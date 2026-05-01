from django.urls import path

from .views import (
    create_checkout,
    initiate_payment,
    payment_status,
    resend_sms,
    verify_payment,
    webhook_click,
    webhook_payme,
    webhook_paynet,
    webhook_wlcm,
)

urlpatterns = [
    # Real to'lov (Payme / Click / Paynet / WLCM)
    path("checkout/", create_checkout, name="payment-checkout"),
    path("webhook/payme/", webhook_payme, name="payment-webhook-payme"),
    path("webhook/click/", webhook_click, name="payment-webhook-click"),
    path("webhook/paynet/", webhook_paynet, name="payment-webhook-paynet"),
    path("webhook/wlcm/", webhook_wlcm, name="payment-webhook-wlcm"),

    # SMS-mock (test rejimi)
    path("initiate/", initiate_payment, name="payment-initiate"),
    path("verify/", verify_payment, name="payment-verify"),
    path("resend/", resend_sms, name="payment-resend"),
    path("<int:payment_id>/status/", payment_status, name="payment-status"),
]
