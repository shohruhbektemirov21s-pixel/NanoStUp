"""
Publik HTML site rendering — Django template'lar orqali.

URL: /sites/<slug>/
Maqsad: AI tomondan yaratilgan content (schema_data) ni tayyor HTML template
ichiga joylab, statik HTML sahifa qaytarish (minimal/zero JS).
"""
from __future__ import annotations

import logging
from typing import Any, Dict, Optional, Tuple

from django.http import Http404, HttpRequest, HttpResponse, HttpResponseGone
from django.shortcuts import get_object_or_404
from django.template import TemplateDoesNotExist
from django.template.loader import select_template
from django.utils import timezone
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET

from apps.website_projects.models import HostingStatus, WebsiteProject

from .template_picker import (
    HTMLTemplateChoice,
    pick_html_template,
)

logger = logging.getLogger(__name__)


# ── Color palettes (CSS variables) ──────────────────────────────────
# Har color_variant uchun primary/accent/bg/text/muted ranglari.
# Frontend tomonidan emas, faqat shu yerda boshqariladi.
COLOR_PALETTES: Dict[str, Dict[str, str]] = {
    "warm": {
        "primary": "#c2410c",   # orange-700
        "accent":  "#f59e0b",   # amber-500
        "bg":      "#fffbeb",   # amber-50
        "surface": "#ffffff",
        "text":    "#1c1917",   # stone-900
        "muted":   "#78716c",   # stone-500
        "border":  "#e7e5e4",   # stone-200
    },
    "cool": {
        "primary": "#1e40af",   # blue-800
        "accent":  "#0891b2",   # cyan-600
        "bg":      "#f8fafc",   # slate-50
        "surface": "#ffffff",
        "text":    "#0f172a",   # slate-900
        "muted":   "#64748b",   # slate-500
        "border":  "#e2e8f0",   # slate-200
    },
    "vibrant": {
        "primary": "#db2777",   # pink-600
        "accent":  "#16a34a",   # green-600
        "bg":      "#fafafa",
        "surface": "#ffffff",
        "text":    "#18181b",   # zinc-900
        "muted":   "#71717a",   # zinc-500
        "border":  "#e4e4e7",   # zinc-200
    },
    "muted": {
        "primary": "#a16207",   # yellow-700
        "accent":  "#a3a3a3",   # neutral-400
        "bg":      "#fafaf9",   # stone-50
        "surface": "#ffffff",
        "text":    "#292524",   # stone-800
        "muted":   "#78716c",   # stone-500
        "border":  "#e7e5e4",   # stone-200
    },
    "dark": {
        "primary": "#f59e0b",   # amber-500 (accent on dark)
        "accent":  "#ef4444",   # red-500
        "bg":      "#0a0a0a",   # near black
        "surface": "#171717",   # neutral-900
        "text":    "#fafafa",   # neutral-50
        "muted":   "#a3a3a3",   # neutral-400
        "border":  "#262626",   # neutral-800
    },
    "neutral": {
        "primary": "#18181b",
        "accent":  "#52525b",
        "bg":      "#ffffff",
        "surface": "#fafafa",
        "text":    "#09090b",
        "muted":   "#71717a",
        "border":  "#e4e4e7",
    },
}


TYPOGRAPHY_FONTS: Dict[str, Dict[str, str]] = {
    "sans": {
        "heading": "'Inter', system-ui, -apple-system, sans-serif",
        "body":    "'Inter', system-ui, -apple-system, sans-serif",
        "google":  "Inter:wght@400;500;600;700;800",
    },
    "serif": {
        "heading": "'Playfair Display', Georgia, serif",
        "body":    "'Lora', Georgia, serif",
        "google":  "Lora:wght@400;500;600&family=Playfair+Display:wght@600;700;800",
    },
    "display": {
        "heading": "'Bebas Neue', Impact, sans-serif",
        "body":    "'Inter', system-ui, sans-serif",
        "google":  "Bebas+Neue&family=Inter:wght@400;500;600",
    },
    "mono": {
        "heading": "'JetBrains Mono', 'Fira Code', monospace",
        "body":    "'Inter', system-ui, sans-serif",
        "google":  "JetBrains+Mono:wght@500;600;700&family=Inter:wght@400;500",
    },
}


