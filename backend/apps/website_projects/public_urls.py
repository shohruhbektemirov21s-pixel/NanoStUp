from django.urls import path

from .views import public_site

urlpatterns = [
    path("sites/<slug:slug>/", public_site, name="public_site"),
]
