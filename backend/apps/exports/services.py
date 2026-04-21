import io
import json
import zipfile
from html import escape
from typing import Any, Dict, Iterable

from apps.website_projects.models import WebsiteProject


def _txt(value: Any, default: str = "") -> str:
    if value is None:
        return default
    return escape(str(value))


def _render_hero(content: Dict[str, Any]) -> str:
    title = _txt(content.get("title") or content.get("heading"), "")
    subtitle = _txt(content.get("subtitle") or content.get("description"), "")
    cta = _txt(content.get("cta") or content.get("button"), "")
    return f"""
<section class="py-24 px-6 text-center bg-gradient-to-b from-zinc-50 to-white">
  <h1 class="text-5xl md:text-7xl font-black tracking-tight text-zinc-900 max-w-4xl mx-auto">{title}</h1>
  <p class="mt-6 text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto">{subtitle}</p>
  {f'<a href="#" class="inline-block mt-10 px-8 py-4 bg-zinc-900 text-white font-bold rounded-2xl shadow-lg">{cta}</a>' if cta else ''}
</section>
""".strip()


def _render_features(content: Dict[str, Any]) -> str:
    title = _txt(content.get("title"), "Features")
    items: Iterable[Dict[str, Any]] = content.get("items") or content.get("features") or []
    cards = "\n".join(
        f"""
    <div class="p-8 bg-white rounded-3xl border border-zinc-100 shadow-sm">
      <h3 class="text-xl font-bold text-zinc-900">{_txt(item.get('title') or item.get('name'))}</h3>
      <p class="mt-3 text-zinc-600">{_txt(item.get('description') or item.get('text'))}</p>
    </div>""".strip()
        for item in items
    )
    return f"""
<section class="py-20 px-6 bg-zinc-50">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
    <div class="grid md:grid-cols-3 gap-6">{cards}</div>
  </div>
</section>
""".strip()


def _render_stats(content: Dict[str, Any]) -> str:
    items: Iterable[Dict[str, Any]] = content.get("items") or content.get("stats") or []
    cards = "\n".join(
        f"""
    <div class="text-center">
      <div class="text-5xl font-black text-zinc-900">{_txt(item.get('value') or item.get('number'))}</div>
      <div class="mt-2 text-sm font-semibold text-zinc-500 uppercase tracking-widest">{_txt(item.get('label') or item.get('title'))}</div>
    </div>""".strip()
        for item in items
    )
    return f"""
<section class="py-20 px-6 bg-white">
  <div class="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">{cards}</div>
</section>
""".strip()


def _render_pricing(content: Dict[str, Any]) -> str:
    title = _txt(content.get("title"), "Pricing")
    items: Iterable[Dict[str, Any]] = content.get("items") or content.get("plans") or []
    cards = "\n".join(
        f"""
    <div class="p-8 bg-white rounded-3xl border border-zinc-200 flex flex-col">
      <h3 class="text-xl font-bold text-zinc-900">{_txt(item.get('name') or item.get('title'))}</h3>
      <div class="mt-4 text-4xl font-black">{_txt(item.get('price'))}</div>
      <p class="mt-3 text-zinc-600 flex-1">{_txt(item.get('description'))}</p>
      <a href="#" class="mt-6 text-center px-6 py-3 bg-zinc-900 text-white font-bold rounded-xl">{_txt(item.get('cta'), 'Choose')}</a>
    </div>""".strip()
        for item in items
    )
    return f"""
<section class="py-20 px-6 bg-zinc-50">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-4xl font-black text-center text-zinc-900 mb-12">{title}</h2>
    <div class="grid md:grid-cols-3 gap-6">{cards}</div>
  </div>
</section>
""".strip()


def _render_contact(content: Dict[str, Any]) -> str:
    title = _txt(content.get("title"), "Contact")
    email = _txt(content.get("email"))
    phone = _txt(content.get("phone"))
    return f"""
<section class="py-20 px-6 bg-white text-center">
  <h2 class="text-4xl font-black text-zinc-900">{title}</h2>
  <div class="mt-6 space-y-2 text-zinc-600">
    {f'<div>Email: <a class="underline" href="mailto:{email}">{email}</a></div>' if email else ''}
    {f'<div>Phone: {phone}</div>' if phone else ''}
  </div>
</section>
""".strip()


_RENDERERS = {
    "hero": _render_hero,
    "about": _render_hero,
    "features": _render_features,
    "services": _render_features,
    "stats": _render_stats,
    "pricing": _render_pricing,
    "contact": _render_contact,
}


def _render_section(section: Dict[str, Any]) -> str:
    section_type = str(section.get("type", "")).lower()
    renderer = _RENDERERS.get(section_type)
    content = section.get("content") or {}
    if renderer:
        return renderer(content)
    return (
        '<section class="py-10 px-6 border border-dashed border-zinc-300 text-center text-zinc-400 m-6 rounded-3xl">'
        f"Unsupported section: {escape(section_type)}</section>"
    )


def _render_page(schema: Dict[str, Any]) -> str:
    pages = schema.get("pages") or []
    if not pages:
        return '<div class="p-20 text-center font-bold">No pages in schema.</div>'
    page = next((p for p in pages if p.get("slug") == "home"), pages[0])
    return "\n".join(_render_section(s) for s in page.get("sections", []))


def _build_index_html(project: WebsiteProject) -> str:
    body = _render_page(project.schema_data or {})
    return f"""<!DOCTYPE html>
<html lang="{escape(project.language or 'en')}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{escape(project.title)}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
  <style>body {{ font-family: 'Outfit', sans-serif; }}</style>
</head>
<body class="bg-white text-zinc-900">
{body}
</body>
</html>
"""


class ExportService:
    @staticmethod
    def generate_static_zip(project: WebsiteProject) -> io.BytesIO:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr("index.html", _build_index_html(project))
            zip_file.writestr(
                "README.md",
                (
                    f"# {project.title} — AI Generated Website\n\n"
                    "Ushbu loyiha AI Website Builder platformasi orqali yaratildi.\n\n"
                    "## Ishga tushirish\n"
                    "1. ZIP faylni oching.\n"
                    "2. `index.html` faylini brauzerda oching (yoki VS Code Live Server).\n\n"
                    f"Yaratilgan sana: {project.created_at.strftime('%Y-%m-%d %H:%M')}\n"
                ),
            )
            zip_file.writestr(
                "schema_data.json",
                json.dumps(project.schema_data or {}, indent=2, ensure_ascii=False),
            )
        buffer.seek(0)
        return buffer
