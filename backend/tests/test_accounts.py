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


def _obtain_token(client, email, password):
    resp = client.post("/api/accounts/login/", {"email": email, "password": password}, format="json")
    assert resp.status_code == 200, resp.content
    return resp.data["access"]


def test_admin_login_and_me(api_client, admin_user):
    token = _obtain_token(api_client, admin_user.email, "adminpass")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api_client.get("/api/accounts/me/")
    assert resp.status_code == 200
    assert resp.data["email"] == admin_user.email


def test_register_creates_user(api_client, db):
    resp = api_client.post(
        "/api/accounts/register/",
        {"email": "new@example.com", "password": "StrongPass123", "full_name": "New"},
        format="json",
    )
    assert resp.status_code == 201
    assert User.objects.filter(email="new@example.com").exists()
