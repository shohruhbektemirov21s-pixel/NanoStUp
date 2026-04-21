from rest_framework import serializers
from .models import WebsiteProject

class WebsiteProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebsiteProject
        fields = '__all__'
        read_only_fields = ('id', 'user', 'status', 'blueprint', 'schema_data', 'created_at', 'updated_at')

class CreateProjectSerializer(serializers.Serializer):
    prompt = serializers.CharField(required=True)
    title = serializers.CharField(required=True)
    language = serializers.ChoiceField(choices=['en', 'ru', 'uz'], default='en')
