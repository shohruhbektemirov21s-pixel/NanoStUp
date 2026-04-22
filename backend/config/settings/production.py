"""
Production sozlamalari.
DJANGO_SETTINGS_MODULE=config.settings.production
"""
from .base import *  # noqa: F401, F403

DEBUG = False

# ── Xavfsizlik ─────────────────────────────────────────────────────

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["nanostup-api.onrender.com", "nanostup.uz", "www.nanostup.uz", "*"])

# HTTPS majburiy
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31_536_000   # 1 yil
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CORS — faqat ko'rsatilgan domenlar
CORS_ALLOW_ALL_ORIGINS = True  # Vaqtincha barchasiga ruxsat beramiz, Render muhit o'zgaruvchilari yangilanmagunicha xato chiqmasligi uchun
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["https://nanostup.uz", "https://www.nanostup.uz", "https://nanostup.onrender.com"])
CORS_ALLOW_CREDENTIALS = True

# Sessiya umri
SESSION_COOKIE_AGE = 86_400  # 1 kun
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# ── Database — PostgreSQL ──────────────────────────────────────────
DATABASES = {
    "default": env.db("DATABASE_URL")
}

# ── Logging ────────────────────────────────────────────────────────
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "verbose"},
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
    "loggers": {
        "django": {"handlers": ["console"], "level": "WARNING", "propagate": False},
        "apps": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}

# ── Channels — Redis (ixtiyoriy) ───────────────────────────────────
# Agar REDIS_URL berilgan bo'lsa — Redis ishlatiladi,
# aks holda in-memory fallback (dev/kichik prod uchun)
_redis_url = env("REDIS_URL", default="")
if _redis_url:
    CHANNEL_LAYERS = {
        "default": {
            "BACKEND": "channels_redis.core.RedisChannelLayer",
            "CONFIG": {"hosts": [_redis_url]},
        }
    }
else:
    CHANNEL_LAYERS = {
        "default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
    }
