import logging
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from .models import Subscription, SubscriptionStatus, Tariff

logger = logging.getLogger(__name__)


# ════════════════════════════════════════════════════════════════════════
# Yagona obuna aktivatsiyasi — har qanday to'lov manbai uchun (Payme/Click/
# Paynet/WLCM webhook + admin manual + SMS-mock). DRY: nano koin grant,
# obuna sanalari, sayt qayta-aktivatsiya, PaymentTransaction holati —
# barchasi shu yerda yagona joyda. Avval har bir gateway o'zicha
# qiluvchidi → endi shu helper chaqiriladi.
# ════════════════════════════════════════════════════════════════════════


def activate_for_payment(payment) -> Subscription:
    """
    PaymentTransaction → ACTIVE Subscription + nano koin grant.

    Idempotent: payment.status == SUCCESS bo'lsa qayta ish bajarmaydi
    (faqat mavjud subscription'ni qaytaradi).

    Bajariladigan ishlar (atomik):
      1. User'ning ACTIVE obunalarini CANCELED qiladi
      2. Yangi Subscription(ACTIVE) yaratadi (start_date=now,
         end_date=now+tariff.duration_days, oylik counter reset)
      3. tariff.nano_coins_included × TOKENS_PER_NANO_COIN tokenni
         user.tokens_balance ga qo'shadi va nano_coins_last_used_at
         ni now() ga o'rnatadi (30-kunlik timer reset)
      4. Foydalanuvchining EXPIRED bo'lib qolgan saytlarini qayta
         ACTIVE qiladi (suspension_reason='') — agar SUSPENDED yoki
         ARCHIVED bo'lmasa
      5. payment.status = SUCCESS, verified_at = now
    """
    from apps.payments.models import PaymentStatus
    from apps.accounts.models import TOKENS_PER_NANO_COIN

    if payment.status == PaymentStatus.SUCCESS:
        # idempotent: ushbu payment uchun yaratilgan oxirgi ACTIVE obunani qaytaramiz
        existing = Subscription.objects.filter(
            user=payment.user,
            tariff=payment.tariff,
            status=SubscriptionStatus.ACTIVE,
        ).order_by("-start_date").first()
        if existing:
            return existing
        # status=SUCCESS lekin obuna yo'q — anomaly, davom etamiz va yaratamiz

    tariff = payment.tariff
    user = payment.user

    with transaction.atomic():
        # 1. Eski ACTIVE obunalarni yopish
        Subscription.objects.filter(
            user=user, status=SubscriptionStatus.ACTIVE,
        ).update(status=SubscriptionStatus.CANCELED)

        # 2. Yangi obuna
        now = timezone.now()
        # duration_days timedelta uchun xavfsiz oraliqda bo'lishi kerak
        # ("bepul" tarif kabilarida int64 max qiymat saqlanishi mumkin →
        # OverflowError beradi). Cheklaymiz: max 10 yil = 3650 kun.
        days = tariff.duration_days or 30
        if days <= 0 or days > 3650:
            days = 3650
        end = now + timedelta(days=days)
        sub = Subscription.objects.create(
            user=user,
            tariff=tariff,
            status=SubscriptionStatus.ACTIVE,
            start_date=now,
            end_date=end,
            sites_created_this_month=0,
            month_reset_date=now.date() + timedelta(days=30),
        )

        # 3. Nano koin grant (race-safe F() update — parallel webhook'larda ham to'g'ri)
        nano = tariff.nano_coins_included or 0
        tokens = nano * TOKENS_PER_NANO_COIN
        if tokens > 0:
            from django.db.models import F
            User = type(user)
            User.objects.filter(pk=user.pk).update(
                tokens_balance=F("tokens_balance") + tokens,
                nano_coins_last_used_at=now,  # 30-kunlik timer reset
            )
            user.refresh_from_db(fields=["tokens_balance", "nano_coins_last_used_at"])

        # 4. EXPIRED saytlarni qayta tiklash (SaaS soft-lock)
        try:
            from apps.website_projects.models import WebsiteProject, HostingStatus
            WebsiteProject.objects.filter(user=user).exclude(
                hosting_status__in=[HostingStatus.SUSPENDED, HostingStatus.ARCHIVED]
            ).update(
                hosting_status=HostingStatus.ACTIVE,
                hosting_expires_at=end,
                suspension_reason="",
                is_active=True,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("activate_for_payment: sayt aktivatsiyasi xato: %s", exc)

        # 5. Payment'ni SUCCESS qilish
        payment.status = PaymentStatus.SUCCESS
        payment.verified_at = now
        payment.save(update_fields=["status", "verified_at", "updated_at"])

    logger.info(
        "activate_for_payment: payment=%s user=%s tariff=%s nano+%d sub_id=%s",
        payment.id, user.id, tariff.id, nano, sub.id,
    )
    return sub


class SubscriptionService:
    @staticmethod
    @transaction.atomic
    def activate_subscription(user, tariff):
        """
        Activates a new subscription for a user.
        Closes any existing active subscriptions first and ALSO reactivates
        all of the user's previously created sites (sets is_active=True).
        """
        # 1. Close existing active subscriptions
        Subscription.objects.filter(
            user=user,
            status=SubscriptionStatus.ACTIVE,
        ).update(status=SubscriptionStatus.CANCELED)

        # 2. Calculate dates
        start_date = timezone.now()
        end_date = start_date + timedelta(days=tariff.duration_days)
        reset_date = start_date.date() + timedelta(days=30)

        # 3. Create new subscription (oylik counter resetlangan holda)
        subscription = Subscription.objects.create(
            user=user,
            tariff=tariff,
            status=SubscriptionStatus.ACTIVE,
            start_date=start_date,
            end_date=end_date,
            sites_created_this_month=0,
            month_reset_date=reset_date,
        )

        # 4. Foydalanuvchining oldin yaratgan saytlari (obuna tugaganda EXPIRED
        # bo'lib qolgan bo'lishi mumkin) — yangidan faollashtiramiz.
        # SaaS soft-lock: hosting_status = ACTIVE va expires_at = subscription end_date.
        try:
            from apps.website_projects.models import WebsiteProject, HostingStatus
            # SUSPENDED va ARCHIVED saytlarga tegmaymiz (admin yoki user qo'lda chiqaradi)
            WebsiteProject.objects.filter(user=user).exclude(
                hosting_status__in=[HostingStatus.SUSPENDED, HostingStatus.ARCHIVED]
            ).update(
                hosting_status=HostingStatus.ACTIVE,
                hosting_expires_at=end_date,
                suspension_reason='',
                is_active=True,  # backward compat
            )
        except Exception:
            pass

        return subscription

    @staticmethod
    def expire_user_sites(user):
        """
        Foydalanuvchi obunasi tugaganda chaqiriladi: barcha ACTIVE/TRIAL
        saytlarni EXPIRED qiladi (soft-lock). SUSPENDED/ARCHIVED tegmaydi.
        Cron yoki signal'dan chaqiriladi.
        """
        try:
            from apps.website_projects.models import WebsiteProject, HostingStatus
            WebsiteProject.objects.filter(
                user=user,
                hosting_status__in=[HostingStatus.ACTIVE, HostingStatus.TRIAL],
            ).update(
                hosting_status=HostingStatus.EXPIRED,
                suspension_reason='Obuna muddati tugagan',
            )
        except Exception:
            pass

    @staticmethod
    def check_user_limits(user, feature_name):
        """
        Checks if user has enough credits/limits for a feature.
        """
        active_sub = Subscription.objects.filter(
            user=user, 
            status=SubscriptionStatus.ACTIVE,
            end_date__gt=timezone.now()
        ).first()
        
        if not active_sub:
            return False, "No active subscription found."
            
        if feature_name == 'projects':
            if active_sub.projects_created >= active_sub.tariff.projects_limit:
                return False, "Project limit reached for your plan."
        
        if feature_name == 'ai_generation':
            if active_sub.generations_used >= active_sub.tariff.ai_generations_limit:
                return False, "AI generation limit reached for your plan."
                
        return True, ""
