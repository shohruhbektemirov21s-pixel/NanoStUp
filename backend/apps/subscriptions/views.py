from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Tariff, Subscription
from .serializers import TariffSerializer, SubscriptionSerializer

class TariffViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tariff.objects.filter(is_active=True)
    serializer_class = TariffSerializer
    permission_classes = [permissions.AllowAny]

class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        sub = self.get_queryset().filter(status='ACTIVE').first()
        if sub:
            return Response(SubscriptionSerializer(sub).data)
        return Response({"detail": "No active subscription"}, status=status.HTTP_404_NOT_FOUND)
