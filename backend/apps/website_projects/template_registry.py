"""
Template Registry — niche bo'yicha sayt layout shablonlarini boshqaradi.

Maqsad:
  - AI faqat content (matn, ro'yxatlar) yaratadi
  - Layout (sektsiya tartibi, vizual variant) — backend tomonidan tanlanadi
  - Saytlar bir-biriga o'xshamasin: har niche uchun 3+ layout, deterministic
    seed-based tanlash

Eslatma:
  - Hozirgi schema_data flow buzilmaydi (backward compatible)
  - Template tanlanganda schema.design ga `template_id`, `design_seed`,
    `layout_variant`, `palette_variant`, `typography_variant` yoziladi
  - SiteRenderer bu fieldlarni o'qib variantlarni ishlatadi
"""
from __future__ import annotations

import hashlib
import random
import uuid
from dataclasses import dataclass, field, asdict
from typing import Any, Dict, List, Optional, Tuple


# ───────────────────────────────────────────────────────────────
# Section types (SiteRenderer komponentlariga mos)
# ───────────────────────────────────────────────────────────────
# Frontend SiteRenderer.tsx quyidagi turlarni qo'llab-quvvatlaydi:
#   hero, features, services, menu, pricing, about, testimonials,
#   team, faq, stats, gallery, cta, contact, blog, products,
#   portfolio, properties, booking, timeline, logos, video


@dataclass
class TemplateSection:
    """Template ichidagi bitta sektsiya (layout, content key emas)."""
    type: str
    id: Optional[str] = None  # Optional UUID
    # Content placeholderlar (AI shularni to'ldirsin):
    content_keys: List[str] = field(default_factory=list)


@dataclass
class Template:
    """Niche-specific layout template."""
    id: str                          # e.g. "restaurant_classic_v1"
    niche: str                       # e.g. "restaurant"
    name: str                        # human-readable
    description: str                 # short text for admin UI
    sections: List[TemplateSection]  # ordered list of sections

    # Variant identifierlar (SiteRenderer'da niche+seed dan deterministic
    # variant tanlash uchun):
    layout_variant: str = "default"      # default | classic | modern | bold | elegant
    typography_variant: str = "sans"     # sans | serif | display | mono
    density_variant: str = "comfortable" # compact | comfortable | spacious

    # Tavsiya etilgan palette indekslari (BUSINESS_PALETTES list ichida)
    # NULL = istalgan palette ishlatilishi mumkin
    recommended_palette_index: Optional[int] = None


# ───────────────────────────────────────────────────────────────
# Section presetlar (qisqartirish uchun)
# ───────────────────────────────────────────────────────────────

# Universal hero — barcha nichelarda ishlaydi
_HERO = TemplateSection(
    type="hero",
    content_keys=["title", "subtitle", "description", "ctaText", "ctaLink", "badge"],
)
_CTA = TemplateSection(
    type="cta",
    content_keys=["title", "description", "ctaText", "ctaLink", "badge"],
)
_CONTACT = TemplateSection(
    type="contact",
    content_keys=["title", "subtitle", "email", "phone", "address", "workingHours"],
)
_ABOUT = TemplateSection(
    type="about",
    content_keys=["title", "subtitle", "description", "mission", "values"],
)
_TESTIMONIALS = TemplateSection(
    type="testimonials",
    content_keys=["title", "subtitle", "items"],
)
_FAQ = TemplateSection(
    type="faq",
    content_keys=["title", "subtitle", "items"],
)
_STATS = TemplateSection(
    type="stats",
    content_keys=["title", "subtitle", "items"],
)
_GALLERY = TemplateSection(
    type="gallery",
    content_keys=["title", "subtitle", "items"],
)
_TEAM = TemplateSection(
    type="team",
    content_keys=["title", "subtitle", "items"],
)


def _services(content_keys: Optional[List[str]] = None) -> TemplateSection:
    return TemplateSection(
        type="services",
        content_keys=content_keys or ["title", "subtitle", "items"],
    )


def _features(content_keys: Optional[List[str]] = None) -> TemplateSection:
    return TemplateSection(
        type="features",
        content_keys=content_keys or ["title", "subtitle", "items"],
    )


