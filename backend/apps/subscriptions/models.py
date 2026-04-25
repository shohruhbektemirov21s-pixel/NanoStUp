from datetime import timedelta

from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

class Tariff(models.Model):
    name = models.CharField("Tarif nomi", max_length=100)
    description = models.TextField("Tavsif", blank=True)
    price = models.DecimalField(
        "Narxi (UZS)", max_digits=12, decimal_places=2,
        help_text="O'zbek so'mida. Masalan: 199000",
    )
    duration_days = models.IntegerField("Muddati (kun)", default=30)

    # ── Limits ────────────────────────────────────────────────────
    projects_limit = models.IntegerField(
        "Faol saytlar soni", default=1,
        help_text="Bir vaqtning o'zida ushlab turish mumkin bo'lgan faol saytlar.",
    )
    max_sites_per_month = models.IntegerField(
        "Oylik yangi sayt limiti", default=3,
        help_text="Foydalanuvchi bir oyda yarata oladigan yangi saytlar soni. 0 = cheksiz.",
    )
    max_active_sites = models.IntegerField(
        "Bir vaqtdagi maks. faol saytlar", default=0,
        help_text="0 = projects_limit bilan bir xil. Aks holda alohida cheklov.",
    )
    pages_per_project_limit = models.IntegerField("Bir loyihada sahifalar", default=5)
    ai_generations_limit = models.IntegerField("AI generatsiya limiti", default=10)

    # ── Hosting/storage limitlari (faqat metadata) ────────────────
    storage_limit_mb = models.IntegerField(
        "Saqlash hajmi (MB)", default=100,
        help_text="Hosting'da har sayt uchun maksimal disk hajmi (MB).",
    )
    traffic_limit_gb = models.IntegerField(
        "Oylik trafik (GB)", default=1,
        help_text="Oyiga maksimal trafik (GB). 0 = cheksiz.",
    )

    # Nano koin — admin panel orqali qo'lda kiritiladi.
    nano_coins_included = models.PositiveIntegerField(
        "Oyiga nano koin",
        default=0,
        help_text="1 oyga beriladigan umumiy nano koin miqdori (haftada 1/4 qismi beriladi)",
    )

    is_active = models.BooleanField("Faol", default=True)
    created_at = models.DateTimeField("Yaratilgan sana", auto_now_add=True)

    # Helper'lar
    @property
    def effective_max_active_sites(self) -> int:
        """`max_active_sites` 0 bo'lsa `projects_limit` qiymati ishlatiladi."""
        return self.max_active_sites if self.max_active_sites > 0 else self.projects_limit

    class Meta:
        verbose_name = "Tarif (narxlar)"
        verbose_name_plural = "Tariflar (narxlar)"

    @property
    def weekly_allowance(self) -> int:
        """Har hafta foydalanuvchiga beriladigan nano koin (1/4 dan)."""
        return self.nano_coins_included // 4 if self.nano_coins_included else 0

    def __str__(self):
        return self.name

class SubscriptionStatus(models.TextChoices):
    ACTIVE = 'ACTIVE', "Faol"
    EXPIRED = 'EXPIRED', "Muddati o'tgan"
    CANCELED = 'CANCELED', "Bekor qilingan"


class Subscription(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Foydalanuvchi",
        on_delete=models.CASCADE,
        related_name='subscriptions',
    )
    tariff = models.ForeignKey(
        Tariff, verbose_name="Tarif", on_delete=models.PROTECT,
    )
    status = models.CharField(
        "Holat",
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
    )
    start_date = models.DateTimeField("Boshlanish sanasi", default=timezone.now)
    end_date = models.DateTimeField("Tugash sanasi")

    # Tracking usage (jami tarix)
    projects_created = models.IntegerField("Jami yaratilgan loyihalar", default=0)
    generations_used = models.IntegerField("Ishlatilgan AI", default=0)

    # ── Oylik counter (har oy reset bo'ladi) ──────────────────────
    sites_created_this_month = models.PositiveIntegerField(
        "Bu oy yaratilgan saytlar", default=0,
    )
    month_reset_date = models.DateField(
        "Oylik reset sanasi", null=True, blank=True,
        help_text="Bu sana kelganda sites_created_this_month 0 ga resetlanadi.",
    )

    created_at = models.DateTimeField("Yaratilgan", auto_now_add=True)
    updated_at = models.DateTimeField("Yangilangan", auto_now=True)

    class Meta:
        verbose_name = "Obuna"
        verbose_name_plural = "Obunalar"

    def is_valid(self):
        return self.status == SubscriptionStatus.ACTIVE and self.end_date > timezone.now()

    # ── Limit helpers ─────────────────────────────────────────────
    def maybe_reset_period(self) -> bool:
        """
        Agar `month_reset_date` o'tgan bo'lsa, oylik counter va sanani yangilaydi.
        Returns: True — reset bo'lgan bo'lsa.
        """
        today = timezone.now().date()
        # Hech qachon reset_date qo'yilmagan — hoziroq belgilaymiz
        if not self.month_reset_date:
            self.month_reset_date = today + timedelta(days=30)
            self.save(update_fields=["month_reset_date", "updated_at"])
            return False
        if today >= self.month_reset_date:
            self.sites_created_this_month = 0
            self.month_reset_date = today + timedelta(days=30)
            self.save(update_fields=[
                "sites_created_this_month", "month_reset_date", "updated_at",
            ])
            return True
        return False

    @property
    def sites_remaining(self) -> int:
        """Bu oy uchun qolgan sayt yaratish miqdori. -1 = cheksiz."""
        cap = self.tariff.max_sites_per_month
        if cap == 0:
            return -1
        return max(0, cap - self.sites_created_this_month)

    def can_create_site(self) -> bool:
        """Foydalanuvchi yangi sayt yaratish huquqiga egami?"""
        if not self.is_valid():
            return False
        # Avval oylik counter o'tib ketgan bo'lsa, reset qilamiz
        self.maybe_reset_period()
        # Refresh from DB to ensure post-reset state is read
        self.refresh_from_db(fields=["sites_created_this_month", "month_reset_date"])
        cap = self.tariff.max_sites_per_month
        if cap == 0:  # cheksiz
            return True
        return self.sites_created_this_month < cap

    def increment_sites_counter(self) -> None:
        """Yangi sayt yaratilganda chaqiriladi: oylik va umumiy counter'ni oshiradi."""
        from django.db.models import F
        Subscription.objects.filter(pk=self.pk).update(
            sites_created_this_month=F("sites_created_this_month") + 1,
            projects_created=F("projects_created") + 1,
        )
        self.refresh_from_db(fields=["sites_created_this_month", "projects_created"])

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        # Agar end_date kiritilmagan bo'lsa, tariff bo'yicha hisoblaymiz
        if not self.end_date:
            self.end_date = timezone.now() + timedelta(days=self.tariff.duration_days)
            
        super().save(*args, **kwargs)
        
        # Yangi faol obuna yaratilganda nano koinlarni balansga qo'shish
        if is_new and self.status == SubscriptionStatus.ACTIVE:
            from django.contrib.auth import get_user_model
            UserModel = get_user_model()
            from apps.accounts.models import TOKENS_PER_NANO_COIN
            nano_to_add = self.tariff.nano_coins_included
            if nano_to_add > 0:
                tokens_to_add = nano_to_add * TOKENS_PER_NANO_COIN
                from django.db.models import F
                UserModel.objects.filter(pk=self.user.pk).update(
                    tokens_balance=F("tokens_balance") + tokens_to_add
                )

    def __str__(self):
        return f"{self.user.email} - {self.tariff.name}"
