from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import PaymentTransaction

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(ModelAdmin):
    list_display = ["id", "user", "amount", "provider", "status", "created_at"]
    list_filter = ["status", "provider"]
    search_fields = ["user__email", "external_id"]
    readonly_fields = ["created_at", "updated_at"]
    
    # Custom color markers for status (supported by Unfold)
    def get_status_color(self, obj):
        if obj.status == "SUCCESS":
            return "success"
        if obj.status == "PENDING":
            return "warning"
        return "danger"
