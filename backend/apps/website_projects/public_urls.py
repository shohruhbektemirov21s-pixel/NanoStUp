from django.urls import path

from .views import public_site, verify_domain

urlpatterns = [
    path("sites/<slug:slug>/", public_site, name="public_site"),
    path("verify-domain/", verify_domain, name="verify_domain"),
]
