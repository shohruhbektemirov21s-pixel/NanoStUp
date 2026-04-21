"""
AI services:
  - ArchitectService  — Gemini orqali foydalanuvchi bilan gaplashib, dizayn variantlar va sayt spetsini yig'adi
  - ClaudeService     — tayyor spetsdan JSON sxema generatsiyasi (Claude)
  - AIRouterService   — prompt intentini aniqlaydi
"""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import anthropic
from google import genai
from google.genai import types as genai_types
from django.conf import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# Arxitektor tizim yo'riqnomasi (Gemini roli)
# ─────────────────────────────────────────────────────────────────
ARCHITECT_SYSTEM_PROMPT = """Sen "Antigravity" platformasining "Arxitektor AI" rolisida ishlaysan. Sen Gemini AI — mijozlar bilan muloqot qilib, sayt loyihasini rejalashtiruvchi ekspert.

## SENING VAZIFANG:
1. **Muloqot bosqichi**: Foydalanuvchi sayt so'raganda darhol yaratma. Avval aniqla:
   - Biznes turi va maqsadi
   - Maqsadli auditoriya
   - Kerakli sahifalar

2. **DIZAYN VARIANTLAR**: Biznes turini bilgach, DOIM 3 ta vizual dizayn variantini taklif et.
   Variantlarni [DESIGN_VARIANTS] bloki ichida JSON formatida yoz:

[DESIGN_VARIANTS]
[
  {
    "id": 1,
    "name": "Minimalist Pro",
    "primary": "#1a1a2e",
    "accent": "#e94560",
    "bg": "#f8f9fa",
    "text": "#2d2d2d",
    "mood": "Professional, toza, ishonchli",
    "font": "Inter",
    "layout": "centered",
    "description": "Qora-oq minimalist, korporativ uslub. Nufuzli brendlar uchun.",
    "icon": "🏢"
  },
  {
    "id": 2,
    "name": "Bold Creative",
    "primary": "#6c63ff",
    "accent": "#ff6584",
    "bg": "#ffffff",
    "text": "#1a1a1a",
    "mood": "Ijodiy, zamonaviy, energetik",
    "font": "Poppins",
    "layout": "dynamic",
    "description": "Gradient, rangdor, kreativ dizayn. Startuplar va ijodiy agentliklar uchun.",
    "icon": "🚀"
  },
  {
    "id": 3,
    "name": "Nature Fresh",
    "primary": "#2d6a4f",
    "accent": "#74c69d",
    "bg": "#f0fdf4",
    "text": "#1b4332",
    "mood": "Tabiiy, iliq, ishonchli",
    "font": "Nunito",
    "layout": "soft",
    "description": "Yashil, organik, tabiiy kayfiyat. Ekologik va sog'liqni saqlash sohalari uchun.",
    "icon": "🌿"
  }
]
[/DESIGN_VARIANTS]

3. **Detallar yig'ish**: Qaysi sahifalar kerakligini aniqlashtir.

## QOIDA:
- Foydalanuvchi variant tanlaganda yoki "Bo'ldi, qur", "Yaratib ber", "Tayyor", "Boshla" KABI iboralarni ishlatganda FINAL_SITE_SPEC blokini yaratasan.
- Undan oldin faqat savol-javob olib bor.
- Javoblar DOIM o'zbek tilida, do'stona va professional bo'lsin.
- [DESIGN_VARIANTS] bloki faqat BIRINCHI marta variantlar taklif etilganda yozilsin.
- Emoji ishlatishingiz mumkin (ortiqchasiz).

## FINAL_SITE_SPEC formati (FAQAT foydalanuvchi rozi bo'lganda):
Javobingning OXIRIDA quyidagi blokni yoz:

[FINAL_SITE_SPEC]
Loyiha nomi: {nom}
Maqsad: {qisqacha tavsif}
Sahifalar: {vergul bilan ro'yxat}
Funksiyalar: {xususiyatlar ro'yxati}
Uslub: {ranglar, kayfiyat, shriftlar}
Til: {uz/ru/en}
[/FINAL_SITE_SPEC]"""

# ─────────────────────────────────────────────────────────────────
# Generatsiya tizim yo'riqnomasi
# ─────────────────────────────────────────────────────────────────
GENERATE_SYSTEM_PROMPT = """You are a senior web developer. Generate a complete website JSON schema.

RETURN ONLY valid JSON (no markdown, no explanation):
{
  "siteName": "...",
  "pages": [
    {
      "slug": "home",
      "sections": [
        {"id": "hero-1", "type": "hero", "content": {"title": "...", "description": "...", "ctaText": "..."}, "settings": {}},
        {"id": "features-1", "type": "features", "content": {"title": "...", "items": [{"title": "...", "desc": "..."}]}, "settings": {}},
        {"id": "contact-1", "type": "contact", "content": {"title": "...", "email": "...", "phone": "..."}, "settings": {}}
      ]
    }
  ]
}

Allowed section types: hero, features, stats, pricing, contact, services, about.
Make ALL text content in the requested language. Return ONLY JSON."""

