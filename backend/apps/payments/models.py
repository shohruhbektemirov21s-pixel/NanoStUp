from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from apps.subscriptions.models import Tariff

class PaymentStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    SUCCESS = 'SUCCESS', _('Success')
    FAILED = 'FAILED', _('Failed')

class PaymentTransaction(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    tariff = models.ForeignKey(Tariff, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    provider = models.CharField(max_length=50, default='payme')
    external_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    
    status = models.CharField(
        max_length=20, 
        choices=PaymentStatus.choices, 
        default=PaymentStatus.PENDING
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.id} - {self.user.email} - {self.status}"
