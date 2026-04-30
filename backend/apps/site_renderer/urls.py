from django.urls import path

from .views import render_public_site

app_name = "site_renderer"

urlpatterns = [
    # /sites/<slug>/ — publik HTML sayt
    path("<slug:slug>/", render_public_site, name="public_site"),
]
