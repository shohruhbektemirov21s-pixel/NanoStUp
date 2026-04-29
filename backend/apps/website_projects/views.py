import json
import logging
import queue as _queue_module
import random as _random
import secrets
import threading
import time
from collections import deque
from datetime import timedelta
from threading import Lock
from typing import Dict, Optional

from django.db.models import F
from django.http import HttpResponse, StreamingHttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import (
    CHAT_COST_NANO,
    SITE_CREATION_COST,
    TOKENS_PER_NANO_COIN,
    COST_SIMPLE_NANO,
    COST_MEDIUM_NANO,
    COST_COMPLEX_NANO,
    COST_REVISION_NANO,
    COST_REVISION_SIMPLE_NANO,
    COST_REVISION_MEDIUM_NANO,
    COST_REVISION_COMPLEX_NANO,
    COST_FIRST_SITE_NANO,
    tokens_to_nano_coins,
)
from apps.ai_generation.services import AIRouterService, ArchitectService, ClaudeService
from apps.exports.services import ExportService
from apps.subscriptions.models import Subscription, SubscriptionStatus


# ── Tarif bo'yicha limitlar ───────────────────────────────────
# Free (obunasi yo'q) foydalanuvchi uchun default:
FREE_MAX_PAGES = 10           # Ko'p sahifali sayt — hamma uchun ochiq (preview)
FREE_CAN_PUBLISH = True       # publik URL beramiz — bepul foydalanuvchilar uchun ham
FREE_MAX_SITES_PER_MONTH = 1  # Obunasiz user 1 ta sayt yarata oladi

# ── Generatsiya lock (parallel double-submit oldini oladi) ───────────
# Bir foydalanuvchi bir vaqtda faqat BITTA Claude generatsiyasi qila oladi.
# Multi-tab yoki tezda 2 marta yuborilganda — 2-si 429 oladi.
# Diqqat: gunicorn workers=2 bo'lsa, lock per-worker (cross-worker race
# nadir bo'lsa-da, bu kichik ehtimol va katta zarar yo'q).
# user_id -> acquired_at (epoch float) — timeout uchun vaqt saqlaymiz
_active_generations: dict = {}
_active_generations_lock = Lock()
_GENERATION_LOCK_TTL = 1200  # 20 daqiqa — har qanday holda lock tozalanadi


def _acquire_generation_lock(user_id: int) -> bool:
    """True qaytarsa — slot olindi, boshqa generatsiya yo'q. False — hali band.
    TTL'dan oshgan (ishlamaydigan) locklar avtomatik tozalanadi.
    """
    now = time.time()
    with _active_generations_lock:
        acquired_at = _active_generations.get(user_id)
        if acquired_at is not None:
            if now - acquired_at < _GENERATION_LOCK_TTL:
                return False
            # TTL o'tdi — lock eskirgan, majburan ozod qilamiz
            logger.warning("Generation lock TTL expired for user_id=%s, force-releasing", user_id)
        _active_generations[user_id] = now
        return True


def _release_generation_lock(user_id: int) -> None:
    with _active_generations_lock:
        _active_generations.pop(user_id, None)


def _force_release_generation_lock(user_id: int) -> bool:
    """Admin / frontend cancel uchun — har qanday holatda lockni tozalaydi.
    True qaytarsa — lock mavjud edi va tozalandi.
    """
    with _active_generations_lock:
        existed = user_id in _active_generations
        _active_generations.pop(user_id, None)
        return existed


def _get_active_subscription(user) -> Optional[Subscription]:
    """Foydalanuvchining hozirda faol obunasini qaytaradi (yoki None)."""
    if not user or not user.is_authenticated:
        return None
    sub = (
        Subscription.objects
        .filter(user=user, status=SubscriptionStatus.ACTIVE)
        .select_related("tariff")
        .order_by("-end_date")
        .first()
    )
    if sub and sub.is_valid():
        # Lazy oylik reset — har request paytida tekshiriladi
        sub.maybe_reset_period()
        return sub
    return None


def _get_user_limits(user) -> Dict[str, int]:
    """
    Foydalanuvchining faol obunasiga qarab limitlarini qaytaradi.
    Faol obuna bo'lmasa — FREE default.

    Returns:
        {
          "max_pages": int,
          "can_publish": bool,
          "max_sites_per_month": int (0 = cheksiz),
          "sites_created_this_month": int,
          "sites_remaining": int (-1 = cheksiz),
          "has_subscription": bool,
        }
    """
    if not user or not user.is_authenticated:
        return {
            "max_pages": FREE_MAX_PAGES,
            "can_publish": False,
            "max_sites_per_month": FREE_MAX_SITES_PER_MONTH,
            "sites_created_this_month": 0,
            "sites_remaining": FREE_MAX_SITES_PER_MONTH,
            "has_subscription": False,
        }

    sub = _get_active_subscription(user)
    if sub:
        tariff = sub.tariff
        return {
            "max_pages": int(tariff.pages_per_project_limit or 1),
            "can_publish": True,
            "max_sites_per_month": int(tariff.max_sites_per_month),
            "sites_created_this_month": int(sub.sites_created_this_month),
            "sites_remaining": sub.sites_remaining,
            "has_subscription": True,
            "tariff_name": tariff.name,
        }

    # Obuna yo'q — FREE
    # Bu user qancha sayt yaratganini sanaymiz (oylik proxy = oxirgi 30 kun)
    free_count = WebsiteProject.objects.filter(
        user=user, created_at__gte=timezone.now() - timedelta(days=30),
    ).count()
    return {
        "max_pages": FREE_MAX_PAGES,
        "can_publish": FREE_CAN_PUBLISH,
        "max_sites_per_month": FREE_MAX_SITES_PER_MONTH,
        "sites_created_this_month": free_count,
        "sites_remaining": max(0, FREE_MAX_SITES_PER_MONTH - free_count),
        "has_subscription": False,
    }


def _site_limit_response(user_limits: Dict, action: str = "Yangi sayt yaratish") -> Response:
    """Oylik sayt limiti tugaganda standart 402 javob."""
    cap = user_limits.get("max_sites_per_month", 0)
    used = user_limits.get("sites_created_this_month", 0)
    has_sub = user_limits.get("has_subscription", False)
    msg = (
        f"⚠️ Oy uchun sayt yaratish limiti tugadi.\n\n"
        f"📌 Sizning tarifingiz: {user_limits.get('tariff_name', 'FREE')}\n"
        f"📊 Bu oy yaratilgan: {used} / {cap}\n\n"
    )
    if has_sub:
        msg += "Yuqoriroq tarifga o'tib, ko'proq sayt yaratishingiz mumkin."
    else:
        msg += "Obuna sotib olib, oyiga ko'proq sayt yarating."
    return Response({
        "success": False,
        "limit_reached": True,
        "error": msg,
        "message": "Oy uchun sayt limiti tugadi",
        "action": action,
        "max_sites_per_month": cap,
        "sites_created_this_month": used,
        "sites_remaining": user_limits.get("sites_remaining", 0),
        "has_subscription": has_sub,
        "pricing_url": "/pricing",
    }, status=status.HTTP_402_PAYMENT_REQUIRED)

# ── TEST REJIMI ───────────────────────────────────────────────
# True bo'lsa — token balans tekshirilmaydi (cheklovsiz test).
# False — real balans tizimi ishlaydi (chat bonus + obuna nano koin).
TOKEN_LIMITS_DISABLED = False


def _auto_publish(project) -> None:
    """Loyihani avtomatik publik qiladi — slug beradi va is_published=True."""
    updates = []
    if not project.slug:
        project.slug = _generate_unique_slug(project.title)
        updates.append("slug")
    if not project.is_published:
        project.is_published = True
        project.published_at = timezone.now()
        updates += ["is_published", "published_at"]
    if updates:
        updates.append("updated_at")
        project.save(update_fields=updates)


def _build_admin_panel_info(project, user, language: str = "uz") -> Optional[Dict]:
    """
    Sayt egasiga admin panel haqida ma'lumot tayyorlaydi.

    Returns: {
      "url": "/uz/site-admin/<slug>",
      "public_url": "/uz/s/<slug>",
      "user_email": "...",
      "instructions": "<chat AI uchun tayyor matn (uz/ru/en)>",
    }
    """
    if not project.slug or not user or not getattr(user, "is_authenticated", False):
        return None

    lang = (language or "uz").lower()[:2]
    if lang not in ("uz", "ru", "en"):
        lang = "uz"

    public_url = f"/{lang}/s/{project.slug}"
    admin_url = f"/{lang}/site-admin/{project.slug}"
    email = user.email or ""

    if lang == "ru":
        instructions = (
            f"\n\n🔐 **АДМИН-ПАНЕЛЬ — только для вас:**\n"
            f"👉 {admin_url}\n\n"
            f"• Это отдельная скрытая ссылка для управления сайтом.\n"
            f"• Войти можно ТОЛЬКО под вашим аккаунтом: **{email}** "
            f"(тот же пароль, что и при регистрации в NanoStUp).\n"
            f"• 🛡 Никто кроме вас не сможет зайти.\n"
            f"• 💾 Сохраните эту ссылку и не передавайте её другим!"
        )
    elif lang == "en":
        instructions = (
            f"\n\n🔐 **ADMIN PANEL — only for you:**\n"
            f"👉 {admin_url}\n\n"
            f"• This is a separate hidden URL to manage your site.\n"
            f"• Sign in ONLY with your account: **{email}** "
            f"(the same password you used to register on NanoStUp).\n"
            f"• 🛡 No one else can access it.\n"
            f"• 💾 Save this link and do not share it!"
        )
    else:  # uz
        instructions = (
            f"\n\n🔐 **ADMIN PANEL — faqat siz uchun:**\n"
            f"👉 {admin_url}\n\n"
            f"• Bu — saytni boshqarish uchun alohida yashirin havola.\n"
            f"• Faqat O'Z akkauntingiz bilan kira olasiz: **{email}** "
            f"(NanoStUp'ga ro'yxatdan o'tgandagi parolingiz bilan).\n"
            f"• 🛡 Sizdan boshqa hech kim kira olmaydi.\n"
            f"• 💾 Bu havolani SAQLANG va boshqalarga BERMANG!"
        )

    return {
        "url": admin_url,
        "public_url": public_url,
        "user_email": email,
        "instructions": instructions,
    }


def _estimate_complexity(schema: Dict) -> Dict:
    """Sayt murakkabligini hisoblaydi va nano koin narxini qaytaradi."""
    pages = schema.get("pages", [])
    section_count = sum(len(p.get("sections", [])) for p in pages)
    page_count = len(pages)

    if section_count <= 3 and page_count <= 1:
        level = "simple"
        label_uz = "Oddiy"
        color = "green"
        cost_nano = COST_SIMPLE_NANO   # 3 000 nano
    elif section_count <= 6 and page_count <= 2:
        level = "medium"
        label_uz = "O'rta"
        color = "yellow"
        cost_nano = COST_MEDIUM_NANO   # 4 000 nano
    else:
        level = "complex"
        label_uz = "Murakkab"
        color = "red"
        cost_nano = COST_COMPLEX_NANO  # 5 000 nano

    # Tahrir narxi: sayt murakkabligiga mos (300/400/500 nano)
    if level == "simple":
        revision_cost_nano = COST_REVISION_SIMPLE_NANO   # 300
    elif level == "medium":
        revision_cost_nano = COST_REVISION_MEDIUM_NANO   # 400
    else:
        revision_cost_nano = COST_REVISION_COMPLEX_NANO  # 500

    return {
        "level": level,
        "label": label_uz,
        "color": color,
        "sections": section_count,
        "pages": page_count,
        "cost_nano": cost_nano,
        "cost_tokens": cost_nano * TOKENS_PER_NANO_COIN,
        "revision_cost_nano": revision_cost_nano,
        "revision_cost_tokens": revision_cost_nano * TOKENS_PER_NANO_COIN,
    }