def _normalize_schema(schema: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """schema_data'ni xavfsiz default qiymatlar bilan to'ldirish."""
    if not isinstance(schema, dict):
        schema = {}
    schema.setdefault("siteName", "")
    schema.setdefault("settings", {})
    schema.setdefault("design", {})
    schema.setdefault("pages", [])
    return schema


def _resolve_template_choice(project: WebsiteProject) -> HTMLTemplateChoice:
    """
    schema.design dan template_variant'ni o'qish, bo'lmasa pick_html_template
    chaqiriladi (deterministik). Bir martagina tanlanadi va schema'ga yoziladi
    (keyingi render'larda bir xil bo'ladi).
    """
    schema = _normalize_schema(project.schema_data)
    design = schema.get("design") or {}

    existing_html = design.get("html_path")
    existing_seed = design.get("design_seed") or design.get("html_seed")

    # Niche aniqlash — schema.design.niche, bo'lmasa AI generatsiya paytidagi
    # `_detect_business_type` natijasi schema'ga saqlangan bo'lishi mumkin.
    niche = (
        design.get("niche")
        or design.get("business_type")
        or schema.get("settings", {}).get("niche")
        or "default"
    )

    if existing_html and existing_seed:
        # Mavjud tanlovni qaytaramiz (idempotent)
        template_variant = existing_html.rsplit("/", 1)[-1].rsplit(".", 1)[0]
        return HTMLTemplateChoice(
            html_path=existing_html,
            template_variant=template_variant,
            color_variant=design.get("color_variant", "neutral"),
            typography_variant=design.get("typography_variant", "sans"),
            niche=niche,
            seed=existing_seed,
        )

    # Yangi tanlov
    return pick_html_template(niche=niche, seed=existing_seed)


def _persist_design_choice(project: WebsiteProject, choice: HTMLTemplateChoice) -> None:
    """
    Tanlovni schema.design ga saqlaymiz (idempotent — keyingi render'lar
    bir xil bo'lsin). Faqat eski qiymat yo'q bo'lsa yoziladi.
    """
    schema = _normalize_schema(project.schema_data)
    design = schema.get("design") or {}
    if design.get("html_path") and design.get("design_seed"):
        return  # allaqachon yozilgan

    design.update(choice.to_meta())
    schema["design"] = design
    project.schema_data = schema
    try:
        project.save(update_fields=["schema_data", "updated_at"])
    except Exception:
        # DB xatosi — render'ni to'xtatmaslik kerak
        logger.warning("schema.design persist failed for slug=%s", project.slug, exc_info=True)


# Section turi uchun "har doim mavjud bo'lishi kerak" maydonlar.
# Bular bo'sh string sifatida default bo'ladi — shu orqali Django template'da
# `{{ section.field|default:other }}` xato bermaydi.
_SECTION_DEFAULTS: Dict[str, Tuple[str, ...]] = {
    "hero":    ("title", "subtitle", "description", "eyebrow", "image"),
    "menu":    ("title", "subtitle"),
    "features":("title", "subtitle"),
    "services":("title", "subtitle"),
    "about":   ("title", "subtitle", "description", "text", "image", "quote", "quote_author"),
    "gallery": ("title", "subtitle"),
    "cta":     ("title", "subtitle"),
    "contact": ("title", "subtitle", "address", "phone", "email", "hours", "map_embed_url"),
    "testimonials": ("title", "subtitle"),
    "faq":     ("title", "subtitle"),
    "stats":   ("title", "subtitle"),
}

# Settings ichida AI yoki user yozadigan, lekin har doim string sifatida
# kerak bo'ladigan maydonlar.
_SETTINGS_STRING_KEYS: Tuple[str, ...] = (
    "phone", "email", "address", "description", "ogImage",
    "primaryColor", "accentColor", "bgColor", "textColor", "font",
)


# Item-darajadagi maydonlar (menu.items, features.items, gallery.images)
_ITEM_STRING_KEYS: Tuple[str, ...] = (
    "name", "title", "subtitle", "description", "text",
    "price", "image", "icon", "href", "alt", "src",
)


def _normalize_items(items: Any) -> Any:
    """Items list'ining har bir elementiga string default qo'shish."""
    if not isinstance(items, list):
        return items
    for item in items:
        if not isinstance(item, dict):
            continue
        for key in _ITEM_STRING_KEYS:
            item.setdefault(key, "")
    return items


def _ensure_section_defaults(section: Any) -> Any:
    """
    Section dict'iga _SECTION_DEFAULTS asosida bo'sh string default qo'shish.
    Mutates va qaytaradi.
    """
    if not isinstance(section, dict):
        return section
    t = section.get("type")
    if t in _SECTION_DEFAULTS:
        for key in _SECTION_DEFAULTS[t]:
            section.setdefault(key, "")
    # 'cta' sub-object — har doim {label, href} bo'lsin
    for cta_key in ("cta", "cta2", "button"):
        sub = section.get(cta_key)
        if isinstance(sub, dict):
            sub.setdefault("label", "")
            sub.setdefault("href", "")
    # Items / images — normalize har bir element
    if "items" in section:
        _normalize_items(section.get("items"))
    if "images" in section:
        _normalize_items(section.get("images"))
    if "stats" in section:
        for stat in (section.get("stats") or []):
            if isinstance(stat, dict):
                stat.setdefault("value", "")
                stat.setdefault("label", "")
    if "paragraphs" not in section:
        section.setdefault("paragraphs", [])
    return section


# Template'lar `sections.X|default:sections.Y` patternini ishlatadi —
# shu sababli barcha standart sectiontype'larga bo'sh dict default qo'shamiz.
# Shunda template ichida har qanday section access xato bermaydi
# (`{% if sections.menu %}` falsy bo'sh dictga to'g'ri ishlaydi).
_KNOWN_SECTION_TYPES: Tuple[str, ...] = (
    "hero", "menu", "features", "services", "products",
    "courses", "rooms", "articles", "projects", "doctors", "team",
    "about", "gallery", "testimonials", "faq", "stats",
    "cta", "contact",
)


def _build_sections_index(page: Dict[str, Any]) -> Dict[str, Any]:
    """
    page.sections[] ro'yxatidan {section_type: section_obj | [sections...]} dict
    yaratish. Bir xil type bir necha marta uchrasa — list qaytaradi.

    Misol:
      page.sections = [
        {"type": "hero", "title": "..."},
        {"type": "menu", "items": [...]},
        {"type": "menu", "items": [...]},
      ]
      → {"hero": {...}, "menu": [{...}, {...}]}

    Shuningdek, ishlatilmagan _KNOWN_SECTION_TYPES'ga ham bo'sh dict
    default qo'shadi — shu orqali Django template'da
    `sections.foo|default:sections.bar` chain xato bermaydi.
    """
    # Boshlang'ich qiymat: barcha known section type'lar bo'sh dict bilan
    index: Dict[str, Any] = {t: {} for t in _KNOWN_SECTION_TYPES}

    sections = page.get("sections") if isinstance(page, dict) else None
    if not isinstance(sections, list):
        return index
    counts: Dict[str, int] = {}
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        t = sec.get("type")
        if not t or not isinstance(t, str):
            continue
        # Default keylarni qo'shamiz — Django template'da bezarar
        _ensure_section_defaults(sec)
        seen = counts.get(t, 0)
        if seen == 0:
            # Birinchi marta bu typeni ko'ryapmiz — bo'sh default'ni almashtir
            index[t] = sec
        elif seen == 1:
            # Ikkinchi marta — list'ga aylantir
            index[t] = [index[t], sec]
        else:
            # Uchinchi va keyingi marta — listga append
            index[t].append(sec)
        counts[t] = seen + 1
    return index


def _ensure_settings_defaults(settings: Dict[str, Any]) -> Dict[str, Any]:
    """settings dict'iga string default qiymatlar qo'shish (template safe lookup uchun)."""
    if not isinstance(settings, dict):
        return {}
    for key in _SETTINGS_STRING_KEYS:
        settings.setdefault(key, "")
    return settings


def _build_render_context(
    project: WebsiteProject,
    choice: HTMLTemplateChoice,
) -> Dict[str, Any]:
    """Template ichiga uzatiladigan kontekst."""
    schema = _normalize_schema(project.schema_data)
    settings = _ensure_settings_defaults(schema.get("settings") or {})

    palette = COLOR_PALETTES.get(choice.color_variant, COLOR_PALETTES["neutral"])
    fonts = TYPOGRAPHY_FONTS.get(choice.typography_variant, TYPOGRAPHY_FONTS["sans"])

    # Foydalanuvchi sozlamalari (settings.primaryColor) — palette'ni override qiladi
    primary = settings.get("primaryColor") or palette["primary"]
    accent = settings.get("accentColor") or palette["accent"]
    bg = settings.get("bgColor") or palette["bg"]
    text = settings.get("textColor") or palette["text"]

    # Lock holati
    is_locked = project.is_locked
    lock_message = project.lock_message(language=project.language or "uz") if is_locked else None

    return {
        "site": {
            "title": schema.get("siteName") or project.title,
            "language": project.language or "uz",
            "slug": project.slug,
            "is_locked": is_locked,
            "lock_message": lock_message,
            "hosting_status": project.hosting_status,
        },
        "settings": settings,
        "design": schema.get("design") or {},
        "pages": schema.get("pages") or [],
        # Birinchi sahifa — odatda asosiy
        "page": (schema.get("pages") or [{}])[0],
        # Sektsiyalarga type bo'yicha tezkor kirish (template uchun qulay)
        "sections": _build_sections_index((schema.get("pages") or [{}])[0]),
        # Variantlar
        "template_variant": choice.template_variant,
        "color_variant": choice.color_variant,
        "typography_variant": choice.typography_variant,
        "niche": choice.niche,
        # Color tokens (CSS variables uchun)
        "colors": {
            "primary": primary,
            "accent": accent,
            "bg": bg,
            "surface": palette["surface"],
            "text": text,
            "muted": palette["muted"],
            "border": palette["border"],
        },
        # Font stack
        "fonts": fonts,
        # SEO
        "meta": {
            "title": schema.get("siteName") or project.title,
            "description": settings.get("description")
                           or schema.get("description")
                           or f"{project.title} — NanoStUp orqali yaratilgan sayt.",
            "url": f"/sites/{project.slug}/",
            "image": settings.get("ogImage") or "",
        },
    }


@require_GET
@cache_control(max_age=60, public=True)
def render_public_site(request: HttpRequest, slug: str) -> HttpResponse:
    """
    Publik sayt HTML render: /sites/<slug>/

    Status xatti-harakati:
      - Sayt yo'q yoki published emas → 404
      - hosting_status=ARCHIVED → 410 Gone (umuman ko'rinmaydi)
      - hosting_status=ACTIVE/TRIAL → to'liq render
      - hosting_status=EXPIRED/SUSPENDED → render + soft-lock overlay
    """
    project = get_object_or_404(
        WebsiteProject.objects.select_related("user"),
        slug=slug,
        is_published=True,
    )

    # Lazy hosting sync (ACTIVE bo'lsa-yu obuna tugagan bo'lsa)
    if project.hosting_status == HostingStatus.ACTIVE:
        if project.hosting_expires_at and project.hosting_expires_at < timezone.now():
            project.sync_hosting_with_subscription(save=True)

    if project.hosting_status == HostingStatus.ARCHIVED:
        return HttpResponseGone(b"<h1>410 Gone</h1><p>Sayt arxivlangan.</p>")

    # View count (faqat live saytlar uchun)
    if project.is_live:
        try:
            from django.db.models import F
            WebsiteProject.objects.filter(pk=project.pk).update(view_count=F("view_count") + 1)
        except Exception:
            pass

    # Template tanlash (idempotent)
    choice = _resolve_template_choice(project)
    _persist_design_choice(project, choice)

    # Context
    ctx = _build_render_context(project, choice)

    # Template loading — fallback chain: tanlangan → default
    try:
        tpl = select_template([choice.html_path, "sites/default.html"])
    except TemplateDoesNotExist:
        logger.error("Template not found: %s (slug=%s)", choice.html_path, slug)
        # So'nggi fallback — bare HTML
        return HttpResponse(
            f"<h1>{project.title}</h1>"
            f"<p>Template '{choice.html_path}' mavjud emas. Admin bilan bog'laning.</p>",
            status=500,
        )

    return HttpResponse(tpl.render(ctx, request))
