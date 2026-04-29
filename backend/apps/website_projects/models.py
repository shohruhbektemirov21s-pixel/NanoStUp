from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
import uuid

class ProjectStatus(models.TextChoices):
    IDLE = 'IDLE', _('Idle')
    GENERATING = 'GENERATING', _('Generating')
    COMPLETED = 'COMPLETED', _('Completed')
    FAILED = 'FAILED', _('Failed')


class HostingStatus(models.TextChoices):
    """
    Sayt hosting holati (SaaS soft-lock tizimi):
      - ACTIVE     — to'liq ishlayapti (obuna faol yoki bepul plan ruxsat etilgan)
      - TRIAL      — sinov muddati (yangi user, free demo)
      - EXPIRED    — obuna muddati tugagan (soft-lock, ma'lumot saqlanadi)
      - SUSPENDED  — admin qo'lda to'xtatgan (ToS buzilishi va h.k.)
      - ARCHIVED   — user qo'lda arxivga olgan (vaqtinchalik ko'rinmaydi)
    """
    ACTIVE = 'ACTIVE', _('Faol')
    TRIAL = 'TRIAL', _('Sinov')
    EXPIRED = 'EXPIRED', _('Muddati tugagan')
    SUSPENDED = 'SUSPENDED', _('To\'xtatilgan')
    ARCHIVED = 'ARCHIVED', _('Arxivlangan')


