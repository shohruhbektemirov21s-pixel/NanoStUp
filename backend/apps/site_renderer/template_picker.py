"""
HTML template tanlash mantig'i.

template_registry.py — abstract template metadata (frontend Next.js uchun).
template_picker.py — REAL HTML fayllarni `templates/sites/<niche>/<variant>.html`
yo'lidan tanlaydi. Tanlash deterministik (sha256 seed) — bir xil sayt har doim
bir xil template'ni oladi.

Saytlar bir-biriga o'xshamasligini ta'minlash uchun 3 ta variant ishlatiladi:
  - template_variant     — HTML fayli (classic/modern/storytelling/...)
  - color_variant        — rang sxemasi (warm/cool/dark/...)
  - typography_variant   — shrift to'plami (sans/serif/display/mono)

Har niche uchun 3 ta HTML template (Faza 1: restaurant; Faza 4: qolganlari).
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# ── HTML template inventari ─────────────────────────────────────────
# Har niche uchun mavjud HTML template fayllar (Django template path).
# Yangi niche/variant qo'shganda — shu yerga ro'yxatga olib qo'ying.
HTML_TEMPLATES: Dict[str, List[str]] = {
    "restaurant": [
        "sites/restaurant/classic.html",
        "sites/restaurant/modern.html",
        "sites/restaurant/storytelling.html",
    ],
    # Faza 4'da qo'shiladi:
    # "clinic":     ["sites/clinic/trustworthy.html", "sites/clinic/specialist.html", "sites/clinic/wellness.html"],
    # "shop":       ["sites/shop/catalog.html",       "sites/shop/boutique.html",    "sites/shop/landing.html"],
    # "portfolio":  [...], "news": [...], "wedding": [...], "finance": [...],
    # "legal": [...], "education": [...], "hotel": [...],
}

# Niche yo'q bo'lsa fallback. 'default.html' universal — har qanday content uchun.
DEFAULT_TEMPLATE = "sites/default.html"

# Niche aliases — `_detect_business_type` natijasini real niche'ga mapping.
# template_registry.py'dagi NICHE_ALIASES bilan sinxron bo'lishi shart.
NICHE_ALIASES: Dict[str, str] = {
    "cafe": "restaurant",
    "coffee": "restaurant",
    "food": "restaurant",
    "salon": "clinic",
    "beauty": "clinic",
    "fitness": "clinic",
    "store": "shop",
    "ecommerce": "shop",
    "boutique": "shop",
    "studio": "portfolio",
    "agency": "portfolio",
    "blog": "news",
    "magazine": "news",
}


# ── Color va typography variantlari ────────────────────────────────
# Backend tomondan tanlanadi (AI kontent qaytaradi, lekin variant
# template_picker tomondan deterministik aniqlanadi).

COLOR_VARIANTS: Tuple[str, ...] = (
    "warm",      # apricot, coral, terracotta — restaurant, hotel
    "cool",      # blue, teal, navy           — clinic, finance, legal
    "vibrant",   # orange, magenta, lime      — shop, portfolio
    "muted",     # beige, taupe, gray         — wedding, news
    "dark",      # near-black + accent        — modern niches
    "neutral",   # white + black + gray       — default fallback
)

TYPOGRAPHY_VARIANTS: Tuple[str, ...] = (
    "sans",      # Inter, system-ui — default, clean
    "serif",     # Playfair, Lora — wedding, legal, hotel
    "display",   # Bebas, Anton  — bold, modern, news
    "mono",      # JetBrains, Fira — tech, portfolio
)


@dataclass(frozen=True)
class HTMLTemplateChoice:
    """Render uchun zarur metadata."""
    html_path: str               # Django template path: 'sites/restaurant/classic.html'
    template_variant: str        # 'classic' | 'modern' | 'storytelling' | ...
    color_variant: str           # COLOR_VARIANTS dan biri
    typography_variant: str      # TYPOGRAPHY_VARIANTS dan biri
    niche: str                   # 'restaurant' | 'clinic' | ...
    seed: str                    # Determinizm uchun

    def to_meta(self) -> Dict[str, str]:
        """schema.design ga merge qilish uchun."""
        return {
            "html_path": self.html_path,
            "template_variant": self.template_variant,
            "color_variant": self.color_variant,
            "typography_variant": self.typography_variant,
            "niche": self.niche,
            "design_seed": self.seed,
        }


def _normalize_niche(niche: Optional[str]) -> str:
    """Niche'ni standart ko'rinishga keltirish."""
    if not niche:
        return "default"
    n = niche.strip().lower()
    return NICHE_ALIASES.get(n, n)


def _seed_to_index(seed: str, modulo: int) -> int:
    """sha256 hash'dan deterministik index."""
    if modulo <= 0:
        return 0
    h = hashlib.sha256(seed.encode("utf-8", errors="ignore")).digest()
    return int.from_bytes(h[:8], "big") % modulo


