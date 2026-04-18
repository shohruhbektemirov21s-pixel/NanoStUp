from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import WebsiteProject

@admin.register(WebsiteProject)
class WebsiteProjectAdmin(ModelAdmin):
    list_display = ["title", "user", "status", "created_at"]
    list_filter = ["status", "language"]
    search_fields = ["title", "prompt", "user__email"]
    readonly_fields = ["created_at", "updated_at"]
    
    # Custom dashboard cards integration (provided by unfold)
    list_fullwidth = True
    
    fieldsets = (
        ("Core Information", {
            "fields": ("title", "user", "status", "language")
        }),
        ("AI Content", {
            "fields": ("prompt", "blueprint", "schema_data")
        }),
        ("MetaData", {
            "fields": ("business_type", "generation_started_at", "created_at", "updated_at")
        }),
    )
