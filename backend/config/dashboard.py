from django.utils.translation import gettext_lazy as _


def dashboard_callback(request, context):
    """Unfold admin dashboard uchun statistika."""
    try:
        from django.contrib.auth import get_user_model
        from apps.subscriptions.models import Subscription, SubscriptionStatus
        from apps.website_projects.models import WebsiteProject, ProjectStatus
        from django.utils import timezone

        User = get_user_model()

        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        active_subs = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gt=timezone.now(),
        ).count()
        total_projects = WebsiteProject.objects.count()
        completed_projects = WebsiteProject.objects.filter(status=ProjectStatus.COMPLETED).count()

        context.update({
            "kpi": [
                {
                    "title": _("Jami foydalanuvchilar"),
                    "metric": str(total_users),
                    "footer": f"Faol: {active_users}",
                },
                {
                    "title": _("Faol obunalar"),
                    "metric": str(active_subs),
                    "footer": f"Jami: {Subscription.objects.count()}",
                },
                {
                    "title": _("AI loyihalar"),
                    "metric": str(completed_projects),
                    "footer": f"Jami: {total_projects}",
                },
            ],
        })
    except Exception:
        pass

    return context
