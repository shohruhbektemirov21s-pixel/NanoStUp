from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WebsiteProjectViewSet,
    owner_download_by_slug,
    owner_get_by_slug,
    owner_save_by_slug,
    owner_set_site_status,
    dashboard_sites,
    admin_set_site_status,
)
from .views_owner_extras import (
    owner_upload_image,
    owner_list_versions,
    owner_get_version,
    owner_restore_version,
)
from apps.exports.views import ExportZIPView

router = DefaultRouter()
router.register(r'', WebsiteProjectViewSet, basename='project')

urlpatterns = [
    path('<uuid:project_id>/export/', ExportZIPView.as_view(), name='project_export'),

    # SaaS Dashboard — foydalanuvchi saytlari ro'yxati + status filter
    path('dashboard/sites/', dashboard_sites, name='dashboard_sites'),

    # Owner admin — slug bo'yicha schema'ni olish/saqlash (auth + owner only)
    path('owner/by_slug/<slug:slug>/', owner_get_by_slug, name='owner_get_by_slug'),
    path('owner/by_slug/<slug:slug>/save/', owner_save_by_slug, name='owner_save_by_slug'),
    path('owner/by_slug/<slug:slug>/download/', owner_download_by_slug, name='owner_download_by_slug'),
    path('owner/by_slug/<slug:slug>/status/', owner_set_site_status, name='owner_set_site_status'),

    # Owner — image upload (drag&drop, Pillow + WebP compress)
    path('owner/by_slug/<slug:slug>/upload-image/', owner_upload_image, name='owner_upload_image'),

    # Owner — versiya tarixi (rollback UI uchun)
    path('owner/by_slug/<slug:slug>/versions/', owner_list_versions, name='owner_list_versions'),
    path('owner/by_slug/<slug:slug>/versions/<uuid:version_id>/', owner_get_version, name='owner_get_version'),
    path('owner/by_slug/<slug:slug>/versions/<uuid:version_id>/restore/', owner_restore_version, name='owner_restore_version'),

    # Admin — status o'zgartirish (faqat staff)
    path('admin/set-status/', admin_set_site_status, name='admin_set_site_status'),

    path('', include(router.urls)),
]
