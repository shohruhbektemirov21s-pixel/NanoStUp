"""
Paynet.uz to'lov tizimi integratsiyasi.

Hujjatlar: https://paynet.uz (merchant account kerak)

Paynet odatda SOAP/XML interfeysi orqali ishlaydi. Oqim:
  1. Merchant o'z saytida invoice yaratadi (API yoki QR kod)
  2. Foydalanuvchi Paynet terminali/ilovasida order_id bilan to'laydi
  3. Paynet merchant webhook'ga XML so'rov yuboradi:
       - getInformation (tekshirish)
       - performTransaction (tasdiqlash)
       - cancelTransaction (bekor qilish)

.env:
  PAYNET_USERNAME=xxxxxxx
  PAYNET_PASSWORD=xxxxxxx
  PAYNET_TERMINAL_ID=xxxxxxx
  PAYNET_CHECKOUT_URL=https://paynet.uz/pay  # yoki QR code redirect
"""
from __future__ import annotations

import logging
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.http import HttpRequest
from rest_framework.response import Response

from ..models import PaymentStatus, PaymentTransaction
from .payme import _activate_subscription

logger = logging.getLogger(__name__)


def _settings():
    return {
        "username": getattr(settings, "PAYNET_USERNAME", ""),
        "password": getattr(settings, "PAYNET_PASSWORD", ""),
        "terminal_id": getattr(settings, "PAYNET_TERMINAL_ID", ""),
        "checkout_url": getattr(settings, "PAYNET_CHECKOUT_URL", ""),
        "return_url": getattr(settings, "PAYMENT_RETURN_URL", ""),
    }


def build_checkout_url(payment: PaymentTransaction) -> Optional[str]:
    """
    Paynet checkout URL (agar sozlangan bo'lsa).
    Amaliyotda ko'p integratsiyalarda QR kod generatsiya qilinadi va
    foydalanuvchi Paynet ilovasi orqali to'laydi. Bu yerda sodda URL:

      {checkout_url}?merchant={TERMINAL_ID}&order={PAYMENT_ID}&amount={SUM}
    """
    cfg = _settings()
    if not cfg["checkout_url"] or not cfg["terminal_id"]:
        logger.warning("PAYNET_* sozlanmagan")
        return None

    from urllib.parse import urlencode
    params = {
        "merchant": cfg["terminal_id"],
        "order": str(payment.id),
        "amount": str(payment.amount),
    }
    if cfg["return_url"]:
        params["return_url"] = f"{cfg['return_url']}?payment_id={payment.id}"
    return f"{cfg['checkout_url']}?{urlencode(params)}"


# ─── Webhook (soddalashtirilgan JSON variant) ─────────────────────────
# Paynet haqiqatda SOAP/XML ishlatadi — bu stub test/development uchun.
# Ishlab chiqarishda spyne/suds yoki xml.etree orqali SOAP envelope parse qilinadi.

def handle_webhook(request: HttpRequest) -> Response:
    """
    Paynet callback — sodda REST variant. Body:
      {
        "method": "getInformation" | "performTransaction" | "cancelTransaction",
        "order_id": "<payment_id>",
        "amount": <decimal>,
        "transaction_id": "<paynet transaction id>"
      }
    """
    import json

    # Basic auth tekshiruv
    cfg = _settings()
    if cfg["username"] and cfg["password"]:
        import base64
        auth = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth.startswith("Basic "):
            return Response({"status": "ERROR", "error": "Unauthorized"}, status=401)
        try:
            decoded = base64.b64decode(auth[6:]).decode()
            u, p = decoded.split(":", 1)
            if u != cfg["username"] or p != cfg["password"]:
                return Response({"status": "ERROR", "error": "Invalid credentials"}, status=401)
        except Exception:
            return Response({"status": "ERROR", "error": "Invalid auth"}, status=401)

    try:
        data = json.loads(request.body.decode() or "{}")
    except Exception:
        return Response({"status": "ERROR", "error": "Invalid JSON"}, status=400)

    method = data.get("method")
    order_id = data.get("order_id")

    try:
        payment = PaymentTransaction.objects.select_related(
            "tariff", "user",
        ).get(pk=order_id)
    except (PaymentTransaction.DoesNotExist, ValueError, TypeError):
        return Response({"status": "ERROR", "error": "Order not found"}, status=404)

    # Summa tekshiruvi
    if "amount" in data:
        try:
            if Decimal(str(data["amount"])) != Decimal(payment.amount):
                return Response({"status": "ERROR", "error": "Wrong amount"}, status=200)
        except Exception:
            return Response({"status": "ERROR", "error": "Invalid amount"}, status=200)

    if method == "getInformation":
        return Response({
            "status": "OK",
            "order_id": str(payment.id),
            "amount": str(payment.amount),
            "description": f"Obuna: {payment.tariff.name}",
        }, status=200)

    if method == "performTransaction":
        payment.external_id = data.get("transaction_id", payment.external_id)
        payment.save(update_fields=["external_id", "updated_at"])
        _activate_subscription(payment)
        return Response({
            "status": "OK",
            "transaction_id": payment.external_id,
            "order_id": str(payment.id),
        }, status=200)

    if method == "cancelTransaction":
        payment.status = PaymentStatus.FAILED
        payment.save(update_fields=["status", "updated_at"])
        return Response({
            "status": "OK",
            "transaction_id": payment.external_id,
            "order_id": str(payment.id),
        }, status=200)

    return Response({"status": "ERROR", "error": "Unknown method"}, status=400)
