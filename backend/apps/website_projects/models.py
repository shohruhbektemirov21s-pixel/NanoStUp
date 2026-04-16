from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
import uuid

class ProjectStatus(models.TextChoices):
    IDLE = 'IDLE', _('Idle')
    GENERATING = 'GENERATING', _('Generating')
    COMPLETED = 'COMPLETED', _('Completed')
    FAILED = 'FAILED', _('Failed')

class WebsiteProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    title = models.CharField(max_length=255)
    prompt = models.TextField()
    language = models.CharField(max_length=10, default='en') # en, ru, uz
    
    status = models.CharField(
        max_length=20, 
        choices=ProjectStatus.choices, 
        default=ProjectStatus.IDLE
    )
    
    # The generated content
    blueprint = models.JSONField(null=True, blank=True)
    schema_data = models.JSONField(null=True, blank=True)
    
    # Metadata
    business_type = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} ({self.user.email})"

    class Meta:
        ordering = ['-created_at']
