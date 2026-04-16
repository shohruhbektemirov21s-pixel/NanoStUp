from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class Tariff(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(default=30)
    
    # Limits
    projects_limit = models.IntegerField(default=1)
    pages_per_project_limit = models.IntegerField(default=5)
    ai_generations_limit = models.IntegerField(default=10)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', _('Active')
    EXPIRED = 'EXPIRED', _('Expired')
    CANCELED = 'CANCELED', _('Canceled')

class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='subscriptions'
    )
    tariff = models.ForeignKey(Tariff, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=20, 
        choices=SubscriptionStatus.choices, 
        default=SubscriptionStatus.ACTIVE
    )
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    
    # Tracking usage
    projects_created = models.IntegerField(default=0)
    generations_used = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_valid(self):
        return self.status == SubscriptionStatus.ACTIVE and self.end_date > timezone.now()

    def __str__(self):
        return f"{self.user.email} - {self.tariff.name}"
