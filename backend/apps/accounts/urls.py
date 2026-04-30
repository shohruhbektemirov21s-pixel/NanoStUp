from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import ProtectedTokenObtainPairView, RegisterView, UserMeView
from .admin_api import (
    AdminStatsView,
    AdminUsersView,
    AdminGrantSubscriptionView,
    AdminToggleUserView,
    AdminTariffsView,
    AdminTariffDetailView,
    AdminProjectsView,
    AdminProjectDetailView,
    AdminHostingListView,
    AdminSetHostingStatusView,
    AdminSetCustomDomainView,
    AdminPaymentsView,
    AdminAIUsageView,
    AdminTemplatesView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', ProtectedTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserMeView.as_view(), name='user_me'),

    # Admin panel API
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin/users/<int:user_id>/grant/', AdminGrantSubscriptionView.as_view(), name='admin_grant_sub'),
    path('admin/users/<int:user_id>/toggle/', AdminToggleUserView.as_view(), name='admin_toggle_user'),
    path('admin/tariffs/', AdminTariffsView.as_view(), name='admin_tariffs'),
    path('admin/tariffs/<int:tariff_id>/', AdminTariffDetailView.as_view(), name='admin_tariff_detail'),
    path('admin/projects/', AdminProjectsView.as_view(), name='admin_projects'),
    path('admin/projects/<uuid:project_id>/', AdminProjectDetailView.as_view(), name='admin_project_detail'),

    # Hosting & custom domain management
    path('admin/hosting/', AdminHostingListView.as_view(), name='admin_hosting_list'),
    path('admin/hosting/<uuid:project_id>/status/', AdminSetHostingStatusView.as_view(), name='admin_hosting_status'),
    path('admin/hosting/<uuid:project_id>/domain/', AdminSetCustomDomainView.as_view(), name='admin_hosting_domain'),

    # Payments + AI usage + templates
    path('admin/payments/', AdminPaymentsView.as_view(), name='admin_payments'),
    path('admin/ai-usage/', AdminAIUsageView.as_view(), name='admin_ai_usage'),
    path('admin/templates/', AdminTemplatesView.as_view(), name='admin_templates'),
]
