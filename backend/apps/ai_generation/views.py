import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

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
        return Response({"message": message})


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
