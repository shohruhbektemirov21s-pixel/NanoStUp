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
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
        return Response({"message": message})


class DetectIntentView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        prompt = (request.data.get("prompt") or "").strip()
        if not prompt:
            return Response({"error": "Prompt kutilmoqda."}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"intent": AIRouterService.detect_intent(prompt)})