REVISE_SYSTEM_PROMPT = (
    "You are a website schema editor. Apply the user change to the provided JSON schema "
    "and return the FULL updated schema. Preserve unrelated fields. Return ONLY valid JSON."
)

# ─────────────────────────────────────────────────────────────────
# To'liq kod generatsiyasi tizim yo'riqnomasi (Claude)
# ─────────────────────────────────────────────────────────────────
SITE_FILES_SYSTEM_PROMPT = """You are a senior full-stack web developer. Generate a complete, production-ready website package from the provided JSON schema.

Return ONLY a single valid JSON object with this exact structure (no markdown, no explanation):
{
  "index.html": "...full HTML content...",
  "css/styles.css": "...full CSS content...",
  "js/app.js": "...full JavaScript content...",
  "backend/server.js": "...full Node.js Express server content...",
  "backend/package.json": "...package.json content...",
  "backend/.env.example": "...env example content..."
}

## index.html requirements:
- Complete HTML5 document, SEO meta tags, Open Graph
- Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
- Google Fonts via CDN (Inter or Outfit)
- AOS (Animate On Scroll) library via CDN
- Link to css/styles.css and js/app.js
- Full responsive layout: hero, navigation (with hamburger), all sections from schema
- Mobile-first design, professional and modern

## css/styles.css requirements:
- Custom CSS variables for colors/fonts from schema style
- Smooth scroll behavior
- Custom animations (fade-in, slide-up, scale)
- Navbar scroll effect (shrink + shadow on scroll)
- Button hover effects, card shadows
- Loading spinner, mobile menu transitions
- Custom scrollbar styling

## js/app.js requirements:
- Vanilla JS (no jQuery)
- Mobile hamburger menu toggle
- Smooth scroll for anchor links
- AOS initialization
- Navbar shrink on scroll
- Contact form validation and AJAX submit to backend API
- Typing animation for hero title (optional)
- Scroll-to-top button

## backend/server.js requirements:
- Node.js + Express.js REST API
- CORS enabled
- POST /api/contact — receives {name, email, phone, message}, validates, logs
- GET /api/health — health check
- Serve static files from parent directory (for production)
- Environment variables via dotenv
- Error handling middleware
- Port from PORT env var, default 3000

## backend/package.json requirements:
- name, version, description from schema
- dependencies: express, cors, dotenv, nodemailer
- scripts: start, dev (nodemon)

## backend/.env.example:
- PORT=3000
- SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
- CONTACT_EMAIL

## CRITICAL RULES:
- ALL text content (headings, descriptions, buttons) must be in the language specified in the schema
- Professional, modern design with the colors/style from schema
- The JSON values must be properly escaped strings (\\n for newlines, \\" for quotes inside strings)
- Return ONLY the JSON object, nothing else"""

CHAT_SYSTEM_PROMPT = (
    "Siz AI Website Builder platformasining yordamchisisiz. "
    "Savollarga qisqa va aniq javob bering. Foydalanuvchi tilida javob yozing."
)

# Foydalanuvchi tayyor ekanligini bildiruvchi iboralar
READY_TRIGGERS = re.compile(
    r"(bo'ldi|qur|yaratib\s+ber|tayyor|boshla|shu\s+variant|ma'qul|maqul|"
    r"ready|let'?s\s+go|build\s+it|start|go\s+ahead|давай|готово|поехали)",
    re.IGNORECASE,
)

SPEC_PATTERN = re.compile(
    r"\[FINAL_SITE_SPEC\](.*?)\[/FINAL_SITE_SPEC\]",
    re.DOTALL,
)

DESIGN_VARIANTS_PATTERN = re.compile(
    r"\[DESIGN_VARIANTS\]\s*(\[.*?\])\s*\[/DESIGN_VARIANTS\]",
    re.DOTALL,
)


def _extract_json(text: str) -> Dict[str, Any]:
    text = text.strip()
    if "```" in text:
        lines = [ln for ln in text.splitlines() if not ln.strip().startswith("```")]
        text = "\n".join(lines).strip()
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"AI javobida JSON topilmadi. Matn: {text[:300]}")
    try:
        return json.loads(text[start: end + 1])
    except json.JSONDecodeError as exc:
        raise ValueError(f"AI JSON formati noto'g'ri: {exc}") from exc


def _extract_spec(text: str) -> Optional[str]:
    """FINAL_SITE_SPEC blokini ajratib oladi."""
    m = SPEC_PATTERN.search(text)
    return m.group(1).strip() if m else None


