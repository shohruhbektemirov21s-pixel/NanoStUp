"""
Site exporter — schema_data dan to'liq ishlaydigan multi-page HTML sayti generatsiya qiladi.

Output ZIP tuzilmasi:
  index.html              — bosh sahifa (slug=home)
  pages/<slug>.html       — qolgan sahifalar
  assets/styles.css       — qo'shimcha stillar (Tailwind CDN ustiga)
  assets/main.js          — mobil menyu, smooth scroll
  README.md               — qanday ishga tushirish
  schema_data.json        — manba JSON (qayta tahrirlash uchun)

Frontend `SiteRenderer.tsx` bilan bir xil section turlarini qo'llab-quvvatlaydi:
  hero · features · services · stats · pricing · contact · about
  testimonials · team · faq · menu · cta · gallery
"""

from __future__ import annotations

import io
import json
import re
import zipfile
from html import escape
from typing import Any, Dict, Iterable, List, Optional, Tuple

from apps.website_projects.models import WebsiteProject


# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def _txt(value: Any, default: str = "") -> str:
    if value is None or value == "":
        return default
    return escape(str(value))


def _raw(value: Any, default: str = "") -> str:
    """Escape qilmasdan string'ga aylantirish (URL, css, raqam uchun)."""
    if value is None or value == "":
        return default
    return str(value)


def _slugify(value: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9-_]+", "-", str(value or "").lower()).strip("-")
    return s or "page"


def _items(content: Dict[str, Any], *keys: str) -> List[Dict[str, Any]]:
    for k in keys:
        v = content.get(k)
        if isinstance(v, list):
            return [x for x in v if isinstance(x, dict)]
    return []


# ═══════════════════════════════════════════════════════════════════
# Color palette (frontend SiteRenderer bilan mos)
# ═══════════════════════════════════════════════════════════════════

PALETTES: List[Tuple[List[str], Dict[str, str]]] = [
    (["restoran", "cafe", "kafe", "food", "taom", "oshxona", "pizza", "burger", "sushi"],
     {"primary": "#e85d04", "accent": "#f48c06", "bg": "#fff8f0", "text": "#1a0a00", "font": "Poppins"}),
    (["salon", "spa", "beauty", "go'zallik", "gozallik", "kosmetik", "nail", "barber", "soch"],
     {"primary": "#c9184a", "accent": "#ff4d6d", "bg": "#fff0f3", "text": "#1a0005", "font": "Playfair Display"}),
    (["gym", "fitness", "sport", "trener", "bodybuilding", "crossfit", "yoga"],
     {"primary": "#e63946", "accent": "#f4a261", "bg": "#0d0d0d", "text": "#ffffff", "font": "Montserrat"}),
    (["klinika", "clinic", "tibbiy", "doktor", "shifokor", "hospital", "health"],
     {"primary": "#0077b6", "accent": "#00b4d8", "bg": "#f0f8ff", "text": "#023e8a", "font": "Inter"}),
    (["tech", "saas", "startup", "software", "it", "dastur", "ilova", "app", "digital"],
     {"primary": "#6366f1", "accent": "#8b5cf6", "bg": "#0f0f1a", "text": "#ffffff", "font": "Space Grotesk"}),
    (["real", "estate", "uy", "kvartira", "property"],
     {"primary": "#1d4e89", "accent": "#f4a261", "bg": "#f8f9fa", "text": "#1a1a2e", "font": "Raleway"}),
    (["ta'lim", "talim", "kurs", "maktab", "akademiya", "school", "academy", "edu"],
     {"primary": "#2d6a4f", "accent": "#52b788", "bg": "#f0fff4", "text": "#081c15", "font": "Poppins"}),
    (["agentlik", "agency", "kreativ", "creative", "dizayn", "design", "studio"],
     {"primary": "#7209b7", "accent": "#f72585", "bg": "#10002b", "text": "#ffffff", "font": "Space Grotesk"}),
    (["shop", "do'kon", "dokon", "market", "mahsulot", "store", "ecommerce"],
     {"primary": "#e63946", "accent": "#457b9d", "bg": "#ffffff", "text": "#1d3557", "font": "Inter"}),
    (["hotel", "mehmonxona", "turizm", "travel", "tourism", "resort"],
     {"primary": "#b5838d", "accent": "#e5989b", "bg": "#fff4e6", "text": "#2d1b1e", "font": "Playfair Display"}),
    (["avto", "auto", "mashina", "car", "transport", "taxi"],
     {"primary": "#212529", "accent": "#ffd60a", "bg": "#0a0a0a", "text": "#ffffff", "font": "Montserrat"}),
    (["portfolio", "freelancer", "shaxsiy", "personal"],
     {"primary": "#4361ee", "accent": "#4cc9f0", "bg": "#0d1b2a", "text": "#ffffff", "font": "Space Grotesk"}),
    (["qurilish", "construction", "arxitektura", "architect", "building"],
     {"primary": "#3a405a", "accent": "#f4a261", "bg": "#f5f5f0", "text": "#1a1a2a", "font": "Raleway"}),
    (["yuridik", "lawyer", "advokat", "legal", "huquq"],
     {"primary": "#1b2a4a", "accent": "#c9a84c", "bg": "#f5f0e8", "text": "#1b2a4a", "font": "Playfair Display"}),
]

DEFAULT_PALETTE = {
    "primary": "#2563eb",
    "accent": "#7c3aed",
    "bg": "#ffffff",
    "text": "#111827",
    "font": "Inter",
}


def _is_plain(color: Optional[str]) -> bool:
    if not color:
        return True
    c = color.lower().replace("#", "")
    return c in {"000000", "111111", "0d0d0d", "1a1a1a", "ffffff", "fefefe", "f8f8f8", "f5f5f5", "eeeeee", "e5e5e5"}


def _luminance(hex_color: str) -> float:
    h = hex_color.replace("#", "")
    if len(h) != 6:
        return 0.5
    try:
        r = int(h[0:2], 16)
        g = int(h[2:4], 16)
        b = int(h[4:6], 16)
        return (r * 299 + g * 587 + b * 114) / 1000 / 255
    except ValueError:
        return 0.5


def _smart_palette(site_name: str, section_types: Iterable[str]) -> Dict[str, str]:
    hay = (site_name + " " + " ".join(section_types)).lower()
    for keys, palette in PALETTES:
        if any(k in hay for k in keys):
            return palette
    return DEFAULT_PALETTE