class WebsiteProject(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='projects'
    )
    title = models.CharField(max_length=255)
    prompt = models.TextField()
    language = models.CharField(max_length=10, default='en') # en, ru, uz
    
    status = models.CharField(
        max_length=20, 
        choices=ProjectStatus.choices, 
        default=ProjectStatus.IDLE
    )
    
    # The generated content
    blueprint = models.JSONField(null=True, blank=True)
    schema_data = models.JSONField(null=True, blank=True)
    # Claude-generated code files: {"index.html": "...", "css/styles.css": "...", ...}
    generated_files = models.JSONField(null=True, blank=True)
    
    # Metadata
    business_type = models.CharField(max_length=100, blank=True)

    # ── Publish / share ────────────────────────────────────────
    # Saytni publik URL orqali ko'rish uchun: /s/<slug>
    slug = models.SlugField(max_length=80, unique=True, null=True, blank=True, db_index=True)
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    view_count = models.PositiveIntegerField(default=0)

    # ── Hosting kontroli ───────────────────────────────────────
    # SaaS hosting status (ACTIVE/TRIAL/EXPIRED/SUSPENDED/ARCHIVED)
    hosting_status = models.CharField(
        "Hosting holati", max_length=20,
        choices=HostingStatus.choices,
        default=HostingStatus.TRIAL,
        db_index=True,
        help_text="Sayt hosting holati. Subscription tugaganda EXPIRED bo'ladi (soft-lock).",
    )
    # Hosting muddati tugash sanasi (subscription bilan sinxronlanadi)
    hosting_expires_at = models.DateTimeField(
        "Hosting tugash sanasi", null=True, blank=True, db_index=True,
        help_text="Sayt hosting muddati. NULL bo'lsa cheksiz (TRIAL/ARCHIVED).",
    )
    # Soft-lock sababi (admin yoki avto)
    suspension_reason = models.CharField(
        "To'xtatish sababi", max_length=255, blank=True,
        help_text="EXPIRED yoki SUSPENDED holatda foydalanuvchiga ko'rsatiladigan xabar.",
    )
    # Custom domain (Pro+ tarif uchun)
    custom_domain = models.CharField(
        "Custom domen", max_length=253, blank=True, db_index=True,
        help_text="Misol: mysite.com. Pro+ tarif uchun. DNS A-record nanostup-api'ga yo'naltirilishi kerak.",
    )
    custom_domain_verified = models.BooleanField(
        "Domen tasdiqlangan", default=False,
        help_text="DNS to'g'ri sozlanganmi? Avto-tekshiriladi.",
    )
    # Backward compatibility: eski is_active hali ishlatilayotgan joylar uchun saqlanadi.
    # Hozir bu hosting_status'dan derived bo'ladi (property orqali).
    is_active = models.BooleanField(
        "Faol (deprecated)", default=True,
        help_text="ESKI: hosting_status orqali ishlash kerak. False = SUSPENDED ekvivalent.",
    )
    # Sayt faqat NanoStUp infrastrukturasida hosting bo'ladi.
    hosted_on_platform = models.BooleanField(
        "NanoStUp'da hosting", default=True,
        help_text="Saytlar faqat NanoStUp serverlarida ishlaydi (external hosting taqiqlangan).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    generation_started_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} ({self.user.email})"

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['hosting_status', '-updated_at']),
            models.Index(fields=['user', 'hosting_status']),
        ]

    # ── Helper methodlar (SaaS soft-lock) ──────────────────────

    @property
    def is_locked(self) -> bool:
        """Sayt publik URL orqali ko'rinmaydigan holatdami?"""
        return self.hosting_status in (
            HostingStatus.EXPIRED,
            HostingStatus.SUSPENDED,
            HostingStatus.ARCHIVED,
        )

    @property
    def is_live(self) -> bool:
        """Sayt to'liq publik ko'rinadigan holatdami?"""
        return (
            self.is_published
            and self.hosting_status in (HostingStatus.ACTIVE, HostingStatus.TRIAL)
            and self.is_active  # backward compat
        )

    @property
    def days_until_expiry(self) -> int | None:
        """Hosting tugashiga qancha kun qolgan? None = cheksiz."""
        if not self.hosting_expires_at:
            return None
        delta = self.hosting_expires_at - timezone.now()
        return max(0, delta.days)

    @property
    def needs_renewal_soon(self) -> bool:
        """7 kun yoki kamroq qoldi — renewal banner ko'rsatish kerak."""
        days = self.days_until_expiry
        return days is not None and days <= 7 and self.hosting_status == HostingStatus.ACTIVE

    def lock_message(self, language: str = 'uz') -> dict:
        """Soft-lock overlay uchun chiroyli xabar."""
        messages = {
            HostingStatus.EXPIRED: {
                'uz': {
                    'title': 'Hosting muddati tugagan',
                    'description': 'Bu saytning hosting muddati tugagan. Saytni qayta faollashtirish uchun obunani yangilang.',
                    'cta': 'Obunani yangilash',
                },
                'ru': {
                    'title': 'Срок хостинга истёк',
                    'description': 'Срок хостинга этого сайта истёк. Чтобы снова сделать сайт доступным, обновите подписку.',
                    'cta': 'Обновить подписку',
                },
                'en': {
                    'title': 'Hosting expired',
                    'description': 'This site\'s hosting has expired. Renew your subscription to bring it back online.',
                    'cta': 'Renew subscription',
                },
            },
            HostingStatus.SUSPENDED: {
                'uz': {
                    'title': 'Sayt vaqtinchalik to\'xtatilgan',
                    'description': self.suspension_reason or 'Bu sayt administrator tomonidan vaqtinchalik to\'xtatilgan. Batafsil ma\'lumot uchun support bilan bog\'laning.',
                    'cta': 'Support bilan bog\'lanish',
                },
                'ru': {
                    'title': 'Сайт временно приостановлен',
                    'description': self.suspension_reason or 'Этот сайт временно приостановлен администратором. Свяжитесь с поддержкой для подробностей.',
                    'cta': 'Связаться с поддержкой',
                },
                'en': {
                    'title': 'Site temporarily suspended',
                    'description': self.suspension_reason or 'This site has been suspended by the administrator. Contact support for details.',
                    'cta': 'Contact support',
                },
            },
            HostingStatus.ARCHIVED: {
                'uz': {
                    'title': 'Sayt arxivlangan',
                    'description': 'Bu sayt egasi tomonidan arxivga olingan.',
                    'cta': 'Bosh sahifaga',
                },
                'ru': {
                    'title': 'Сайт архивирован',
                    'description': 'Этот сайт был архивирован владельцем.',
                    'cta': 'На главную',
                },
                'en': {
                    'title': 'Site archived',
                    'description': 'This site has been archived by the owner.',
                    'cta': 'Back to home',
                },
            },
        }
        return messages.get(self.hosting_status, {}).get(language) or messages.get(self.hosting_status, {}).get('uz', {
            'title': 'Sayt mavjud emas', 'description': '', 'cta': '',
        })

    def sync_hosting_with_subscription(self, save: bool = True) -> bool:
        """
        Egasi obunasiga qarab hosting_status va expires_at ni yangilaydi.
        SUSPENDED va ARCHIVED holatlari avto-yangilanmaydi (admin/user qo'lda qiladi).
        Returns: o'zgartirildi/yo'q.
        """
        if self.hosting_status in (HostingStatus.SUSPENDED, HostingStatus.ARCHIVED):
            return False

        from apps.subscriptions.models import Subscription, SubscriptionStatus
        sub = Subscription.objects.filter(
            user=self.user, status=SubscriptionStatus.ACTIVE,
        ).order_by('-end_date').first()

        old_status = self.hosting_status
        old_expires = self.hosting_expires_at

        if sub and sub.end_date and sub.end_date > timezone.now():
            self.hosting_status = HostingStatus.ACTIVE
            self.hosting_expires_at = sub.end_date
            self.suspension_reason = ''
        else:
            # Faol obuna yo'q yoki muddati o'tgan
            if self.hosting_status == HostingStatus.ACTIVE:
                self.hosting_status = HostingStatus.EXPIRED
                self.suspension_reason = 'Obuna muddati tugagan'
            elif self.hosting_status == HostingStatus.TRIAL and self.hosting_expires_at and self.hosting_expires_at < timezone.now():
                self.hosting_status = HostingStatus.EXPIRED
                self.suspension_reason = 'Sinov muddati tugagan'

        changed = (old_status != self.hosting_status) or (old_expires != self.hosting_expires_at)
        if changed and save:
            self.save(update_fields=['hosting_status', 'hosting_expires_at', 'suspension_reason', 'updated_at'])
        return changed

class ProjectVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(WebsiteProject, on_delete=models.CASCADE, related_name='versions')
    prompt = models.TextField()
    schema_data = models.JSONField()
    intent = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    version_number = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('project', 'version_number')


# ─────────────────────────────────────────────────────────────
# Chat tarixi: Conversation (suhbat) + ChatMessage (yozishma)
# Har bir foydalanuvchining AI bilan bo'lgan barcha yozishmalarini
# saqlaydi. Suhbat yangilanganda, unga bog'liq loyiha paydo bo'lsa
# `project` bog'lanadi.
# ─────────────────────────────────────────────────────────────

class Conversation(models.Model):
    """AI bilan bir sessiya suhbati. Loyiha yaratilsa unga bog'lanadi."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    project = models.ForeignKey(
        WebsiteProject,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='conversations',
    )
    title = models.CharField(max_length=255, blank=True)
    language = models.CharField(max_length=10, default='uz')
    # Agregat metrikalar — admin panel uchun qulay
    total_messages = models.PositiveIntegerField(default=0)
    total_tokens_input = models.PositiveIntegerField(default=0)
    total_tokens_output = models.PositiveIntegerField(default=0)
    # Har bir yangi chat ochilganda 500 nano bonus beriladi.
    # Bu AI kod yozishda birinchi navbatda ishlatiladi; tugagach user
    # obuna tokenlaridan yechiladi.
    chat_budget_nano = models.PositiveIntegerField(
        default=500,
        help_text="Chat uchun bonus nano koin (har yangi chatda 500 beriladi)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['-updated_at']),
            models.Index(fields=['user', '-updated_at']),
        ]

    def __str__(self):
        title = self.title or '(sarlavhasiz)'
        return f"{title} — {self.user.email}"


class ChatRole(models.TextChoices):
    USER = 'user', _('User')
    ASSISTANT = 'assistant', _('AI')
    SYSTEM = 'system', _('System')


class ChatMessage(models.Model):
    """Bitta xabar — user yoki AI tomonidan yuborilgan."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=20, choices=ChatRole.choices)
    content = models.TextField()
    # Intent: CHAT / ARCHITECT / REVISE / GENERATE / DESIGN_VARIANTS
    intent = models.CharField(max_length=30, blank=True)
    # Qo'shimcha ma'lumot: design_variants, stats, balance, schema snapshot
    metadata = models.JSONField(null=True, blank=True)
    # Agar bu xabar natijasida loyiha yaratilgan/yangilangan bo'lsa
    project_version = models.ForeignKey(
        ProjectVersion,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='messages',
    )
    # Tokenlar (AI xabarlari uchun)
    tokens_input = models.PositiveIntegerField(default=0)
    tokens_output = models.PositiveIntegerField(default=0)
    # Generatsiya vaqti (ms) — AI xabarlari uchun
    duration_ms = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        preview = self.content[:60].replace('\n', ' ')
        return f"[{self.role}] {preview}"
