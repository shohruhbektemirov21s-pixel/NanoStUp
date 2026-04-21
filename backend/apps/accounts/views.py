import logging
import time
from collections import deque
from threading import Lock

from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView

from .lockout import lockout_manager
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()
logger = logging.getLogger(__name__)


# ── Rate limiter ───────────────────────────────────────────────────

class _SimpleRateLimiter:
    def __init__(self, max_req: int, window_s: int) -> None:
        self.max_req = max_req
        self.window = window_s
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_req:
                return False
            hits.append(now)
            return True


def _get_ip(request) -> str:
    # Proxy orqali kelganda faqat birinchi IP ni olish (spoofing oldini olish)
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip()
    return xff or request.META.get("REMOTE_ADDR", "unknown")


_register_limiter = _SimpleRateLimiter(max_req=5, window_s=3600)  # 5 ta ro'yxat/soat


# ── Ro'yxatdan o'tish ─────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = (permissions.AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        ip = _get_ip(request)
        if not _register_limiter.allow(ip):
            logger.warning("Register rate limit: ip=%s", ip)
            return Response(
                {"detail": "Juda ko'p ro'yxatdan o'tish urinishi. 1 soatdan keyin qayta urining."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        return super().create(request, *args, **kwargs)


# ── Kirish (brute-force + lockout himoyasi) ───────────────────────

class ProtectedTokenObtainPairView(TokenObtainPairView):
    """
    Login endpointiga:
    - IP bo'yicha sliding-window rate limit (10/daqiqa)
    - Email + IP bo'yicha lockout (5 noto'g'ri → 15 daqiqa blok)
    - Muvaffaqiyatli logindan so'ng lockout tozalanadi
    - Barcha noto'g'ri urinishlar loglanadi
    """

    def post(self, request, *args, **kwargs):
        ip = _get_ip(request)
        email = str(request.data.get("email", "")).lower().strip()

        # Lockout tekshiruvi (IP)
        locked_ip, retry_ip = lockout_manager.is_locked(f"ip:{ip}")
        if locked_ip:
            logger.warning("Login blocked (ip lockout): ip=%s", ip)
            return Response(
                {"detail": f"IP bloklangi. {retry_ip} soniyadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": str(retry_ip)},
            )

        # Lockout tekshiruvi (email)
        if email:
            locked_em, retry_em = lockout_manager.is_locked(f"email:{email}")
            if locked_em:
                logger.warning("Login blocked (email lockout): email=%s", email)
                return Response(
                    {"detail": f"Ushbu akkaunt vaqtincha bloklandi. {retry_em} soniyadan keyin urining."},
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                    headers={"Retry-After": str(retry_em)},
                )

        # Asosiy login
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            # Muvaffaqiyatli login — lockoutni tozalash
            lockout_manager.clear(f"ip:{ip}")
            if email:
                lockout_manager.clear(f"email:{email}")
            logger.info("Login success: email=%s ip=%s", email, ip)
        else:
            # Noto'g'ri parol — xato hisoblash
            lockout_manager.record_failure(f"ip:{ip}")
            if email:
                lockout_manager.record_failure(f"email:{email}")
            logger.warning("Login failed: email=%s ip=%s status=%s", email, ip, response.status_code)

        return response


# ── Profil ────────────────────────────────────────────────────────

class UserMeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = (permissions.IsAuthenticated,)

    def get_object(self):
        return self.request.user