def _resolve_colors(schema: Dict[str, Any]) -> Dict[str, Any]:
    settings = schema.get("settings") or {}
    site_name = str(schema.get("siteName") or schema.get("name") or "")
    pages = schema.get("pages") or []
    section_types = []
    for p in pages:
        for s in (p.get("sections") or []):
            if isinstance(s, dict) and s.get("type"):
                section_types.append(str(s["type"]))

    use_smart = _is_plain(settings.get("primaryColor")) or not settings.get("primaryColor")
    palette = _smart_palette(site_name, section_types) if use_smart else None

    primary = settings.get("primaryColor") if (settings.get("primaryColor") and not _is_plain(settings.get("primaryColor"))) else palette["primary"]
    accent = settings.get("accentColor") if (settings.get("accentColor") and not _is_plain(settings.get("accentColor"))) else (palette["accent"] if palette else "#6366f1")
    bg = settings.get("bgColor") or (palette["bg"] if palette else "#ffffff")
    text = settings.get("textColor") or (palette["text"] if palette else "#111827")
    font = settings.get("font") or (palette["font"] if palette else "Inter")

    is_dark_primary = _luminance(primary) < 0.5
    is_dark_bg = _luminance(bg) < 0.5

    return {
        "primary": primary,
        "accent": accent,
        "bg": bg,
        "text": text,
        "font": font,
        "on_primary": "#ffffff" if is_dark_primary else "#18181b",
        "muted_text": "rgba(255,255,255,0.6)" if is_dark_bg else "rgba(0,0,0,0.5)",
        "card_bg": "rgba(255,255,255,0.07)" if is_dark_bg else "rgba(0,0,0,0.03)",
        "card_border": "rgba(255,255,255,0.1)" if is_dark_bg else "rgba(0,0,0,0.08)",
        "section_alt": "rgba(255,255,255,0.04)" if is_dark_bg else "rgba(0,0,0,0.025)",
        "is_dark_bg": is_dark_bg,
    }


# ═══════════════════════════════════════════════════════════════════
# Section renderers
# ═══════════════════════════════════════════════════════════════════

