from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import Subscription, SubscriptionStatus, Tariff
from django.core.exceptions import ValidationError

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
