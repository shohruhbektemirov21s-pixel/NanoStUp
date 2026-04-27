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

from django.db import transaction
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
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

    # Kod to'g'ri — obunani aktivlashtiramiz
    tariff = payment.tariff
    user = request.user

    with transaction.atomic():
        Subscription.objects.filter(
            user=user, status=SubscriptionStatus.ACTIVE,
        ).update(status=SubscriptionStatus.CANCELED)

        now = timezone.now()
        end = now + timedelta(days=tariff.duration_days or 30)
        sub = Subscription.objects.create(
            user=user,
            tariff=tariff,
            status=SubscriptionStatus.ACTIVE,
            start_date=now,
            end_date=end,
        )

        # To'lov tasdiqlandi — tarifdagi TO'LIQ nano koin miqdori zudlik bilan
        # beriladi (admin paneldagi `nano_coins_included` qiymatiga ko'ra).
        nano_granted = tariff.nano_coins_included or 0
        tokens_to_add = nano_granted * TOKENS_PER_NANO_COIN
        if tokens_to_add > 0:
            from django.utils import timezone as _tz
            user.tokens_balance = (user.tokens_balance or 0) + tokens_to_add
            # 30 kunlik foydalanmaslik timer'ini qaytadan boshlaymiz
            user.nano_coins_last_used_at = _tz.now()
            user.save(update_fields=["tokens_balance", "nano_coins_last_used_at"])

        payment.status = PaymentStatus.SUCCESS
        payment.verified_at = now
        payment.save(update_fields=["status", "verified_at", "updated_at"])

    return Response({
        "success": True,
        "subscription_id": sub.id,
        "tariff_name": tariff.name,
        "nano_granted": nano_granted,
        "tokens_granted": tokens_to_add,
        "new_balance": user.tokens_balance,
        "nano_coins": user.nano_coins,
        "message": (
            f"🎉 «{tariff.name}» obunasi faollashtirildi! "
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