def _menu() -> TemplateSection:
    return TemplateSection(
        type="menu",
        content_keys=["title", "subtitle", "categories"],
    )


def _products() -> TemplateSection:
    return TemplateSection(
        type="products",
        content_keys=["title", "subtitle", "items"],
    )


def _portfolio() -> TemplateSection:
    return TemplateSection(
        type="portfolio",
        content_keys=["title", "subtitle", "items"],
    )


def _blog() -> TemplateSection:
    return TemplateSection(
        type="blog",
        content_keys=["title", "subtitle", "items"],
    )


def _pricing() -> TemplateSection:
    return TemplateSection(
        type="pricing",
        content_keys=["title", "subtitle", "items"],
    )


def _booking() -> TemplateSection:
    return TemplateSection(
        type="booking",
        content_keys=["title", "subtitle", "submitText", "infoText"],
    )


# ───────────────────────────────────────────────────────────────
# TEMPLATES — 5 niche × 3 = 15 ta variant
# ───────────────────────────────────────────────────────────────

TEMPLATES: List[Template] = [
    # ═══════════════════════════════════════════════════════════
    # RESTAURANT (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="restaurant_classic_v1",
        niche="restaurant",
        name="Klassik restoran",
        description="Hero → Menyu → Biz haqimizda → Galereya → Mijozlar → Aloqa",
        layout_variant="classic",
        typography_variant="serif",
        density_variant="comfortable",
        sections=[_HERO, _menu(), _ABOUT, _GALLERY, _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="restaurant_modern_v1",
        niche="restaurant",
        name="Modern restoran",
        description="Hero → Stats → Menyu → Bron → Mijozlar → CTA → Aloqa",
        layout_variant="modern",
        typography_variant="display",
        density_variant="spacious",
        sections=[_HERO, _STATS, _menu(), _booking(), _TESTIMONIALS, _CTA, _CONTACT],
    ),
    Template(
        id="restaurant_storytelling_v1",
        niche="restaurant",
        name="Hikoya bilan restoran",
        description="Hero → Biz haqimizda → Menyu → Galereya → Jamoa → FAQ → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _menu(), _GALLERY, _TEAM, _FAQ, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # CLINIC (tibbiyot) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="clinic_trustworthy_v1",
        niche="clinic",
        name="Ishonchli klinika",
        description="Hero → Xizmatlar → Biz haqimizda → Shifokorlar → Mijozlar → FAQ → Aloqa",
        layout_variant="default",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _services(), _ABOUT, _TEAM, _TESTIMONIALS, _FAQ, _CONTACT],
    ),
    Template(
        id="clinic_specialist_v1",
        niche="clinic",
        name="Mutaxassislar klinika",
        description="Hero → Stats → Shifokorlar → Xizmatlar → Bron → Mijozlar → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _TEAM, _services(), _booking(), _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="clinic_wellness_v1",
        niche="clinic",
        name="Wellness/Spa klinika",
        description="Hero → Biz haqimizda → Xizmatlar → Galereya → Pricing → CTA → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _services(), _GALLERY, _pricing(), _CTA, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # SHOP (e-commerce) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="shop_catalog_v1",
        niche="shop",
        name="Katalog do'kon",
        description="Hero → Mahsulotlar → Afzalliklar → Mijozlar → FAQ → CTA → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _products(), _features(), _TESTIMONIALS, _FAQ, _CTA, _CONTACT],
    ),
    Template(
        id="shop_boutique_v1",
        niche="shop",
        name="Butik do'kon",
        description="Hero → Biz haqimizda → Mahsulotlar → Galereya → Mijozlar → Aloqa",
        layout_variant="elegant",
        typography_variant="display",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _products(), _GALLERY, _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="shop_landing_v1",
        niche="shop",
        name="Landing do'kon",
        description="Hero → Stats → Mahsulotlar → Afzalliklar → Pricing → Mijozlar → CTA",
        layout_variant="bold",
        typography_variant="display",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _products(), _features(), _pricing(), _TESTIMONIALS, _CTA],
    ),

    # ═══════════════════════════════════════════════════════════
    # PORTFOLIO (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="portfolio_creative_v1",
        niche="portfolio",
        name="Kreativ portfolio",
        description="Hero → Portfolio → Biz haqimizda → Xizmatlar → Mijozlar → Aloqa",
        layout_variant="bold",
        typography_variant="display",
        density_variant="spacious",
        sections=[_HERO, _portfolio(), _ABOUT, _services(), _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="portfolio_studio_v1",
        niche="portfolio",
        name="Studio portfolio",
        description="Hero → Stats → Xizmatlar → Portfolio → Jamoa → Mijozlar → CTA",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _services(), _portfolio(), _TEAM, _TESTIMONIALS, _CTA],
    ),
    Template(
        id="portfolio_minimal_v1",
        niche="portfolio",
        name="Minimal portfolio",
        description="Hero → Portfolio → Biz haqimizda → Mijozlar → Aloqa",
        layout_variant="default",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _portfolio(), _ABOUT, _TESTIMONIALS, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # NEWS (yangiliklar/blog) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="news_editorial_v1",
        niche="news",
        name="Editorial yangiliklar",
        description="Hero → Blog → Stats → Mualliflar → Aloqa",
        layout_variant="classic",
        typography_variant="serif",
        density_variant="comfortable",
        sections=[_HERO, _blog(), _STATS, _TEAM, _CONTACT],
    ),
    Template(
        id="news_magazine_v1",
        niche="news",
        name="Magazine layout",
        description="Hero → Blog → Biz haqimizda → Mualliflar → CTA → Aloqa",
        layout_variant="elegant",
        typography_variant="display",
        density_variant="spacious",
        sections=[_HERO, _blog(), _ABOUT, _TEAM, _CTA, _CONTACT],
    ),
    Template(
        id="news_modern_v1",
        niche="news",
        name="Modern news portal",
        description="Hero → Stats → Blog → Mualliflar → Mijozlar → FAQ → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _blog(), _TEAM, _TESTIMONIALS, _FAQ, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # WEDDING (to'y/nikoh) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="wedding_romantic_v1",
        niche="wedding",
        name="Romantik to'y",
        description="Hero → Hikoya → Galereya → Bron → Mehmonlar → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _GALLERY, _booking(), _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="wedding_modern_v1",
        niche="wedding",
        name="Zamonaviy to'y",
        description="Hero → Stats → Xizmatlar → Galereya → Pricing → Aloqa",
        layout_variant="modern",
        typography_variant="display",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _services(), _GALLERY, _pricing(), _CONTACT],
    ),
    Template(
        id="wedding_classic_v1",
        niche="wedding",
        name="Klassik to'y",
        description="Hero → Xizmatlar → Galereya → FAQ → Mijozlar → Aloqa",
        layout_variant="classic",
        typography_variant="serif",
        density_variant="comfortable",
        sections=[_HERO, _services(), _GALLERY, _FAQ, _TESTIMONIALS, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # FINANCE (bank/sug'urta/invest) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="finance_trustworthy_v1",
        niche="finance",
        name="Ishonchli moliya",
        description="Hero → Xizmatlar → Stats → Biz haqimizda → FAQ → Aloqa",
        layout_variant="default",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _services(), _STATS, _ABOUT, _FAQ, _CONTACT],
    ),
    Template(
        id="finance_corporate_v1",
        niche="finance",
        name="Korporativ moliya",
        description="Hero → Stats → Xizmatlar → Jamoa → Mijozlar → CTA → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _services(), _TEAM, _TESTIMONIALS, _CTA, _CONTACT],
    ),
    Template(
        id="finance_premium_v1",
        niche="finance",
        name="Premium investitsiya",
        description="Hero → Biz haqimizda → Xizmatlar → Pricing → Mijozlar → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _services(), _pricing(), _TESTIMONIALS, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # LEGAL (yuridik/advokat) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="legal_authority_v1",
        niche="legal",
        name="Mahkam advokatlik",
        description="Hero → Xizmatlar → Biz haqimizda → Jamoa → Mijozlar → FAQ → Aloqa",
        layout_variant="classic",
        typography_variant="serif",
        density_variant="comfortable",
        sections=[_HERO, _services(), _ABOUT, _TEAM, _TESTIMONIALS, _FAQ, _CONTACT],
    ),
    Template(
        id="legal_modern_v1",
        niche="legal",
        name="Zamonaviy yuridik",
        description="Hero → Stats → Xizmatlar → Jamoa → CTA → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _services(), _TEAM, _CTA, _CONTACT],
    ),
    Template(
        id="legal_boutique_v1",
        niche="legal",
        name="Butik yuridik byuro",
        description="Hero → Biz haqimizda → Jamoa → Xizmatlar → Mijozlar → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _ABOUT, _TEAM, _services(), _TESTIMONIALS, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # EDUCATION (kurs/akademiya) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="education_academy_v1",
        niche="education",
        name="Akademiya",
        description="Hero → Xizmatlar (kurslar) → Stats → Mualliflar → Mijozlar → FAQ → Aloqa",
        layout_variant="default",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _services(), _STATS, _TEAM, _TESTIMONIALS, _FAQ, _CONTACT],
    ),
    Template(
        id="education_bootcamp_v1",
        niche="education",
        name="Bootcamp / kurs",
        description="Hero → Stats → Xizmatlar → Pricing → Mijozlar → CTA → Aloqa",
        layout_variant="bold",
        typography_variant="display",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _services(), _pricing(), _TESTIMONIALS, _CTA, _CONTACT],
    ),
    Template(
        id="education_kids_v1",
        niche="education",
        name="Bolalar maktabi",
        description="Hero → Biz haqimizda → Xizmatlar → Galereya → Jamoa → Aloqa",
        layout_variant="modern",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _ABOUT, _services(), _GALLERY, _TEAM, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # HOTEL (mehmonxona/turizm) (3 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="hotel_luxury_v1",
        niche="hotel",
        name="Lyuks mehmonxona",
        description="Hero → Galereya → Xizmatlar → Pricing → Mijozlar → Bron → Aloqa",
        layout_variant="elegant",
        typography_variant="serif",
        density_variant="spacious",
        sections=[_HERO, _GALLERY, _services(), _pricing(), _TESTIMONIALS, _booking(), _CONTACT],
    ),
    Template(
        id="hotel_resort_v1",
        niche="hotel",
        name="Resort/Kurort",
        description="Hero → Stats → Galereya → Xizmatlar → Bron → Mijozlar → Aloqa",
        layout_variant="modern",
        typography_variant="display",
        density_variant="comfortable",
        sections=[_HERO, _STATS, _GALLERY, _services(), _booking(), _TESTIMONIALS, _CONTACT],
    ),
    Template(
        id="hotel_boutique_v1",
        niche="hotel",
        name="Butik mehmonxona",
        description="Hero → Biz haqimizda → Galereya → Xizmatlar → FAQ → Aloqa",
        layout_variant="classic",
        typography_variant="serif",
        density_variant="comfortable",
        sections=[_HERO, _ABOUT, _GALLERY, _services(), _FAQ, _CONTACT],
    ),

    # ═══════════════════════════════════════════════════════════
    # DEFAULT — fallback (har qanday biznes uchun) (1 ta)
    # ═══════════════════════════════════════════════════════════
    Template(
        id="default_universal_v1",
        niche="default",
        name="Universal biznes",
        description="Hero → Xizmatlar → Biz haqimizda → Mijozlar → CTA → Aloqa",
        layout_variant="default",
        typography_variant="sans",
        density_variant="comfortable",
        sections=[_HERO, _services(), _ABOUT, _TESTIMONIALS, _CTA, _CONTACT],
    ),
]


