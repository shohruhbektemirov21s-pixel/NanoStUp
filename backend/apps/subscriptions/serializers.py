from rest_framework import serializers
from .models import Tariff, Subscription

class TariffSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tariff
        fields = '__all__'

class SubscriptionSerializer(serializers.ModelSerializer):
    tariff_name = serializers.ReadOnlyField(source='tariff.name')
    
    class Meta:
        model = Subscription
        fields = '__all__'
