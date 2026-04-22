from django.utils import timezone
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Subscription, SubscriptionStatus, Tariff
from .serializers import SubscriptionSerializer, TariffSerializer


class TariffViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tariff.objects.filter(is_active=True)
    serializer_class = TariffSerializer
    permission_classes = [permissions.AllowAny]

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def purchase(self, request, pk=None):
        """
        ESKI ENDPOINT — bloklangan.
        Foydalanuvchi endi `/api/payments/initiate/` orqali karta + SMS
        tasdig'idan o'tishi kerak. To'liq nano koin faqat to'lov muvaffaqiyatli
        tasdiqlangandan so'ng beriladi.
        """
        return Response(
            {
                "error": (
                    "Bu endpoint o'chirilgan. Iltimos, /checkout/<tariff_id>/ "
                    "sahifasi orqali karta va SMS tasdig'idan o'ting."
                ),
                "redirect": f"/checkout/{pk}",
            },
            status=status.HTTP_410_GONE,
        )


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"])
    def current(self, request):
        sub = self.get_queryset().filter(
            status=SubscriptionStatus.ACTIVE,
            end_date__gt=timezone.now(),
        ).first()
        if sub:
            return Response(SubscriptionSerializer(sub).data)
        return Response({"detail": "No active subscription"}, status=status.HTTP_404_NOT_FOUND)
