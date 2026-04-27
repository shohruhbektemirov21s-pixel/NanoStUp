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
        return format_html("<b>{:,.0f}</b> so'm", float(obj.amount or 0))
    amount_display.short_description = "Summa"
    amount_display.admin_order_field = "amount"

    def provider_badge(self, obj):
        colors = {
            "admin_manual": "#8b5cf6",
            "payme": "#22c55e",
            "click": "#3b82f6",
            "paylov": "#f59e0b",
        }
        color = colors.get(obj.provider, "#6b7280")
        label = "👨‍💼 Admin" if obj.provider == "admin_manual" else obj.provider.upper()
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, label,
        )
    provider_badge.short_description = "Manba"

    def status_badge(self, obj):
        colors = {"SUCCESS": "#22c55e", "PENDING": "#f59e0b", "FAILED": "#ef4444"}
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;'
            'border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = "Holat"

    # ── Daromad summary changelist ustida ─────────────────────────
    def changelist_view(self, request, extra_context=None):
        """List page tepasiga umumiy daromad statistikasini qo'shadi."""
        qs = PaymentTransaction.objects.filter(status=PaymentStatus.SUCCESS)

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        last_30_start = now - timedelta(days=30)

        total = qs.aggregate(s=Sum("amount"))["s"] or 0
        month = qs.filter(created_at__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
        today = qs.filter(created_at__gte=today_start).aggregate(s=Sum("amount"))["s"] or 0
        last_30 = qs.filter(created_at__gte=last_30_start).aggregate(s=Sum("amount"))["s"] or 0

        # Provider bo'yicha breakdown
        by_provider = (
            qs.values("provider")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        # Eng ko'p sotilgan tarif
        top_tariff = (
            qs.values("tariff__name")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
            .first()
        )

        extra_context = extra_context or {}
        extra_context["revenue_summary"] = {
            "total": total,
            "month": month,
            "today": today,
            "last_30": last_30,
            "by_provider": list(by_provider),
            "top_tariff": top_tariff,
            "successful_count": qs.count(),
        }
        return super().changelist_view(request, extra_context=extra_context)