def _extract_design_variants(text: str) -> Optional[List[Dict[str, Any]]]:
    """[DESIGN_VARIANTS] blokidan JSON ro'yxatini ajratib oladi."""
    m = DESIGN_VARIANTS_PATTERN.search(text)
    if not m:
        return None
    try:
        return json.loads(m.group(1))
    except (json.JSONDecodeError, ValueError):
        return None


def _spec_to_prompt(spec: str) -> str:
    """Spetsifikatsiyani generatsiya promptiga aylantiradi."""
    return (
        f"Build a complete website based on this specification:\n\n{spec}\n\n"
        "Generate a rich, detailed JSON schema with real content (not placeholders). "
        "Use appropriate language as specified. Include at least hero, services/features, and contact sections."
    )


# ─────────────────────────────────────────────────────────────────
# Claude client
# ─────────────────────────────────────────────────────────────────
def _get_claude_client() -> anthropic.Anthropic:
    api_key = (
        os.environ.get("ANTHROPIC_API_KEY")
        or getattr(settings, "ANTHROPIC_API_KEY", "")
    )
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY .env da topilmadi.")
    return anthropic.Anthropic(api_key=api_key)


def _get_claude_model() -> str:
    return (
        os.environ.get("ANTHROPIC_MODEL")
        or getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6")
    )


# ─────────────────────────────────────────────────────────────────
# Gemini client (ArchitectService uchun) — google.genai SDK
# ─────────────────────────────────────────────────────────────────
def _get_gemini_client() -> genai.Client:
    api_key = (
        os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
        or getattr(settings, "GEMINI_API_KEY", "")
    )
    if not api_key:
        raise RuntimeError("GOOGLE_GENERATIVE_AI_API_KEY .env da topilmadi.")
    return genai.Client(api_key=api_key)


def _get_gemini_model_name() -> str:
    return (
        os.environ.get("GOOGLE_GENERATIVE_AI_MODEL")
        or getattr(settings, "GEMINI_MODEL", "gemini-2.0-flash")
    )


# ─────────────────────────────────────────────────────────────────
# ArchitectService  (Gemini bilan muloqot)
# ─────────────────────────────────────────────────────────────────
class ArchitectService:
    """
    Gemini orqali foydalanuvchi bilan muloqot qilib, sayt spetsini va dizayn
    variantlarini yig'adi. Tayyor bo'lganda FINAL_SITE_SPEC bloki qaytaradi.
    """

    def chat(
        self,
        user_message: str,
        history: List[Dict[str, str]],
    ) -> Tuple[str, Optional[str], Optional[List[Dict[str, Any]]]]:
        """
        Returns: (ai_text, spec_or_None, design_variants_or_None)
          - ai_text          — Gemini javob matni ([DESIGN_VARIANTS] bloki olib tashlangan)
          - spec_or_None     — FINAL_SITE_SPEC topilsa, string
          - design_variants  — dizayn variantlar ro'yxati yoki None
        """
        try:
            client = _get_gemini_client()
            model_name = _get_gemini_model_name()

            # Tarixni Gemini Content formatiga o'tkazamiz
            gemini_history = [
                genai_types.Content(
                    role="user" if item.get("role") == "user" else "model",
                    parts=[genai_types.Part(text=item.get("content", ""))],
                )
                for item in history
            ]

            chat_session = client.chats.create(
                model=model_name,
                config=genai_types.GenerateContentConfig(
                    system_instruction=ARCHITECT_SYSTEM_PROMPT,
                    max_output_tokens=2048,
                ),
                history=gemini_history,
            )
            response = chat_session.send_message(user_message)
            text: str = response.text
        except Exception as exc:
            logger.exception("ArchitectService (Gemini) chat xatosi")
            raise RuntimeError(f"Gemini Arxitektor AI da xatolik: {exc}") from exc

        spec = _extract_spec(text)
        design_variants = _extract_design_variants(text)

        # Javob matnidan [DESIGN_VARIANTS] blokini olib tashlaymiz (frontend alohida ko'rsatadi)
        clean_text = DESIGN_VARIANTS_PATTERN.sub("", text).strip()

        return clean_text, spec, design_variants


