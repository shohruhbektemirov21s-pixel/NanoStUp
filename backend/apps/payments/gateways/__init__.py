"""
To'lov tizimlari integratsiyasi (Uzbekistan).

Qo'llab-quvvatlanadigan provayderlar:
  - payme    — Payme / Paycom (JSON-RPC 2.0 webhook, Basic auth)
  - click    — Click.uz (GET/POST prepare + complete webhook, MD5 sign)
  - paynet   — Paynet.uz (SOAP yoki REST bilan integratsiya)
  - sms      — Ichki SMS-kod test rejimi (mock, ishlab chiqarishda ishlatilmaydi)

Har bir provider moduli ikki asosiy funksiya beradi:
  - build_checkout_url(payment)  -> str | None
        Foydalanuvchi yo'naltiriladigan to'lov sahifasi URL'i.
  - handle_webhook(request)      -> Response
        Provayderdan kelgan callback (to'lov holati) ni boshqarish.
"""
from typing import Dict, Callable

from . import click as click_gw
from . import paynet as paynet_gw
from . import payme as payme_gw
from . import wlcm as wlcm_gw


PROVIDERS: Dict[str, Dict[str, Callable]] = {
    "payme": {
        "build_checkout_url": payme_gw.build_checkout_url,
        "handle_webhook": payme_gw.handle_webhook,
        "label": "Payme",
    },
    "click": {
        "build_checkout_url": click_gw.build_checkout_url,
        "handle_webhook": click_gw.handle_webhook,
        "label": "Click",
    },
    "paynet": {
        "build_checkout_url": paynet_gw.build_checkout_url,
        "handle_webhook": paynet_gw.handle_webhook,
        "label": "Paynet",
    },
    # WLCM — agregator: bitta API orqali Payme/Click/Paylov/Uzum/Card
    # https://docs.wlcm.uz/
    "wlcm": {
        "build_checkout_url": wlcm_gw.build_checkout_url,
        "handle_webhook": wlcm_gw.handle_webhook,
        "label": "WLCM",
    },
}

__all__ = ["PROVIDERS", "payme_gw", "click_gw", "paynet_gw", "wlcm_gw"]
