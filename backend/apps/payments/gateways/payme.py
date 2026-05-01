"""
Payme (Paycom) to'lov tizimi integratsiyasi.

Hujjatlar: https://developer.help.paycom.uz/

Oqim:
  1. build_checkout_url(payment) — Payme checkout URL yaratadi
     (base64 encoded params: m=MERCHANT_ID;ac.order_id=ID;a=AMOUNT_IN_TIYIN)
  2. handle_webhook(request) — Payme JSON-RPC callback'larini boshqaradi
     (CheckPerformTransaction, CreateTransaction, PerformTransaction,
      CancelTransaction, CheckTransaction, GetStatement)

.env:
  PAYME_MERCHANT_ID=xxxxxxxxxxxxxxxxxxxxxxxx
  PAYME_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx    # Test: TEST_KEY, Prod: real
  PAYME_CHECKOUT_URL=https://checkout.paycom.uz  # Prod
  # PAYME_CHECKOUT_URL=https://test.paycom.uz    # Test rejim
"""
from __future__ import annotations

import base64
import logging
from decimal import Decimal
from typing import Optional

from django.conf import settings
from django.http import HttpRequest
from django.utils import timezone
from rest_framework.response import Response

from apps.accounts.models import TOKENS_PER_NANO_COIN
from apps.subscriptions.models import Subscription, SubscriptionStatus

from ..models import PaymentStatus, PaymentTransaction

logger = logging.getLogger(__name__)


def _settings():
    return {
        "merchant_id": getattr(settings, "PAYME_MERCHANT_ID", ""),
        "secret_key": getattr(settings, "PAYME_SECRET_KEY", ""),
        "checkout_url": getattr(settings, "PAYME_CHECKOUT_URL", "https://checkout.paycom.uz"),
        "return_url": getattr(settings, "PAYMENT_RETURN_URL", ""),
    }


def build_checkout_url(payment: PaymentTransaction) -> Optional[str]:
    """
    Payme checkout URL yaratadi.

    Format:
      {checkout_url}/{base64(m=MERCHANT;ac.order_id=ID;a=AMOUNT;c=RETURN)}
    """
    cfg = _settings()
    if not cfg["merchant_id"]:
        logger.warning("PAYME_MERCHANT_ID sozlanmagan — Payme ishlamaydi")
        return None

    # Payme tiyin (1 so'm = 100 tiyin) qabul qiladi
    amount_tiyin = int(Decimal(payment.amount) * 100)

    parts = [
        f"m={cfg['merchant_id']}",
        f"ac.order_id={payment.id}",
        f"a={amount_tiyin}",
    ]
    if cfg["return_url"]:
        parts.append(f"c={cfg['return_url']}?payment_id={payment.id}")

    params = ";".join(parts)
    encoded = base64.b64encode(params.encode()).decode()
    return f"{cfg['checkout_url']}/{encoded}"


# ─── Webhook (JSON-RPC 2.0) ───────────────────────────────────────────
# Payme merchant API chaqiruvlarni: CheckPerformTransaction, CreateTransaction,
# PerformTransaction, CancelTransaction, CheckTransaction, GetStatement.
# Har birida Basic auth header'da SECRET_KEY tekshiriladi.

_AUTH_ERROR = {"code": -32504, "message": "Not authorized"}
_ORDER_NOT_FOUND = {"code": -31050, "message": "Order not found"}
_WRONG_AMOUNT = {"code": -31001, "message": "Wrong amount"}
_TRANSACTION_NOT_FOUND = {"code": -31003, "message": "Transaction not found"}


def _check_auth(request: HttpRequest) -> bool:
    """Payme merchant Basic auth tekshiruvi."""
    cfg = _settings()
    if not cfg["secret_key"]:
        return False
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if not auth.startswith("Basic "):
        return False
    try:
        decoded = base64.b64decode(auth[6:]).decode()
        # Format: "Paycom:<SECRET_KEY>"
        _, received_key = decoded.split(":", 1)
        return received_key == cfg["secret_key"]
    except Exception:
        return False


def _activate_subscription(payment: PaymentTransaction) -> None:
    """
    Yagona aktivatsiya helperiga delegate.

    Click va WLCM gateway'lari ham shu funksiyani import qilishadi —
    backward compatibility uchun nom saqlanadi, lekin haqiqiy logika
    `apps.subscriptions.services.activate_for_payment` ichida (DRY).
    """
    from apps.subscriptions.services import activate_for_payment
    activate_for_payment(payment)
    logger.info(
        "_activate_subscription (delegated): payment=%s user=%s provider=%s",
        payment.id, payment.user_id, payment.provider,
    )


def handle_webhook(request: HttpRequest) -> Response:
    """
    Payme JSON-RPC webhook'ni boshqaradi.
    Barcha metodlarni qisqacha qo'llab-quvvatlaydi.
    """
    import json

    if not _check_auth(request):
        return Response({"error": _AUTH_ERROR, "id": None}, status=200)

    try:
        body = json.loads(request.body.decode() or "{}")
    except Exception:
        return Response({"error": {"code": -32700, "message": "Parse error"}}, status=200)

    method = body.get("method")
    params = body.get("params") or {}
    req_id = body.get("id")
    order_id = (params.get("account") or {}).get("order_id")

    try:
        payment = PaymentTransaction.objects.select_related("tariff", "user").get(pk=order_id)
    except (PaymentTransaction.DoesNotExist, ValueError, TypeError):
        return Response({"error": _ORDER_NOT_FOUND, "id": req_id}, status=200)

    # Amount tekshiruv (tiyinda)
    if "amount" in params:
        expected = int(Decimal(payment.amount) * 100)
        if int(params["amount"]) != expected:
            return Response({"error": _WRONG_AMOUNT, "id": req_id}, status=200)

    if method == "CheckPerformTransaction":
        return Response({"result": {"allow": True}, "id": req_id}, status=200)

    if method == "CreateTransaction":
        payment.external_id = params.get("id")
        payment.save(update_fields=["external_id", "updated_at"])
        return Response({
            "result": {
                "create_time": int(timezone.now().timestamp() * 1000),
                "transaction": str(payment.id),
                "state": 1,
            },
            "id": req_id,
        }, status=200)

    if method == "PerformTransaction":
        _activate_subscription(payment)
        return Response({
            "result": {
                "transaction": str(payment.id),
                "perform_time": int((payment.verified_at or timezone.now()).timestamp() * 1000),
                "state": 2,
            },
            "id": req_id,
        }, status=200)

    if method == "CancelTransaction":
        payment.status = PaymentStatus.FAILED
        payment.save(update_fields=["status", "updated_at"])
        return Response({
            "result": {
                "transaction": str(payment.id),
                "cancel_time": int(timezone.now().timestamp() * 1000),
                "state": -1,
            },
            "id": req_id,
        }, status=200)

    if method == "CheckTransaction":
        state = 2 if payment.status == PaymentStatus.SUCCESS else 1
        return Response({
            "result": {
                "transaction": str(payment.id),
                "state": state,
                "create_time": int(payment.created_at.timestamp() * 1000),
                "perform_time": int((payment.verified_at or payment.created_at).timestamp() * 1000),
                "cancel_time": 0,
                "reason": None,
            },
            "id": req_id,
        }, status=200)

    if method == "GetStatement":
        return Response({"result": {"transactions": []}, "id": req_id}, status=200)

    return Response({
        "error": {"code": -32601, "message": "Method not found"},
        "id": req_id,
    }, status=200)
