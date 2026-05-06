import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .knowledge_base import (
    get_admin_faqs,
    get_quick_prompts,
    get_templates,
    match_auto_reply,
    match_faq,
)
from .services import AIRouterService, ClaudeService, detect_language

logger = logging.getLogger(__name__)


# 3 tilda lokalizatsiya qilingan xato xabarlari (uz/ru/en).
# Foydalanuvchi qaysi tilda yozsa — shu tilda javob qaytariladi.
_ERR_MSGS = {
    "empty_prompt": {
        "uz": "Xabar matnini kiriting.",
        "ru": "Пожалуйста, введите сообщение.",
        "en": "Please enter a message.",
    },
    "ai_unavailable": {
        "uz": "AI xizmati hozircha ishlamayapti. Iltimos, birozdan keyin qayta urinib ko'ring.",
        "ru": "Сервис AI временно недоступен. Пожалуйста, попробуйте чуть позже.",
        "en": "AI service is temporarily unavailable. Please try again shortly.",
    },
    "server_error": {
        "uz": "Server xatoligi. Iltimos, keyinroq urinib ko'ring.",
        "ru": "Ошибка сервера. Попробуйте позже.",
        "en": "Server error. Please try again later.",
    },
}


def _err(key: str, prompt: str = "") -> str:
    """Foydalanuvchi tilini aniqlab, mos lokalizatsiyalangan xato matnini qaytaradi."""
    lang = detect_language(prompt) if prompt else "uz"
    return _ERR_MSGS[key].get(lang, _ERR_MSGS[key]["uz"])


class ChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        if not prompt:
            return Response({"error": _err("empty_prompt")}, status=status.HTTP_400_BAD_REQUEST)

        # ── Token-saving short-circuit ─────────────────────────
        # Salom/rahmat/"kim siz?" kabi qisqa xabarlar uchun AI'ga
        # umuman murojaat qilmasdan tayyor javob qaytariladi.
        lang = detect_language(prompt)
        auto = match_auto_reply(prompt, lang=lang)
        if auto:
            return Response({"message": auto["reply"], "source": "kb"})

        try:
            message = ClaudeService().chat(prompt, history=request.data.get("history"))
        except RuntimeError as e:
            logger.warning("AI chat failed: %s", e)
            return Response(
                {"error": _err("ai_unavailable", prompt)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("AI chat kutilmagan xato")
            return Response(
                {"error": _err("server_error", prompt)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"message": message, "source": "ai"})


class DetectIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        has_project = bool(request.data.get("project_id"))
        has_images = bool(request.data.get("images"))
        if not prompt:
            return Response({"error": _err("empty_prompt")}, status=status.HTTP_400_BAD_REQUEST)
        primary = AIRouterService.detect_intent(prompt, has_project=has_project)
        topic = AIRouterService.classify_topic(
            prompt, has_project=has_project, has_images=has_images,
        )
        return Response({
            "intent": primary,                       # backwards-compat (ARCHITECT/REVISE/CHAT/GENERATE)
            "semantic_intent": topic["intent"],     # CREATE_SITE/REVISE_SITE/SEO_HELP/...
            "language": topic["language"],
            "off_topic": topic["off_topic"],
        })


# ─────────────────────────────────────────────────────────────────────────
# Knowledge-base powered endpoints (chat tayyor variantlari + RAG)
# ─────────────────────────────────────────────────────────────────────────


def _normalize_lang(raw: str) -> str:
    raw = (raw or "").lower().strip()
    if raw.startswith("ru"):
        return "ru"
    if raw.startswith("en"):
        return "en"
    return "uz"


class SuggestionsView(APIView):
    """Builder va Site-admin uchun statik chat-variantlar.

    Query params:
        context: "builder" | "admin"  (default: "builder")
        phase:   "idle" | "done"      (faqat builder uchun)
        lang:    "uz" | "ru" | "en"

    Auth talab qilmaydi — javob foydalanuvchi-spetsifik emas, hammaga bir xil.
    Bu sahifa yuklanishi bilan bir marta chaqiriladi va keshlanadi.
    """

    permission_classes = [permissions.AllowAny]

    def get(self, request):
        context = (request.query_params.get("context") or "builder").lower()
        phase = (request.query_params.get("phase") or "idle").lower()
        lang = _normalize_lang(request.query_params.get("lang") or "uz")

        if context == "admin":
            return Response({
                "context": "admin",
                "lang": lang,
                "faqs": get_admin_faqs(lang=lang),
            })

        # Default: builder
        return Response({
            "context": "builder",
            "lang": lang,
            "phase": phase,
            "templates": get_templates(lang=lang),
            "quick_prompts": get_quick_prompts(phase=phase, lang=lang),
        })


class AdminAssistView(APIView):
    """Site-admin AI yordamchisi.

    Algoritm:
        1. Foydalanuvchi savolini KB FAQ bilan solishtir.
        2. Mos topilsa → tezkor (instant) javob qaytar (`source: "kb"`).
        3. Aks holda → Gemini'ga yo'naltir (google_search grounding bilan)
           va `source: "ai"` qaytar.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        if not prompt:
            return Response({"error": _err("empty_prompt")}, status=status.HTTP_400_BAD_REQUEST)

        lang = _normalize_lang(request.data.get("lang") or detect_language(prompt))

        # 0) Salom/rahmat/etc — eng arzon yo'l
        auto = match_auto_reply(prompt, lang=lang)
        if auto:
            return Response({
                "source": "kb",
                "kb_id": auto["id"],
                "message": auto["reply"],
            })

        # 1) Bilim bazasidan tezkor javob
        kb_hit = match_faq(prompt, lang=lang)
        if kb_hit and kb_hit.get("matched_triggers", 0) >= 1:
            return Response({
                "source": "kb",
                "kb_id": kb_hit["id"],
                "question": kb_hit["question"],
                "message": kb_hit["answer"],
            })

        # 2) Internet/AI fallback (Gemini google_search grounding)
        try:
            history = request.data.get("history") or []
            ai_message = ClaudeService().chat(prompt, history=history)
        except RuntimeError as e:
            logger.warning("Admin assist AI failed: %s", e)
            return Response(
                {"error": _err("ai_unavailable", prompt)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("Admin assist kutilmagan xato")
            return Response(
                {"error": _err("server_error", prompt)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        return Response({"source": "ai", "message": ai_message})
