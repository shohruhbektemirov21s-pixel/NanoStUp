from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WebsiteProjectViewSet
from apps.exports.views import ExportZIPView

router = DefaultRouter()
router.register(r'', WebsiteProjectViewSet, basename='project')

urlpatterns = [
    path('<uuid:project_id>/export/', ExportZIPView.as_view(), name='project_export'),
    path('', include(router.urls)),
]