# ───────────────────────────────────────────────────────────────
# Lookup helpers
# ───────────────────────────────────────────────────────────────

# Niche aliaslar — _detect_business_type natijasidan template niche'ga
# o'tkazish uchun. Agar niche mavjud bo'lmasa "default" ishlatiladi.
NICHE_ALIASES: Dict[str, str] = {
    # Restaurant family
    "restaurant": "restaurant",
    "cafe": "restaurant",
    # Health family
    "clinic": "clinic",
    "pharmacy": "clinic",
    "salon": "clinic",  # salon UI ham wellness'ga yaqin
    "gym": "clinic",
    # Commerce family
    "shop": "shop",
    "auto": "shop",
    "real_estate": "shop",
    # Creative family
    "portfolio": "portfolio",
    "agency": "portfolio",
    "photo": "portfolio",
    "tech": "portfolio",
    "music_event": "portfolio",
    # News family
    "news": "news",
    "ngo": "news",
    # New dedicated niches
    "wedding": "wedding",
    "finance": "finance",
    "legal": "legal",
    "education": "education",
    "hotel": "hotel",
}


def _resolve_template_niche(business_type: str) -> str:
    """_detect_business_type natijasini template registry niche'ga oqib chiqadi."""
    return NICHE_ALIASES.get(business_type, "default")


def get_templates_for_niche(niche: str) -> List[Template]:
    """Niche uchun mavjud template'larni qaytaradi (default fallback bilan)."""
    template_niche = _resolve_template_niche(niche)
    matching = [t for t in TEMPLATES if t.niche == template_niche]
    if matching:
        return matching
    # Niche topilmasa default'ni qaytaramiz
    return [t for t in TEMPLATES if t.niche == "default"]


def get_template_by_id(template_id: str) -> Optional[Template]:
    """ID bo'yicha template topadi."""
    for t in TEMPLATES:
        if t.id == template_id:
            return t
    return None


def _seed_to_int(seed: str) -> int:
    """String seed'dan deterministik integer chiqaradi."""
    h = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return int(h[:16], 16)


def pick_template(business_type: str, seed: Optional[str] = None) -> Tuple[Template, str]:
    """
    Niche uchun template tanlaydi (seed-based deterministik).

    Returns: (template, seed)
      - seed berilmasa yangi UUID generatsiya qilinadi
      - bir xil seed har doim bir xil template'ni qaytaradi
    """
    if not seed:
        seed = uuid.uuid4().hex
    candidates = get_templates_for_niche(business_type)
    idx = _seed_to_int(seed) % len(candidates)
    return candidates[idx], seed


def generate_design_seed() -> str:
    """Yangi noyob design seed (32-char hex)."""
    return uuid.uuid4().hex


