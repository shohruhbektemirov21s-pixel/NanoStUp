from datetime import timedelta

from django.contrib import admin
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin

from .models import PaymentTransaction, PaymentStatus


@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(ModelAdmin):
    list_display = [
        "id", "user_email", "tariff_name", "amount_display",
        "provider_badge", "status_badge", "created_at",
    ]
    list_filter = ["status", "provider", "tariff"]
    search_fields = ["user__email", "external_id", "phone"]
    readonly_fields = ["created_at", "updated_at", "verified_at"]
    list_select_related = ["user", "tariff"]
    ordering = ["-created_at"]
    list_per_page = 50

    # ── Display helpers ───────────────────────────────────────────
    def user_email(self, obj):
        return obj.user.email if obj.user_id else "—"
    user_email.short_description = "Foydalanuvchi"
    user_email.admin_order_field = "user__email"

    def tariff_name(self, obj):
        return obj.tariff.name if obj.tariff_id else "—"
    tariff_name.short_description = "Tarif"
    tariff_name.admin_order_field = "tariff__name"

    def amount_display(self, obj):
        amount_str = f"{float(obj.amount or 0):,.0f}"
        return format_html("<b>{}</b> so'm", amount_str)
    amount_display.short_description = "Summa"
    amount_display.admin_order_field = "amount"

    def provider_badge(self, obj):
        colors = {
            "admin_manual": "#8b5cf6",
            "payme": "#22c55e",
            "click": "#3b82f6",
            "paylov": "#f59e0b",
        }
        provider = obj.provider or "unknown"
        color = colors.get(provider, "#6b7280")
        label = "Admin" if provider == "admin_manual" else provider.upper()
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, label,
        )
    provider_badge.short_description = "Manba"

    def status_badge(self, obj):
        colors = {"SUCCESS": "#22c55e", "PENDING": "#f59e0b", "FAILED": "#ef4444"}
        color = colors.get(obj.status, "#6b7280")
        try:
            label = obj.get_status_display()
        except Exception:
            label = obj.status or "—"
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, label,
        )
    status_badge.short_description = "Holat"

    # ── Daromad summary message_user orqali ko'rsatamiz (template-siz) ──
    def changelist_view(self, request, extra_context=None):
        """List page'ga umumiy daromad summary'ni message orqali qo'shadi."""
        try:
            from django.contrib import messages as dj_messages
            qs = PaymentTransaction.objects.filter(status=PaymentStatus.SUCCESS)

            now = timezone.now()
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            total = qs.aggregate(s=Sum("amount"))["s"] or 0
            month = qs.filter(created_at__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
            today = qs.filter(created_at__gte=today_start).aggregate(s=Sum("amount"))["s"] or 0
            success_count = qs.count()

            # GET request bo'lsa message qo'shamiz (POST'da form-level message bo'ladi)
            if request.method == "GET" and success_count > 0:
                summary = (
                    f"💰 Jami daromad: {float(total):,.0f} so'm  •  "
                    f"📅 Bu oy: {float(month):,.0f} so'm  •  "
                    f"📍 Bugun: {float(today):,.0f} so'm  •  "
                    f"✅ {success_count} ta muvaffaqiyatli to'lov"
                )
                dj_messages.info(request, summary)
        except Exception:
            pass  # Summary xato bersa ham asosiy sahifa ishlasin
        return super().changelist_view(request, extra_context=extra_context)