def pick_html_template(
    niche: Optional[str],
    seed: Optional[str] = None,
    forced_variant: Optional[str] = None,
) -> HTMLTemplateChoice:
    """
    Niche va seed asosida HTML template tanlash.

    Args:
        niche: 'restaurant' | 'clinic' | 'shop' | ... yoki alias.
        seed: Determinizm uchun string. Berilmasa — random UUID hex.
        forced_variant: Test uchun aniq template_variant (masalan 'classic').

    Returns:
        HTMLTemplateChoice — render uchun barcha metadata.

    Faqat ro'yxatga olingan template'lar tanlanadi. Niche ro'yxatda yo'q
    bo'lsa — DEFAULT_TEMPLATE ishlatiladi.
    """
    import uuid

    niche_norm = _normalize_niche(niche)
    seed_str = seed or uuid.uuid4().hex

    # 1. HTML fayl tanlash
    candidates = HTML_TEMPLATES.get(niche_norm, [])
    if not candidates:
        # Fallback: default
        if niche_norm != "default":
            logger.info(
                "pick_html_template: niche=%s ro'yxatda yo'q, default ishlatiladi",
                niche_norm,
            )
        # Ehtiyot shart: default.html mavjud bo'lmasa ham xato bermay,
        # `sites/default.html` qaytaradi (template muhandis qo'shadi).
        html_path = DEFAULT_TEMPLATE
        template_variant = "default"
    else:
        if forced_variant:
            # Test uchun: 'classic' kelsa, 'sites/restaurant/classic.html' tanla.
            forced = [p for p in candidates if forced_variant in p]
            html_path = forced[0] if forced else candidates[0]
        else:
            idx = _seed_to_index(seed_str + ":template", len(candidates))
            html_path = candidates[idx]
        # template_variant — fayl nomidan extension olib tashlanadi
        template_variant = html_path.rsplit("/", 1)[-1].rsplit(".", 1)[0]

    # 2. Color va typography — niche'ga bog'liq, lekin seed bilan o'zgaradi
    color_variant = _pick_color_variant(niche_norm, seed_str)
    typography_variant = _pick_typography_variant(niche_norm, seed_str)

    return HTMLTemplateChoice(
        html_path=html_path,
        template_variant=template_variant,
        color_variant=color_variant,
        typography_variant=typography_variant,
        niche=niche_norm,
        seed=seed_str,
    )


def _pick_color_variant(niche: str, seed: str) -> str:
    """Niche'ga eng mos rang sxemalarini olib, seed orqali tanla."""
    niche_palettes: Dict[str, Tuple[str, ...]] = {
        "restaurant": ("warm", "muted", "dark"),
        "clinic":     ("cool", "neutral", "muted"),
        "shop":       ("vibrant", "neutral", "warm"),
        "portfolio":  ("dark", "neutral", "vibrant"),
        "news":       ("neutral", "muted", "dark"),
        "wedding":    ("muted", "warm", "neutral"),
        "finance":    ("cool", "dark", "neutral"),
        "legal":      ("cool", "muted", "neutral"),
        "education":  ("vibrant", "cool", "warm"),
        "hotel":      ("warm", "muted", "dark"),
    }
    options = niche_palettes.get(niche, COLOR_VARIANTS)
    idx = _seed_to_index(seed + ":color", len(options))
    return options[idx]


def _pick_typography_variant(niche: str, seed: str) -> str:
    """Niche'ga eng mos shrift to'plamini olib, seed orqali tanla."""
    niche_fonts: Dict[str, Tuple[str, ...]] = {
        "restaurant": ("serif", "display", "sans"),
        "clinic":     ("sans", "serif"),
        "shop":       ("sans", "display"),
        "portfolio":  ("display", "mono", "sans"),
        "news":       ("serif", "sans"),
        "wedding":    ("serif", "display"),
        "finance":    ("sans", "serif"),
        "legal":      ("serif", "sans"),
        "education":  ("sans", "display"),
        "hotel":      ("serif", "display"),
    }
    options = niche_fonts.get(niche, TYPOGRAPHY_VARIANTS)
    idx = _seed_to_index(seed + ":typography", len(options))
    return options[idx]


def list_available_templates() -> Dict[str, List[str]]:
    """Admin/debug uchun: barcha mavjud HTML templatelar ro'yxati."""
    return dict(HTML_TEMPLATES)


def picker_stats() -> Dict[str, int]:
    """Statistika: nechta niche, nechta template."""
    total = sum(len(v) for v in HTML_TEMPLATES.values())
    return {
        "total_html_templates": total,
        "niches": len(HTML_TEMPLATES),
        "color_variants": len(COLOR_VARIANTS),
        "typography_variants": len(TYPOGRAPHY_VARIANTS),
    }
