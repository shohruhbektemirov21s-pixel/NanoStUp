"""
To'liq HTTP xavfsizlik sarlavhalari middleware.
OWASP Secure Headers Project standartlariga muvofiq.
"""
from django.conf import settings
from django.http import HttpRequest, HttpResponse


class SecurityHeadersMiddleware:
    """
    Barcha javoblarga xavfsizlik sarlavhalarini qo'shadi:
    - Content-Security-Policy (XSS oldini olish)
    - Permissions-Policy (brauzer API ruxsatlari)
    - Cross-Origin-* sarlavhalari
    - Cache-Control (API javoblar uchun)
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        response = self.get_response(request)
        self._add_headers(request, response)
        return response

    @staticmethod
    def _is_api(request: HttpRequest) -> bool:
        return request.path.startswith("/api/")

    def _add_headers(self, request: HttpRequest, response: HttpResponse) -> None:
        debug = getattr(settings, "DEBUG", False)

        # ── Content-Security-Policy ───────────────────────────────
        # Admin panelda unfold CDN kerak; APIda hech narsa yuklanmaydi.
        if "/admin" not in request.path and not self._is_api(request):
            response["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        else:
            # Admin uchun birmuncha yumshoqroq CSP (unfold asset lari uchun)
            response["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://fonts.gstatic.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; "
                "font-src 'self' data: https://fonts.gstatic.com; "
                "img-src 'self' data: https:; "
                "connect-src 'self'; "
                "frame-ancestors 'none';"
            )

        # ── Cross-Origin sarlavhalari ─────────────────────────────
        response["Cross-Origin-Opener-Policy"] = "same-origin"
        response["Cross-Origin-Resource-Policy"] = "same-origin"
        response["Cross-Origin-Embedder-Policy"] = "require-corp"

        # ── Brauzer API ruxsatlari ────────────────────────────────
        response["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), "
            "payment=(), usb=(), bluetooth=(), "
            "accelerometer=(), gyroscope=()"
        )

        # ── Qo'shimcha sarlavhalar ────────────────────────────────
        response["X-Content-Type-Options"] = "nosniff"
        response["X-Frame-Options"] = "DENY"
        response["Referrer-Policy"] = "strict-origin-when-cross-origin"

        # ── API javoblar cache lanmasin ───────────────────────────
        if self._is_api(request):
            response["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response["Pragma"] = "no-cache"

        # ── Server versiyasini yashirish ──────────────────────────
        if "Server" in response:
            del response["Server"]
        response["Server"] = "AI-Builder"

        # ── HSTS (faqat production HTTPS da) ─────────────────────
        if not debug and request.is_secure():
            response["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )
