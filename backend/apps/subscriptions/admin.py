from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Tariff, Subscription

@admin.register(Tariff)
class TariffAdmin(ModelAdmin):
    list_display = ["name", "price", "duration_days", "ai_generations_limit", "is_active"]
    list_editable = ["is_active"]

@admin.register(Subscription)
class SubscriptionAdmin(ModelAdmin):
    list_display = ["user", "tariff", "status", "end_date", "is_valid_status"]
    list_filter = ["status", "tariff"]
    search_fields = ["user__email", "user__full_name"]
    
    def is_valid_status(self, obj):
        return obj.is_valid()
    is_valid_status.boolean = True
    is_valid_status.short_description = "Is Valid"
