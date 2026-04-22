from django.urls import path

from .views import initiate_payment, payment_status, resend_sms, verify_payment

urlpatterns = [
    path("initiate/", initiate_payment, name="payment-initiate"),
    path("verify/", verify_payment, name="payment-verify"),
    path("resend/", resend_sms, name="payment-resend"),
    path("<int:payment_id>/status/", payment_status, name="payment-status"),
]
