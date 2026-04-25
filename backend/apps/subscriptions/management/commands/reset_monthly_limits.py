from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.subscriptions.models import Subscription, SubscriptionStatus

class Command(BaseCommand):
    help = "Resets the monthly sites creation counter for subscriptions whose month_reset_date has passed"

    def handle(self, *args, **options):
        today = timezone.now().date()
        # Find active subscriptions where month_reset_date is less than or equal to today
        subs = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            month_reset_date__lte=today
        )

        count = 0
        for sub in subs:
            if sub.maybe_reset_period():
                count += 1
        
        self.stdout.write(self.style.SUCCESS(f"Successfully reset monthly limits for {count} subscriptions."))
