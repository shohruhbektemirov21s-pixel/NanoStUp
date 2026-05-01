"""
WLCM (https://wlcm.uz) — to'lov tizimi integratsiyasi.

Hujjatlar: https://docs.wlcm.uz/

WLCM bu agregator: bitta API orqali Payme, Click, Paylov, Uzum, va
to'g'ridan-to'g'ri karta orqali to'lovlarni yig'a oladi. Ushbu modul
mavjud `payme` / `click` / `paynet` gateway'larga o'xshash interfeys
beradi:
    - build_checkout_url(payment) -> Optional[str]
    - handle_webhook(request)     -> rest_framework.Response

Autentifikatsiya (docs.wlcm.uz/authentication):
    Headers:
        X-API-Key:    partnyor uchun berilgan API kalit
        X-Timestamp:  millisekundlardagi timestamp (max 300s skew)
        X-Signature:  HMAC-SHA256(api_secret, "METHOD\\nCANONICAL_PATH\\nTS\\nSHA256(BODY)")
        Content-Type: application/json

.env namunasi:
    WLCM_API_KEY=xxxxxxxxxxxxxxxxxx
    WLCM_API_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
    WLCM_BASE_URL=https://api.wlcm.uz
    WLCM_CHECKOUT_PATH=/api/v1/integrations/checkout
    WLCM_DEFAULT_PROVIDER=payme        # payme|click|paylov|uzum|card
    WLCM_VERIFY_WEBHOOK_SIGNATURE=True

Webhook (docs.wlcm.uz/webhook): WLCM bizning webhook URL'imizga
to'lov holati o'zgarganda POST yuboradi:
    {
      "external_id": "...",  # bizning PaymentTransaction.id
      "order_id":    "...",  # WLCM ichidagi order id
      "payment_id":  "...",
      "amount":      "10.00",
      "state":       "2",    # 2 = SUCCESS, -2 = CANCELLED
      "provider":    "payme",
      "timestamp":   "...",
      "signature":   "..."
    }
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import time
from decimal import Decimal
from typing import Optional
from urllib.parse import parse_qsl, urlencode

import requests
from django.conf import settings
from django.http import HttpRequest
from rest_framework.response import Response

from ..models import PaymentStatus, PaymentTransaction
from .payme import _activate_subscription  # mavjud aktivatsiya logikasini qayta ishlatamiz

logger = logging.getLogger(__name__)


# ─── Settings helper ──────────────────────────────────────────────────


def _settings() -> dict:
    return {
        "api_key":          getattr(settings, "WLCM_API_KEY", "") or "",
        "api_secret":       getattr(settings, "WLCM_API_SECRET", "") or "",
        "base_url":         (getattr(settings, "WLCM_BASE_URL", "") or "https://api.wlcm.uz").rstrip("/"),
        "checkout_path":    getattr(settings, "WLCM_CHECKOUT_PATH", "/api/v1/integrations/checkout"),
        "default_provider": (getattr(settings, "WLCM_DEFAULT_PROVIDER", "") or "payme").lower(),
        "verify_webhook":   bool(getattr(settings, "WLCM_VERIFY_WEBHOOK_SIGNATURE", True)),
        "return_url":       getattr(settings, "PAYMENT_RETURN_URL", "") or "",
        "timeout":          float(getattr(settings, "WLCM_HTTP_TIMEOUT", 15)),
    }


# ─── Signature (request → WLCM) ───────────────────────────────────────
# docs.wlcm.uz/python-signature dan to'g'ridan-to'g'ri formula:
#   message = "METHOD\nCANONICAL_PATH\nTIMESTAMP\nSHA256_HEX(body)"
#   signature = HMAC-SHA256(api_secret, message)


def _build_canonical_path(path: str, query_string: str = "") -> str:
    if not query_string:
        return path
    params = sorted(parse_qsl(query_string, keep_blank_values=True))
    return f"{path}?{urlencode(params)}" if params else path


def make_signature(
    api_secret: str,
    method: str,
    path: str,
    query_string: str,
    timestamp: str,
    body: bytes,
) -> str:
    canonical = _build_canonical_path(path, query_string)
    body_hash = hashlib.sha256(body or b"").hexdigest()
    message = f"{method.upper()}\n{canonical}\n{timestamp}\n{body_hash}"
    return hmac.new(
        key=api_secret.encode(),
        msg=message.encode(),
        digestmod=hashlib.sha256,
    ).hexdigest()


def _signed_headers(method: str, path: str, body: bytes, query_string: str = "") -> dict:
    cfg = _settings()
    timestamp = str(int(time.time() * 1000))
    sig = make_signature(
        api_secret=cfg["api_secret"],
        method=method,
        path=path,
        query_string=query_string,
        timestamp=timestamp,
        body=body,
    )
    return {
        "X-API-Key":    cfg["api_key"],
        "X-Timestamp":  timestamp,
        "X-Signature":  sig,
        "Content-Type": "application/json",
    }


# ─── Checkout URL yaratish ────────────────────────────────────────────


def build_checkout_url(payment: PaymentTransaction) -> Optional[str]:
    """
    POST /api/v1/integrations/checkout → JSON:
        { external_id, amount(tiyinda), payment_provider, return_url }

    WLCM `checkout_url` qaytaradi — foydalanuvchi shu URL'ga yo'naltiriladi.
    Agar konfiguratsiya yo'q bo'lsa None qaytaramiz; views.py uni
    "hozircha sozlanmagan" javob bilan boshqaradi.
    """
    cfg = _settings()
    if not cfg["api_key"] or not cfg["api_secret"]:
        logger.warning("WLCM_API_KEY / WLCM_API_SECRET sozlanmagan — WLCM checkout o'tkazilmayapti")
        return None

    # WLCM amount'ni tiyinda kutadi (1 so'm = 100 tiyin).
    amount_tiyin = int((Decimal(payment.amount) * 100).to_integral_value())

    payload: dict = {
        "external_id": str(payment.id),
        "amount":      amount_tiyin,
        "payment_provider": cfg["default_provider"],
    }
    if cfg["return_url"]:
        payload["return_url"] = f"{cfg['return_url']}?payment_id={payment.id}"

    body = json.dumps(payload, separators=(",", ":")).encode()
    headers = _signed_headers("POST", cfg["checkout_path"], body)
    url = f"{cfg['base_url']}{cfg['checkout_path']}"

    try:
        resp = requests.post(url, data=body, headers=headers, timeout=cfg["timeout"])
    except requests.RequestException as exc:
        logger.exception("WLCM checkout so'rovi muvaffaqiyatsiz: %s", exc)
        return None

    if resp.status_code not in (200, 201):
        logger.warning("WLCM checkout %s qaytardi: %s", resp.status_code, resp.text[:500])
        return None

    try:
        data = resp.json()
    except ValueError:
        logger.warning("WLCM checkout JSON emas: %s", resp.text[:500])
        return None

    # external_id ↔ order_id mapping'ni saqlaymiz (webhook tekshiruvida foyda)
    order_id = data.get("order_id")
    if order_id and not payment.external_id:
        payment.external_id = str(order_id)
        payment.save(update_fields=["external_id", "updated_at"])

    checkout_url = data.get("checkout_url")
    if not checkout_url:
        # Card flow'da checkout_url=null bo'lishi mumkin (OTP flow). Hozircha
        # subscription uchun faqat redirect flow'ni qo'llab-quvvatlaymiz.
        logger.info("WLCM javobida checkout_url yo'q (state=%s) — flow qo'llab-quvvatlanmaydi", data.get("state"))
        return None

    return checkout_url


# ─── Webhook (WLCM → biz) ─────────────────────────────────────────────
# docs.wlcm.uz/webhook: state ∈ {2, -2}. Imzo tekshirish formulasi
# docs'da to'liq berilmagan, shuning uchun ikki strategiya:
#   1) Agar `signature` HMAC(api_secret, body[bytes]) bo'lsa — moslikni tekshiramiz.
#   2) Agar HMAC canonical-string (fields concat) bo'lsa — moslikni tekshiramiz.
# Ikkalasi ham fail bo'lsa va WLCM_VERIFY_WEBHOOK_SIGNATURE=True bo'lsa rad etamiz.


def _verify_webhook_signature(raw_body: bytes, payload: dict, api_secret: str) -> bool:
    received = (payload.get("signature") or "").lower()
    if not received or not api_secret:
        return False

    # Strategy A: HMAC over raw body bytes
    sig_a = hmac.new(api_secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig_a.lower(), received):
        return True

    # Strategy B: HMAC over canonical concat of declared fields
    canonical = (
        f"{payload.get('external_id','')}"
        f"{payload.get('order_id','')}"
        f"{payload.get('payment_id','')}"
        f"{payload.get('amount','')}"
        f"{payload.get('state','')}"
        f"{payload.get('provider','')}"
        f"{payload.get('timestamp','')}"
    )
    sig_b = hmac.new(api_secret.encode(), canonical.encode(), hashlib.sha256).hexdigest()
    if hmac.compare_digest(sig_b.lower(), received):
        return True

    return False


def handle_webhook(request: HttpRequest) -> Response:
    cfg = _settings()
    raw_body = request.body or b""

    try:
        payload = json.loads(raw_body.decode() or "{}") if raw_body else {}
    except (ValueError, UnicodeDecodeError):
        return Response({"error": "Invalid JSON"}, status=400)

    if not isinstance(payload, dict):
        return Response({"error": "Invalid payload"}, status=400)

    # Imzoni tekshiramiz (faqat secret mavjud bo'lsa)
    if cfg["verify_webhook"] and cfg["api_secret"]:
        if not _verify_webhook_signature(raw_body, payload, cfg["api_secret"]):
            logger.warning("WLCM webhook: signature mismatch payload=%s", payload)
            return Response({"error": "Bad signature"}, status=401)

    external_id = payload.get("external_id")
    try:
        payment = PaymentTransaction.objects.select_related("tariff", "user").get(pk=external_id)
    except (PaymentTransaction.DoesNotExist, ValueError, TypeError):
        return Response({"error": "Order not found"}, status=404)

    # Amount tekshiruvi (WLCM amount'ni "10.00" ko'rinishida yuboradi — so'mda)
    try:
        wlcm_amount = Decimal(str(payload.get("amount", "0")))
        if wlcm_amount != Decimal(payment.amount):
            logger.warning(
                "WLCM webhook: amount nomos %s != %s (payment=%s)",
                wlcm_amount, payment.amount, payment.id,
            )
            return Response({"error": "Amount mismatch"}, status=400)
    except Exception:
        return Response({"error": "Invalid amount"}, status=400)

    state = str(payload.get("state", "")).strip()
    order_id = payload.get("order_id")
    if order_id and not payment.external_id:
        payment.external_id = str(order_id)
        payment.save(update_fields=["external_id", "updated_at"])

    if state == "2":
        if payment.status != PaymentStatus.SUCCESS:
            _activate_subscription(payment)
        return Response({"ok": True}, status=200)

    if state == "-2":
        if payment.status == PaymentStatus.PENDING:
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status", "updated_at"])
        return Response({"ok": True}, status=200)

    # Pending yoki noma'lum holat — qabul qilamiz, lekin hech narsa qilmaymiz
    return Response({"ok": True, "ignored": True, "state": state}, status=200)