from .models import ChatMessage, ChatRole, Conversation, ProjectStatus, ProjectVersion, WebsiteProject
from .serializers import WebsiteProjectSerializer

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# AI xato turini aniqlash (foydalanuvchi tilida sodda xabar uchun)
# ─────────────────────────────────────────────────────────────
def _classify_ai_error(exc: BaseException) -> Dict[str, str]:
    """
    AI runtime xatosini turkumlaydi va foydalanuvchi uchun sodda xabar tayyorlaydi.
    Returns: {"code": <slug>, "message": <uz user-facing>, "retryable": "yes"/"no"}
    """
    msg = str(exc).lower()

    # Quota / rate limit
    if any(k in msg for k in ("quota", "rate limit", "429", "too many requests", "resource exhausted")):
        return {
            "code": "ai_quota",
            "message": "AI xizmati hozir band (limit). Bir necha daqiqadan so'ng qayta urinib ko'ring.",
            "retryable": "yes",
        }
    # Timeout
    if any(k in msg for k in ("timeout", "timed out", "deadline", "504")):
        return {
            "code": "ai_timeout",
            "message": "AI javob bermay qoldi (vaqt tugadi). Iltimos, qayta urinib ko'ring.",
            "retryable": "yes",
        }
    # API key / auth / config
    if any(k in msg for k in ("api_key", "api key", "unauthorized", "401", "403", ".env da topilmadi")):
        return {
            "code": "ai_config",
            "message": "AI xizmati sozlamalarida muammo. Administrator bilan bog'laning.",
            "retryable": "no",
        }
    # Network / connection
    if any(k in msg for k in ("connection", "network", "dns", "resolve", "unreachable")):
        return {
            "code": "ai_network",
            "message": "AI serveriga ulanib bo'lmadi. Internetni tekshiring va qayta urinib ko'ring.",
            "retryable": "yes",
        }
    # Server-side
    if any(k in msg for k in ("500", "502", "503", "internal", "overload")):
        return {
            "code": "ai_server",
            "message": "AI serveri vaqtincha javob bermayapti. Bir necha daqiqada qayta urinib ko'ring.",
            "retryable": "yes",
        }
    # Default
    return {
        "code": "ai_unavailable",
        "message": "AI xizmati hozircha ishlamayapti. Iltimos, birozdan keyin qayta urinib ko'ring.",
        "retryable": "yes",
    }


def _ai_error_response(exc: BaseException, *, log_prefix: str = "AI") -> Response:
    """RuntimeError -> 502 Response with error_code, retryable + sodda xabar."""
    info = _classify_ai_error(exc)
    logger.error("%s xatosi [%s]: %s", log_prefix, info["code"], exc)
    return Response(
        {
            "success": False,
            "error": info["message"],
            "error_code": info["code"],
            "retryable": info["retryable"] == "yes",
        },
        status=status.HTTP_502_BAD_GATEWAY,
    )


def _ensure_multipage(schema: Dict) -> Dict:
    """
    AI faqat 1 sahifa bergan bo'lsa, standart ko'p sahifali tuzilma yaratadi.
    Mavjud sahifalar buzilmaydi. Minimal 4 sahifa: home, about, services, contact.
    """
    pages = schema.get("pages", [])
    if not isinstance(pages, list):
        pages = []

    existing_slugs = {p.get("slug", "") for p in pages}

    # Agar allaqachon 4+ sahifa bo'lsa — hech narsa qilmaymiz
    if len(pages) >= 4:
        return schema

    # home sahifasidan site_name va birinchi sektsiya mazmunini olamiz
    home_page = next((p for p in pages if p.get("slug") == "home"), pages[0] if pages else {})
    home_sections = home_page.get("sections", [])
    site_name = schema.get("siteName") or schema.get("name") or "Biznes"

    # home sahifasida qaysi turdagi seksiyalar bor?
    home_types = {s.get("type", "") for s in home_sections}

    # -- about sahifasi --
    if "about" not in existing_slugs:
        about_sections = []
        # home dan about seksiyasini ko'chirmasdan nusxa olamiz
        existing_about = [s for s in home_sections if s.get("type") == "about"]
        if existing_about:
            about_sections.extend(existing_about)
        else:
            about_sections.append({
                "id": "about-main",
                "type": "about",
                "content": {
                    "title": f"{site_name} haqida",
                    "subtitle": "Bizning hikoyamiz",
                    "description": f"{site_name} — mijozlarimizga sifatli xizmat ko'rsatishga bag'ishlangan kompaniya.",
                    "mission": "Har bir mijozga eng yaxshi xizmat ko'rsatish",
                    "values": [
                        {"title": "Sifat", "text": "Yuqori sifatli mahsulot va xizmatlar"},
                        {"title": "Ishonch", "text": "Mijozlarimizga to'liq ishonch"},
                        {"title": "Innovatsiya", "text": "Zamonaviy yechimlar"}
                    ]
                }
            })
        # stats qo'shamiz agar home da yo'q bo'lsa
        if "stats" not in home_types:
            about_sections.append({
                "id": "about-stats",
                "type": "stats",
                "content": {"items": [
                    {"value": "5+", "label": "Yillik tajriba"},
                    {"value": "500+", "label": "Mamnun mijozlar"},
                    {"value": "100%", "label": "Kafolat"}
                ]}
            })
        # team
        about_sections.append({
            "id": "about-team",
            "type": "team",
            "content": {
                "title": "Bizning jamoa",
                "subtitle": "Professional mutaxassislar",
                "items": [
                    {"name": "Rahbar", "role": "Direktor", "bio": "10 yillik tajriba"},
                    {"name": "Mutaxassis", "role": "Bosh mutaxassis", "bio": "5 yillik tajriba"},
                    {"name": "Yordamchi", "role": "Mijozlar bilan ishlash", "bio": "3 yillik tajriba"}
                ]
            }
        })
        pages.append({"slug": "about", "title": "Biz haqimizda", "sections": about_sections})
        existing_slugs.add("about")

    # -- services sahifasi --
    if "services" not in existing_slugs:
        services_sections = []
        existing_services = [s for s in home_sections if s.get("type") in ("services", "features")]
        if existing_services:
            services_sections.extend(existing_services)
        else:
            services_sections.append({
                "id": "services-main",
                "type": "services",
                "content": {
                    "title": "Bizning xizmatlar",
                    "subtitle": "Sizga mos yechimni topamiz",
                    "items": [
                        {"icon": "⭐", "title": "Asosiy xizmat", "description": "Professional darajada xizmat", "price": "Narx kelishiladi"},
                        {"icon": "🔧", "title": "Qo'shimcha xizmat", "description": "Har qanday so'rovni bajaramiz", "price": "Narx kelishiladi"},
                        {"icon": "✅", "title": "Kafolat", "description": "Barcha ishlarimizga kafolat beramiz", "price": "Bepul"}
                    ]
                }
            })
        # faq
        services_sections.append({
            "id": "services-faq",
            "type": "faq",
            "content": {
                "title": "Ko'p so'raladigan savollar",
                "subtitle": "Sizning savollaringizga javob beramiz",
                "items": [
                    {"question": "Qanday murojaat qilish mumkin?", "answer": "Bizga telefon yoki email orqali murojaat qilishingiz mumkin."},
                    {"question": "Xizmat narxi qancha?", "answer": "Narx loyiha hajmiga qarab kelishiladi. Bepul konsultatsiya uchun aloqaga chiqing."},
                    {"question": "Qancha vaqt ketadi?", "answer": "Loyiha murakkabligiga qarab 1-4 hafta davom etadi."}
                ]
            }
        })
        pages.append({"slug": "services", "title": "Xizmatlar", "sections": services_sections})
        existing_slugs.add("services")

    # -- contact sahifasi --
    if "contact" not in existing_slugs:
        existing_contact = [s for s in home_sections if s.get("type") == "contact"]
        if existing_contact:
            contact_sections = existing_contact
        else:
            contact_sections = [{
                "id": "contact-main",
                "type": "contact",
                "content": {
                    "title": "Biz bilan bog'laning",
                    "subtitle": "Har qanday savol uchun murojaat qiling",
                    "email": "info@example.com",
                    "phone": "+998 90 000 00 00",
                    "address": "Toshkent, O'zbekiston",
                    "workingHours": "Du-Ju: 9:00 - 18:00"
                }
            }]
        pages.append({"slug": "contact", "title": "Aloqa", "sections": contact_sections})
        existing_slugs.add("contact")

    schema["pages"] = pages
    return schema


# ─────────────────────────────────────────────────────────────────
# DESIGN RANDOMIZATION ENGINE
# ─────────────────────────────────────────────────────────────────

LAYOUT_PATTERNS = [
    "centered-hero", "split-hero", "hero-with-sidebar", "image-first-hero",
    "dashboard-style", "magazine-layout", "saas-landing", "local-business",
    "premium-dark", "gradient-modern", "hero-fullscreen", "minimal-clean",
    "bold-typography", "glassmorphism-card", "asymmetric-layout",
    "hero-with-cards", "editorial", "overlap-cards",
    "two-column-content", "bold-hero",
]

DESIGN_STYLES = [
    "minimal", "luxury", "startup", "dark", "glassmorphism",
    "editorial", "playful", "corporate", "bold-gradient", "local-uzbek",
]