def _r_hero(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title") or c.get("heading"), "Xush kelibsiz")
    subtitle = _txt(c.get("subtitle"))
    desc = _txt(c.get("description"))
    cta = _txt(c.get("ctaText") or c.get("cta") or c.get("button"))
    cta_link = _raw(c.get("ctaLink") or "#contact")
    badge = _txt(c.get("badge"))
    badge_html = (
        f'<span class="inline-block mb-4 px-3 py-1 text-xs font-bold tracking-wider uppercase rounded-lg" '
        f'style="background:{col["primary"]}22;color:{col["primary"]};border:1px solid {col["primary"]}44">{badge}</span>'
    ) if badge else ""
    cta_html = (
        f'<a href="{cta_link}" class="inline-block mt-8 px-8 py-4 font-black text-sm rounded-xl shadow-lg hover:opacity-90 transition" '
        f'style="background:{col["primary"]};color:{col["on_primary"]}">{cta}</a>'
    ) if cta else ""
    return f"""
<section class="py-20 md:py-32 px-4 md:px-8 text-center" style="background:{col["bg"]};color:{col["text"]}">
  <div class="max-w-4xl mx-auto">
    {badge_html}
    <h1 class="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-tight" style="color:{col["text"]}">{title}</h1>
    {f'<p class="mt-4 text-base sm:text-lg font-semibold" style="color:{col["primary"]}">{subtitle}</p>' if subtitle else ''}
    {f'<p class="mt-4 text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto" style="color:{col["muted_text"]}">{desc}</p>' if desc else ''}
    {cta_html}
  </div>
</section>
""".strip()


def _r_about(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title") or c.get("heading"), "Biz haqimizda")
    subtitle = _txt(c.get("subtitle"))
    desc = _txt(c.get("description") or c.get("text"))
    mission = _txt(c.get("mission"))
    values = _items(c, "values")
    values_html = ""
    if values:
        cards = "\n".join(
            f'''<div class="p-4 rounded-xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
        <h4 class="font-bold text-sm" style="color:{col["primary"]}">{_txt(v.get("title"))}</h4>
        <p class="mt-1 text-xs leading-relaxed" style="color:{col["muted_text"]}">{_txt(v.get("text") or v.get("description"))}</p>
      </div>'''
            for v in values
        )
        values_html = f'<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">{cards}</div>'

    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
    <div>
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-2 font-semibold text-sm sm:text-base" style="color:{col["primary"]}">{subtitle}</p>' if subtitle else ''}
      {f'<p class="mt-4 text-sm sm:text-base leading-relaxed" style="color:{col["muted_text"]}">{desc}</p>' if desc else ''}
      {f'<p class="mt-3 text-sm leading-relaxed" style="color:{col["muted_text"]}">{mission}</p>' if mission else ''}
    </div>
    {values_html}
  </div>
</section>
""".strip()


def _r_features(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Xizmatlarimiz")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "features", "services")
    cards = []
    for i, item in enumerate(items):
        icon = _txt(item.get("icon"))
        item_title = _txt(item.get("title") or item.get("name"))
        item_desc = _txt(item.get("desc") or item.get("description") or item.get("text"))
        price = item.get("price")
        cards.append(f'''<div class="p-6 md:p-8 rounded-2xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<div class="text-2xl mb-3">{icon}</div>' if icon else ''}
      <h3 class="text-base md:text-lg font-bold" style="color:{col["text"]}">{item_title}</h3>
      <p class="mt-2 text-sm leading-relaxed" style="color:{col["muted_text"]}">{item_desc}</p>
      {f'<div class="mt-3 font-black text-lg" style="color:{col["primary"]}">{_txt(price)}</div>' if price not in (None, "") else ''}
    </div>''')
    cols_class = "grid-cols-1 sm:grid-cols-2" if len(items) <= 2 else "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["section_alt"]}">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10 md:mb-14">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base max-w-xl mx-auto" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid {cols_class} gap-4 md:gap-6">{"".join(cards)}</div>
  </div>
</section>
""".strip()


def _r_stats(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    items = _items(c, "items", "stats")
    cards = "\n".join(
        f'''<div class="text-center">
      {f'<div class="text-2xl mb-2">{_txt(it.get("icon"))}</div>' if it.get("icon") else ''}
      <div class="text-3xl sm:text-4xl md:text-5xl font-black" style="color:{col["on_primary"]}">{_txt(it.get("value") or it.get("number"))}</div>
      <div class="mt-1.5 text-xs sm:text-sm font-semibold uppercase tracking-widest" style="color:{col["on_primary"]};opacity:0.7">{_txt(it.get("label") or it.get("title"))}</div>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-14 md:py-20 px-4 md:px-8" style="background:{col["primary"]}">
  <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">{cards}</div>
</section>
""".strip()


def _r_pricing(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Tariflar")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "plans")
    cards = []
    for it in items:
        is_pop = bool(it.get("popular"))
        name = _txt(it.get("name") or it.get("title"))
        price = _txt(it.get("price"))
        period = _txt(it.get("period"))
        desc = _txt(it.get("description"))
        cta = _txt(it.get("cta") or "Tanlash")
        features = it.get("features") if isinstance(it.get("features"), list) else []
        feats_html = ""
        if features:
            lis = "\n".join(
                f'<li class="flex items-start gap-2 text-sm"><span style="color:{col["on_primary"] if is_pop else col["accent"]}">✓</span> {_txt(f)}</li>'
                for f in features
            )
            feats_html = f'<ul class="mt-4 space-y-1.5">{lis}</ul>'
        style = (
            f'background:{col["primary"]};border:2px solid {col["primary"]};color:{col["on_primary"]}'
            if is_pop else
            f'background:{col["card_bg"]};border:1px solid {col["card_border"]};color:{col["text"]}'
        )
        btn_style = (
            f'background:{col["on_primary"]};color:{col["primary"]}'
            if is_pop else
            f'background:{col["primary"]};color:{col["on_primary"]}'
        )
        cards.append(f'''<div class="p-6 md:p-8 rounded-2xl flex flex-col relative" style="{style}">
      {f'<div class="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-xs font-bold rounded-lg" style="background:{col["accent"]};color:#fff">⭐ Top</div>' if is_pop else ''}
      <h3 class="text-base md:text-lg font-bold">{name}</h3>
      <div class="mt-3 text-3xl md:text-4xl font-black">{price}{f'<span class="text-sm font-normal opacity-60 ml-1">/{period}</span>' if period else ''}</div>
      <p class="mt-2 text-sm opacity-70 flex-1">{desc}</p>
      {feats_html}
      <a href="#contact" class="mt-6 text-center px-5 py-3 font-bold text-sm rounded-xl hover:opacity-90 transition" style="{btn_style}">{cta}</a>
    </div>''')
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10 md:mb-14">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base max-w-xl mx-auto" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">{"".join(cards)}</div>
  </div>
</section>
""".strip()


def _r_contact(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Bog'lanish")
    subtitle = _txt(c.get("subtitle"))
    email = _txt(c.get("email"))
    phone = _txt(c.get("phone"))
    address = _txt(c.get("address"))
    hours = _txt(c.get("workingHours") or c.get("hours"))
    info_blocks = []
    if email:
        info_blocks.append(f'<div><div class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:{col["muted_text"]}">Email</div><a href="mailto:{email}" class="font-semibold text-sm break-all hover:underline" style="color:{col["primary"]}">{email}</a></div>')
    if phone:
        info_blocks.append(f'<div><div class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:{col["muted_text"]}">Telefon</div><a href="tel:{phone}" class="font-semibold text-sm hover:underline" style="color:{col["primary"]}">{phone}</a></div>')
    if address:
        info_blocks.append(f'<div><div class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:{col["muted_text"]}">Manzil</div><p class="text-sm" style="color:{col["text"]}">{address}</p></div>')
    if hours:
        info_blocks.append(f'<div><div class="text-xs font-semibold uppercase tracking-wider mb-1" style="color:{col["muted_text"]}">Ish vaqti</div><p class="text-sm" style="color:{col["text"]}">{hours}</p></div>')
    return f"""
<section id="contact" class="py-16 md:py-24 px-4 md:px-8" style="background:{col["section_alt"]}">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="p-6 rounded-2xl space-y-4" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
        {"".join(info_blocks)}
      </div>
      <form class="p-6 rounded-2xl space-y-3" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}" onsubmit="event.preventDefault();alert('Yuborildi!')">
        <input placeholder="Ismingiz" required class="w-full px-4 py-2.5 text-sm rounded-xl outline-none" style="background:{col["bg"]};border:1px solid {col["card_border"]};color:{col["text"]}">
        <input type="email" placeholder="Email" required class="w-full px-4 py-2.5 text-sm rounded-xl outline-none" style="background:{col["bg"]};border:1px solid {col["card_border"]};color:{col["text"]}">
        <textarea rows="4" placeholder="Xabar..." required class="w-full px-4 py-2.5 text-sm rounded-xl outline-none resize-none" style="background:{col["bg"]};border:1px solid {col["card_border"]};color:{col["text"]}"></textarea>
        <button type="submit" class="w-full py-3 font-bold text-sm rounded-xl hover:opacity-90 transition" style="background:{col["primary"]};color:{col["on_primary"]}">Yuborish</button>
      </form>
    </div>
  </div>
</section>
""".strip()


def _r_testimonials(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Mijozlar fikri")
    items = _items(c, "items", "testimonials")
    cards = "\n".join(
        f'''<div class="p-6 rounded-2xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      <div class="text-amber-400 text-sm">{"★" * int(it.get("rating") or 5)}</div>
      <p class="mt-3 text-sm italic leading-relaxed" style="color:{col["text"]}">"{_txt(it.get("text") or it.get("quote") or it.get("message"))}"</p>
      <div class="mt-4 flex items-center gap-3">
        <div class="w-10 h-10 rounded-full flex items-center justify-center font-black text-sm" style="background:{col["primary"]};color:{col["on_primary"]}">{_txt((it.get("name") or "?")[:1]).upper()}</div>
        <div>
          <div class="font-bold text-sm" style="color:{col["text"]}">{_txt(it.get("name"))}</div>
          {f'<div class="text-xs" style="color:{col["muted_text"]}">{_txt(it.get("role") or it.get("position") or it.get("company"))}</div>' if (it.get("role") or it.get("position") or it.get("company")) else ''}
        </div>
      </div>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-center text-2xl sm:text-3xl md:text-4xl font-black mb-10" style="color:{col["text"]}">{title}</h2>
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">{cards}</div>
  </div>
</section>
""".strip()


def _r_team(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Bizning jamoa")
    items = _items(c, "items", "members", "team")
    cards = "\n".join(
        f'''<div class="text-center p-5 rounded-2xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<img src="{_raw(it.get("image") or it.get("photo"))}" alt="{_txt(it.get("name"))}" class="w-24 h-24 mx-auto rounded-full object-cover mb-4">' if it.get("image") or it.get("photo") else f'<div class="w-24 h-24 mx-auto rounded-full flex items-center justify-center font-black text-2xl mb-4" style="background:{col["primary"]};color:{col["on_primary"]}">{_txt((it.get("name") or "?")[:1]).upper()}</div>'}
      <h3 class="font-bold text-base" style="color:{col["text"]}">{_txt(it.get("name"))}</h3>
      <p class="text-xs mt-1" style="color:{col["primary"]}">{_txt(it.get("role") or it.get("position"))}</p>
      {f'<p class="mt-2 text-xs leading-relaxed" style="color:{col["muted_text"]}">{_txt(it.get("bio") or it.get("description"))}</p>' if (it.get("bio") or it.get("description")) else ''}
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["section_alt"]}">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-center text-2xl sm:text-3xl md:text-4xl font-black mb-10" style="color:{col["text"]}">{title}</h2>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">{cards}</div>
  </div>
</section>
""".strip()


def _r_faq(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Savol-javoblar")
    items = _items(c, "items", "faqs", "questions")
    cards = "\n".join(
        f'''<details class="p-5 rounded-2xl group" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      <summary class="font-bold cursor-pointer list-none flex justify-between items-center text-sm md:text-base" style="color:{col["text"]}">
        <span>{_txt(it.get("question") or it.get("title") or it.get("q"))}</span>
        <span class="text-xl transition-transform group-open:rotate-45" style="color:{col["primary"]}">+</span>
      </summary>
      <p class="mt-3 text-sm leading-relaxed" style="color:{col["muted_text"]}">{_txt(it.get("answer") or it.get("text") or it.get("a"))}</p>
    </details>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-center text-2xl sm:text-3xl md:text-4xl font-black mb-10" style="color:{col["text"]}">{title}</h2>
    <div class="space-y-3">{cards}</div>
  </div>
</section>
""".strip()


def _r_menu(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Menyu")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "menu", "dishes")
    cards = "\n".join(
        f'''<div class="flex items-start gap-4 p-4 rounded-2xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<img src="{_raw(it.get("image"))}" alt="{_txt(it.get("name"))}" class="w-20 h-20 rounded-xl object-cover shrink-0">' if it.get("image") else ''}
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between gap-2">
          <h3 class="font-bold text-sm md:text-base" style="color:{col["text"]}">{_txt(it.get("name") or it.get("title"))}</h3>
          {f'<span class="font-black text-base md:text-lg shrink-0" style="color:{col["primary"]}">{_txt(it.get("price"))}</span>' if it.get("price") else ''}
        </div>
        {f'<p class="mt-1 text-xs sm:text-sm leading-relaxed" style="color:{col["muted_text"]}">{_txt(it.get("description") or it.get("desc"))}</p>' if (it.get("description") or it.get("desc")) else ''}
        {f'<span class="inline-block mt-1 px-2 py-0.5 text-[10px] rounded-md font-semibold" style="background:{col["accent"]}22;color:{col["accent"]}">{_txt(it.get("category"))}</span>' if it.get("category") else ''}
      </div>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-5xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">{cards}</div>
  </div>
</section>
""".strip()


def _r_cta(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title") or c.get("heading"), "Bizga qo'shiling")
    desc = _txt(c.get("description") or c.get("subtitle"))
    cta = _txt(c.get("ctaText") or c.get("cta") or c.get("button") or "Boshlash")
    cta_link = _raw(c.get("ctaLink") or "#contact")
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8 text-center" style="background:{col["primary"]}">
  <div class="max-w-3xl mx-auto">
    <h2 class="text-2xl sm:text-3xl md:text-5xl font-black" style="color:{col["on_primary"]}">{title}</h2>
    {f'<p class="mt-4 text-sm sm:text-base md:text-lg" style="color:{col["on_primary"]};opacity:0.85">{desc}</p>' if desc else ''}
    <a href="{cta_link}" class="inline-block mt-8 px-8 py-4 font-black text-sm rounded-xl shadow-lg hover:opacity-90 transition" style="background:{col["on_primary"]};color:{col["primary"]}">{cta}</a>
  </div>
</section>
""".strip()


def _r_gallery(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Galereya")
    images = c.get("items") or c.get("images") or []
    if not isinstance(images, list):
        images = []
    cards = []
    for img in (images if isinstance(images, list) else []):
        if isinstance(img, str):
            url = _raw(img)
            cap = ""
        elif isinstance(img, dict):
            url = _raw(img.get("url") or img.get("src") or img.get("image"))
            cap = _txt(img.get("caption") or img.get("title"))
        else:
            continue
        if not url:
            continue
        caption_html = f'<div class="p-3 text-xs font-semibold" style="color:{col["text"]}">{cap}</div>' if cap else ""
        cards.append(
            f'<div class="rounded-2xl overflow-hidden" style="background:{col["card_bg"]}">'
            f'<img src="{url}" alt="{cap}" class="w-full h-48 md:h-56 object-cover hover:scale-105 transition-transform duration-500">'
            f'{caption_html}'
            "</div>"
        )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-center text-2xl sm:text-3xl md:text-4xl font-black mb-10" style="color:{col["text"]}">{title}</h2>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">{"".join(cards)}</div>
  </div>
</section>
""".strip()


def _r_blog(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Blog")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "posts", "articles")
    cards = "\n".join(
        f'''<article class="rounded-2xl overflow-hidden flex flex-col" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<img src="{_raw(it.get("image") or it.get("thumbnail"))}" alt="{_txt(it.get("title"))}" class="w-full h-48 object-cover">' if (it.get("image") or it.get("thumbnail")) else ''}
      <div class="p-5 flex-1 flex flex-col">
        {f'<span class="inline-block self-start mb-2 px-2 py-0.5 text-[10px] rounded-md font-semibold" style="background:{col["accent"]}22;color:{col["accent"]}">{_txt(it.get("category"))}</span>' if it.get("category") else ''}
        <h3 class="font-bold text-base md:text-lg mb-2" style="color:{col["text"]}">{_txt(it.get("title"))}</h3>
        <p class="text-sm leading-relaxed mb-4 flex-1" style="color:{col["muted_text"]}">{_txt(it.get("excerpt") or it.get("description"))}</p>
        <div class="flex items-center justify-between text-xs" style="color:{col["muted_text"]}">
          <span>{_txt(it.get("author"))}</span>
          <span>{_txt(it.get("date"))}{(" · " + _txt(it.get("readTime"))) if it.get("readTime") else ""}</span>
        </div>
      </div>
    </article>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{cards}</div>
  </div>
</section>
""".strip()


def _r_products(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Mahsulotlar")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "products", "goods")
    cards = "\n".join(
        f'''<div class="rounded-2xl overflow-hidden flex flex-col" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      <div class="relative">
        {f'<img src="{_raw(it.get("image"))}" alt="{_txt(it.get("name"))}" class="w-full h-48 object-cover">' if it.get("image") else f'<div class="w-full h-48" style="background:{col["accent"]}22"></div>'}
        {f'<span class="absolute top-3 left-3 px-2 py-1 text-[10px] rounded-md font-bold" style="background:{col["primary"]};color:{col["on_primary"]}">{_txt(it.get("badge") or "YANGI")}</span>' if it.get("badge") or it.get("oldPrice") else ''}
      </div>
      <div class="p-4 flex-1 flex flex-col">
        {f'<span class="text-[11px] mb-1" style="color:{col["muted_text"]}">{_txt(it.get("category"))}</span>' if it.get("category") else ''}
        <h3 class="font-bold text-sm md:text-base mb-1" style="color:{col["text"]}">{_txt(it.get("name") or it.get("title"))}</h3>
        <div class="flex items-baseline gap-2 mb-3">
          <span class="font-black text-base md:text-lg" style="color:{col["primary"]}">{_txt(it.get("price"))}</span>
          {f'<span class="text-xs line-through" style="color:{col["muted_text"]}">{_txt(it.get("oldPrice"))}</span>' if it.get("oldPrice") else ''}
        </div>
        <a href="{_raw(it.get("link") or "#contact")}" class="mt-auto block text-center px-3 py-2 rounded-lg text-xs font-bold transition hover:opacity-90" style="background:{col["primary"]};color:{col["on_primary"]}">Savatga</a>
      </div>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">{cards}</div>
  </div>
</section>
""".strip()


def _r_portfolio(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Portfolio")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "projects", "works")
    cards = "\n".join(
        f'''<a href="{_raw(it.get("link") or "#contact")}" class="group block rounded-2xl overflow-hidden relative" style="background:{col["card_bg"]}">
      {f'<img src="{_raw(it.get("image"))}" alt="{_txt(it.get("title"))}" class="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500">' if it.get("image") else f'<div class="w-full h-64" style="background:{col["accent"]}33"></div>'}
      <div class="absolute inset-0 flex flex-col justify-end p-5" style="background:linear-gradient(to top, {col["text"]}cc, transparent)">
        {f'<span class="inline-block self-start mb-2 px-2 py-0.5 text-[10px] rounded-md font-semibold" style="background:{col["accent"]};color:{col["on_primary"]}">{_txt(it.get("category"))}</span>' if it.get("category") else ''}
        <h3 class="font-bold text-base md:text-lg mb-1" style="color:{col["card_bg"]}">{_txt(it.get("title"))}</h3>
        {f'<p class="text-xs sm:text-sm" style="color:{col["card_bg"]};opacity:0.85">{_txt(it.get("description"))}</p>' if it.get("description") else ''}
        {f'<span class="mt-1 text-[11px]" style="color:{col["card_bg"]};opacity:0.7">{_txt(it.get("client"))}</span>' if it.get("client") else ''}
      </div>
    </a>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{cards}</div>
  </div>
</section>
""".strip()


def _r_properties(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Ko'chmas mulk")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "properties", "listings")
    cards = "\n".join(
        f'''<div class="rounded-2xl overflow-hidden" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<img src="{_raw(it.get("image"))}" alt="{_txt(it.get("title"))}" class="w-full h-52 object-cover">' if it.get("image") else f'<div class="w-full h-52" style="background:{col["accent"]}22"></div>'}
      <div class="p-5">
        <div class="flex items-baseline justify-between gap-2 mb-2">
          <span class="font-black text-lg md:text-xl" style="color:{col["primary"]}">{_txt(it.get("price"))}</span>
          {f'<span class="text-[11px] px-2 py-0.5 rounded-md font-semibold" style="background:{col["accent"]}22;color:{col["accent"]}">{_txt(it.get("type"))}</span>' if it.get("type") else ''}
        </div>
        <h3 class="font-bold text-sm md:text-base mb-1" style="color:{col["text"]}">{_txt(it.get("title"))}</h3>
        <p class="text-xs mb-3" style="color:{col["muted_text"]}">📍 {_txt(it.get("location"))}</p>
        <div class="flex items-center gap-3 text-xs" style="color:{col["muted_text"]}">
          {f'<span>🛏 {_txt(it.get("bedrooms"))}</span>' if it.get("bedrooms") is not None else ''}
          {f'<span>🛁 {_txt(it.get("bathrooms"))}</span>' if it.get("bathrooms") is not None else ''}
          {f'<span>📐 {_txt(it.get("area"))}</span>' if it.get("area") else ''}
        </div>
      </div>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-7xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{cards}</div>
  </div>
</section>
""".strip()


def _r_booking(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Bron qilish")
    subtitle = _txt(c.get("subtitle"))
    submit_text = _txt(c.get("submitText") or c.get("cta"), "Bron qilish")
    info_text = _txt(c.get("infoText") or c.get("description"))
    fields = c.get("fields") or [
        {"name": "name", "label": "Ism", "type": "text"},
        {"name": "phone", "label": "Telefon", "type": "tel"},
        {"name": "date", "label": "Sana", "type": "date"},
        {"name": "time", "label": "Vaqt", "type": "time"},
    ]
    if not isinstance(fields, list):
        fields = []
    inputs = []
    for f in fields:
        if not isinstance(f, dict):
            continue
        f_label = _txt(f.get("label") or f.get("name"))
        f_name = _raw(f.get("name") or f.get("label") or "field")
        f_type = _raw(f.get("type") or "text")
        if f_type == "select" and isinstance(f.get("options"), list):
            opts = "".join(f'<option>{_txt(o)}</option>' for o in f["options"])
            inputs.append(f'<div><label class="block text-xs font-semibold mb-1" style="color:{col["muted_text"]}">{f_label}</label><select name="{f_name}" class="w-full px-3 py-2 rounded-lg text-sm" style="background:{col["card_bg"]};border:1px solid {col["card_border"]};color:{col["text"]}">{opts}</select></div>')
        elif f_type == "textarea":
            inputs.append(f'<div class="md:col-span-2"><label class="block text-xs font-semibold mb-1" style="color:{col["muted_text"]}">{f_label}</label><textarea name="{f_name}" rows="3" class="w-full px-3 py-2 rounded-lg text-sm" style="background:{col["card_bg"]};border:1px solid {col["card_border"]};color:{col["text"]}"></textarea></div>')
        else:
            inputs.append(f'<div><label class="block text-xs font-semibold mb-1" style="color:{col["muted_text"]}">{f_label}</label><input type="{f_type}" name="{f_name}" class="w-full px-3 py-2 rounded-lg text-sm" style="background:{col["card_bg"]};border:1px solid {col["card_border"]};color:{col["text"]}"></div>')
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <form class="grid grid-cols-1 md:grid-cols-2 gap-4 p-6 rounded-2xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}" onsubmit="event.preventDefault(); alert('Murojaatingiz qabul qilindi.')">
      {"".join(inputs)}
      <button type="submit" class="md:col-span-2 mt-2 px-6 py-3 rounded-xl font-black text-sm hover:opacity-90 transition" style="background:{col["primary"]};color:{col["on_primary"]}">{submit_text}</button>
      {f'<p class="md:col-span-2 text-xs text-center" style="color:{col["muted_text"]}">{info_text}</p>' if info_text else ''}
    </form>
  </div>
</section>
""".strip()


def _r_timeline(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Bizning tariximiz")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "events", "steps")
    rows = "\n".join(
        f'''<div class="relative pl-12 pb-8 last:pb-0">
      <span class="absolute left-0 top-0 w-9 h-9 rounded-full flex items-center justify-center font-black text-sm" style="background:{col["primary"]};color:{col["on_primary"]}">{_txt(it.get("icon") or it.get("year") or it.get("step") or "•")}</span>
      <span class="absolute left-[1.05rem] top-9 bottom-0 w-px" style="background:{col["card_border"]}"></span>
      <div class="text-[11px] font-bold mb-1" style="color:{col["accent"]}">{_txt(it.get("year"))}</div>
      <h3 class="font-bold text-base md:text-lg mb-1" style="color:{col["text"]}">{_txt(it.get("title"))}</h3>
      <p class="text-sm leading-relaxed" style="color:{col["muted_text"]}">{_txt(it.get("description") or it.get("text"))}</p>
    </div>'''
        for it in items
    )
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-3xl mx-auto">
    <div class="text-center mb-10">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div>{rows}</div>
  </div>
</section>
""".strip()


def _r_logos(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Bizga ishonadi")
    subtitle = _txt(c.get("subtitle"))
    items = _items(c, "items", "logos", "brands", "clients")
    cards = "\n".join(
        f'''<div class="flex items-center justify-center p-4 rounded-xl h-20" style="background:{col["card_bg"]};border:1px solid {col["card_border"]}">
      {f'<img src="{_raw(it.get("logo") or it.get("image") or it.get("src"))}" alt="{_txt(it.get("alt") or it.get("name"))}" class="max-h-12 max-w-full object-contain opacity-70 hover:opacity-100 transition">' if (it.get("logo") or it.get("image") or it.get("src")) else f'<span class="font-bold text-sm" style="color:{col["muted_text"]}">{_txt(it.get("name"))}</span>'}
    </div>'''
        for it in items
    )
    return f"""
<section class="py-12 md:py-16 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-6xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-base md:text-xl font-bold uppercase tracking-wide" style="color:{col["muted_text"]}">{title}</h2>
      {f'<p class="mt-2 text-xs" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">{cards}</div>
  </div>
</section>
""".strip()


def _r_video(c: Dict[str, Any], col: Dict[str, Any]) -> str:
    title = _txt(c.get("title"), "Video")
    subtitle = _txt(c.get("subtitle"))
    description = _txt(c.get("description"))
    cta_text = _txt(c.get("ctaText") or c.get("cta"))
    cta_link = _raw(c.get("ctaLink") or "#contact")
    video_url = _raw(c.get("videoUrl") or c.get("url") or "")
    thumbnail = _raw(c.get("thumbnail") or c.get("poster") or "")
    embed_html = ""
    if "youtube.com/watch" in video_url or "youtu.be/" in video_url:
        # YouTube embed URL'ga aylantiramiz
        vid = ""
        if "v=" in video_url:
            vid = video_url.split("v=", 1)[1].split("&", 1)[0]
        elif "youtu.be/" in video_url:
            vid = video_url.split("youtu.be/", 1)[1].split("?", 1)[0]
        if vid:
            embed_html = f'<iframe src="https://www.youtube.com/embed/{escape(vid)}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen class="w-full aspect-video rounded-2xl"></iframe>'
    elif video_url.endswith(".mp4") or video_url.endswith(".webm"):
        poster_attr = f' poster="{thumbnail}"' if thumbnail else ""
        embed_html = f'<video controls{poster_attr} class="w-full aspect-video rounded-2xl"><source src="{video_url}"></video>'
    if not embed_html:
        embed_html = f'<div class="w-full aspect-video rounded-2xl flex items-center justify-center text-4xl" style="background:{col["card_bg"]};border:1px solid {col["card_border"]};color:{col["primary"]}">▶</div>'
    return f"""
<section class="py-16 md:py-24 px-4 md:px-8" style="background:{col["bg"]}">
  <div class="max-w-4xl mx-auto">
    <div class="text-center mb-8">
      <h2 class="text-2xl sm:text-3xl md:text-4xl font-black" style="color:{col["text"]}">{title}</h2>
      {f'<p class="mt-3 text-sm sm:text-base" style="color:{col["muted_text"]}">{subtitle}</p>' if subtitle else ''}
    </div>
    {embed_html}
    {f'<p class="mt-6 text-center text-sm leading-relaxed" style="color:{col["muted_text"]}">{description}</p>' if description else ''}
    {f'<div class="mt-6 text-center"><a href="{cta_link}" class="inline-block px-6 py-3 rounded-xl font-black text-sm transition hover:opacity-90" style="background:{col["primary"]};color:{col["on_primary"]}">{cta_text}</a></div>' if cta_text else ''}
  </div>
</section>
""".strip()


# Section type → renderer
_RENDERERS = {
    "hero": _r_hero,
    "about": _r_about,
    "features": _r_features,
    "services": _r_features,
    "stats": _r_stats,
    "pricing": _r_pricing,
    "contact": _r_contact,
    "testimonials": _r_testimonials,
    "reviews": _r_testimonials,
    "team": _r_team,
    "faq": _r_faq,
    "menu": _r_menu,
    "cta": _r_cta,
    "gallery": _r_gallery,
    "blog": _r_blog,
    "news": _r_blog,
    "products": _r_products,
    "shop": _r_products,
    "portfolio": _r_portfolio,
    "works": _r_portfolio,
    "properties": _r_properties,
    "listings": _r_properties,
    "booking": _r_booking,
    "reservation": _r_booking,
    "timeline": _r_timeline,
    "history": _r_timeline,
    "logos": _r_logos,
    "clients": _r_logos,
    "brands": _r_logos,
    "video": _r_video,
}


def _render_section(section: Dict[str, Any], col: Dict[str, Any]) -> str:
    s_type = str(section.get("type", "")).lower().strip()
    content = section.get("content") if isinstance(section.get("content"), dict) else {}
    section_id = section.get("id")
    id_attr = f' id="{escape(str(section_id))}"' if section_id else ""
    renderer = _RENDERERS.get(s_type)
    if renderer:
        inner = renderer(content, col)
    else:
        inner = (
            f'<section class="py-10 px-6 m-6 rounded-2xl text-center text-sm" '
            f'style="border:1px dashed {col["card_border"]};color:{col["muted_text"]}">'
            f'Section: <code>{escape(s_type)}</code>'
            "</section>"
        )
    return f'<div{id_attr}>{inner}</div>'


# ═══════════════════════════════════════════════════════════════════
# Page builder
# ═══════════════════════════════════════════════════════════════════

def _nav_html(pages: List[Dict[str, Any]], current_slug: str, site_name: str, col: Dict[str, Any]) -> str:
    if len(pages) <= 1:
        return ""
    in_subdir = current_slug != "home"
    links = []
    for p in pages:
        slug = p.get("slug") or "page"
        title = _txt(p.get("title") or slug.replace("-", " ").title())
        if slug == "home":
            href = "../index.html" if in_subdir else "index.html"
        else:
            href = f"{_slugify(slug)}.html" if in_subdir else f"pages/{_slugify(slug)}.html"
        is_active = slug == current_slug
        active_style = (
            f"background:{col['primary']};color:{col['on_primary']}"
            if is_active else
            f"color:{col['muted_text']}"
        )
        links.append(
            f'<a href="{href}" class="px-3 py-1.5 rounded-lg text-sm font-semibold capitalize hover:opacity-80 transition" style="{active_style}">{title}</a>'
        )
    home_href = "../index.html" if in_subdir else "index.html"
    return f"""
<nav class="sticky top-0 z-20 backdrop-blur-md" style="background:{col["bg"]}f0;border-bottom:1px solid {col["card_border"]}">
  <div class="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between h-14 md:h-16">
    <a href="{home_href}" class="font-black text-base md:text-lg tracking-tight" style="color:{col["text"]}">{escape(site_name)}</a>
    <div class="hidden md:flex items-center gap-1">{"".join(links)}</div>
    <button id="mobileMenuBtn" class="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menu" style="color:{col["text"]}">
      <span class="block w-5 h-0.5" style="background:{col["text"]}"></span>
      <span class="block w-5 h-0.5" style="background:{col["text"]}"></span>
      <span class="block w-5 h-0.5" style="background:{col["text"]}"></span>
    </button>
  </div>
  <div id="mobileMenu" class="md:hidden hidden px-4 py-3 flex-col gap-1" style="background:{col["bg"]};border-top:1px solid {col["card_border"]}">
    {"".join(links)}
  </div>
</nav>
""".strip()


def _footer_html(site_name: str, col: Dict[str, Any]) -> str:
    return f"""
<footer class="py-8 px-4 text-center text-sm" style="background:{col["primary"]};color:{col["on_primary"]}">
  © <span id="year"></span> {escape(site_name)}
  <div class="mt-1 text-xs" style="opacity:0.55">Barcha huquqlar himoyalangan</div>
</footer>
<script>document.getElementById('year').textContent = new Date().getFullYear();</script>
""".strip()


def _build_page_html(
    page: Dict[str, Any],
    schema: Dict[str, Any],
    col: Dict[str, Any],
    pages: List[Dict[str, Any]],
    is_root: bool,
) -> str:
    site_name = str(schema.get("siteName") or schema.get("name") or "Sayt")
    page_title = _txt(page.get("title") or site_name, site_name)
    sections = page.get("sections") or []
    slug = page.get("slug") or "home"

    sections_html = "\n".join(_render_section(s, col) for s in sections if isinstance(s, dict))

    css_path = "assets/styles.css" if is_root else "../assets/styles.css"
    js_path = "assets/main.js" if is_root else "../assets/main.js"

    nav = _nav_html(pages, slug, site_name, col)
    footer = _footer_html(site_name, col)

    font_family = col["font"]
    font_url_name = font_family.replace(" ", "+")

    return f"""<!DOCTYPE html>
<html lang="{escape(schema.get("language") or "uz")}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>{page_title} — {escape(site_name)}</title>
  <meta name="description" content="{_txt(schema.get("description") or page_title)}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family={font_url_name}:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{css_path}">
</head>
<body style="background:{col["bg"]};color:{col["text"]};font-family:'{font_family}',sans-serif">
{nav}
<main>{sections_html}</main>
{footer}
<script src="{js_path}"></script>
</body>
</html>
"""


# ═══════════════════════════════════════════════════════════════════
# Assets (CSS/JS)
# ═══════════════════════════════════════════════════════════════════

_CSS = """
/* NanoStUp generated styles */
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; -webkit-font-smoothing: antialiased; }
img { max-width: 100%; display: block; }
details summary { user-select: none; }
details summary::-webkit-details-marker { display: none; }
@keyframes fadeUp { from { opacity:0; transform: translateY(20px); } to { opacity:1; transform: translateY(0); } }
section > div { animation: fadeUp 0.6s ease-out both; }
"""

_JS = """
// NanoStUp generated — mobile menu + smooth scroll
(function() {
  var btn = document.getElementById('mobileMenuBtn');
  var menu = document.getElementById('mobileMenu');
  if (btn && menu) {
    btn.addEventListener('click', function() {
      menu.classList.toggle('hidden');
      menu.classList.toggle('flex');
    });
  }
  // Smooth scroll for hash links
  document.querySelectorAll('a[href^="#"]').forEach(function(a) {
    a.addEventListener('click', function(e) {
      var id = a.getAttribute('href').slice(1);
      if (!id) return;
      var el = document.getElementById(id);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' }); }
    });
  });
})();
"""


# ═══════════════════════════════════════════════════════════════════
# README
# ═══════════════════════════════════════════════════════════════════

def _build_readme(project: WebsiteProject, has_backend: bool, page_count: int) -> str:
    backend_section = """
## Backend ishga tushirish (Node.js)
```bash
cd backend
npm install
cp .env.example .env
npm start
```
""" if has_backend else ""

    return f"""# {project.title}
> NanoStUp yordamida yaratildi (Gemini + Claude)

## Tuzilma
```
{project.title}/
├── index.html              ← bosh sahifa
├── pages/                  ← qolgan {max(0, page_count - 1)} ta sahifa
├── assets/
│   ├── styles.css          ← qo'shimcha stillar
│   └── main.js             ← mobil menyu, smooth scroll
├── schema_data.json        ← saytning JSON manbasi (admin paneldan tahrirlanadi)
└── README.md
```

## Brauzerda ochish
```bash
# Oddiy: index.html ni brauzerda oching
# Yoki Python local server:
python3 -m http.server 8080
# So'ng http://localhost:8080
```
{backend_section}
## Texnologiyalar
- HTML5 + Tailwind CSS (CDN)
- Vanilla JavaScript (responsive menyu, smooth scroll)
- Google Fonts
- Sahifalar: {page_count} ta

---
NanoStUp · https://nanostup.uz
"""


# ═══════════════════════════════════════════════════════════════════
# Domain protection (eski mantiq saqlanadi)
# ═══════════════════════════════════════════════════════════════════

DOMAIN_PROTECTION_SCRIPT = """
<script>
(function() {
    var host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || host === '') return;
    if (host.endsWith('nanostup.uz')) return;
    fetch('https://api.nanostup.uz/api/public/verify-domain/?domain=' + host)
      .then(r => r.json())
      .then(d => {
         if(!d.allowed) {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#f8f9fa;color:#1f2937;text-align:center;"><div style="background:white;padding:40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.05);max-width:500px;"><h2>Ruxsat etilmagan domen</h2><p>Ushbu sayt faqat NanoStUp platformasida ishlashga mo\\'ljallangan.</p><a href="https://nanostup.uz" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#6366f1;color:white;text-decoration:none;border-radius:8px;">NanoStUp ga o\\'tish</a></div></div>';
         }
      }).catch(function() {});
})();
</script>
"""


def _inject_domain_protection(html: str) -> str:
    if "</body>" in html:
        return html.replace("</body>", f"{DOMAIN_PROTECTION_SCRIPT}\n</body>")
    return html + DOMAIN_PROTECTION_SCRIPT


# ═══════════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════════

class ExportService:

    @staticmethod
    def generate_static_zip(project: WebsiteProject) -> io.BytesIO:
        """
        schema_data dan to'liq, ishlaydigan multi-page HTML saytni ZIP qiladi.
        Claude'ni chaqirmaydi — schema'ning o'zidan render qiladi (~100ms).
        """
        schema = project.schema_data or {}
        col = _resolve_colors(schema)

        pages_raw = schema.get("pages") if isinstance(schema.get("pages"), list) else []
        pages: List[Dict[str, Any]] = [p for p in pages_raw if isinstance(p, dict)]
        if not pages:
            # Fallback: schema'da bevosita sections bor bo'lishi mumkin
            direct = schema.get("sections")
            if isinstance(direct, list):
                pages = [{"slug": "home", "title": "Home", "sections": direct}]

        if not pages:
            pages = [{"slug": "home", "title": "Home", "sections": []}]

        # Home sahifasini birinchi qilamiz
        home_idx = next((i for i, p in enumerate(pages) if p.get("slug") == "home"), 0)
        if home_idx != 0:
            pages.insert(0, pages.pop(home_idx))

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            # Sahifalar
            for i, page in enumerate(pages):
                slug = page.get("slug") or f"page-{i}"
                is_root = (i == 0)
                html = _build_page_html(page, schema, col, pages, is_root=is_root)
                html = _inject_domain_protection(html)
                if is_root:
                    zf.writestr("index.html", html)
                else:
                    zf.writestr(f"pages/{_slugify(slug)}.html", html)

            # Assets
            zf.writestr("assets/styles.css", _CSS.strip() + "\n")
            zf.writestr("assets/main.js", _JS.strip() + "\n")

            # README + manba
            zf.writestr(
                "README.md",
                _build_readme(project, has_backend=False, page_count=len(pages)),
            )
            zf.writestr(
                "schema_data.json",
                json.dumps(schema, indent=2, ensure_ascii=False),
            )
        buffer.seek(0)
        return buffer

    @staticmethod
    def generate_zip_from_files(
        project: WebsiteProject,
        generated_files: Dict[str, str],
    ) -> io.BytesIO:
        """Claude tomonidan yaratilgan to'liq fayllardan ZIP tuzadi (eski mantiq)."""
        has_backend = "backend/server.js" in generated_files
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for file_path, content in generated_files.items():
                if file_path.endswith(".html"):
                    content = _inject_domain_protection(content)
                zf.writestr(file_path, content)
            page_count = sum(1 for k in generated_files if k.endswith(".html"))
            zf.writestr(
                "README.md",
                _build_readme(project, has_backend=has_backend, page_count=max(1, page_count)),
            )
            zf.writestr(
                "schema_data.json",
                json.dumps(project.schema_data or {}, indent=2, ensure_ascii=False),
            )
        buffer.seek(0)
        return buffer
