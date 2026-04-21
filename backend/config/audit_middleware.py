"""
Audit log middleware — barcha muhim so'rovlarni loglaydi.
Maxfiy ma'lumotlarni (parol, token) hech qachon loglamaydi.
"""
import json
import logging
import re
import time

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("audit")

# Saqlanmaydigan maydonlar (regex)
_SENSITIVE_KEYS = re.compile(
    r"password|token|secret|key|api_key|card|cvv|ssn|auth",
    re.IGNORECASE,
)

# Kuzatiladigan endpointlar
_AUDIT_PATHS = re.compile(
    r"^/(api/accounts/(login|register|me)|api/projects/|17210707admin/)",
    re.IGNORECASE,
)


def _mask(data: dict) -> dict:
    """Maxfiy maydonlarni yashiradi."""
    result = {}
    for k, v in data.items():
        if _SENSITIVE_KEYS.search(str(k)):
            result[k] = "***"
        elif isinstance(v, dict):
            result[k] = _mask(v)
        else:
            result[k] = v
    return result


def _safe_ip(request: HttpRequest) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    return xff or request.META.get("REMOTE_ADDR", "unknown")


class AuditLogMiddleware:
    """
    Muhim API so'rovlarini loglaydi:
    - Kirish, ro'yxatdan o'tish, profil o'zgartirish
    - AI generatsiya so'rovlari
    - Admin panel amallari
    Sekin so'rovlar, noto'g'ri metodlar va xatolar alohida belgilanadi.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not _AUDIT_PATHS.match(request.path):
            return self.get_response(request)

        start = time.monotonic()
        response = self.get_response(request)
        elapsed_ms = int((time.monotonic() - start) * 1000)

        user = "anon"
        if hasattr(request, "user") and request.user.is_authenticated:
            user = str(request.user.id)

        level = logging.INFO
        if response.status_code >= 500:
            level = logging.ERROR
        elif response.status_code in (401, 403, 429):
            level = logging.WARNING
        elif response.status_code >= 400:
            level = logging.WARNING

        logger.log(
            level,
            "%s %s %s user=%s ip=%s %dms",
            request.method,
            request.path,
            response.status_code,
            user,
            _safe_ip(request),
            elapsed_ms,
        )

        # Sekin so'rovlar haqida alohida ogohlantirish (>3 soniya)
        if elapsed_ms > 3000:
            logger.warning(
                "Sekin so'rov: %s %s %dms",
                request.method, request.path, elapsed_ms,
            )

        return response
