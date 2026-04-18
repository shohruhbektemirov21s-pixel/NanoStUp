from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import WebsiteProject, ProjectStatus
from .serializers import WebsiteProjectSerializer, CreateProjectSerializer
from apps.subscriptions.services import SubscriptionService
from apps.ai_generation.services import GeminiService

class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['post'])
    def generate(self, request):
        serializer = CreateProjectSerializer(data=request.data)
        if serializer.is_valid():
            user = request.user
            # Check limits
            can_create, msg = SubscriptionService.check_user_limits(user, 'projects')
            if not can_create:
                return Response({"detail": msg}, status=status.HTTP_403_FORBIDDEN)
            
            # GUARD: Prevent duplicate generating processes for same user
            from django.utils import timezone
            from datetime import timedelta
            
            # Find any active generation that is NOT older than 10 minutes (safety timeout)
            stuck_threshold = timezone.now() - timedelta(minutes=10)
            active_gen = WebsiteProject.objects.filter(
                user=user, 
                status=ProjectStatus.GENERATING,
                generation_started_at__gt=stuck_threshold
            ).exists()
            
            if active_gen:
                return Response(
                    {"detail": "You already have a site being generated. Please wait or try again in 10 minutes."}, 
                    status=status.HTTP_409_CONFLICT
                )

            # Create project record
            project = WebsiteProject.objects.create(
                user=user,
                title=serializer.validated_data['title'],
                prompt=serializer.validated_data['prompt'],
                language=serializer.validated_data['language'],
                status=ProjectStatus.GENERATING,
                generation_started_at=timezone.now()
            )

            
            # TODO: Start async generation (Celery)
            # For now, we'll return the project object
            
            return Response(WebsiteProjectSerializer(project).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