BUSINESS_PALETTES: Dict[str, list] = {
    "restaurant": [
        {"primary": "#e85d04", "accent": "#f48c06", "bg": "#fff8f0", "text": "#1a0a00", "font": "Poppins"},
        {"primary": "#d62828", "accent": "#fcbf49", "bg": "#1a0000", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#606c38", "accent": "#dda15e", "bg": "#fefae0", "text": "#283618", "font": "Playfair Display"},
        {"primary": "#bc6c25", "accent": "#dda15e", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
    ],
    "salon": [
        {"primary": "#c9184a", "accent": "#ff4d6d", "bg": "#fff0f3", "text": "#1a0005", "font": "Playfair Display"},
        {"primary": "#6d2b8f", "accent": "#d4a5ff", "bg": "#f8f0ff", "text": "#1a0030", "font": "Raleway"},
        {"primary": "#b5179e", "accent": "#f72585", "bg": "#0d001a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#a2836e", "accent": "#d4b8a5", "bg": "#fdf5f0", "text": "#2d1b12", "font": "Playfair Display"},
    ],
    "clinic": [
        {"primary": "#0077b6", "accent": "#00b4d8", "bg": "#f0f8ff", "text": "#023e8a", "font": "Inter"},
        {"primary": "#2d6a4f", "accent": "#52b788", "bg": "#f0fff4", "text": "#081c15", "font": "Inter"},
        {"primary": "#005f73", "accent": "#0a9396", "bg": "#ffffff", "text": "#001219", "font": "Space Grotesk"},
        {"primary": "#1d3557", "accent": "#457b9d", "bg": "#f8f9fa", "text": "#1d3557", "font": "Raleway"},
    ],
    "tech": [
        {"primary": "#6366f1", "accent": "#8b5cf6", "bg": "#0f0f1a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#0ea5e9", "accent": "#6366f1", "bg": "#020617", "text": "#ffffff", "font": "Inter"},
        {"primary": "#10b981", "accent": "#06b6d4", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#f59e0b", "accent": "#ef4444", "bg": "#09090b", "text": "#ffffff", "font": "Montserrat"},
    ],
    "gym": [
        {"primary": "#e63946", "accent": "#f4a261", "bg": "#0d0d0d", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#f97316", "accent": "#fbbf24", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#dc2626", "accent": "#16a34a", "bg": "#111827", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#7c3aed", "accent": "#f59e0b", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
    ],
    "hotel": [
        {"primary": "#b5838d", "accent": "#e5989b", "bg": "#fff4e6", "text": "#2d1b1e", "font": "Playfair Display"},
        {"primary": "#c9a84c", "accent": "#e5c687", "bg": "#1a1100", "text": "#ffffff", "font": "Playfair Display"},
        {"primary": "#8338ec", "accent": "#ff006e", "bg": "#10002b", "text": "#ffffff", "font": "Raleway"},
        {"primary": "#c77dff", "accent": "#e0aaff", "bg": "#10002b", "text": "#ffffff", "font": "Playfair Display"},
    ],
    "agency": [
        {"primary": "#7209b7", "accent": "#f72585", "bg": "#10002b", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#3a0ca3", "accent": "#4cc9f0", "bg": "#0d0d0d", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#f72585", "accent": "#7209b7", "bg": "#ffffff", "text": "#10002b", "font": "Montserrat"},
        {"primary": "#ff6b35", "accent": "#004e89", "bg": "#ffffff", "text": "#1a1a2e", "font": "Raleway"},
    ],
    "education": [
        {"primary": "#2d6a4f", "accent": "#52b788", "bg": "#f0fff4", "text": "#081c15", "font": "Poppins"},
        {"primary": "#1d3557", "accent": "#457b9d", "bg": "#f8f9fa", "text": "#1d3557", "font": "Inter"},
        {"primary": "#6930c3", "accent": "#5e60ce", "bg": "#f8f0ff", "text": "#1a003a", "font": "Space Grotesk"},
        {"primary": "#e76f51", "accent": "#f4a261", "bg": "#fef9ef", "text": "#1a0a00", "font": "Poppins"},
    ],
    "shop": [
        {"primary": "#e63946", "accent": "#457b9d", "bg": "#ffffff", "text": "#1d3557", "font": "Inter"},
        {"primary": "#0f4c81", "accent": "#f7b731", "bg": "#ffffff", "text": "#1a1a2e", "font": "Montserrat"},
        {"primary": "#2d6a4f", "accent": "#52b788", "bg": "#f8fff8", "text": "#0a1a0a", "font": "Inter"},
        {"primary": "#6d2b8f", "accent": "#d4a5ff", "bg": "#ffffff", "text": "#1a0030", "font": "Space Grotesk"},
    ],
    "news": [
        {"primary": "#dc2626", "accent": "#1f2937", "bg": "#fafafa", "text": "#111827", "font": "Playfair Display"},
        {"primary": "#b91c1c", "accent": "#facc15", "bg": "#ffffff", "text": "#0f172a", "font": "Inter"},
        {"primary": "#0f172a", "accent": "#dc2626", "bg": "#f8fafc", "text": "#020617", "font": "Playfair Display"},
        {"primary": "#7c2d12", "accent": "#f59e0b", "bg": "#fffbeb", "text": "#1c1917", "font": "Playfair Display"},
    ],
    "real_estate": [
        {"primary": "#1d4e89", "accent": "#f4a261", "bg": "#f8f9fa", "text": "#1a1a2e", "font": "Raleway"},
        {"primary": "#264653", "accent": "#e9c46a", "bg": "#fefae0", "text": "#1a1a1a", "font": "Playfair Display"},
        {"primary": "#1b4332", "accent": "#d4a574", "bg": "#f4f1ec", "text": "#0a1a0a", "font": "Inter"},
        {"primary": "#0f172a", "accent": "#c9a84c", "bg": "#fafafa", "text": "#020617", "font": "Raleway"},
    ],
    "auto": [
        {"primary": "#dc2626", "accent": "#fbbf24", "bg": "#0a0a0a", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#212529", "accent": "#ffd60a", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#0ea5e9", "accent": "#f97316", "bg": "#0f172a", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#dc2626", "accent": "#1f2937", "bg": "#ffffff", "text": "#0f172a", "font": "Inter"},
    ],
    "legal": [
        {"primary": "#1b2a4a", "accent": "#c9a84c", "bg": "#f5f0e8", "text": "#1b2a4a", "font": "Playfair Display"},
        {"primary": "#0f172a", "accent": "#b45309", "bg": "#fafaf9", "text": "#0c0a09", "font": "Playfair Display"},
        {"primary": "#1e3a8a", "accent": "#92400e", "bg": "#fefce8", "text": "#1c1917", "font": "Raleway"},
        {"primary": "#0c4a6e", "accent": "#a16207", "bg": "#f8fafc", "text": "#0c0a09", "font": "Inter"},
    ],
    "portfolio": [
        {"primary": "#4361ee", "accent": "#4cc9f0", "bg": "#0d1b2a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#f72585", "accent": "#7209b7", "bg": "#10002b", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#0a0a0a", "accent": "#fbbf24", "bg": "#fafafa", "text": "#0a0a0a", "font": "Space Grotesk"},
        {"primary": "#10b981", "accent": "#06b6d4", "bg": "#0a0a0a", "text": "#ffffff", "font": "Inter"},
    ],
    "ngo": [
        {"primary": "#2d6a4f", "accent": "#95d5b2", "bg": "#f0fff4", "text": "#1b4332", "font": "Poppins"},
        {"primary": "#0077b6", "accent": "#90e0ef", "bg": "#f0f8ff", "text": "#03045e", "font": "Inter"},
        {"primary": "#bc4749", "accent": "#f4a261", "bg": "#fefae0", "text": "#283618", "font": "Raleway"},
        {"primary": "#7209b7", "accent": "#fcbf49", "bg": "#ffffff", "text": "#10002b", "font": "Poppins"},
    ],
    "finance": [
        {"primary": "#1e3a8a", "accent": "#fbbf24", "bg": "#f8fafc", "text": "#0f172a", "font": "Inter"},
        {"primary": "#0c4a6e", "accent": "#10b981", "bg": "#ffffff", "text": "#0c0a09", "font": "Inter"},
        {"primary": "#0a0a0a", "accent": "#22c55e", "bg": "#fafafa", "text": "#0a0a0a", "font": "Space Grotesk"},
        {"primary": "#1e293b", "accent": "#eab308", "bg": "#0f172a", "text": "#ffffff", "font": "Montserrat"},
    ],
    "photo": [
        {"primary": "#0a0a0a", "accent": "#fbbf24", "bg": "#fafafa", "text": "#0a0a0a", "font": "Playfair Display"},
        {"primary": "#fafafa", "accent": "#fbbf24", "bg": "#0a0a0a", "text": "#fafafa", "font": "Space Grotesk"},
        {"primary": "#7c2d12", "accent": "#fbbf24", "bg": "#fafaf9", "text": "#1c1917", "font": "Playfair Display"},
        {"primary": "#1e293b", "accent": "#f43f5e", "bg": "#fafafa", "text": "#020617", "font": "Inter"},
    ],
    "wedding": [
        {"primary": "#c8a880", "accent": "#e8c5a0", "bg": "#fff8f0", "text": "#2a1810", "font": "Playfair Display"},
        {"primary": "#9d4e4e", "accent": "#e8c5a0", "bg": "#fdf5f0", "text": "#2d1b12", "font": "Playfair Display"},
        {"primary": "#a16207", "accent": "#fde68a", "bg": "#fffbeb", "text": "#1c1917", "font": "Playfair Display"},
        {"primary": "#831843", "accent": "#fbcfe8", "bg": "#fdf2f8", "text": "#500724", "font": "Playfair Display"},
    ],
    "pharmacy": [
        {"primary": "#16a34a", "accent": "#0ea5e9", "bg": "#f0fdf4", "text": "#052e16", "font": "Inter"},
        {"primary": "#0ea5e9", "accent": "#16a34a", "bg": "#f0f9ff", "text": "#0c4a6e", "font": "Inter"},
        {"primary": "#059669", "accent": "#dc2626", "bg": "#ffffff", "text": "#064e3b", "font": "Poppins"},
        {"primary": "#0d9488", "accent": "#14b8a6", "bg": "#f0fdfa", "text": "#042f2e", "font": "Inter"},
    ],
    "music_event": [
        {"primary": "#a855f7", "accent": "#ec4899", "bg": "#0a0a0a", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#f43f5e", "accent": "#fbbf24", "bg": "#0f0a1a", "text": "#ffffff", "font": "Montserrat"},
        {"primary": "#06b6d4", "accent": "#a855f7", "bg": "#000000", "text": "#ffffff", "font": "Space Grotesk"},
        {"primary": "#fbbf24", "accent": "#dc2626", "bg": "#0a0a0a", "text": "#ffffff", "font": "Montserrat"},
    ],
    "default": [
        {"primary": "#2563eb", "accent": "#7c3aed", "bg": "#ffffff", "text": "#111827", "font": "Inter"},
        {"primary": "#0f172a", "accent": "#6366f1", "bg": "#f8fafc", "text": "#0f172a", "font": "Space Grotesk"},
        {"primary": "#059669", "accent": "#0891b2", "bg": "#ffffff", "text": "#064e3b", "font": "Poppins"},
        {"primary": "#dc2626", "accent": "#b45309", "bg": "#fffbeb", "text": "#1c1917", "font": "Inter"},
    ],
}

BUSINESS_KEYWORDS: Dict[str, list] = {
    # Tartibni saqlash muhim: aniqroq nichelar avval (umumiy oxirida)
    "news":         ["yangilik", "news", "gazeta", "akhbor", "axborot", "jurnal", "jurnalistika", "media", "axborotnoma"],
    "pharmacy":     ["dorixona", "pharmacy", "dori", "apteka", "medikament"],
    "clinic":       ["klinika", "clinic", "shifokor", "doktor", "tibbiy", "hospital", "health", "sog'liq", "stomatolog", "shifoxona"],
    "wedding":      ["to'y", "toy", "wedding", "nikoh", "marriage", "to\u2019y", "kelin", "kuyov", "to'yxona"],
    "music_event":  ["musiqa", "music", "konsert", "concert", "event", "tadbir", "festival", "dj", "club", "klub"],
    "photo":        ["fotograf", "photo", "photography", "suratchi", "surat olish", "video studio"],
    "finance":      ["bank", "moliya", "finance", "kredit", "loan", "sug'urta", "insurance", "invest", "akademik moliyaviy"],
    "legal":        ["yuridik", "lawyer", "advokat", "legal", "huquq", "hukuq", "sud", "notary", "notarius"],
    "real_estate":  ["ko'chmas mulk", "kochmas", "real estate", "uy sotish", "kvartira", "property", "realtor", "agentlik uy", "ijara"],
    "auto":         ["avto", "auto", "mashina", "car ", "transport", "taxi", "avtomobil", "servis stansiya", "ehtiyot qism"],
    "portfolio":    ["portfolio", "freelancer", "shaxsiy", "personal", "resume"],
    "ngo":          ["xayriya", "jamoat", "ngo", "fond", "charity", "non-profit", "foundation", "volunteer", "yordam fondi"],
    "restaurant":   ["restoran", "kafe", "cafe", "taom", "oshxona", "pizza", "burger", "sushi", "food", "ovqat", "choyxona", "milliy taom"],
    "salon":        ["salon", "spa", "beauty", "go'zallik", "gozallik", "barber", "nail", "soch", "kosmetik", "manikur", "go\u2019zallik"],
    "tech":         ["tech", "saas", "startup", "software", "it kompaniya", "dastur", "ilova", "app ", "digital", "texnologiya", "web studio", "ai "],
    "gym":          ["gym", "fitness", "sport", "trener", "bodybuilding", "crossfit", "yoga", "zal", "mma", "jismoniy"],
    "hotel":        ["hotel", "mehmonxona", "turizm", "travel", "tourism", "resort", "sayohat", "hostel", "otel"],
    "agency":       ["agentlik", "agency", "kreativ", "creative", "dizayn", "design studio", "marketing", "reklama", "smm", "branding"],
    "education":    ["ta'lim", "talim", "kurs", "maktab", "akademiya", "school", "academy", "edu", "o'quv", "trening", "o\u2019quv markaz"],
    "shop":         ["shop", "do'kon", "dokon", "market", "mahsulot", "store", "ecommerce", "savdo", "sotish", "savdo markazi"],
}


def _detect_business_type(prompt: str) -> str:
    """Promptdan biznes turini aniqlaydi."""
    lower = prompt.lower()
    for btype, keywords in BUSINESS_KEYWORDS.items():
        if any(k in lower for k in keywords):
            return btype
    return "default"


def _pick_random_design(business_type: str) -> tuple:
    """Har generatsiyada yangi random dizayn va rang palitrasini tanlaydi."""
    style = _random.choice(DESIGN_STYLES)
    layout = _random.choice(LAYOUT_PATTERNS)

    mood_map = {
        "minimal": "calm", "luxury": "elegant", "startup": "modern",
        "dark": "modern", "glassmorphism": "premium", "editorial": "elegant",
        "playful": "energetic", "corporate": "calm", "bold-gradient": "energetic",
        "local-uzbek": "modern",
    }
    mood = mood_map.get(style, "modern")

    if style in ("dark", "glassmorphism", "bold-gradient"):
        corner = _random.choice(["medium", "large", "extra"])
    elif style == "corporate":
        corner = _random.choice(["none", "small", "medium"])
    else:
        corner = _random.choice(["small", "medium", "large", "extra"])

    palettes = BUSINESS_PALETTES.get(business_type, BUSINESS_PALETTES["default"])
    palette = _random.choice(palettes)

    design = {
        "style": style,
        "layoutPattern": layout,
        "mood": mood,
        "density": _random.choice(["compact", "comfortable", "spacious"]),
        "cornerRadius": corner,
        "animation": _random.choice(["none", "subtle", "smooth"]),
    }
    return design, palette


def _build_design_constraint(design: Dict, palette: Dict) -> str:
    """Claude promptiga qo'shiladigan majburiy dizayn constraint matni."""
    return (
        "\n\n=== MANDATORY DESIGN CONSTRAINT ===\n"
        f"Style: {design['style']}  |  Layout: {design['layoutPattern']}  |  Mood: {design['mood']}\n"
        f"Density: {design['density']}  |  CornerRadius: {design['cornerRadius']}\n"
        "\nColor palette — USE EXACTLY THESE VALUES in settings{}:\n"
        f'  primaryColor: "{palette["primary"]}"\n'
        f'  accentColor:  "{palette["accent"]}"\n'
        f'  bgColor:      "{palette["bg"]}"\n'
        f'  textColor:    "{palette["text"]}"\n'
        f'  font:         "{palette["font"]}"\n'
        "\nInclude this block at top level of JSON (same level as settings):\n"
        '"design": {\n'
        f'  "style": "{design["style"]}",\n'
        f'  "layoutPattern": "{design["layoutPattern"]}",\n'
        f'  "mood": "{design["mood"]}",\n'
        f'  "density": "{design["density"]}",\n'
        f'  "cornerRadius": "{design["cornerRadius"]}",\n'
        f'  "animation": "{design["animation"]}"\n'
        "}\n"
        "=== END DESIGN CONSTRAINT ==="
    )


def _deduct_partial_nano(
    user, conversation: Optional[Conversation], nano: int,
) -> int:
    """
    Generatsiya davomida (har 5 soniyada) qisman nano koin yechib olish.
    Mavjud bo'lganini yechib oladi, raise qilmaydi.
    Returns: haqiqatda yechib olingan nano miqdori.
    """
    if nano <= 0 or user is None or not getattr(user, "is_authenticated", False):
        return 0
    deducted = 0
    remaining = nano

    # 1. Avval chat bonus budjetidan
    if conversation and conversation.chat_budget_nano > 0 and remaining > 0:
        bonus_use = min(conversation.chat_budget_nano, remaining)
        if bonus_use > 0:
            try:
                Conversation.objects.filter(id=conversation.id).update(
                    chat_budget_nano=F("chat_budget_nano") - bonus_use,
                )
                conversation.refresh_from_db(fields=["chat_budget_nano"])
                deducted += bonus_use
                remaining -= bonus_use
            except Exception:
                logger.warning("Partial bonus deduct failed", exc_info=True)

    # 2. Qolgan qismini obuna tokenlaridan
    if remaining > 0:
        sub_nano_avail = (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN
        sub_use = min(sub_nano_avail, remaining)
        if sub_use > 0:
            try:
                user.deduct_tokens(sub_use * TOKENS_PER_NANO_COIN)
                deducted += sub_use
            except Exception:
                logger.warning("Partial subscription deduct failed", exc_info=True)
    return deducted


def _deduct_with_partial(
    user, conversation: Optional[Conversation], cost_tokens: int,
    request,
) -> Dict[str, int]:
    """
    `_deduct_for_generation` ustidan o'rovchi: agar `request._billing_ctx`
    da progressive partial deduction bo'lgan bo'lsa, qolgan farqnigina
    yechib oladi va response'ga umumiy hisobotni qo'shadi.

    Returns: {"from_bonus_nano", "from_subscription_tokens", "total_cost_nano",
              "partial_deducted_nano", "final_deducted_nano"}
    """
    ctx = getattr(request, "_billing_ctx", None) if request is not None else None
    partial_nano = int(ctx.get("deducted_nano", 0)) if isinstance(ctx, dict) else 0
    aborted = bool(ctx.get("aborted")) if isinstance(ctx, dict) else False

    target_nano = cost_tokens // TOKENS_PER_NANO_COIN
    remaining_nano = max(0, target_nano - partial_nano)
    remaining_tokens = remaining_nano * TOKENS_PER_NANO_COIN

    # Foydalanuvchi pauza qilgan bo'lsa — qolgan top-up'ni yechib olmaymiz.
    # Faqat progressive partial yechilgan miqdor saqlanib qoladi.
    if aborted:
        remaining_tokens = 0
        logger.info("User aborted — top-up skipped (partial=%d nano kept)", partial_nano)

    if remaining_tokens > 0:
        deduction = _deduct_for_generation(user, conversation, remaining_tokens)
    else:
        deduction = {
            "from_bonus_nano": 0,
            "from_subscription_tokens": 0,
            "from_subscription_nano": 0,
            "bonus_left": conversation.chat_budget_nano if conversation else 0,
            "total_cost_nano": 0,
        }

    deduction["partial_deducted_nano"] = partial_nano
    deduction["final_deducted_nano"] = deduction.get("total_cost_nano", 0)
    deduction["grand_total_nano"] = partial_nano + deduction["final_deducted_nano"]
    return deduction


def _deduct_for_generation(
    user, conversation: Optional[Conversation], cost_tokens: int,
) -> Dict[str, int]:
    """
    Kod generatsiyasi uchun to'lov olish.
    Birinchi navbatda conversation.chat_budget_nano (500 bonus) ishlatiladi,
    undan keyin user.tokens_balance (obuna) yechiladi.

    Returns: {"from_bonus": X_nano, "from_subscription": Y_tokens, "bonus_left": Z_nano}
    """
    cost_nano = cost_tokens // TOKENS_PER_NANO_COIN
    from_bonus = 0
    from_subscription = 0

    # 1. Bonus chat budjetidan yechamiz
    if conversation and conversation.chat_budget_nano > 0:
        from_bonus = min(conversation.chat_budget_nano, cost_nano)
        Conversation.objects.filter(id=conversation.id).update(
            chat_budget_nano=F("chat_budget_nano") - from_bonus,
        )
        conversation.refresh_from_db(fields=["chat_budget_nano"])

    # 2. Qolgan qismini obuna tokenlaridan yechamiz
    remaining_nano = cost_nano - from_bonus
    if remaining_nano > 0:
        from_subscription = remaining_nano * TOKENS_PER_NANO_COIN
        user.deduct_tokens(from_subscription)

    return {
        "from_bonus_nano": from_bonus,
        "from_subscription_tokens": from_subscription,
        "from_subscription_nano": from_subscription // TOKENS_PER_NANO_COIN,
        "bonus_left": conversation.chat_budget_nano if conversation else 0,
        "total_cost_nano": cost_nano,
    }


def _get_site_generation_cost_tokens(schema: Dict) -> int:
    """Schema murakkabligiga qarab nano koin narxini token sifatida qaytaradi."""
    complexity = _estimate_complexity(schema)
    return complexity["cost_tokens"]



def _can_afford_nano(user, conversation, cost_nano: int) -> bool:
    """Chat bonus + obuna birga yetadimi? (nano koin)."""
    if cost_nano == 0:
        return True
    bonus = conversation.chat_budget_nano if conversation else 0
    sub_nano = (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN
    return (bonus + sub_nano) >= cost_nano


def _insufficient_balance_response(user, conversation, cost_nano: int, action: str = "sayt yaratish"):
    """Balans yetmasa — aniq xabar bilan 402 Response qaytaradi."""
    bonus = conversation.chat_budget_nano if conversation else 0
    total_nano = (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN + bonus
    return Response({
        "success": False,
        "insufficient_tokens": True,
        "error": (
            f"⚠️ Nano koin yetarli emas!\n\n"
            f"📌 {action} uchun: {cost_nano:,} nano koin\n"
            f"💰 Sizning balansingiz: {total_nano:,} nano koin\n\n"
            f"Yangi nano koin sotib olish uchun: /pricing"
        ),
        "required_nano": cost_nano,
        "current_nano": total_nano,
        "chat_bonus_nano": bonus,
        "subscription_nano": (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN,
        "pricing_url": "/pricing",
    }, status=status.HTTP_402_PAYMENT_REQUIRED)


def _can_afford_generation(user, conversation: Optional[Conversation], cost_tokens: int) -> bool:
    """Chat bonus + obuna birga yetadimi? (token)."""
    cost_nano = cost_tokens // TOKENS_PER_NANO_COIN
    return _can_afford_nano(user, conversation, cost_nano)


# ─────────────────────────────────────────────────────────────
# Chat tarixi helperlari
# ─────────────────────────────────────────────────────────────

def _get_or_create_conversation(
    user,
    conversation_id: Optional[str],
    language: str,
    first_prompt: str,
) -> Optional[Conversation]:
    """Mavjud suhbatni topadi yoki yangisini yaratadi. Anonymous user uchun None qaytaradi."""
    if not user or not user.is_authenticated:
        return None
    if conversation_id:
        try:
            return Conversation.objects.get(id=conversation_id, user=user)
        except Conversation.DoesNotExist:
            pass
    # Yangi suhbat — sarlavha birinchi promptdan kesilgan qismi
    title = first_prompt.strip().replace("\n", " ")[:80] or "Yangi suhbat"
    return Conversation.objects.create(user=user, language=language, title=title)


def _save_message(
    conversation: Optional[Conversation],
    role: str,
    content: str,
    intent: str = "",
    metadata: Optional[dict] = None,
    tokens_input: int = 0,
    tokens_output: int = 0,
    duration_ms: int = 0,
    project_version: Optional[ProjectVersion] = None,
) -> Optional[ChatMessage]:
    """Bitta xabarni DB'ga yozadi va suhbatning agregat hisoblarini yangilaydi."""
    if conversation is None or not content:
        return None
    msg = ChatMessage.objects.create(
        conversation=conversation,
        role=role,
        content=content[:10000],  # juda uzun xabarlarni cheklaymiz
        intent=intent,
        metadata=metadata,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        duration_ms=duration_ms,
        project_version=project_version,
    )
    # Agregatlarni atomik yangilaymiz
    Conversation.objects.filter(id=conversation.id).update(
        total_messages=F("total_messages") + 1,
        total_tokens_input=F("total_tokens_input") + tokens_input,
        total_tokens_output=F("total_tokens_output") + tokens_output,
    )
    return msg


class _IpRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            return True


_ai_rate_limiter = _IpRateLimiter(max_requests=30, window_seconds=60)


def _get_client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def process_prompt(self, request):
        """
        Streaming wrapper:
          - Har 4 soniyada keep-alive bytes yuboradi (Render proxy timeoutining oldini oladi)
          - Har 5 soniyada PROGRESSIVE billing: ozgina nano koin yechib boradi.
            Agar foydalanuvchi yarmida to'xtatsa — faqat o'tgan vaqtga proporsional
            nano miqdori yechiladi, qolgani saqlanib qoladi.
        """
        # ── Parallel generation guard ──────────────────────────────────
        # Bir foydalanuvchi bir vaqtda faqat 1 ta so'rov yubora oladi.
        # Multi-tab yoki double-click oldini oladi.
        _user_id = request.user.id if getattr(request.user, "is_authenticated", False) else None
        _lock_acquired = False
        if _user_id is not None:
            if not _acquire_generation_lock(_user_id):
                return Response(
                    {
                        "success": False,
                        "error": (
                            "⏳ Avvalgi so'rovingiz hali tugamadi. "
                            "Iltimos, kuting yoki uni to'xtating, keyin qayta urinib ko'ring."
                        ),
                        "concurrent_request": True,
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
            _lock_acquired = True

        result_q = _queue_module.Queue()

        # ── Progressive billing context ────────────────────────────────
        # `_process_prompt_impl` ichida deduct qilinganda, bu yerda allaqachon
        # yechib olingan miqdor ayriladi (ortiqcha to'lov bo'lmaydi).
        billing_ctx: Dict = {
            "deducted_nano": 0,                      # shu paytgacha yechilgan
            "expected_cost_nano": COST_COMPLEX_NANO, # max ehtimoliy narx (5000)
            "expected_duration_sec": 90,             # taxminiy generatsiya vaqti
            "user_id": request.user.id if getattr(request.user, "is_authenticated", False) else None,
            "conversation_id": None,                  # _process_prompt_impl yangilaydi
            "stopped": False,                         # generatsiya yakunlandimi?
            "aborted": False,                         # foydalanuvchi pause/abort qildimi?
            # Progressive billing FAQAT kod yozish (Claude generate/revise) boshlanganda
            # aktivlashadi. Chat (Gemini suhbat) bepul — nano yechilmaydi.
            "generation_started": False,
        }
        # request orqali _process_prompt_impl ham bu kontekstga kira oladi
        request._billing_ctx = billing_ctx  # type: ignore[attr-defined]

        def _run():
            try:
                resp = self._process_prompt_impl(request)
                result_q.put(("ok", resp.status_code, resp.data))
            except Exception as exc:
                logger.exception("process_prompt thread xatosi")
                result_q.put(("err", 500, {"success": False, "error": str(exc)}))
            finally:
                billing_ctx["stopped"] = True
                # Generatsiya tugadi (yoki crash bo'ldi) — slot ozod qilinadi.
                if _lock_acquired and _user_id is not None:
                    _release_generation_lock(_user_id)

        threading.Thread(target=_run, daemon=True).start()

        def _stream():
            # 2s — har 2 soniyada nano koin kamayadi (foydalanuvchi ko'rishi uchun).
            BILLING_INTERVAL = 2.0
            last_bill_at = time.monotonic()
            try:
                while True:
                    try:
                        kind, status_code, data = result_q.get(timeout=2)
                        payload = json.dumps(data, ensure_ascii=False)
                        yield payload.encode("utf-8")
                        return
                    except _queue_module.Empty:
                        yield b" "   # keep-alive

                        # ── Progressive partial deduction ────────────────
                        # FAQAT kod yozish (Claude) boshlanganda yechiladi.
                        # Chat (Gemini suhbat) — bepul.
                        now = time.monotonic()
                        if (
                            not billing_ctx["stopped"]
                            and not billing_ctx.get("aborted")
                            and billing_ctx.get("generation_started")
                            and billing_ctx["user_id"] is not None
                            and not TOKEN_LIMITS_DISABLED
                            and (now - last_bill_at) >= BILLING_INTERVAL
                        ):
                            elapsed = now - last_bill_at
                            cap = billing_ctx["expected_cost_nano"]
                            already = billing_ctx["deducted_nano"]
                            if already < cap:
                                chunk_nano = int(cap * elapsed / billing_ctx["expected_duration_sec"])
                                chunk_nano = min(chunk_nano, cap - already)
                                if chunk_nano > 0:
                                    try:
                                        User = type(request.user)
                                        u = User.objects.filter(id=billing_ctx["user_id"]).first()
                                        conv = None
                                        cid = billing_ctx.get("conversation_id")
                                        if cid:
                                            conv = Conversation.objects.filter(id=cid).first()
                                        actually_deducted = _deduct_partial_nano(u, conv, chunk_nano)
                                        billing_ctx["deducted_nano"] += actually_deducted
                                    except Exception:
                                        logger.warning("Progressive billing chunk error", exc_info=True)
                            last_bill_at = now
            except GeneratorExit:
                # Foydalanuvchi pause/abort qildi (frontend AbortController) —
                # progressive billing darrov to'xtaydi va final top-up qilinmaydi.
                billing_ctx["aborted"] = True
                logger.info("Stream aborted by client (user_id=%s, deducted=%d nano)",
                            billing_ctx.get("user_id"), billing_ctx.get("deducted_nano", 0))
                raise

        streaming_resp = StreamingHttpResponse(
            _stream(), content_type="application/json; charset=utf-8",
        )
        streaming_resp["X-Accel-Buffering"] = "no"
        streaming_resp["Cache-Control"] = "no-cache"
        return streaming_resp

    def _process_prompt_impl(self, request):
        """
        Arxitektor oqimi (FAQAT ro'yxatdan o'tgan foydalanuvchilar):
          1. Foydalanuvchi bilan muloqot (ArchitectService)
          2. FINAL_SITE_SPEC tayyor bo'lganda ClaudeService sayt generatsiya qiladi
          3. Mavjud loyiha bo'lsa — revise rejimi
        """
        prompt = (request.data.get("prompt") or "").strip()
        project_id = request.data.get("project_id")
        conversation_id = request.data.get("conversation_id")
        language = request.data.get("language", "uz")
        # Frontend arxitektor suhbat tarixini yuboradi
        history: list = request.data.get("history", [])
        # Ixtiyoriy: rasmlar (base64) — ArchitectService/Claude vision uchun
        # Format: [{"media_type": "image/jpeg", "data": "<base64>"}, ...]
        # Orqaga moslik uchun `image` (dict) ham qabul qilinadi.
        images_raw = request.data.get("images")
        if not images_raw:
            single = request.data.get("image")
            images_raw = [single] if isinstance(single, dict) else []
        if not isinstance(images_raw, list):
            images_raw = []
        images: list[dict] = []
        for it in images_raw[:5]:  # max 5 ta rasm
            if isinstance(it, dict) and it.get("data"):
                if len(it.get("data", "")) > 7_500_000:
                    return Response(
                        {"success": False, "error": "Rasm juda katta (har biri max ~5 MB)."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                images.append(it)

        if not prompt and not images:
            return Response(
                {"success": False, "error": "Prompt yoki rasm kutilmoqda."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        is_auth = request.user.is_authenticated
        rl_key = str(request.user.id) if is_auth else f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Prompt xavfsizligi: hajmini cheklash
        if len(prompt) > 8000:
            return Response(
                {"success": False, "error": "Prompt juda uzun (max 8000 belgi)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # History hajmini cheklash (injection oldini olish)
        if len(history) > 40:
            history = history[-40:]
        # History strukturasini tekshirish
        safe_history = []
        for item in history:
            if isinstance(item, dict) and item.get("role") in ("user", "assistant"):
                content = str(item.get("content", ""))[:4000]
                safe_history.append({"role": item["role"], "content": content})
        history = safe_history

        intent = AIRouterService.detect_intent(prompt, has_project=bool(project_id))
        # Agar loyiha mavjud va foydalanuvchi rasm yuborgan bo'lsa — bu REVISE
        # (rasm odatda "shunga o'xshash qil" yoki "shu yerga qo'sh" degan ma'noda).
        if project_id and images and intent == "CHAT":
            intent = "REVISE"

        # Semantic classification — analitika va til detect uchun (mavjud routerni buzmaydi)
        topic = AIRouterService.classify_topic(
            prompt, has_project=bool(project_id), has_images=bool(images),
        )
        detected_lang = topic.get("language") or language
        if not language or language == "auto":
            language = detected_lang

        # Foydalanuvchi tarif limitlari (max_pages, can_publish)
        user_limits = _get_user_limits(request.user)
        logger.info("AI request user=%s intent=%s project=%s images=%d limits=%s",
                    getattr(request.user, "id", "guest"), intent, project_id,
                    len(images), user_limits)

        # ── Suhbatni topamiz yoki yaratamiz, user xabarini saqlaymiz ──
        conversation = _get_or_create_conversation(
            request.user, conversation_id, language, prompt,
        )
        _save_message(
            conversation, ChatRole.USER, prompt, intent=intent,
            metadata={
                "topic": topic.get("intent"),
                "language": topic.get("language"),
                "off_topic": topic.get("off_topic", False),
                "has_images": bool(images),
            },
        )

        # Progressive billing context'ni conversation_id bilan yangilaymiz
        if conversation:
            ctx = getattr(request, "_billing_ctx", None)
            if isinstance(ctx, dict):
                ctx["conversation_id"] = str(conversation.id)

        # Agar intent generatsiya bo'lsa (yangi sayt yoki REVISE) — balansni tekshiramiz.
        # CHAT va ARCHITECT muloqot bosqichi bepul bo'ladi (faqat gaplashish).
        # ARCHITECT keyinchalik FINAL_SITE_SPEC yig'ib Claude generatsiyaga o'tganda
        # ichkarida yana tekshiriladi (quyidagi blokda).
        if is_auth and intent == "REVISE" and not TOKEN_LIMITS_DISABLED:
            # Joriy schema murakkabligiga qarab narx: 300/400/500 nano
            _rev_schema = {}
            if project_id:
                try:
                    _rev_proj = WebsiteProject.objects.get(id=project_id, user=request.user)
                    _rev_schema = _rev_proj.schema_data or {}
                except Exception:
                    pass
            _rev_complexity = _estimate_complexity(_rev_schema) if _rev_schema else {"revision_cost_nano": COST_REVISION_SIMPLE_NANO}
            revision_cost = _rev_complexity.get("revision_cost_nano", COST_REVISION_SIMPLE_NANO)
            if not _can_afford_nano(request.user, conversation, revision_cost):
                return _insufficient_balance_response(
                    request.user, conversation, revision_cost,
                    action=f"saytni tahrirlash ({revision_cost} nano)"
                )

        try:
            # ── 1. MAVJUD LOYIHANI TAHRIRLASH ───────────────────────────
            if project_id and is_auth and intent == "REVISE":
                try:
                    project = WebsiteProject.objects.get(id=project_id, user=request.user)
                except WebsiteProject.DoesNotExist:
                    return Response(
                        {"success": False, "error": "Loyiha topilmadi."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                # 1-bosqich: Gemini rasm+matnni tahlil qilib Claude uchun aniq
                # ingliz ko'rsatma (instruction) tayyorlaydi.
                try:
                    architect = ArchitectService()
                    claude_instruction = architect.plan_revision(
                        prompt, project.schema_data or {}, images=images,
                    )
                    logger.info("Gemini → Claude instruction: %s", claude_instruction[:300])
                except Exception:
                    logger.exception("plan_revision xatosi — foydalanuvchi matni to'g'ridan yuboriladi")
                    claude_instruction = prompt

                # 2-bosqich: Claude tayyor ko'rsatma bo'yicha schema'ni yangilaydi.
                # Progressive billing FAQAT shu nuqtadan e'tiboran aktivlashadi.
                _ctx = getattr(request, "_billing_ctx", None)
                if isinstance(_ctx, dict):
                    _ctx["generation_started"] = True
                gen_start = time.monotonic()
                claude = ClaudeService()
                new_schema, usage = claude.revise_site(
                    claude_instruction, project.schema_data or {}, language,
                )
                gen_ms = int((time.monotonic() - gen_start) * 1000)
                # Haqiqiy Claude xarajati = input + output token (10 tok = 1 nano)
                actual_cost_tokens = max(
                    (usage.get("input_tokens", 0) + usage.get("output_tokens", 0)),
                    CHAT_COST_NANO * TOKENS_PER_NANO_COIN,  # minimum = 1 chat = 5000 tokens
                )
                project.schema_data = new_schema
                project.status = ProjectStatus.COMPLETED
                project.save(update_fields=["schema_data", "status", "updated_at"])
                if user_limits["can_publish"]:
                    _auto_publish(project)  # REVISE — obuna bor, publik URL beramiz
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="revise", version_number=project.versions.count() + 1,
                )
                # Suhbatni loyihaga bog'laymiz va AI xabarini saqlaymiz
                if conversation and not conversation.project_id:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                _save_message(
                    conversation, ChatRole.ASSISTANT,
                    f"✅ Sayt yangilandi: «{project.title}»",
                    intent="REVISE",
                    tokens_input=usage.get("input_tokens", 0),
                    tokens_output=usage.get("output_tokens", 0),
                    duration_ms=gen_ms,
                    project_version=version,
                    metadata={"project_id": str(project.id), "title": project.title},
                )
                # Nano koin yechamiz — REVISE uchun 300/400/500 nano (murakkablikka qarab)
                # Progressive partial allaqachon yechilgan bo'lsa — farqigina yechiladi
                deduction = None
                if not TOKEN_LIMITS_DISABLED:
                    rev_complexity_data = _estimate_complexity(new_schema)
                    revision_cost_tokens = rev_complexity_data["revision_cost_tokens"]
                    try:
                        deduction = _deduct_with_partial(
                            request.user, conversation, revision_cost_tokens, request,
                        )
                    except ValueError:
                        return Response({
                            "success": False,
                            "error": "Nano koin balansi yetarli emas.",
                            "insufficient_tokens": True,
                        }, status=status.HTTP_402_PAYMENT_REQUIRED)

                _final_complexity = _estimate_complexity(new_schema)
                return Response({
                    "success": True,
                    "phase": "DONE",
                    "is_chat": False,
                    "project": WebsiteProjectSerializer(project).data,
                    "message": f"✅ Sayt yangilandi: «{project.title}»",
                    "conversation_id": str(conversation.id) if conversation else None,
                    "revision_cost_nano": _final_complexity["revision_cost_nano"],
                    "balance": {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost": actual_cost_tokens,
                        "cost_nano": _final_complexity["revision_cost_nano"],
                        "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                        "deduction": deduction,
                    },
                })

            # ── 2. GEMINI ARXITEKTOR SUHBAT ──────────────────────────────
            if intent in ("ARCHITECT", "CHAT"):
                architect = ArchitectService()
                # Gemini: (ai_text, spec_or_None, design_variants_or_None)
                ai_text, spec, design_variants = architect.chat(prompt, history, images=images)

                if spec:
                    # FINAL_SITE_SPEC topildi → Claude sayt generatsiya qiladi
                    # ── Oylik sayt limiti tekshiruvi ──
                    if is_auth and user_limits.get("sites_remaining", 0) == 0:
                        return _site_limit_response(user_limits)
                    # Generatsiyadan oldin balansni tekshiramiz (auth user uchun)
                    logger.info("FINAL_SITE_SPEC aniqlandi, Claude generatsiya boshlandi")
                    _btype = _detect_business_type(prompt)
                    _design, _palette = _pick_random_design(_btype)
                    _constraint = _build_design_constraint(_design, _palette)
                    # Progressive billing FAQAT shu nuqtadan e'tiboran aktivlashadi.
                    _ctx = getattr(request, "_billing_ctx", None)
                    if isinstance(_ctx, dict):
                        _ctx["generation_started"] = True
                    gen_start = time.monotonic()
                    claude = ClaudeService()
                    new_schema, usage = claude.generate_from_spec(
                        spec + _constraint, max_pages=user_limits["max_pages"],
                    )
                    if isinstance(new_schema, dict) and "design" not in new_schema:
                        new_schema["design"] = _design
                    gen_ms = int((time.monotonic() - gen_start) * 1000)
                    complexity = _estimate_complexity(new_schema)

                    # Murakkablikka qarab narx aniqlanadi
                    site_cost_nano = complexity["cost_nano"]
                    site_cost_tokens = site_cost_nano * TOKENS_PER_NANO_COIN

                    # Balans tekshirish (spec topilgandan keyin)
                    if is_auth and site_cost_nano > 0 and not TOKEN_LIMITS_DISABLED and not _can_afford_nano(
                        request.user, conversation, site_cost_nano,
                    ):
                        action_label = f"{complexity['label']} sayt yaratish ({site_cost_nano:,} nano)"
                        return _insufficient_balance_response(
                            request.user, conversation, site_cost_nano, action=action_label
                        )
                    # Fallback: AI 4 dan kam sahifa bersa, standart ko'p sahifali tuzilma qo'shamiz
                    new_schema = _ensure_multipage(new_schema)
                    logger.info(
                        "Claude schema: type=%s keys=%s siteName=%s pages=%s sections_in_first_page=%s",
                        type(new_schema).__name__,
                        list(new_schema.keys()) if isinstance(new_schema, dict) else "N/A",
                        new_schema.get("siteName") if isinstance(new_schema, dict) else "N/A",
                        len(new_schema.get("pages", [])) if isinstance(new_schema, dict) else "N/A",
                        (len(new_schema["pages"][0].get("sections", []))
                         if isinstance(new_schema, dict) and new_schema.get("pages") else "N/A"),
                    )

                    balance_data: Optional[dict] = None
                    if is_auth:
                        project = WebsiteProject.objects.create(
                            user=request.user,
                            title=new_schema.get("siteName", "AI Site"),
                            prompt=prompt,
                            language=language,
                            schema_data=new_schema,
                            status=ProjectStatus.COMPLETED,
                        )
                        # Oylik sayt counter'ni oshiramiz (faol obuna bo'lsa)
                        _active_sub = _get_active_subscription(request.user)
                        if _active_sub:
                            _active_sub.increment_sites_counter()
                        if user_limits["can_publish"]:
                            _auto_publish(project)  # Yangi sayt — obunada publik URL
                        version = ProjectVersion.objects.create(
                            project=project, prompt=spec, schema_data=new_schema,
                            intent="generate", version_number=1,
                        )
                        # Admin panel ma'lumotlarini hozir quramiz (project.slug tayyor)
                        _admin_info = _build_admin_panel_info(project, request.user, language)
                        _done_text = f"✅ Sayt tayyor: «{project.title}»"
                        if _admin_info:
                            _done_text += _admin_info["instructions"]
                        # Suhbatni bu loyihaga bog'laymiz + AI javobini saqlaymiz
                        if conversation:
                            Conversation.objects.filter(id=conversation.id).update(project=project)
                            _save_message(
                                conversation, ChatRole.ASSISTANT,
                                _done_text,
                                intent="GENERATE",
                                tokens_input=usage.get("input_tokens", 0),
                                tokens_output=usage.get("output_tokens", 0),
                                duration_ms=gen_ms,
                                project_version=version,
                                metadata={
                                    "project_id": str(project.id),
                                    "title": project.title,
                                    "complexity": complexity,
                                    "architect_message": ai_text,
                                    "admin_panel": _admin_info,
                                },
                            )
                        # Nano koin yechamiz (complexity ga qarab: 3000/4000/5000 nano)
                        # Progressive partial allaqachon yechilgan bo'lsa — farqigina yechiladi
                        if not TOKEN_LIMITS_DISABLED and site_cost_nano > 0:
                            try:
                                deduction = _deduct_with_partial(
                                    request.user, conversation, site_cost_tokens, request,
                                )
                                balance_data = {
                                    "tokens": request.user.tokens_balance,
                                    "nano_coins": request.user.nano_coins,
                                    "cost_nano": site_cost_nano,
                                    "cost": site_cost_tokens,
                                    "is_first_site": site_cost_nano == 0,
                                    "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                                    "deduction": deduction,
                                }
                            except ValueError:
                                logger.warning("Token yechishda muammo user=%s", request.user.id)
                        elif site_cost_nano == 0:
                            balance_data = {
                                "tokens": request.user.tokens_balance,
                                "nano_coins": request.user.nano_coins,
                                "cost_nano": 0,
                                "cost": 0,
                                "is_first_site": True,
                                "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                            }
                        project_data = WebsiteProjectSerializer(project).data
                    else:
                        project_data = {
                            "id": None,
                            "title": new_schema.get("siteName", "AI Site"),
                            "status": "COMPLETED",
                            "schema_data": new_schema,
                        }
                        _admin_info = None
                        _done_text = f"✅ Sayt tayyor: «{project_data['title']}»"

                    resp = {
                        "success": True,
                        "phase": "DONE",
                        "is_chat": False,
                        "project": project_data,
                        "architect_message": ai_text,
                        "message": _done_text,
                        "admin_panel": _admin_info,
                        "stats": {
                            "generation_time_ms": gen_ms,
                            "input_tokens": usage.get("input_tokens", 0),
                            "output_tokens": usage.get("output_tokens", 0),
                            "complexity": complexity,
                        },
                    }
                    if balance_data:
                        resp["balance"] = balance_data
                    if conversation:
                        resp["conversation_id"] = str(conversation.id)
                    return Response(resp)

                # Spec hali yo'q — davom etayotgan suhbat (Gemini)
                # AI javobini va (bo'lsa) variantlarni tarixga yozamiz.
                # ⚠️ MUHIM: Chat suhbati BEPUL — nano koin yechilmaydi.
                # Nano koin faqat Claude kod yozganda (FINAL_SITE_SPEC + generate)
                # yoki saytni tahrirlaganda (REVISE) yechiladi.
                _save_message(
                    conversation, ChatRole.ASSISTANT, ai_text,
                    intent="ARCHITECT" if design_variants else intent,
                    metadata={"design_variants": design_variants} if design_variants else None,
                )
                resp_data: dict = {
                    "success": True,
                    "phase": "ARCHITECT",
                    "is_chat": True,
                    "message": ai_text,
                }
                if design_variants:
                    resp_data["design_variants"] = design_variants
                if conversation:
                    resp_data["conversation_id"] = str(conversation.id)
                # Chat bepul — balansni shunchaki yangi qiymat bilan qaytaramiz
                # (UI doim hozirgi balansni ko'rsatib tursin)
                if is_auth:
                    resp_data["balance"] = {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost_nano": 0,
                        "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                    }
                return Response(resp_data)

            # ── 3. TO'G'RIDAN-TO'G'RI GENERATSIYA (qisqa yo'l) ───────────
            # ── Oylik sayt limiti tekshiruvi ──
            if is_auth and user_limits.get("sites_remaining", 0) == 0:
                return _site_limit_response(user_limits)
            site_cost_nano = COST_MEDIUM_NANO  # schema yo'q — o'rta narx (4000 nano)
            site_cost_tokens = site_cost_nano * TOKENS_PER_NANO_COIN

            # Balans tekshirish (auth user uchun)
            if is_auth and site_cost_nano > 0 and not TOKEN_LIMITS_DISABLED and not _can_afford_nano(
                request.user, conversation, site_cost_nano,
            ):
                return _insufficient_balance_response(
                    request.user, conversation, site_cost_nano,
                    action=f"sayt yaratish ({site_cost_nano:,} nano)"
                )

            _btype2 = _detect_business_type(prompt)
            _design2, _palette2 = _pick_random_design(_btype2)
            _constraint2 = _build_design_constraint(_design2, _palette2)
            # Progressive billing FAQAT shu nuqtadan e'tiboran aktivlashadi.
            _ctx = getattr(request, "_billing_ctx", None)
            if isinstance(_ctx, dict):
                _ctx["generation_started"] = True
            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema, usage = claude.generate_full_site(
                prompt + _constraint2, language, max_pages=user_limits["max_pages"],
            )
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            if isinstance(new_schema, dict) and "design" not in new_schema:
                new_schema["design"] = _design2
            # Fallback: AI 4 dan kam sahifa bersa, standart ko'p sahifali tuzilma qo'shamiz
            new_schema = _ensure_multipage(new_schema)
            complexity = _estimate_complexity(new_schema)
            # HAQIQIY Claude xarajati (input + output token, min = 5 000 token)
            actual_cost_tokens2 = max(
                (usage.get("input_tokens", 0) + usage.get("output_tokens", 0)),
                CHAT_COST_NANO * TOKENS_PER_NANO_COIN,
            )

            balance_data2: Optional[dict] = None
            if is_auth:
                project = WebsiteProject.objects.create(
                    user=request.user,
                    title=new_schema.get("siteName", "AI Site"),
                    prompt=prompt,
                    language=language,
                    schema_data=new_schema,
                    status=ProjectStatus.COMPLETED,
                )
                # Oylik sayt counter'ni oshiramiz (faol obuna bo'lsa)
                _active_sub2 = _get_active_subscription(request.user)
                if _active_sub2:
                    _active_sub2.increment_sites_counter()
                if user_limits["can_publish"]:
                    _auto_publish(project)  # Yangi sayt — obunada publik URL
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="generate", version_number=1,
                )
                # Admin panel ma'lumotlarini quramiz (project.slug tayyor)
                _admin_info2 = _build_admin_panel_info(project, request.user, language)
                _done_text2 = f"✅ Sayt tayyor: «{project.title}»"
                if _admin_info2:
                    _done_text2 += _admin_info2["instructions"]
                if conversation:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                    _save_message(
                        conversation, ChatRole.ASSISTANT,
                        _done_text2,
                        intent="GENERATE",
                        tokens_input=usage.get("input_tokens", 0),
                        tokens_output=usage.get("output_tokens", 0),
                        duration_ms=gen_ms,
                        project_version=version,
                        metadata={
                            "project_id": str(project.id),
                            "title": project.title,
                            "complexity": complexity,
                            "admin_panel": _admin_info2,
                        },
                    )
                if not TOKEN_LIMITS_DISABLED and site_cost_nano > 0:
                    try:
                        deduction2 = _deduct_with_partial(
                            request.user, conversation, site_cost_tokens, request,
                        )
                        balance_data2 = {
                            "tokens": request.user.tokens_balance,
                            "nano_coins": request.user.nano_coins,
                            "cost_nano": site_cost_nano,
                            "cost": site_cost_tokens,
                            "is_first_site": is_first,
                            "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                            "deduction": deduction2,
                        }
                    except ValueError:
                        logger.warning("Token yechishda muammo user=%s", request.user.id)
                elif is_first:
                    balance_data2 = {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost_nano": 0, "cost": 0, "is_first_site": True,
                        "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                    }
                project_data = WebsiteProjectSerializer(project).data
            else:
                project_data = {
                    "id": None,
                    "title": new_schema.get("siteName", "AI Site"),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                }
                _admin_info2 = None
                _done_text2 = f"✅ Sayt tayyor: «{project_data['title']}»"

            resp2 = {
                "success": True,
                "phase": "DONE",
                "is_chat": False,
                "project": project_data,
                "message": _done_text2,
                "admin_panel": _admin_info2,
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "complexity": complexity,
                },
            }
            if balance_data2:
                resp2["balance"] = balance_data2
            if conversation:
                resp2["conversation_id"] = str(conversation.id)
            return Response(resp2)

        except ValueError as exc:
            logger.warning("AI JSON xatosi: %s", exc)
            return Response(
                {"success": False, "error": "AI javobi to'liq emas. Iltimos, qayta urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError as exc:
            return _ai_error_response(exc, log_prefix="process_prompt")
        except Exception:
            logger.exception("AI router xatosi")
            return Response(
                {"success": False, "error": "Server xatoligi. Iltimos, keyinroq urinib ko'ring."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def download_zip(self, request, pk=None):
        """
        ZIP yuklab olish.
        Birinchi marta: Claude frontend (HTML/CSS/JS) + backend (Node.js) kodni generatsiya
        qiladi va keshda saqlaydi. Keyingi marta keshdan yuklaydi.
        """
        project = self.get_object()
        try:
            # Kesh: generated_files allaqachon saqlangan bo'lsa ishlatamiz
            if project.generated_files and isinstance(project.generated_files, dict):
                zip_buffer = ExportService.generate_zip_from_files(
                    project, project.generated_files
                )
                logger.info("ZIP keshdan yuklandi project=%s", project.id)
            else:
                # Claude orqali to'liq kod generatsiyasi
                logger.info("Claude kod generatsiyasi boshlandi project=%s", project.id)
                claude = ClaudeService()
                generated_files = claude.generate_site_files(
                    project.schema_data or {}, project.language or "uz"
                )
                # Keshga saqlaymiz
                project.generated_files = generated_files
                project.save(update_fields=["generated_files"])
                zip_buffer = ExportService.generate_zip_from_files(project, generated_files)
                logger.info(
                    "ZIP yaratildi project=%s fayllar=%s",
                    project.id, list(generated_files.keys()),
                )
        except RuntimeError as exc:
            logger.error("Claude kod generatsiyasi xatosi project=%s: %s", project.id, exc)
            # Fallback: oddiy HTML ZIP
            try:
                zip_buffer = ExportService.generate_static_zip(project)
            except Exception:
                logger.exception("Fallback ZIP ham xato project=%s", project.id)
                return Response(
                    {"error": "ZIP eksport xatosi"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception:
            logger.exception("ZIP export xatosi project=%s", project.id)
            return Response(
                {"error": "Eksport xatosi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_title = "".join(c for c in project.title if c.isalnum() or c in " -_").strip()
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=True, methods=["post"])
    def generate_files(self, request, pk=None):
        """
        Loyihaning barcha kod fayllarini (HTML/CSS/JS/Node.js) JSON ko'rinishida
        qaytaradi. Frontend IDE ko'rinishida ko'rsatish va alohida yuklab olish uchun.
        Kesh bor bo'lsa — undan olinadi.
        """
        project = self.get_object()
        try:
            if project.generated_files and isinstance(project.generated_files, dict):
                return Response({
                    "success": True,
                    "files": project.generated_files,
                    "cached": True,
                })
            claude = ClaudeService()
            files = claude.generate_site_files(
                project.schema_data or {}, project.language or "uz"
            )
            project.generated_files = files
            project.save(update_fields=["generated_files"])
            return Response({
                "success": True,
                "files": files,
                "cached": False,
            })
        except RuntimeError as exc:
            return _ai_error_response(exc, log_prefix=f"generate_files project={project.id}")
        except Exception:
            logger.exception("generate_files kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def generate_files_inline(self, request):
        """
        Login talab qilmasdan schema_data dan kod fayllarini generatsiya qiladi.
        Frontend IDE ko'rinishi uchun.
        """
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        # DEBUG: nima keldi?
        logger.info(
            "generate_files_inline: type=%s keys=%s",
            type(schema_data).__name__,
            list(schema_data.keys()) if isinstance(schema_data, dict) else "N/A",
        )

        if not schema_data or not isinstance(schema_data, dict):
            return Response(
                {
                    "success": False,
                    "error": "schema_data talab qilinadi.",
                    "debug": {
                        "received_type": type(schema_data).__name__,
                        "is_none": schema_data is None,
                        "is_dict": isinstance(schema_data, dict),
                        "request_keys": list(request.data.keys()),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        rl_key = f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            claude = ClaudeService()
            files = claude.generate_site_files(schema_data, language)
            return Response({"success": True, "files": files})
        except RuntimeError as exc:
            return _ai_error_response(exc, log_prefix="generate_files_inline")
        except Exception:
            logger.exception("generate_files_inline kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def regenerate_code(self, request, pk=None):
        """Mavjud loyiha uchun kodni qaytadan generatsiya qiladi (keshni tozalaydi)."""
        project = self.get_object()
        project.generated_files = None
        project.save(update_fields=["generated_files"])
        return Response({"success": True, "message": "Kod keshi tozalandi. ZIP yuklaganda qayta generatsiya bo'ladi."})

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def export_zip(self, request):
        """
        Login talab qilmasdan schema_data dan ZIP yaratadi.
        Frontend sxemani yuboradi, biz HTML ZIP qaytaramiz.
        """
        schema_data = request.data.get("schema_data")
        title = str(request.data.get("title", "my-site"))[:100]
        language = str(request.data.get("language", "uz"))

        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        # Vaqtincha loyiha ob'ekti yaratamiz (DB ga saqlamasdan)
        class TempProject:
            schema_data = None
            generated_files = None
            language = "uz"
            created_at = None

            def __init__(self, sd, lang, t):
                import datetime
                self.schema_data = sd
                self.language = lang
                self.title = t
                self.created_at = datetime.datetime.now()

        temp = TempProject(schema_data, language, title)

        try:
            zip_buffer = ExportService.generate_static_zip(temp)
        except Exception:
            logger.exception("export_zip xatosi")
            return Response({"error": "ZIP yaratishda xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip() or "site"
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def cancel_generation(self, request):
        """
        Foydalanuvchining joriy generatsiya lock'ini majburan ozod qiladi.
        Frontend "Bekor qilish" tugmasi bosildanda chaqiriladi.
        """
        user_id = request.user.id
        released = _force_release_generation_lock(user_id)
        logger.info("cancel_generation: user_id=%s released=%s", user_id, released)
        return Response({
            "success": True,
            "released": released,
            "message": "Generatsiya bekor qilindi. Endi yangi so'rov yuborishingiz mumkin." if released
                       else "Faol generatsiya topilmadi.",
        })

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def revise_inline(self, request):
        """
        Mavjud schema ni tahrirlaydi (FAQAT ro'yxatdan o'tgan foydalanuvchilar).
        schema_data + prompt yuboriladi, yangi schema qaytariladi.
        """
        prompt = (request.data.get("prompt") or "").strip()
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        if not prompt:
            return Response({"error": "Prompt talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema, usage = claude.revise_site(prompt, schema_data, language)
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            complexity = _estimate_complexity(new_schema)

            return Response({
                "success": True,
                "phase": "DONE",
                "project": {
                    "id": None,
                    "title": new_schema.get("siteName", schema_data.get("siteName", "AI Site")),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                },
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "complexity": complexity,
                },
                "message": "✅ Sayt yangilandi.",
            })
        except RuntimeError as exc:
            return _ai_error_response(exc, log_prefix="revise_inline")
        except Exception:
            logger.exception("revise_inline kutilmagan xato")
            return Response({"success": False, "error": "AI xizmatida xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
# Publish / Share — publik sayt uchun slug generatsiyasi
# ─────────────────────────────────────────────────────────────

def _generate_unique_slug(title: str) -> str:
    """Saytni publik URL uchun unikal slug (masalan: 'napoli-pizza-a3f2')."""
    base = slugify(title or "site", allow_unicode=False)[:60] or "site"
    # Takrorlanmaslik uchun qisqa tasodifiy qo'shimcha
    for _ in range(5):
        candidate = f"{base}-{secrets.token_hex(2)}"  # 4 belgi hex
        if not WebsiteProject.objects.filter(slug=candidate).exists():
            return candidate
    # juda qattiq holat — uzunroq random
    return f"{base}-{secrets.token_hex(4)}"


# WebsiteProjectViewSet ga qo'shimcha action'lar (publish/unpublish)
def publish(self, request, pk=None):
    project = self.get_object()
    if not project.schema_data:
        return Response(
            {"success": False, "error": "Sayt hali generatsiya qilinmagan."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not project.slug:
        project.slug = _generate_unique_slug(project.title)
    project.is_published = True
    project.published_at = timezone.now()
    project.save(update_fields=["slug", "is_published", "published_at", "updated_at"])
    return Response({
        "success": True,
        "slug": project.slug,
        "is_published": True,
        "published_at": project.published_at,
        "public_url": f"/s/{project.slug}",
    })


def unpublish(self, request, pk=None):
    project = self.get_object()
    project.is_published = False
    project.save(update_fields=["is_published", "updated_at"])
    return Response({"success": True, "is_published": False})


WebsiteProjectViewSet.publish = action(detail=True, methods=["post"])(publish)
WebsiteProjectViewSet.unpublish = action(detail=True, methods=["post"])(unpublish)


# ─────────────────────────────────────────────────────────────
# Publik sayt endpoint — auth talab qilmaydi
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def public_site(request, slug: str):
    """
    /api/public/sites/<slug>/ — Publik URL uchun sayt sxemasini qaytaradi.

    Sayt ko'rinishi shartlari:
      1. `is_published=True`     — sayt publish qilingan
      2. `is_active=True`         — sayt admin/obuna tomonidan bloklanmagan
      3. Egasining obunasi faol  — obunasi tugagan bo'lsa sayt inactive
    """
    try:
        project = WebsiteProject.objects.select_related("user").only(
            "id", "title", "schema_data", "language",
            "slug", "is_published", "is_active", "view_count", "updated_at",
            "user__id",
        ).get(slug=slug, is_published=True)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki o'chirilgan."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # 2-shart: admin tomonidan bloklangan
    if not project.is_active:
        return Response({
            "success": False,
            "site_inactive": True,
            "error": "Bu sayt vaqtinchalik o'chirilgan.",
        }, status=status.HTTP_410_GONE)

    # 3-shart: egasining obunasi tugaganmi?
    owner_sub = _get_active_subscription(project.user)
    if not owner_sub and not FREE_CAN_PUBLISH:
        # Obunasi yo'q va bepul publish ruxsat berilmagan — sayt yopiq
        return Response({
            "success": False,
            "subscription_required": True,
            "site_inactive": True,
            "error": "Sayt egasining obunasi muddati tugagan. Sayt vaqtinchalik ishlamayapti.",
        }, status=status.HTTP_410_GONE)

    # View counter — atomik inkrement
    WebsiteProject.objects.filter(pk=project.pk).update(view_count=F("view_count") + 1)

    return Response({
        "success": True,
        "site": {
            "title": project.title,
            "schema_data": project.schema_data,
            "language": project.language,
            "slug": project.slug,
            "view_count": project.view_count + 1,
            "updated_at": project.updated_at,
        },
    })


# ─────────────────────────────────────────────────────────────
# Owner admin — sayt egasi /admin sahifasi orqali boshqarish
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_get_by_slug(request, slug: str):
    """
    /api/projects/owner/by_slug/<slug>/ — Login qilingan sayt egasi
    o'z saytining schema'sini olishi uchun.
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response({
        "success": True,
        "site": {
            "id": str(project.id),
            "title": project.title,
            "schema_data": project.schema_data,
            "language": project.language,
            "slug": project.slug,
            "is_published": project.is_published,
            "updated_at": project.updated_at,
        },
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_download_by_slug(request, slug: str):
    """
    /api/projects/owner/by_slug/<slug>/download/ — Sayt egasi o'z saytining
    kodini ZIP holida tezkor yuklab olishi uchun.

    TEZKOR: faqat o'zining loyihasi, Claude orqali qayta generatsiya qilmaydi.
    - Agar `generated_files` (Claude kodlari) keshlangan bo'lsa — undan ZIP qiladi.
    - Aks holda — schema'dan to'g'ridan-to'g'ri static HTML ZIP qiladi (~100ms).
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        if project.generated_files and isinstance(project.generated_files, dict):
            zip_buffer = ExportService.generate_zip_from_files(
                project, project.generated_files,
            )
        else:
            zip_buffer = ExportService.generate_static_zip(project)
    except Exception:
        logger.exception("owner_download_by_slug ZIP xatosi project=%s", project.id)
        return Response(
            {"success": False, "error": "ZIP yaratishda xatolik."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    safe_title = "".join(c for c in (project.title or slug) if c.isalnum() or c in " -_").strip() or slug
    resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
    resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
    resp["Cache-Control"] = "no-store"
    return resp


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def owner_save_by_slug(request, slug: str):
    """
    /api/projects/owner/by_slug/<slug>/save/ — Sayt egasi schema'ni
    qo'lda tahrirlab saqlashi uchun (admin paneldan).
    Body: { "schema_data": {...}, "title"?: "..." }
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )

    new_schema = request.data.get("schema_data")
    if not isinstance(new_schema, dict):
        return Response(
            {"success": False, "error": "schema_data dict bo'lishi kerak."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    new_title = request.data.get("title")
    update_fields = ["schema_data", "updated_at"]
    project.schema_data = new_schema
    if isinstance(new_title, str) and new_title.strip():
        project.title = new_title.strip()[:200]
        update_fields.append("title")

    # Generated_files keshini tozalaymiz — qayta yuklab olganda yangidan generatsiya qilinadi
    if project.generated_files:
        project.generated_files = None
        update_fields.append("generated_files")

    project.save(update_fields=update_fields)

    # Versiya tarixiga ham qo'shamiz (manual edit)
    try:
        ProjectVersion.objects.create(
            project=project,
            prompt="(manual edit via /admin)",
            schema_data=new_schema,
            intent="manual_edit",
            version_number=project.versions.count() + 1,
        )
    except Exception:
        logger.warning("Failed to create version on manual edit", exc_info=True)

    return Response({
        "success": True,
        "site": {
            "id": str(project.id),
            "title": project.title,
            "schema_data": project.schema_data,
            "slug": project.slug,
            "is_published": project.is_published,
            "updated_at": project.updated_at,
        },
        "message": "✅ Saqlandi.",
    })


# ─────────────────────────────────────────────────────────────
# Suhbat tarixi API
# ─────────────────────────────────────────────────────────────

from .serializers import ConversationDetailSerializer, ConversationListSerializer


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Foydalanuvchi suhbatlari tarixi.
      GET /api/conversations/         → barcha suhbatlar ro'yxati
      GET /api/conversations/<id>/    → bitta suhbat + barcha xabarlar
      DELETE /api/conversations/<id>/ → suhbatni o'chirish
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete", "head", "options"]

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user).select_related("project")
        if self.action == "retrieve":
            qs = qs.prefetch_related("messages")
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def destroy(self, request, *args, **kwargs):
        """Suhbatni o'chirish — tegishli xabarlar CASCADE orqali o'chadi."""
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def verify_domain(request):
    domain = request.query_params.get("domain", "").lower()
    allowed_base_domains = ["nanostup.uz", "localhost", "127.0.0.1"]
    
    for base in allowed_base_domains:
        if domain == base or domain.endswith("." + base):
            return Response({"allowed": True})
            
    # For custom domains pointing to us, we could check if any project uses this domain.
    # For now, if they are on an external domain, we disallow.
    return Response({"allowed": False})
