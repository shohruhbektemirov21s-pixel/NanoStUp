from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebsiteProjectViewSet, owner_get_by_slug, owner_save_by_slug
from apps.exports.views import ExportZIPView

router = DefaultRouter()
router.register(r'', WebsiteProjectViewSet, basename='project')

urlpatterns = [
    path('<uuid:project_id>/export/', ExportZIPView.as_view(), name='project_export'),
    # Owner admin — slug bo'yicha schema'ni olish/saqlash (auth + owner only)
    path('owner/by_slug/<slug:slug>/', owner_get_by_slug, name='owner_get_by_slug'),
    path('owner/by_slug/<slug:slug>/save/', owner_save_by_slug, name='owner_save_by_slug'),
    path('', include(router.urls)),
]