def template_to_design_meta(template: Template, seed: str) -> Dict[str, Any]:
    """
    Template'ni schema.design ga kiritiladigan metadata'ga o'tkazadi.
    SiteRenderer bu fieldlarni o'qib variantlarni ishlatadi.
    """
    return {
        "template_id": template.id,
        "design_seed": seed,
        "layout_variant": template.layout_variant,
        "typography_variant": template.typography_variant,
        "density_variant": template.density_variant,
        "niche": template.niche,
    }


def template_section_skeleton(template: Template) -> List[Dict[str, Any]]:
    """
    Template sektsiyalarini bo'sh content'li skeleton sifatida qaytaradi.
    AI bu skeletonni content bilan to'ldirishi kerak (yoki backend
    revise oqimida ishlatilishi mumkin).
    """
    skeleton: List[Dict[str, Any]] = []
    for sec in template.sections:
        skeleton.append({
            "type": sec.type,
            "id": sec.id or f"{sec.type}-{uuid.uuid4().hex[:8]}",
            "content": {k: "" for k in sec.content_keys},
        })
    return skeleton


# ───────────────────────────────────────────────────────────────
# Public registry summary (admin/super-admin uchun)
# ───────────────────────────────────────────────────────────────

def list_all_templates() -> List[Dict[str, Any]]:
    """Admin UI uchun barcha template'larning qisqa ro'yxati."""
    return [
        {
            "id": t.id,
            "niche": t.niche,
            "name": t.name,
            "description": t.description,
            "layout_variant": t.layout_variant,
            "typography_variant": t.typography_variant,
            "density_variant": t.density_variant,
            "section_count": len(t.sections),
            "section_types": [s.type for s in t.sections],
        }
        for t in TEMPLATES
    ]


def registry_stats() -> Dict[str, Any]:
    """Registry haqida qisqa statistika."""
    by_niche: Dict[str, int] = {}
    for t in TEMPLATES:
        by_niche[t.niche] = by_niche.get(t.niche, 0) + 1
    return {
        "total_templates": len(TEMPLATES),
        "niches": list(by_niche.keys()),
        "templates_per_niche": by_niche,
    }


# Ekvivalent: random.Random(seed) — ehtiyot shart, agar boshqa joylar
# sof random kerak bo'lsa
def seeded_rng(seed: str) -> random.Random:
    return random.Random(_seed_to_int(seed))
