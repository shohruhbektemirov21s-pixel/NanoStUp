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


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(email="user@example.com", password="userpass")


def _obtain_token(client, email, password):
    resp = client.post("/api/accounts/login/", {"email": email, "password": password}, format="json")
    assert resp.status_code == 200, resp.content
    return resp.data["access"]


def test_authenticated_me_endpoint_returns_profile(api_client, regular_user):
    token = _obtain_token(api_client, regular_user.email, "userpass")
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    resp = api_client.get("/api/accounts/me/")
    assert resp.status_code == 200
    assert resp.data["email"] == regular_user.email
    assert resp.data["role"] == "USER"


def test_me_requires_auth(api_client):
    resp = api_client.get("/api/accounts/me/")
    assert resp.status_code == 401


def test_user_registration(api_client, db):
    resp = api_client.post(
        "/api/accounts/register/",
        {"email": "newuser@example.com", "password": "StrongPass123", "full_name": "New User"},
        format="json",
    )
    assert resp.status_code == 201
    assert User.objects.filter(email="newuser@example.com").exists()
