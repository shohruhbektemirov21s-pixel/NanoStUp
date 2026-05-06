from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.ChatView.as_view(), name="ai_chat"),
    path("intent/", views.DetectIntentView.as_view(), name="ai_intent"),
    path("suggestions/", views.SuggestionsView.as_view(), name="ai_suggestions"),
    path("admin-assist/", views.AdminAssistView.as_view(), name="ai_admin_assist"),
]
