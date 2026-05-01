"""
SMS-kod asosida tarif sotib olish oqimi (mock):

  1. POST /api/payments/initiate/   body: {tariff_id, phone}
       → PaymentTransaction(PENDING) yaratiladi, 6 raqamli kod generatsiya
         qilinib `sms_code` ga saqlanadi. Kod server log'ida ko'rinadi
         (dev rejim). Javob: {payment_id, resend_after: 60}
  2. POST /api/payments/verify/     body: {payment_id, code}
       → Kod to'g'ri bo'lsa — Subscription aktivlashtiriladi, foydalanuvchiga
         nano koin beriladi (xuddi subscriptions.TariffViewSet.purchase kabi).
  3. POST /api/payments/resend/     body: {payment_id}
       → Oxirgi kod yuborilgandan beri 60 sekund o'tgan bo'lsa, yangi kod
         generatsiyalanadi. Aks holda 429.
"""
from __future__ import annotations

import logging
import secrets
from datetime import timedelta

from django.conf import settings as dj_settings
from django.db import transaction
from django.http import HttpResponse
from django.shortcuts import redirect
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from rest_framework import permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import TOKENS_PER_NANO_COIN
from apps.subscriptions.models import Subscription, SubscriptionStatus, Tariff

from .gateways import PROVIDERS
from .models import PaymentStatus, PaymentTransaction

logger = logging.getLogger(__name__)

RESEND_COOLDOWN_SECONDS = 60
MAX_SMS_ATTEMPTS = 5


