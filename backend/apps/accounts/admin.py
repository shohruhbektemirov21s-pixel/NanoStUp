from datetime import timedelta

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import format_html
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
        "email", "full_name", "is_staff", "is_active",
        "subscription_badge", "date_joined",
    ]
    search_fields = ["email", "full_name"]
    ordering = ["-date_joined"]
    inlines = [SubscriptionInline]
    actions = ["grant_subscription_action"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Shaxsiy ma'lumot", {"fields": ("full_name", "role")}),
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

    def subscription_badge(self, obj):
        sub = obj.subscriptions.filter(status=SubscriptionStatus.ACTIVE).first()
        if not sub:
            return format_html('<span style="color:#6b7280;font-size:11px">Yo\'q</span>')
        days = (sub.end_date - timezone.now()).days
        color = "#22c55e" if days > 3 else "#f59e0b"
        return format_html(
            '<span style="color:{};font-weight:600;font-size:11px">{} · {} kun</span>',
            color, sub.tariff.name, max(days, 0),
        )
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
