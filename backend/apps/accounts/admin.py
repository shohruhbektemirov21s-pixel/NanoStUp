from datetime import timedelta

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db import models
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin, TabularInline

from apps.subscriptions.models import Subscription, SubscriptionStatus, Tariff
from .models import User


# ── Inline obuna ───────────────────────────────────────────────────

class SubscriptionInline(TabularInline):
    model = Subscription
    extra = 0
    fields = ["tariff", "status", "start_date", "end_date"]
    readonly_fields = ["start_date", "created_at"]
    show_change_link = True
    ordering = ["-created_at"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("tariff")


# ── Foydalanuvchi admin ────────────────────────────────────────────

@admin.register(User)
class UserAdmin(ModelAdmin, BaseUserAdmin):
    list_display = [
        "email", "full_name", "balance_badge", "expiry_badge",
        "is_staff", "is_active", "subscription_badge", "date_joined",
    ]
    search_fields = ["email", "full_name"]
    ordering = ["-date_joined"]
    inlines = [SubscriptionInline]
    actions = ["grant_subscription_action", "top_up_tokens_action"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Shaxsiy ma'lumot", {"fields": ("full_name", "role")}),
        ("Balans", {
            "fields": ("tokens_balance", "nano_coins_last_used_at"),
            "description": "30 kun ishlatmasa nano koin avtomatik 0 ga tushadi.",
        }),
        ("Huquqlar", {
            "fields": (
                "is_active", "is_staff", "is_superuser",
                "groups", "user_permissions",
            )
        }),
        ("Muhim sanalar", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "full_name", "password1", "password2", "is_staff", "is_active"),
        }),
    )
    readonly_fields = ("last_login", "date_joined")
    filter_horizontal = ("groups", "user_permissions")

    def balance_badge(self, obj):
        # Real-time expire — agar 30 kundan ortiq bo'lsa 0 ko'rsatamiz
        try:
            tokens = obj.tokens_balance or 0
            nano = tokens // 10  # property emas — DB'dan to'g'ri o'qiymiz
            color = "#22c55e" if nano >= 1000 else "#f59e0b" if nano >= 300 else "#ef4444"
            nano_str = f"{nano:,}"
            return format_html(
                '<span style="color:{};font-weight:700;font-size:11px">💎 {} nano koin</span>',
                color, nano_str,
            )
        except Exception:
            return format_html('<span style="color:#6b7280">—</span>')
    balance_badge.short_description = "Balans"

    def expiry_badge(self, obj):
        """Nano koin foydalanmaslik holatini ko'rsatadi."""
        try:
            last_used = getattr(obj, "nano_coins_last_used_at", None)
            if not last_used or (obj.tokens_balance or 0) == 0:
                return format_html('<span style="color:#6b7280;font-size:10px">—</span>')
            from apps.accounts.models import NANO_COIN_EXPIRY_DAYS
            days_unused = (timezone.now() - last_used).days
            days_left = NANO_COIN_EXPIRY_DAYS - days_unused
            if days_left <= 0:
                return format_html(
                    '<span style="color:#ef4444;font-weight:600;font-size:10px">⏰ Muddati o\'tdi</span>'
                )
            if days_left <= 7:
                return format_html(
                    '<span style="color:#f59e0b;font-weight:600;font-size:10px">⚠️ {} kun qoldi</span>',
                    days_left,
                )
            return format_html(
                '<span style="color:#6b7280;font-size:10px">{} kun qoldi</span>',
                days_left,
            )
        except Exception:
            return format_html('<span style="color:#6b7280;font-size:10px">—</span>')
    expiry_badge.short_description = "Foydalanish muddati"

    @admin.action(description="+1 000 nano koin qo'shish (timer reset)")
    def top_up_tokens_action(self, request, queryset):
        from apps.accounts.models import TOKENS_PER_NANO_COIN
        tokens_per_user = 1_000 * TOKENS_PER_NANO_COIN  # 10 000 token
        count = queryset.update(
            tokens_balance=models.F("tokens_balance") + tokens_per_user,
            nano_coins_last_used_at=timezone.now(),
        )
        self.message_user(
            request,
            f"{count} ta foydalanuvchiga +1 000 nano koin qo'shildi.",
            messages.SUCCESS,
        )

    def subscription_badge(self, obj):
        try:
            sub = obj.subscriptions.filter(status=SubscriptionStatus.ACTIVE).first()
            if not sub or not sub.tariff_id:
                return mark_safe('<span style="color:#6b7280;font-size:11px">Yo\'q</span>')
            if not sub.end_date:
                days = 0
            else:
                days = (sub.end_date - timezone.now()).days
            color = "#22c55e" if days > 3 else "#f59e0b"
            tariff_name = sub.tariff.name if sub.tariff else "—"
            return format_html(
                '<span style="color:{};font-weight:600;font-size:11px">{} · {} kun</span>',
                color, tariff_name, max(days, 0),
            )
        except Exception:
            return mark_safe('<span style="color:#6b7280;font-size:11px">—</span>')
    subscription_badge.short_description = "Obuna"

    @admin.action(description="30 kunlik Pro obuna berish")
    def grant_subscription_action(self, request, queryset):
        tariff = Tariff.objects.filter(is_active=True).order_by("-price").first()
        if not tariff:
            self.message_user(request, "Faol tarif topilmadi. Avval tarif yarating.", messages.ERROR)
            return
        count = 0
        now = timezone.now()
        for user in queryset:
            Subscription.objects.filter(user=user, status=SubscriptionStatus.ACTIVE).update(
                status=SubscriptionStatus.CANCELED
            )
            Subscription.objects.create(
                user=user,
                tariff=tariff,
                status=SubscriptionStatus.ACTIVE,
                start_date=now,
                end_date=now + timedelta(days=30),
            )
            count += 1
        self.message_user(
            request,
            f"{count} ta foydalanuvchiga 30 kunlik '{tariff.name}' obunasi berildi.",
            messages.SUCCESS,
        )

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related("subscriptions__tariff")
