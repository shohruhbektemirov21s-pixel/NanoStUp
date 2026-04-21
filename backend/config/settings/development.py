import os

from .base import *  # noqa: F401, F403

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "0.0.0.0"]

# Dev uchun SECRET_KEY: .env da bo'lmasa vaqtinchalik qiymat
if not os.environ.get("SECRET_KEY"):
    os.environ["SECRET_KEY"] = "dev-only-insecure-key-change-for-production-!!!"

# Daphne (ASGI/Twisted) sandboxda segfault beradi — dev uchun olib tashlaymiz
INSTALLED_APPS = [
    app for app in INSTALLED_APPS  # noqa: F405
    if app not in ("daphne",)
]
# Daphne overridi yo'q bo'lganda WSGI ga qaytamiz
ASGI_APPLICATION = None

# SQLite — local dev uchun Postgres kerak emas
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Redis yo'q — in-memory channels ishlatamiz
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    }
}

# CORS — local Next.js ga ruxsat
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
