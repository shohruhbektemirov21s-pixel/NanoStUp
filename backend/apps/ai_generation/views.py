import logging

from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import AIRouterService, ClaudeService

logger = logging.getLogger(__name__)


class ChatView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        if not prompt:
            return Response({"error": "Prompt kutilmoqda."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            message = ClaudeService().chat(prompt, history=request.data.get("history"))
        except RuntimeError as e:
            logger.warning("AI chat failed: %s", e)
            return Response(
                {"error": "AI xizmati hozircha ishlamayapti. Iltimos, birozdan keyin qayta urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("AI chat kutilmagan xato")
            return Response(
                {"error": "Server xatoligi. Iltimos, keyinroq urinib ko'ring."},
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
            return Response({"error": "Prompt kutilmoqda."}, status=status.HTTP_400_BAD_REQUEST)
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
