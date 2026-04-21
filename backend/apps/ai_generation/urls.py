from django.urls import path

from . import views

urlpatterns = [
    path("chat/", views.ChatView.as_view(), name="ai_chat"),
    path("intent/", views.DetectIntentView.as_view(), name="ai_intent"),
]
