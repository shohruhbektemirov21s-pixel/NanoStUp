"""
Click.uz to'lov tizimi integratsiyasi.

Hujjatlar: https://docs.click.uz/

Oqim:
  1. build_checkout_url(payment) — my.click.uz sahifasiga URL
  2. handle_webhook(request) — Prepare + Complete webhook'larni bir endpoint'da

.env:
  CLICK_SERVICE_ID=xxxxx
  CLICK_MERCHANT_ID=xxxxx
  CLICK_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
  CLICK_CHECKOUT_URL=https://my.click.uz/services/pay
"""
from __future__ import annotations

import hashlib
import logging
from decimal import Decimal
from typing import Optional
from urllib.parse import urlencode

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone
from rest_framework.response import Response

from ..models import PaymentStatus, PaymentTransaction
from .payme import _activate_subscription  # qayta ishlatish

logger = logging.getLogger(__name__)


def _settings():
    return {
        "service_id": getattr(settings, "CLICK_SERVICE_ID", ""),
        "merchant_id": getattr(settings, "CLICK_MERCHANT_ID", ""),
        "secret_key": getattr(settings, "CLICK_SECRET_KEY", ""),
        "checkout_url": getattr(settings, "CLICK_CHECKOUT_URL", "https://my.click.uz/services/pay"),
        "return_url": getattr(settings, "PAYMENT_RETURN_URL", ""),
    }


def build_checkout_url(payment: PaymentTransaction) -> Optional[str]:
    """
    Click checkout URL.
    Format:
      https://my.click.uz/services/pay?service_id=SID&merchant_id=MID
          &amount=AMOUNT&transaction_param=ORDER_ID&return_url=RETURN
    """
    cfg = _settings()
    if not cfg["service_id"] or not cfg["merchant_id"]:
        logger.warning("CLICK_SERVICE_ID/MERCHANT_ID sozlanmagan")
        return None

    params = {
        "service_id": cfg["service_id"],
        "merchant_id": cfg["merchant_id"],
        "amount": str(payment.amount),
        "transaction_param": str(payment.id),
    }
    if cfg["return_url"]:
        params["return_url"] = f"{cfg['return_url']}?payment_id={payment.id}"

    return f"{cfg['checkout_url']}?{urlencode(params)}"


# ─── Webhook ──────────────────────────────────────────────────────────
# Click ikki bosqichli: Prepare (action=0) va Complete (action=1).
# Signature: MD5(click_trans_id + service_id + SECRET_KEY + merchant_trans_id
#                + (merchant_prepare_id if complete else '') + amount + action + sign_time)


def _compute_sign(params: dict, secret_key: str) -> str:
    """Click signature hisoblash."""
    action = int(params.get("action", 0))
    prepare_id = params.get("merchant_prepare_id", "") if action == 1 else ""
    sign_src = (
        f"{params.get('click_trans_id','')}"
        f"{params.get('service_id','')}"
        f"{secret_key}"
        f"{params.get('merchant_trans_id','')}"
        f"{prepare_id}"
        f"{params.get('amount','')}"
        f"{params.get('action','')}"
        f"{params.get('sign_time','')}"
    )
    return hashlib.md5(sign_src.encode()).hexdigest()


def handle_webhook(request: HttpRequest) -> Response:
    """
    Click Prepare + Complete webhook'larni bitta endpoint'da boshqaradi.
    Body Click tomonidan form-encoded yuboriladi (request.POST).
    """
    cfg = _settings()
    data = request.POST.dict() if request.method == "POST" else request.GET.dict()

    # Imzoni tekshiramiz
    if cfg["secret_key"]:
        expected_sign = _compute_sign(data, cfg["secret_key"])
        if data.get("sign_string", "").lower() != expected_sign.lower():
            return Response({"error": -1, "error_note": "SIGN CHECK FAILED"}, status=200)

    try:
        payment = PaymentTransaction.objects.select_related(
            "tariff", "user",
        ).get(pk=data.get("merchant_trans_id"))
    except (PaymentTransaction.DoesNotExist, ValueError, TypeError):
        return Response({"error": -5, "error_note": "Order not found"}, status=200)

    # Summa tekshiruvi
    try:
        if Decimal(data.get("amount", "0")) != Decimal(payment.amount):
            return Response({"error": -2, "error_note": "Wrong amount"}, status=200)
    except Exception:
        return Response({"error": -2, "error_note": "Wrong amount"}, status=200)

    action = int(data.get("action", 0))

    if action == 0:  # Prepare
        payment.external_id = data.get("click_trans_id")
        payment.save(update_fields=["external_id", "updated_at"])
        return Response({
            "error": 0,
            "error_note": "Success",
            "click_trans_id": data.get("click_trans_id"),
            "merchant_trans_id": str(payment.id),
            "merchant_prepare_id": str(payment.id),
        }, status=200)

    if action == 1:  # Complete
        error_code = int(data.get("error", 0))
        if error_code < 0:
            payment.status = PaymentStatus.FAILED
            payment.save(update_fields=["status", "updated_at"])
            return Response({
                "error": -9,
                "error_note": "Transaction cancelled",
            }, status=200)

        _activate_subscription(payment)
        return Response({
            "error": 0,
            "error_note": "Success",
            "click_trans_id": data.get("click_trans_id"),
            "merchant_trans_id": str(payment.id),
            "merchant_confirm_id": str(payment.id),
        }, status=200)

    return Response({"error": -3, "error_note": "Action not found"}, status=200)
