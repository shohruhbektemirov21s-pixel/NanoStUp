from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import ProjectVersion, WebsiteProject


@admin.register(WebsiteProject)
class WebsiteProjectAdmin(ModelAdmin):
    list_display = ("title", "user", "status", "language", "created_at")
    list_filter = ("status", "language", "created_at")
    search_fields = ("title", "user__email", "prompt")
    readonly_fields = ("id", "created_at", "updated_at")
    ordering = ("-created_at",)


@admin.register(ProjectVersion)
class ProjectVersionAdmin(ModelAdmin):
    list_display = ("project", "version_number", "intent", "created_at")
    list_filter = ("intent", "created_at")
    readonly_fields = ("id", "created_at")
    ordering = ("-created_at",)