def _generate_sms_code() -> str:
    """6 raqamli tasodifiy kod."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _send_sms(phone: str, code: str) -> None:
    """
    SMS yuborish — hozir MOCK (dev rejim).
    Haqiqiy SMS gateway (Eskiz.uz / Twilio) shu yerga integratsiya qilinadi.
    """
    logger.warning("📱 SMS MOCK → %s: kod=%s", phone, code)


def _seconds_until_resend(payment: PaymentTransaction) -> int:
    if not payment.sms_sent_at:
        return 0
    elapsed = (timezone.now() - payment.sms_sent_at).total_seconds()
    remaining = RESEND_COOLDOWN_SECONDS - int(elapsed)
    return max(0, remaining)


# ─────────────────────────────────────────────────────────────
# 1. Initiate — PaymentTransaction yaratamiz, SMS yuboramiz
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def initiate_payment(request):
    tariff_id = request.data.get("tariff_id")
    phone = (request.data.get("phone") or "").strip()

    if not tariff_id:
        return Response({"error": "tariff_id talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
    if not phone or len(phone) < 7:
        return Response({"error": "Telefon raqam noto'g'ri."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        tariff = Tariff.objects.get(pk=tariff_id, is_active=True)
    except Tariff.DoesNotExist:
        return Response({"error": "Tarif topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    code = _generate_sms_code()
    payment = PaymentTransaction.objects.create(
        user=request.user,
        tariff=tariff,
        amount=tariff.price,
        provider="sms-mock",
        status=PaymentStatus.PENDING,
        phone=phone,
        sms_code=code,
        sms_sent_at=timezone.now(),
    )
    _send_sms(phone, code)

    return Response({
        "success": True,
        "payment_id": payment.id,
        "tariff": {"id": tariff.id, "name": tariff.name, "price": str(tariff.price)},
        "phone_masked": phone[:4] + "***" + phone[-2:] if len(phone) > 6 else phone,
        "resend_after": RESEND_COOLDOWN_SECONDS,
    }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────────────────────
# 2. Verify — kodni tekshiramiz va obunani aktivlashtiramiz
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def verify_payment(request):
    payment_id = request.data.get("payment_id")
    code = (request.data.get("code") or "").strip()

    if not payment_id or not code:
        return Response({"error": "payment_id va code talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = PaymentTransaction.objects.select_related("tariff").get(
            pk=payment_id, user=request.user,
        )
    except PaymentTransaction.DoesNotExist:
        return Response({"error": "To'lov topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    if payment.status == PaymentStatus.SUCCESS:
        return Response({"error": "Bu to'lov allaqachon tasdiqlangan."}, status=status.HTTP_409_CONFLICT)

    if payment.sms_attempts >= MAX_SMS_ATTEMPTS:
        payment.status = PaymentStatus.FAILED
        payment.save(update_fields=["status", "updated_at"])
        return Response({"error": "Juda ko'p urinish. Yangi to'lov boshlang."}, status=status.HTTP_429_TOO_MANY_REQUESTS)

    # Urinishni yozib boramiz
    PaymentTransaction.objects.filter(pk=payment.pk).update(sms_attempts=payment.sms_attempts + 1)

    if code != payment.sms_code:
        return Response({
            "error": "Kod noto'g'ri.",
            "attempts_left": MAX_SMS_ATTEMPTS - (payment.sms_attempts + 1),
        }, status=status.HTTP_400_BAD_REQUEST)

    # Kod to'g'ri — yagona helper orqali aktivatsiya qilamiz
    from apps.subscriptions.services import activate_for_payment
    sub = activate_for_payment(payment)
    request.user.refresh_from_db(fields=["tokens_balance", "nano_coins_last_used_at"])

    nano_granted = payment.tariff.nano_coins_included or 0
    tokens_granted = nano_granted * TOKENS_PER_NANO_COIN

    return Response({
        "success": True,
        "subscription_id": sub.id,
        "tariff_name": payment.tariff.name,
        "nano_granted": nano_granted,
        "tokens_granted": tokens_granted,
        "new_balance": request.user.tokens_balance,
        "nano_coins": request.user.nano_coins,
        "message": (
            f"🎉 «{payment.tariff.name}» obunasi faollashtirildi! "
            f"+{nano_granted:,} nano koin hisobingizga qo'shildi."
        ),
    })


# ─────────────────────────────────────────────────────────────
# 3. Resend — 60s cooldown bilan qayta yuborish
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def resend_sms(request):
    payment_id = request.data.get("payment_id")
    if not payment_id:
        return Response({"error": "payment_id talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        payment = PaymentTransaction.objects.get(pk=payment_id, user=request.user)
    except PaymentTransaction.DoesNotExist:
        return Response({"error": "To'lov topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    if payment.status != PaymentStatus.PENDING:
        return Response({"error": "Bu to'lov pending holatda emas."}, status=status.HTTP_409_CONFLICT)

    remaining = _seconds_until_resend(payment)
    if remaining > 0:
        return Response({
            "error": f"Iltimos, {remaining} sekund kuting.",
            "retry_after": remaining,
        }, status=status.HTTP_429_TOO_MANY_REQUESTS)

    new_code = _generate_sms_code()
    payment.sms_code = new_code
    payment.sms_sent_at = timezone.now()
    payment.sms_attempts = 0
    payment.save(update_fields=["sms_code", "sms_sent_at", "sms_attempts", "updated_at"])
    _send_sms(payment.phone, new_code)

    return Response({
        "success": True,
        "resend_after": RESEND_COOLDOWN_SECONDS,
        "message": "Yangi kod yuborildi.",
    })


# ─────────────────────────────────────────────────────────────
# 4. Status — verify sahifasi uchun resend timer ni olish
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def payment_status(request, payment_id: int):
    try:
        payment = PaymentTransaction.objects.select_related("tariff").get(
            pk=payment_id, user=request.user,
        )
    except PaymentTransaction.DoesNotExist:
        return Response({"error": "To'lov topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        "payment_id": payment.id,
        "status": payment.status,
        "tariff": {"id": payment.tariff.id, "name": payment.tariff.name, "price": str(payment.tariff.price)},
        "phone_masked": payment.phone[:4] + "***" + payment.phone[-2:] if len(payment.phone) > 6 else payment.phone,
        "seconds_until_resend": _seconds_until_resend(payment),
        "attempts_left": max(0, MAX_SMS_ATTEMPTS - payment.sms_attempts),
    })


# ═════════════════════════════════════════════════════════════════════
# To'lov tizimi (Payme / Click / Paynet) — checkout URL yaratish
# ═════════════════════════════════════════════════════════════════════

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def create_checkout(request):
    """
    Foydalanuvchi tanlagan provayder orqali to'lov boshlash.

    Body:
      { "tariff_id": 1, "provider": "payme" | "click" | "paynet" }

    Javob (muvaffaqiyatli holatda):
      { "success": True, "payment_id": 42, "checkout_url": "https://..." }

    Foydalanuvchi `checkout_url` ga yo'naltiriladi. To'lov muvaffaqiyatli
    tasdiqlangach, provayder webhook'i obunani faollashtiradi va tokenlar
    beriladi (gateways/ ichida).
    """
    tariff_id = request.data.get("tariff_id")
    provider = (request.data.get("provider") or "").lower().strip()

    if not tariff_id:
        return Response({"error": "tariff_id talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
    if provider not in PROVIDERS:
        return Response({
            "error": "Noto'g'ri provayder.",
            "allowed": list(PROVIDERS.keys()),
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        tariff = Tariff.objects.get(pk=tariff_id, is_active=True)
    except Tariff.DoesNotExist:
        return Response({"error": "Tarif topilmadi."}, status=status.HTTP_404_NOT_FOUND)

    payment = PaymentTransaction.objects.create(
        user=request.user,
        tariff=tariff,
        amount=tariff.price,
        provider=provider,
        status=PaymentStatus.PENDING,
    )

    url = PROVIDERS[provider]["build_checkout_url"](payment)
    # Agar relative path qaytgan bo'lsa (masalan WLCM sandbox) —
    # joriy request domenini qo'shib beramiz, frontend to'g'ri redirect qilsin.
    if url and url.startswith("/"):
        url = request.build_absolute_uri(url)
    if not url:
        payment.status = PaymentStatus.FAILED
        payment.save(update_fields=["status", "updated_at"])
        return Response({
            "error": (
                f"{PROVIDERS[provider]['label']} hozircha sozlanmagan. "
                "Admin bilan bog'laning yoki boshqa usulni tanlang."
            ),
        }, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    return Response({
        "success": True,
        "payment_id": payment.id,
        "provider": provider,
        "provider_label": PROVIDERS[provider]["label"],
        "checkout_url": url,
    }, status=status.HTTP_201_CREATED)


# ═════════════════════════════════════════════════════════════════════
# Webhook endpointlari — provayderdan keladi (auth anonim, signature orqali)
# ═════════════════════════════════════════════════════════════════════

@csrf_exempt
@api_view(["POST", "GET"])
@permission_classes([permissions.AllowAny])
def webhook_payme(request):
    """Payme merchant JSON-RPC callback."""
    return PROVIDERS["payme"]["handle_webhook"](request)


@csrf_exempt
@api_view(["POST", "GET"])
@permission_classes([permissions.AllowAny])
def webhook_click(request):
    """Click Prepare + Complete webhook."""
    return PROVIDERS["click"]["handle_webhook"](request)


@csrf_exempt
@api_view(["POST", "GET"])
@permission_classes([permissions.AllowAny])
def webhook_paynet(request):
    """Paynet callback."""
    return PROVIDERS["paynet"]["handle_webhook"](request)


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def webhook_wlcm(request):
    """WLCM (https://docs.wlcm.uz/webhook) callback. Imzo gateway ichida tekshiriladi."""
    return PROVIDERS["wlcm"]["handle_webhook"](request)


# ═════════════════════════════════════════════════════════════════════
# WLCM SANDBOX — kalitlarsiz to'lov simulyatsiyasi (test/dev)
# ═════════════════════════════════════════════════════════════════════

_SANDBOX_PAGE_TEMPLATE = """<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>WLCM Sandbox — To'lovni tasdiqlash</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:linear-gradient(135deg,#1a0b2e 0%,#0f1729 100%);
       min-height:100vh;display:flex;align-items:center;justify-content:center;
       color:#fff;padding:20px}
  .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,0.1);border-radius:24px;
        padding:40px;max-width:480px;width:100%}
  .badge{display:inline-block;background:#f59e0b;color:#000;padding:4px 12px;
         border-radius:12px;font-size:11px;font-weight:700;letter-spacing:.5px;margin-bottom:16px}
  .logo{width:64px;height:64px;border-radius:16px;
        background:linear-gradient(135deg,#a855f7,#3b82f6);
        display:flex;align-items:center;justify-content:center;
        font-size:32px;font-weight:900;margin-bottom:20px}
  h1{font-size:24px;margin-bottom:8px;font-weight:800}
  p{color:#a1a1aa;margin-bottom:24px;line-height:1.5;font-size:14px}
  .row{display:flex;justify-content:space-between;padding:12px 0;
       border-bottom:1px solid rgba(255,255,255,0.06);font-size:14px}
  .row:last-child{border:0}
  .label{color:#71717a}
  .value{color:#fff;font-weight:600}
  .amount{font-size:32px;font-weight:900;text-align:center;margin:24px 0;
          background:linear-gradient(135deg,#a855f7,#3b82f6);
          -webkit-background-clip:text;-webkit-text-fill-color:transparent}
  .actions{display:flex;gap:12px;margin-top:24px}
  button{flex:1;padding:14px;border-radius:14px;border:0;font-weight:700;
         font-size:14px;cursor:pointer;transition:transform .1s}
  button:hover{transform:translateY(-1px)}
  .pay{background:linear-gradient(135deg,#a855f7,#3b82f6);color:#fff}
  .cancel{background:rgba(255,255,255,0.05);color:#a1a1aa;
          border:1px solid rgba(255,255,255,0.1)}
  .note{margin-top:20px;padding:12px;background:rgba(245,158,11,0.1);
        border:1px solid rgba(245,158,11,0.3);border-radius:12px;
        font-size:11px;color:#fbbf24;line-height:1.5}
</style>
</head><body>
<form class="card" method="post">
  <span class="badge">SANDBOX • TEST MODE</span>
  <div class="logo">W</div>
  <h1>WLCM to'lovni tasdiqlash</h1>
  <p>Bu test rejim. Haqiqiy pul yechilmaydi — tugmani bossangiz, tarif darhol faollashtiriladi.</p>
  <div class="amount">__AMOUNT__ so'm</div>
  <div>
    <div class="row"><span class="label">Tarif</span><span class="value">__TARIFF__</span></div>
    <div class="row"><span class="label">Foydalanuvchi</span><span class="value">__EMAIL__</span></div>
    <div class="row"><span class="label">Order ID</span><span class="value">#__PAYMENT_ID__</span></div>
    <div class="row"><span class="label">Provider</span><span class="value">WLCM Sandbox</span></div>
  </div>
  <input type="hidden" name="csrfmiddlewaretoken" value=""/>
  <div class="actions">
    <button type="button" class="cancel" onclick="window.location.href='__RETURN_URL__'">Bekor qilish</button>
    <button type="submit" name="action" value="confirm" class="pay">✓ To'lovni tasdiqlash</button>
  </div>
  <div class="note">
    💡 Production'da haqiqiy WLCM kalitlari (.env: <code>WLCM_API_KEY</code>, <code>WLCM_API_SECRET</code>) bo'lganida bu sahifa o'rniga haqiqiy WLCM checkout sahifasi ochiladi.
  </div>
</form>
</body></html>"""


_RESULT_PAGE_TEMPLATE = """<!doctype html>
<html lang="uz"><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>__TITLE__</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:linear-gradient(135deg,#1a0b2e 0%,#0f1729 100%);
       min-height:100vh;display:flex;align-items:center;justify-content:center;
       color:#fff;padding:20px}
  .card{background:rgba(255,255,255,0.05);backdrop-filter:blur(20px);
        border:1px solid rgba(255,255,255,0.1);border-radius:24px;
        padding:48px 40px;max-width:480px;width:100%;text-align:center}
  .icon{width:88px;height:88px;border-radius:50%;margin:0 auto 24px;
        display:flex;align-items:center;justify-content:center;font-size:48px;
        animation:pop .4s cubic-bezier(.34,1.56,.64,1)}
  .icon.success{background:linear-gradient(135deg,#10b981,#059669);
                box-shadow:0 0 60px rgba(16,185,129,.4)}
  .icon.cancel{background:linear-gradient(135deg,#ef4444,#dc2626);
               box-shadow:0 0 60px rgba(239,68,68,.3)}
  @keyframes pop{0%{transform:scale(0)}100%{transform:scale(1)}}
  h1{font-size:28px;font-weight:900;margin-bottom:12px}
  p{color:#a1a1aa;line-height:1.6;margin-bottom:24px;font-size:15px}
  .info{background:rgba(255,255,255,0.03);border-radius:16px;padding:16px;
        margin:24px 0;text-align:left;font-size:13px}
  .info-row{display:flex;justify-content:space-between;padding:6px 0}
  .info-label{color:#71717a}
  .info-value{color:#fff;font-weight:600}
  .btn{display:inline-block;padding:14px 32px;border-radius:14px;
       font-weight:700;text-decoration:none;transition:transform .15s;
       background:linear-gradient(135deg,#a855f7,#3b82f6);color:#fff;margin-top:8px}
  .btn:hover{transform:translateY(-2px)}
  .countdown{font-size:11px;color:#71717a;margin-top:16px}
</style>
</head><body>
<div class="card">
  <div class="icon __ICON_CLASS__">__ICON_EMOJI__</div>
  <h1>__TITLE__</h1>
  <p>__MESSAGE__</p>
  __INFO_HTML__
  <a href="__FRONTEND_URL__" class="btn">__BUTTON_TEXT__</a>
  <div class="countdown">__COUNTDOWN_TEXT__</div>
</div>
<script>
  (function(){
    var url = "__FRONTEND_URL__";
    var sec = 5;
    var el = document.querySelector('.countdown');
    var timer = setInterval(function(){
      sec--;
      if(sec <= 0){ clearInterval(timer); window.location.href = url; return; }
      if(el) el.textContent = sec + ' soniyadan so\\'ng avtomatik qaytasiz…';
    }, 1000);
  })();
</script>
</body></html>"""


def _frontend_url() -> str:
    """Foydalanuvchini qaytarish uchun frontend URL — env yoki default."""
    url = getattr(dj_settings, "PAYMENT_RETURN_URL", "") or ""
    if url:
        return url
    # Default: nanostup.uz frontendiga qaytaramiz
    return "https://nanostup.uz"


@require_http_methods(["GET"])
def payment_result(request):
    """
    To'lovdan keyin qaytish sahifasi (backend hosted) — chiroyli natija
    ekrani, 5 sekunddan so'ng frontend'ga avtomatik redirect.

    Query: ?payment_id=<id>&status=success|cancelled
    """
    from django.utils.html import escape
    status_q = (request.GET.get("status") or "").lower()
    payment_id = request.GET.get("payment_id") or ""

    success = status_q == "success"
    frontend = _frontend_url()

    info_html = ""
    try:
        if payment_id:
            p = PaymentTransaction.objects.select_related("tariff", "user").get(pk=int(payment_id))
            nano = (p.tariff.nano_coins_included or 0) if p.tariff_id else 0
            info_html = (
                '<div class="info">'
                f'<div class="info-row"><span class="info-label">Tarif</span>'
                f'<span class="info-value">{escape(p.tariff.name if p.tariff_id else "—")}</span></div>'
                f'<div class="info-row"><span class="info-label">Summa</span>'
                f'<span class="info-value">{float(p.amount or 0):,.0f} so\'m</span></div>'
                f'<div class="info-row"><span class="info-label">Nano koin</span>'
                f'<span class="info-value">+{nano:,}</span></div>'
                f'<div class="info-row"><span class="info-label">Order</span>'
                f'<span class="info-value">#{p.id}</span></div>'
                '</div>'
            )
    except (PaymentTransaction.DoesNotExist, ValueError, TypeError):
        pass

    if success:
        replacements = {
            "__TITLE__": "Tarif faollashtirildi! 🎉",
            "__ICON_CLASS__": "success",
            "__ICON_EMOJI__": "✓",
            "__MESSAGE__": "To'lovingiz muvaffaqiyatli qabul qilindi. Nano koinlar hisobingizga qo'shildi va barcha premium imkoniyatlar ochiq.",
            "__BUTTON_TEXT__": "Bosh sahifaga qaytish →",
            "__COUNTDOWN_TEXT__": "5 soniyadan so'ng avtomatik qaytasiz…",
        }
    else:
        replacements = {
            "__TITLE__": "To'lov bekor qilindi",
            "__ICON_CLASS__": "cancel",
            "__ICON_EMOJI__": "✕",
            "__MESSAGE__": "Siz to'lovni bekor qildingiz. Hech qanday pul yechilmadi. Istasangiz qaytadan urinib ko'rishingiz mumkin.",
            "__BUTTON_TEXT__": "Orqaga qaytish",
            "__COUNTDOWN_TEXT__": "5 soniyadan so'ng avtomatik qaytasiz…",
        }

    html = _RESULT_PAGE_TEMPLATE
    for k, v in replacements.items():
        html = html.replace(k, v)
    html = html.replace("__INFO_HTML__", info_html if success else "")
    html = html.replace("__FRONTEND_URL__", frontend)
    return HttpResponse(html)


@csrf_exempt
@require_http_methods(["GET", "POST"])
def wlcm_sandbox(request, payment_id: int):
    """
    WLCM Sandbox sahifasi — kalitlar yo'q paytda haqiqiy to'lov o'rniga
    chiqadi. POST kelganda PaymentTransaction'ni SUCCESS qiladi va
    `PAYMENT_RETURN_URL` ga redirect qiladi (xuddi haqiqiy WLCM kabi).
    """
    try:
        payment = PaymentTransaction.objects.select_related("user", "tariff").get(pk=payment_id)
    except PaymentTransaction.DoesNotExist:
        return HttpResponse("To'lov topilmadi", status=404)

    # Bekor qilish / muvaffaqiyat natija sahifasiga yo'naltiramiz
    result_path = f"/api/payments/result/?payment_id={payment.id}"

    if request.method == "POST" and request.POST.get("action") == "confirm":
        from apps.subscriptions.services import activate_for_payment
        if payment.status != PaymentStatus.SUCCESS:
            activate_for_payment(payment)
        return redirect(f"{result_path}&status=success")

    html = (
        _SANDBOX_PAGE_TEMPLATE
        .replace("__AMOUNT__", f"{float(payment.amount or 0):,.0f}")
        .replace("__TARIFF__", payment.tariff.name if payment.tariff_id else "—")
        .replace("__EMAIL__", payment.user.email if payment.user_id else "—")
        .replace("__PAYMENT_ID__", str(payment.id))
        .replace("__RETURN_URL__", f"{result_path}&status=cancelled")
    )
    return HttpResponse(html)
