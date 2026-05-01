from datetime import timedelta

from django.contrib import admin, messages
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import action as unfold_action

from .models import Subscription, SubscriptionStatus, Tariff
from .services import SubscriptionService


# ── Tarif ──────────────────────────────────────────────────────────

@admin.register(Tariff)
class TariffAdmin(ModelAdmin):
    list_display = [
        "name", "price_display", "nano_coins_display", "duration_days",
        "max_sites_per_month", "projects_limit", "ai_generations_limit",
        "is_active", "subscribers_count",
    ]
    list_editable = ["is_active"]
    search_fields = ["name"]
    ordering = ["price"]
    fieldsets = (
        ("Asosiy", {
            "fields": ("name", "description", "price", "duration_days", "is_active"),
        }),
        ("💎 Nano koin (AI kod uchun)", {
            "fields": ("nano_coins_included",),
            "description": "To'lov muvaffaqiyatli tasdiqlangandan so'ng foydalanuvchiga BIR YO‘LA "
                           "beriladigan umumiy nano koin miqdori. "
                           "Misol: bu yerga 5000 yozsangiz, user 5 000 nano koin oladi. "
                           "1 chat xabar (AI kod yaratish) = 500 nano koin.",
        }),
        ("📊 Sayt limitlari", {
            "fields": (
                "max_sites_per_month",     # oyiga nechta yangi sayt
                "projects_limit",           # bir vaqtda nechta faol sayt
                "max_active_sites",         # alternativ override (0 = projects_limit)
                "pages_per_project_limit",  # bir loyihada sahifalar
                "ai_generations_limit",
            ),
            "description": "<b>max_sites_per_month</b> — har oy yaratilishi mumkin bo'lgan saytlar (0 = cheksiz).<br>"
                           "<b>projects_limit</b> — bir vaqtning o'zida faol bo'lgan saytlar.<br>"
                           "<b>max_active_sites</b> — 0 bo'lsa projects_limit ishlatiladi.",
        }),
        ("🌐 Hosting/storage (metadata)", {
            "fields": ("storage_limit_mb", "traffic_limit_gb"),
            "classes": ("collapse",),
        }),
    )

    def price_display(self, obj):
        try:
            price_str = f"{float(obj.price or 0):,.0f}"
        except Exception:
            price_str = str(obj.price or 0)
        return format_html("<b>{} so'm</b>", price_str)
    price_display.short_description = "Narxi"
    price_display.admin_order_field = "price"

    def nano_coins_display(self, obj):
        nano = obj.nano_coins_included or 0
        if nano == 0:
            return format_html('<span style="color:#6b7280">—</span>')
        return format_html(
            '<span style="color:#f59e0b;font-weight:700">{}</span>',
            f"{nano:,} nano",
        )
    nano_coins_display.short_description = "Oyiga nano"
    nano_coins_display.admin_order_field = "nano_coins_included"

    def subscribers_count(self, obj):
        try:
            count = Subscription.objects.filter(
                tariff=obj, status=SubscriptionStatus.ACTIVE,
            ).count()
        except Exception:
            count = 0
        return format_html(
            '<span style="color:#22c55e;font-weight:bold">{} faol</span>', count
        )
    subscribers_count.short_description = "Faol obunalar"


# ── Obuna ──────────────────────────────────────────────────────────