# ─────────────────────────────────────────────────────────────────
# ClaudeService  (sayt JSON generatsiyasi)
# ─────────────────────────────────────────────────────────────────
class ClaudeService:
    """Claude orqali JSON sxema generatsiyasi va tahrirlash."""

    def chat(self, prompt: str, history: Optional[List[Dict]] = None) -> str:
        client = _get_claude_client()
        messages: List[Dict[str, Any]] = list(history or [])
        messages.append({"role": "user", "content": prompt})
        try:
            response = client.messages.create(
                model=_get_claude_model(),
                max_tokens=1024,
                system=CHAT_SYSTEM_PROMPT,
                messages=messages,
            )
            return response.content[0].text
        except anthropic.APIError as exc:
            logger.exception("Claude chat xatosi")
            raise RuntimeError(f"AI suhbat xizmatida xatolik: {exc}") from exc

    def generate_from_spec(self, spec: str) -> Dict[str, Any]:
        """FINAL_SITE_SPEC dan to'liq sayt sxemasini generatsiya qiladi (Claude)."""
        client = _get_claude_client()
        prompt = _spec_to_prompt(spec)
        try:
            response = client.messages.create(
                model=_get_claude_model(),
                max_tokens=8096,
                system=GENERATE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return _extract_json(response.content[0].text)
        except anthropic.APIError as exc:
            logger.exception("Claude generate_from_spec xatosi")
            raise RuntimeError(f"Sayt generatsiyasida xatolik: {exc}") from exc

    def generate_full_site(self, prompt: str, language: str = "uz") -> Dict[str, Any]:
        """To'g'ridan-to'g'ri promptdan generatsiya (Claude, architect yo'q)."""
        client = _get_claude_client()
        user_msg = f"Language for all content: {language}\nUser request:\n{prompt}"
        try:
            response = client.messages.create(
                model=_get_claude_model(),
                max_tokens=8096,
                system=GENERATE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            return _extract_json(response.content[0].text)
        except anthropic.APIError as exc:
            logger.exception("Claude generate_full_site xatosi")
            raise RuntimeError(f"Sayt generatsiyasida xatolik: {exc}") from exc

    def revise_site(
        self, prompt: str, current_schema: Dict[str, Any], language: str = "uz"
    ) -> Dict[str, Any]:
        client = _get_claude_client()
        user_msg = (
            f"Current schema JSON:\n{json.dumps(current_schema, ensure_ascii=False)}\n\n"
            f"Language: {language}\nChange request:\n{prompt}"
        )
        try:
            response = client.messages.create(
                model=_get_claude_model(),
                max_tokens=8096,
                system=REVISE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            return _extract_json(response.content[0].text)
        except anthropic.APIError as exc:
            logger.exception("Claude revise xatosi")
            raise RuntimeError(f"Sayt tahrirlashda xatolik: {exc}") from exc

    def generate_site_files(
        self, schema: Dict[str, Any], language: str = "uz"
    ) -> Dict[str, str]:
        """
        JSON sxemadan to'liq sayt fayllarini generatsiya qiladi:
          - index.html (frontend)
          - css/styles.css
          - js/app.js
          - backend/server.js (Node.js + Express)
          - backend/package.json
          - backend/.env.example
        Returns: {"index.html": "...", "css/styles.css": "...", ...}
        """
        client = _get_claude_client()
        user_msg = (
            f"Website language: {language}\n\n"
            f"Website JSON schema:\n{json.dumps(schema, ensure_ascii=False, indent=2)}\n\n"
            "Generate the complete website files as described. Return ONLY the JSON object."
        )
        try:
            response = client.messages.create(
                model=_get_claude_model(),
                max_tokens=16000,
                system=SITE_FILES_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            raw = response.content[0].text
            files = _extract_json(raw)
            # Faqat string qiymatlarni qaytaramiz
            return {k: str(v) for k, v in files.items() if isinstance(v, (str, int, float))}
        except anthropic.APIError as exc:
            logger.exception("Claude generate_site_files xatosi")
            raise RuntimeError(f"Sayt kodi generatsiyasida xatolik: {exc}") from exc


# ─────────────────────────────────────────────────────────────────
# AIRouterService
# ─────────────────────────────────────────────────────────────────
class AIRouterService:
    """Promptni ARCHITECT / GENERATE / CHAT / REVISE ga yo'naltiradi."""

    GENERATE_WORDS = re.compile(
        r"(?<![a-zA-Z'])(yarat|qur|build|create|make|generate)(?![a-zA-Z'])",
        re.IGNORECASE,
    )

    CHAT_SIGNALS = (
        "salom", "assalom", "hi ", "hello", "hey ",
        "rahmat", "thanks", "kim sen", "kimsan",
        "nima qila ol", "how are you", "who are you",
    )

    @classmethod
    def detect_intent(cls, prompt: str, has_project: bool = False) -> str:
        text = prompt.lower().strip()

        # Foydalanuvchi mavjud loyihani tahrirlayapti
        if has_project and not text.endswith("?"):
            return "REVISE"

        is_question = text.endswith("?")
        has_greeting = any(sig in text for sig in cls.CHAT_SIGNALS)
        has_gen_word = bool(cls.GENERATE_WORDS.search(text))

        if has_greeting or (is_question and not has_gen_word):
            return "CHAT"

        if has_gen_word or len(text) > 30:
            return "ARCHITECT"

        return "CHAT"
