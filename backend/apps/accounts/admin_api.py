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

        # ── Daromad (PaymentTransaction.SUCCESS bo'yicha) ─────────────
        revenue_total = 0.0
        revenue_month = 0.0
        revenue_today = 0.0
        success_payments = 0
        try:
            from django.db.models import Sum
            from apps.payments.models import PaymentStatus, PaymentTransaction

            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            qs = PaymentTransaction.objects.filter(status=PaymentStatus.SUCCESS)

            revenue_total = float(qs.aggregate(s=Sum("amount"))["s"] or 0)
            revenue_month = float(
                qs.filter(created_at__gte=month_start).aggregate(s=Sum("amount"))["s"] or 0
            )
            revenue_today = float(
                qs.filter(created_at__gte=today_start).aggregate(s=Sum("amount"))["s"] or 0
            )
            success_payments = qs.count()
        except Exception:
            pass

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
            "revenue": {
                "total": revenue_total,
                "month": revenue_month,
                "today": revenue_today,
                "success_payments": success_payments,
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

        # ── Daromadga qo'shish: admin_manual PaymentTransaction yaratamiz ──
        revenue_added = 0.0
        try:
            from apps.payments.models import PaymentStatus, PaymentTransaction
            PaymentTransaction.objects.create(
                user=user,
                tariff=tariff,
                amount=tariff.price,
                provider="admin_manual",
                status=PaymentStatus.SUCCESS,
                external_id=f"admin_api_{sub.id}_{int(now.timestamp())}",
                verified_at=now,
            )
            revenue_added = float(tariff.price or 0)
        except Exception:
            pass

        # ── Foydalanuvchiga nano koin ham beramiz (real to'lovdagi kabi) ──
        try:
            from apps.accounts.models import TOKENS_PER_NANO_COIN
            nano_to_add = getattr(tariff, "nano_coins_included", 0) or 0
            if nano_to_add > 0:
                tokens_to_add = nano_to_add * TOKENS_PER_NANO_COIN
                user.tokens_balance = (user.tokens_balance or 0) + tokens_to_add
                user.nano_coins_last_used_at = now
                user.save(update_fields=["tokens_balance", "nano_coins_last_used_at"])
        except Exception:
            pass

        return Response({
            "ok": True,
            "message": (
                f"{user.email} ga '{tariff.name}' obunasi {days} kunga berildi. "
                f"Daromad: +{revenue_added:,.0f} so'm"
            ),
            "revenue_added": revenue_added,
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


# ── Projects (user saytlari) ───────────────────────────────────────

def _schema_summary(schema):
    if not isinstance(schema, dict):
        return {"page_count": 0, "section_count": 0}
    pages = schema.get("pages") or []
    sections = 0
    for p in pages:
        if isinstance(p, dict):
            secs = p.get("sections") or []
            if isinstance(secs, list):
                sections += len(secs)
    return {"page_count": len(pages) if isinstance(pages, list) else 0, "section_count": sections}


class AdminProjectsView(APIView):
    """Barcha foydalanuvchi loyihalari ro'yxati (qidiruv + filtr)."""
    permission_classes = [IsAdminUser]

    def get(self, request):
        from django.db.models import Q

        qs = WebsiteProject.objects.select_related("user").order_by("-created_at")

        search = (request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(title__icontains=search)
                | Q(slug__icontains=search)
                | Q(user__email__icontains=search)
                | Q(user__username__icontains=search)
            )

        status_f = (request.query_params.get("status") or "").strip().upper()
        if status_f in {"COMPLETED", "FAILED", "GENERATING", "IDLE"}:
            qs = qs.filter(status=status_f)

        published = request.query_params.get("published")
        if published == "true":
            qs = qs.filter(is_published=True)
        elif published == "false":
            qs = qs.filter(is_published=False)

        active = request.query_params.get("active")
        if active == "true":
            qs = qs.filter(is_active=True)
        elif active == "false":
            qs = qs.filter(is_active=False)

        try:
            limit = max(1, min(int(request.query_params.get("limit", 50)), 200))
        except (TypeError, ValueError):
            limit = 50
        try:
            offset = max(0, int(request.query_params.get("offset", 0)))
        except (TypeError, ValueError):
            offset = 0

        total = qs.count()
        rows = qs[offset:offset + limit]

        items = []
        for p in rows:
            summary = _schema_summary(p.schema_data)
            items.append({
                "id": str(p.id),
                "title": p.title,
                "slug": p.slug,
                "language": p.language,
                "status": p.status,
                "is_published": p.is_published,
                "is_active": p.is_active,
                "view_count": p.view_count,
                "page_count": summary["page_count"],
                "section_count": summary["section_count"],
                "created_at": p.created_at.isoformat(),
                "updated_at": p.updated_at.isoformat(),
                "published_at": p.published_at.isoformat() if p.published_at else None,
                "user": {
                    "id": p.user.id,
                    "email": p.user.email,
                    "username": getattr(p.user, "username", "") or "",
                },
            })

        return Response({
            "total": total,
            "limit": limit,
            "offset": offset,
            "items": items,
        })


class AdminProjectDetailView(APIView):
    """Bitta loyiha haqida batafsil + tahrir/aktiv/o'chirish."""
    permission_classes = [IsAdminUser]

    def _get(self, project_id):
        try:
            return WebsiteProject.objects.select_related("user").get(id=project_id)
        except WebsiteProject.DoesNotExist:
            return None

    def get(self, request, project_id):
        p = self._get(project_id)
        if not p:
            return Response({"error": "Topilmadi"}, status=404)
        summary = _schema_summary(p.schema_data)
        return Response({
            "id": str(p.id),
            "title": p.title,
            "slug": p.slug,
            "prompt": p.prompt,
            "language": p.language,
            "status": p.status,
            "is_published": p.is_published,
            "is_active": p.is_active,
            "hosted_on_platform": p.hosted_on_platform,
            "view_count": p.view_count,
            "schema_data": p.schema_data,
            "page_count": summary["page_count"],
            "section_count": summary["section_count"],
            "created_at": p.created_at.isoformat(),
            "updated_at": p.updated_at.isoformat(),
            "published_at": p.published_at.isoformat() if p.published_at else None,
            "user": {
                "id": p.user.id,
                "email": p.user.email,
                "username": getattr(p.user, "username", "") or "",
            },
        })

    def patch(self, request, project_id):
        p = self._get(project_id)
        if not p:
            return Response({"error": "Topilmadi"}, status=404)
        updated = []
        if "title" in request.data:
            p.title = str(request.data["title"])[:200]
            updated.append("title")
        if "is_active" in request.data:
            p.is_active = bool(request.data["is_active"])
            updated.append("is_active")
        if "is_published" in request.data:
            new_val = bool(request.data["is_published"])
            if new_val and not p.is_published:
                p.published_at = timezone.now()
                updated.append("published_at")
            p.is_published = new_val
            updated.append("is_published")
        if "schema_data" in request.data:
            schema = request.data.get("schema_data")
            if isinstance(schema, dict):
                p.schema_data = schema
                updated.append("schema_data")
        if updated:
            updated.append("updated_at")
            p.save(update_fields=updated)
        return Response({"ok": True, "updated": updated})

    def delete(self, request, project_id):
        p = self._get(project_id)
        if not p:
            return Response({"error": "Topilmadi"}, status=404)
        title = p.title
        p.delete()
        return Response({"ok": True, "message": f"'{title}' o'chirildi."})
