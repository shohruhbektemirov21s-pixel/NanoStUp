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

        # 4. Foydalanuvchining oldin yaratgan saytlari (obuna tugaganda is_active=False
        # bo'lib qolgan bo'lishi mumkin) — yangidan faollashtiramiz.
        try:
            from apps.website_projects.models import WebsiteProject
            WebsiteProject.objects.filter(user=user, is_active=False).update(is_active=True)
        except Exception:
            pass

        return subscription

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
