"""
Custom admin REST API — Next.js admin panel uchun.
Faqat is_staff=True foydalanuvchilar kirishi mumkin.
"""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.subscriptions.models import Subscription, SubscriptionStatus, Tariff
from apps.website_projects.models import ProjectStatus, WebsiteProject

User = get_user_model()


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


# ── Dashboard stats ────────────────────────────────────────────────

class AdminStatsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        new_today = User.objects.filter(date_joined__date=now.date()).count()
        new_week = User.objects.filter(date_joined__gte=now - timedelta(days=7)).count()

        total_subs = Subscription.objects.count()
        active_subs = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE, end_date__gt=now
        ).count()

        total_projects = WebsiteProject.objects.count()
        completed = WebsiteProject.objects.filter(status=ProjectStatus.COMPLETED).count()
        today_projects = WebsiteProject.objects.filter(created_at__date=now.date()).count()

        return Response({
            "users": {
                "total": total_users,
                "active": active_users,
                "new_today": new_today,
                "new_week": new_week,
            },
            "subscriptions": {
                "total": total_subs,
                "active": active_subs,
            },
            "projects": {
                "total": total_projects,
                "completed": completed,
                "today": today_projects,
            },
        })


# ── Users ──────────────────────────────────────────────────────────

class AdminUsersView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        search = request.query_params.get("search", "").strip()
        qs = User.objects.prefetch_related("subscriptions__tariff").order_by("-date_joined")
        if search:
            qs = qs.filter(email__icontains=search) | qs.filter(full_name__icontains=search)
            qs = qs.distinct()

        now = timezone.now()
        data = []
        for u in qs[:100]:
            sub = u.subscriptions.filter(status=SubscriptionStatus.ACTIVE).order_by("-end_date").first()
            data.append({
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name or "—",
                "is_active": u.is_active,
                "is_staff": u.is_staff,
                "date_joined": u.date_joined.strftime("%d.%m.%Y %H:%M"),
                "subscription": {
                    "name": sub.tariff.name if sub else None,
                    "days_left": (sub.end_date - now).days if sub else None,
                    "status": sub.status if sub else None,
                } if sub else None,
            })
        return Response(data)


class AdminGrantSubscriptionView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        tariff_id = request.data.get("tariff_id")
        days = int(request.data.get("days", 30))

        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "Foydalanuvchi topilmadi"}, status=404)

        try:
            tariff = Tariff.objects.get(id=tariff_id, is_active=True)
        except Tariff.DoesNotExist:
            return Response({"error": "Tarif topilmadi"}, status=404)

        now = timezone.now()
        Subscription.objects.filter(user=user, status=SubscriptionStatus.ACTIVE).update(
            status=SubscriptionStatus.CANCELED
        )
        sub = Subscription.objects.create(
            user=user,
            tariff=tariff,
            status=SubscriptionStatus.ACTIVE,
            start_date=now,
            end_date=now + timedelta(days=days),
        )
        return Response({
            "ok": True,
            "message": f"{user.email} ga '{tariff.name}' obunasi {days} kunga berildi.",
        })


class AdminToggleUserView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, user_id):
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"error": "Topilmadi"}, status=404)
        if user == request.user:
            return Response({"error": "O'zingizni o'chira olmaysiz"}, status=400)
        user.is_active = not user.is_active
        user.save(update_fields=["is_active"])
        state = "faollashtirildi" if user.is_active else "bloklandi"
        return Response({"ok": True, "is_active": user.is_active, "message": f"{user.email} {state}."})


# ── Tariffs ────────────────────────────────────────────────────────

class AdminTariffsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        tariffs = Tariff.objects.all().order_by("price")
        data = []
        for t in tariffs:
            active_subs = Subscription.objects.filter(
                tariff=t, status=SubscriptionStatus.ACTIVE
            ).count()
            data.append({
                "id": t.id,
                "name": t.name,
                "description": t.description,
                "price": str(t.price),
                "duration_days": t.duration_days,
                "projects_limit": t.projects_limit,
                "ai_generations_limit": t.ai_generations_limit,
                "is_active": t.is_active,
                "active_subscribers": active_subs,
            })
        return Response(data)

    def post(self, request):
        name = request.data.get("name", "").strip()
        if not name:
            return Response({"error": "Nom kiritilishi shart"}, status=400)
        t = Tariff.objects.create(
            name=name,
            description=request.data.get("description", ""),
            price=request.data.get("price", 0),
            duration_days=int(request.data.get("duration_days", 30)),
            projects_limit=int(request.data.get("projects_limit", 5)),
            pages_per_project_limit=int(request.data.get("pages_per_project_limit", 10)),
            ai_generations_limit=int(request.data.get("ai_generations_limit", 50)),
            is_active=True,
        )
        return Response({"ok": True, "id": t.id, "name": t.name})


class AdminTariffDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, tariff_id):
        try:
            t = Tariff.objects.get(id=tariff_id)
        except Tariff.DoesNotExist:
            return Response({"error": "Topilmadi"}, status=404)
        fields = ["name", "description", "price", "duration_days",
                  "projects_limit", "ai_generations_limit", "is_active"]
        updated = []
        for field in fields:
            if field in request.data:
                val = request.data[field]
                if field in ("duration_days", "projects_limit", "ai_generations_limit"):
                    val = int(val)
                setattr(t, field, val)
                updated.append(field)
        if updated:
            t.save(update_fields=updated)
        return Response({"ok": True, "message": f"'{t.name}' yangilandi."})

    def delete(self, request, tariff_id):
        try:
            t = Tariff.objects.get(id=tariff_id)
        except Tariff.DoesNotExist:
            return Response({"error": "Topilmadi"}, status=404)
        active = Subscription.objects.filter(tariff=t, status=SubscriptionStatus.ACTIVE).count()
        if active > 0:
            return Response({"error": f"{active} ta faol obuna bor, o'chirib bo'lmaydi."}, status=400)
        t.delete()
        return Response({"ok": True})