@admin.register(Subscription)
class SubscriptionAdmin(ModelAdmin):
    list_display = [
        "user_email", "tariff", "status_badge",
        "sites_usage_display", "start_date", "end_date",
        "days_left", "is_valid_display",
    ]
    list_filter = ["status", "tariff"]
    search_fields = ["user__email", "user__full_name"]
    raw_id_fields = ["user"]
    list_select_related = ["user", "tariff"]
    ordering = ["-created_at"]
    readonly_fields = [
        "created_at", "updated_at",
        "projects_created", "generations_used",
        "sites_remaining_display",
    ]
    fields = [
        "user", "tariff", "status", "start_date", "end_date",
        "sites_created_this_month", "month_reset_date",
        "sites_remaining_display",
        "projects_created", "generations_used",
        "created_at", "updated_at",
    ]

    # Admin panelda foydalanuvchiga obuna berish tugmasi
    actions = ["extend_30_days", "cancel_subscriptions", "reset_monthly_counter"]

    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = "Foydalanuvchi"
    user_email.admin_order_field = "user__email"

    def status_badge(self, obj):
        colors = {
            "ACTIVE": "#22c55e",
            "EXPIRED": "#ef4444",
            "CANCELED": "#6b7280",
        }
        color = colors.get(obj.status, "#6b7280")
        return format_html(
            '<span style="background:{};color:#fff;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600">{}</span>',
            color, obj.get_status_display(),
        )
    status_badge.short_description = "Holat"

    def days_left(self, obj):
        if obj.status != SubscriptionStatus.ACTIVE:
            return "—"
        delta = obj.end_date - timezone.now()
        days = delta.days
        if days < 0:
            return format_html('<span style="color:#ef4444">Muddati o\'tgan</span>')
        color = "#22c55e" if days > 7 else "#f59e0b"
        return format_html('<span style="color:{}">{} kun</span>', color, days)
    days_left.short_description = "Qolgan kun"

    def is_valid_display(self, obj):
        ok = obj.is_valid()
        icon = "✅" if ok else "❌"
        return icon
    is_valid_display.short_description = "Faolmi?"
    is_valid_display.boolean = True

    def sites_usage_display(self, obj):
        cap = obj.tariff.max_sites_per_month
        used = obj.sites_created_this_month
        if cap == 0:
            return format_html('<span style="color:#22c55e">{} / ∞</span>', used)
        color = "#22c55e" if used < cap else "#ef4444"
        return format_html(
            '<span style="color:{};font-weight:600">{} / {}</span>', color, used, cap,
        )
    sites_usage_display.short_description = "Bu oy saytlar"

    def sites_remaining_display(self, obj):
        rem = obj.sites_remaining
        if rem == -1:
            return "♾ Cheksiz"
        return f"{rem} ta qoldi"
    sites_remaining_display.short_description = "Qolgan limit"

    @admin.action(description="30 kunlik uzaytirish (+ daromad)")
    def extend_30_days(self, request, queryset):
        from apps.payments.models import PaymentTransaction, PaymentStatus
        count = 0
        total_revenue = 0
        for sub in queryset:
            sub.end_date = sub.end_date + timedelta(days=30)
            sub.status = SubscriptionStatus.ACTIVE
            sub.save(update_fields=["end_date", "status", "updated_at"])
            # Uzaytirish ham daromad — payment yozamiz
            try:
                PaymentTransaction.objects.create(
                    user=sub.user,
                    tariff=sub.tariff,
                    amount=sub.tariff.price,
                    provider="admin_manual",
                    status=PaymentStatus.SUCCESS,
                    external_id=f"admin_extend_{sub.id}_{int(timezone.now().timestamp())}",
                    verified_at=timezone.now(),
                )
                total_revenue += float(sub.tariff.price)
            except Exception:
                pass
            count += 1
        self.message_user(
            request,
            f"{count} ta obuna 30 kunga uzaytirildi. Daromad: +{total_revenue:,.0f} so'm",
            messages.SUCCESS,
        )

    @admin.action(description="Bekor qilish")
    def cancel_subscriptions(self, request, queryset):
        count = queryset.update(status=SubscriptionStatus.CANCELED)
        self.message_user(request, f"{count} ta obuna bekor qilindi.", messages.WARNING)

    @admin.action(description="🔄 Oylik sayt limitini qo'lda reset qilish")
    def reset_monthly_counter(self, request, queryset):
        today = timezone.now().date()
        count = queryset.update(
            sites_created_this_month=0,
            month_reset_date=today + timedelta(days=30),
        )
        self.message_user(
            request,
            f"{count} ta obunada oylik sayt counter 0 ga reset qilindi.",
            messages.SUCCESS,
        )

    def save_model(self, request, obj, form, change):
        """
        Admin paneldan QO'LDA tarif berish.

        Yangi ACTIVE obuna uchun yagona helper `activate_for_payment`'ni
        chaqiramiz — u nano koin grant + sayt qayta-aktivatsiya +
        PaymentTransaction(provider='admin_manual') yozishni xuddi haqiqiy
        webhook bilan bir xilda bajaradi (DRY). Bu helper o'zi yangi
        Subscription yaratadi, shuning uchun admin form'idagi `obj`'ni
        SAQLAMAYMIZ — aks holda dublikat obuna chiqadi.

        Tahrirlash (change=True) yoki ACTIVE bo'lmagan holatlar uchun —
        oddiy save: end_date avtomatik hisoblanadi.
        """
        is_new_active_grant = (
            not change
            and obj.status == SubscriptionStatus.ACTIVE
            and obj.tariff_id
            and obj.user_id
        )

        if not is_new_active_grant:
            # Tahrirlash yoki noaktif holat — end_date'ni avtomatik hisoblaymiz
            if (not change) or "tariff" in form.changed_data or "start_date" in form.changed_data:
                if obj.tariff_id and not form.cleaned_data.get("end_date"):
                    obj.end_date = obj.start_date + timedelta(days=obj.tariff.duration_days)
            super().save_model(request, obj, form, change)
            return

        # Yangi ACTIVE grant → yagona helper orqali (haqiqiy to'lovdek)
        try:
            from apps.payments.models import PaymentTransaction, PaymentStatus
            from .services import activate_for_payment

            payment = PaymentTransaction.objects.create(
                user=obj.user,
                tariff=obj.tariff,
                amount=obj.tariff.price,
                provider="admin_manual",
                status=PaymentStatus.PENDING,
                external_id=f"admin_{int(timezone.now().timestamp())}",
            )
            sub = activate_for_payment(payment)

            # Form'dagi `obj`'ni o'rniga helper yaratgan `sub`'ni qaytaramiz
            # (aks holda admin redirect ID si noto'g'ri bo'ladi)
            obj.pk = sub.pk
            obj.id = sub.id
            obj.start_date = sub.start_date
            obj.end_date = sub.end_date
            obj.status = sub.status

            self.message_user(
                request,
                f"✅ «{obj.tariff.name}» obunasi {obj.user.email} uchun "
                f"faollashtirildi: +{obj.tariff.nano_coins_included or 0:,} nano koin, "
                f"+{obj.tariff.price:,.0f} so'm daromad.",
                messages.SUCCESS,
            )
        except Exception as exc:  # noqa: BLE001
            self.message_user(
                request,
                f"⚠️ Obuna aktivatsiyasi xato: {exc}",
                messages.ERROR,
            )
            # Fallback — kamida obuna yozuvini saqlaymiz
            if obj.tariff_id and not obj.end_date:
                obj.end_date = obj.start_date + timedelta(days=obj.tariff.duration_days)
            super().save_model(request, obj, form, change)
