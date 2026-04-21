from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    return User.objects.create_superuser(email="admin@example.com", password="adminpass")


def _auth(client, email, password):
    resp = client.post("/api/accounts/login/", {"email": email, "password": password}, format="json")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {resp.data['access']}")


@mock.patch("apps.website_projects.views.ClaudeService")
def test_process_prompt_generate_success(mock_service, api_client, admin_user, db):
    mock_service.return_value.generate_full_site.return_value = {
        "siteName": "Test",
        "pages": [{"slug": "home", "sections": []}],
    }
    _auth(api_client, admin_user.email, "adminpass")
    resp = api_client.post(
        "/api/projects/process_prompt/",
        {"prompt": "Create a futuristic landing page", "language": "en"},
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert resp.data["success"] is True
    assert resp.data["is_chat"] is False


@mock.patch("apps.website_projects.views.ClaudeService")
def test_process_prompt_ai_error_returns_500(mock_service, api_client, admin_user, db):
    mock_service.return_value.generate_full_site.side_effect = Exception("PROVIDER_QUOTA")
    _auth(api_client, admin_user.email, "adminpass")
    resp = api_client.post(
        "/api/projects/process_prompt/",
        {"prompt": "build a site", "language": "en"},
        format="json",
    )
    assert resp.status_code == 500
    assert resp.data["success"] is False


def test_process_prompt_requires_auth(api_client, db):
    resp = api_client.post(
        "/api/projects/process_prompt/",
        {"prompt": "build a site"},
        format="json",
    )
    assert resp.status_code == 401
