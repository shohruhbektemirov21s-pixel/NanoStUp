from datetime import timedelta

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError(_("The Email must be set"))
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save()
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError(_("Superuser must have is_staff=True."))
        if extra_fields.get("is_superuser") is not True:
            raise ValueError(_("Superuser must have is_superuser=True."))
        return self.create_user(email, password, **extra_fields)

class UserRole(models.TextChoices):
    ADMIN = 'ADMIN', _('Admin')
    USER = 'USER', _('User')

# ═════════════════════════════════════════════════════════════
# Token / Nano Coin iqtisodiy tizimi
# ─────────────────────────────────────────────────────────────
# Yangi foydalanuvchi: 1 000 nano koin (ro'yxatdan o'tish bonusi)
# Har bir token = 1/10 nano koin (1 nano = 10 token)
# Narxlar:
#   Oddiy sayt (1–3 sektsiya)  → 3 000 nano koin = 30 000 token
#   O'rta sayt  (4–6 sektsiya) → 4 000 nano koin = 40 000 token
#   Murakkab    (7+ sektsiya)  → 5 000 nano koin = 50 000 token
#   1-chi sayt yaratish       → BEPUL (0 nano)
#   Keyingi sahifa/o'zgarish  → 300 nano koin = 3 000 token
# ═════════════════════════════════════════════════════════════

# Yangi foydalanuvchiga beriladigan ro'yxatdan o'tish bonusi (nano)
DEFAULT_NANO_COINS = 1_000
DEFAULT_USER_TOKENS = DEFAULT_NANO_COINS * 10  # 10 000 token

# 1 nano koin = 10 token
TOKENS_PER_NANO_COIN = 10

# Sayt narxlari (nano koin)
COST_SIMPLE_NANO   = 3_000   # Oddiy (1–3 sektsiya)
COST_MEDIUM_NANO   = 4_000   # O'rta (4–6 sektsiya)
COST_COMPLEX_NANO  = 5_000   # Murakkab (7+ sektsiya)
COST_REVISION_NANO = 300     # orqaga moslik uchun (eng kam narx)
COST_REVISION_SIMPLE_NANO  = 300   # Oddiy o'zgarish  (rang, matn)
COST_REVISION_MEDIUM_NANO  = 400   # O'rta o'zgarish  (sektsiya qo'shish/o'chirish)
COST_REVISION_COMPLEX_NANO = 500   # Murakkab o'zgarish (sahifa qo'shish, to'liq qayta tuzish)
COST_FIRST_SITE_NANO = 0     # Ishlatilmaydi (legacy)

# Foydalanmaslik muddati — 30 kun ishlatmasa nano koin 0'ga tushadi
NANO_COIN_EXPIRY_DAYS = 30

# Token ekvivalentlari
SITE_CREATION_COST   = COST_MEDIUM_NANO * TOKENS_PER_NANO_COIN  # default = 40 000 token
CHAT_COST_NANO = COST_REVISION_NANO  # orqaga moslik uchun

# Yangi foydalanuvchiga beriladigan bonus token (DB default)
def _nano_to_tokens(nano: int) -> int:
    return nano * TOKENS_PER_NANO_COIN


def tokens_to_nano_coins(tokens: int) -> int:
    return tokens // TOKENS_PER_NANO_COIN


class User(AbstractUser):
    username = None
    email = models.EmailField(_("email address"), unique=True)
    full_name = models.CharField(_("full name"), max_length=255, blank=True)
    role = models.CharField(
        max_length=20, 
        choices=UserRole.choices, 
        default=UserRole.USER
    )
    # Token balans — har bir AI generatsiya uchun yechiladi
    tokens_balance = models.PositiveIntegerField(
        _("tokens balance"),
        default=DEFAULT_USER_TOKENS,
        help_text=_("Foydalanuvchining joriy token balansi"),
    )

    # Oxirgi nano koin ishlatilgan vaqt — 30 kun ishlatmasa 0'ga tushadi
    nano_coins_last_used_at = models.DateTimeField(
        _("nano koin oxirgi ishlatilgan"),
        null=True, blank=True, default=None,
        help_text=_("30 kun ishlatmasa nano koin balansi 0'ga tushadi (use-it-or-lose-it)"),
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []

    @property
    def nano_coins(self) -> int:
        """Token balansining nano koindagi ekvivalenti.

        Agar 30 kundan ko'p ishlatilmagan bo'lsa — 0 qaytaradi va DB'da
        ham 0'ga tushirib qo'yadi (lazy expiry).
        """
        if self.is_nano_coins_expired():
            return 0
        return tokens_to_nano_coins(self.tokens_balance)

    def is_nano_coins_expired(self) -> bool:
        """30 kundan ko'p ishlatilmaganmi?"""
        if not self.nano_coins_last_used_at:
            return False
        if self.tokens_balance <= 0:
            return False
        threshold = timezone.now() - timedelta(days=NANO_COIN_EXPIRY_DAYS)
        return self.nano_coins_last_used_at < threshold

    def expire_nano_coins_if_needed(self) -> bool:
        """Agar 30 kundan ko'p ishlatilmagan bo'lsa, balansni 0 ga tushiradi.

        Returns: True if balance was reset, False otherwise.
        """
        if self.is_nano_coins_expired():
            User.objects.filter(pk=self.pk).update(tokens_balance=0)
            self.tokens_balance = 0
            return True
        return False

    def can_afford(self, cost: int = SITE_CREATION_COST) -> bool:
        # Avval expire qilamiz — keyin tekshiramiz
        self.expire_nano_coins_if_needed()
        return self.tokens_balance >= cost

    def deduct_tokens(self, amount: int) -> None:
        """Atomik yechish — DB level da amount dan kam bo'lsa yechmaydi.

        Yechilgandan so'ng `nano_coins_last_used_at` ni now() ga o'rnatadi —
        shu yo'l bilan keyingi 30 kun davomida balans saqlanib qoladi.
        """
        # Avval expired bo'lsa balansni 0'ga tushiramiz
        self.expire_nano_coins_if_needed()
        from django.db.models import F
        now = timezone.now()
        updated = User.objects.filter(
            pk=self.pk, tokens_balance__gte=amount,
        ).update(
            tokens_balance=F("tokens_balance") - amount,
            nano_coins_last_used_at=now,
        )
        if updated:
            self.refresh_from_db(fields=["tokens_balance", "nano_coins_last_used_at"])
        else:
            raise ValueError("Token balans yetarli emas")

    def touch_nano_usage(self) -> None:
        """Faqat `nano_coins_last_used_at` ni yangilaydi (yechmasdan).

        Bu — partial deduction yoki nano koin sotib olingandan so'ng
        chaqiriladi (timer'ni qaytadan boshlaydi).
        """
        User.objects.filter(pk=self.pk).update(
            nano_coins_last_used_at=timezone.now(),
        )
        self.nano_coins_last_used_at = timezone.now()

    def __str__(self):
        return self.email
