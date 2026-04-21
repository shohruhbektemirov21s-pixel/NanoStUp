"""
AI services:
  - ArchitectService  — foydalanuvchi bilan gaplashib, sayt spetsifikatsiyasini yig'adi
  - ClaudeService     — tayyor spetsdan JSON sxema generatsiyasi
  - AIRouterService   — prompt intentini aniqlaydi
"""
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional, Tuple

import anthropic
from django.conf import settings

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# Arxitektor tizim yo'riqnomasi (Gemini 2.0 Flash roli)
# ─────────────────────────────────────────────────────────────────
ARCHITECT_SYSTEM_PROMPT = """Sen "Antigravity" loyihasining "Arxitektor AI" rolisida ishlaysan.

## SENING VAZIFANG:
1. **Muloqot bosqichi**: Foydalanuvchi sayt so'raganda darhol yaratma. Avval quyidagilarni aniqla:
   - Biznes turi va maqsadi
   - Maqsadli auditoriya
   - Afzal ko'rgan uslub (zamonaviy/klassik/rangdor/minimal)

2. **Variantlar taqdim etish**: Har doim kamida 2 ta konseptual variant ber:
   - Variant 1: (masalan) Minimalistik, qora-oq, professional
   - Variant 2: (masalan) Rangdor, gradient, zamonaviy

3. **Detallar yig'ish**: Qaysi sahifalar kerakligini aniqlashtir:
   - Hero, Xizmatlar, Haqimizda, Portfolio, Narxlar, Bog'lanish va h.k.

## QOIDA:
- Foydalanuvchi "Bo'ldi, qur", "Shu variant ma'qul", "Yaratib ber", "Tayyor", "Boshla" KABI iboralarni ishlatgandagina FINAL_SITE_SPEC blokini yaratasan.
- Undan oldin faqat savol-javob olib bor.
- Javoblar DOIM o'zbek tilida, do'stona va professional bo'lsin.
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
def _get_client() -> anthropic.Anthropic:
    api_key = (
        os.environ.get("ANTHROPIC_API_KEY")
        or getattr(settings, "ANTHROPIC_API_KEY", "")
    )
    if not api_key:
        raise RuntimeError("ANTHROPIC_API_KEY .env da topilmadi.")
    return anthropic.Anthropic(api_key=api_key)


def _get_model() -> str:
    return (
        os.environ.get("ANTHROPIC_MODEL")
        or getattr(settings, "ANTHROPIC_MODEL", "claude-sonnet-4-6")
    )


# ─────────────────────────────────────────────────────────────────
# ArchitectService
# ─────────────────────────────────────────────────────────────────
class ArchitectService:
    """
    Foydalanuvchi bilan muloqot qilib, sayt spetsini yig'adi.
    Tayyor bo'lganda FINAL_SITE_SPEC bloki bilan javob qaytaradi.
    """

    def chat(
        self,
        user_message: str,
        history: List[Dict[str, str]],
    ) -> Tuple[str, Optional[str]]:
        """
        Returns: (ai_text, spec_or_None)
        spec_or_None — FINAL_SITE_SPEC topilsa, string.
        """
        client = _get_client()
        messages = [
            {"role": m["role"], "content": m["content"]}
            for m in history
        ]
        messages.append({"role": "user", "content": user_message})

        try:
            response = client.messages.create(
                model=_get_model(),
                max_tokens=2048,
                system=ARCHITECT_SYSTEM_PROMPT,
                messages=messages,
            )
            text: str = response.content[0].text
        except anthropic.APIError as exc:
            logger.exception("ArchitectService chat xatosi")
            raise RuntimeError(f"Arxitektor AI da xatolik: {exc}") from exc

        spec = _extract_spec(text)
        return text, spec


# ─────────────────────────────────────────────────────────────────
# ClaudeService  (sayt JSON generatsiyasi)
# ─────────────────────────────────────────────────────────────────
class ClaudeService:
    """JSON sxema generatsiyasi va tahrirlash."""

    def chat(self, prompt: str, history: Optional[List[Dict]] = None) -> str:
        client = _get_client()
        messages: List[Dict[str, Any]] = list(history or [])
        messages.append({"role": "user", "content": prompt})
        try:
            response = client.messages.create(
                model=_get_model(),
                max_tokens=1024,
                system=CHAT_SYSTEM_PROMPT,
                messages=messages,
            )
            return response.content[0].text
        except anthropic.APIError as exc:
            logger.exception("Claude chat xatosi")
            raise RuntimeError(f"AI suhbat xizmatida xatolik: {exc}") from exc

    def generate_from_spec(self, spec: str) -> Dict[str, Any]:
        """FINAL_SITE_SPEC dan to'liq sayt sxemasini generatsiya qiladi."""
        client = _get_client()
        prompt = _spec_to_prompt(spec)
        try:
            response = client.messages.create(
                model=_get_model(),
                max_tokens=8096,
                system=GENERATE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": prompt}],
            )
            return _extract_json(response.content[0].text)
        except anthropic.APIError as exc:
            logger.exception("Claude generate_from_spec xatosi")
            raise RuntimeError(f"Sayt generatsiyasida xatolik: {exc}") from exc

    def generate_full_site(self, prompt: str, language: str = "uz") -> Dict[str, Any]:
        """To'g'ridan-to'g'ri promptdan generatsiya (architect yo'q)."""
        client = _get_client()
        user_msg = f"Language for all content: {language}\nUser request:\n{prompt}"
        try:
            response = client.messages.create(
                model=_get_model(),
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
        client = _get_client()
        user_msg = (
            f"Current schema JSON:\n{json.dumps(current_schema, ensure_ascii=False)}\n\n"
            f"Language: {language}\nChange request:\n{prompt}"
        )
        try:
            response = client.messages.create(
                model=_get_model(),
                max_tokens=8096,
                system=REVISE_SYSTEM_PROMPT,
                messages=[{"role": "user", "content": user_msg}],
            )
            return _extract_json(response.content[0].text)
        except anthropic.APIError as exc:
            logger.exception("Claude revise xatosi")
            raise RuntimeError(f"Sayt tahrirlashda xatolik: {exc}") from exc


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
