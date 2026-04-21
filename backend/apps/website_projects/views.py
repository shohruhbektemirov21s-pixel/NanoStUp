import logging
import time
from collections import deque
from threading import Lock

from django.http import HttpResponse
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ai_generation.services import AIRouterService, ArchitectService, ClaudeService
from apps.exports.services import ExportService
from typing import Optional

from .models import ProjectStatus, ProjectVersion, WebsiteProject
from .serializers import WebsiteProjectSerializer

logger = logging.getLogger(__name__)


class _IpRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window = window_seconds
        self._hits: dict[str, deque] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            hits = self._hits.setdefault(key, deque())
            while hits and now - hits[0] > self.window:
                hits.popleft()
            if len(hits) >= self.max_requests:
                return False
            hits.append(now)
            return True


_ai_rate_limiter = _IpRateLimiter(max_requests=30, window_seconds=60)


def _get_client_ip(request) -> str:
    xff = request.META.get("HTTP_X_FORWARDED_FOR")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


class WebsiteProjectViewSet(viewsets.ModelViewSet):
    serializer_class = WebsiteProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WebsiteProject.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def process_prompt(self, request):
        """
        Arxitektor oqimi:
          1. Foydalanuvchi bilan muloqot (ArchitectService)
          2. FINAL_SITE_SPEC tayyor bo'lganda ClaudeService sayt generatsiya qiladi
          3. Mavjud loyiha bo'lsa — revise rejimi
        """
        prompt = (request.data.get("prompt") or "").strip()
        project_id = request.data.get("project_id")
        language = request.data.get("language", "uz")
        # Frontend arxitektor suhbat tarixini yuboradi
        history: list = request.data.get("history", [])

        if not prompt:
            return Response(
                {"success": False, "error": "Prompt kutilmoqda."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        is_auth = request.user.is_authenticated
        rl_key = str(request.user.id) if is_auth else f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # Prompt xavfsizligi: hajmini cheklash
        if len(prompt) > 8000:
            return Response(
                {"success": False, "error": "Prompt juda uzun (max 8000 belgi)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # History hajmini cheklash (injection oldini olish)
        if len(history) > 40:
            history = history[-40:]
        # History strukturasini tekshirish
        safe_history = []
        for item in history:
            if isinstance(item, dict) and item.get("role") in ("user", "assistant"):
                content = str(item.get("content", ""))[:4000]
                safe_history.append({"role": item["role"], "content": content})
        history = safe_history

        intent = AIRouterService.detect_intent(prompt, has_project=bool(project_id))
        logger.info("AI request user=%s intent=%s project=%s",
                    getattr(request.user, "id", "guest"), intent, project_id)

        try:
            # ── 1. MAVJUD LOYIHANI TAHRIRLASH ───────────────────────────
            if project_id and is_auth and intent == "REVISE":
                try:
                    project = WebsiteProject.objects.get(id=project_id, user=request.user)
                except WebsiteProject.DoesNotExist:
                    return Response(
                        {"success": False, "error": "Loyiha topilmadi."},
                        status=status.HTTP_404_NOT_FOUND,
                    )
                claude = ClaudeService()
                new_schema = claude.revise_site(prompt, project.schema_data or {}, language)
                project.schema_data = new_schema
                project.status = ProjectStatus.COMPLETED
                project.save(update_fields=["schema_data", "status", "updated_at"])
                ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="revise", version_number=project.versions.count() + 1,
                )
                return Response({
                    "success": True,
                    "phase": "DONE",
                    "is_chat": False,
                    "project": WebsiteProjectSerializer(project).data,
                    "message": f"✅ Sayt yangilandi: «{project.title}»",
                })

            # ── 2. GEMINI ARXITEKTOR SUHBAT ──────────────────────────────
            if intent in ("ARCHITECT", "CHAT"):
                architect = ArchitectService()
                # Gemini: (ai_text, spec_or_None, design_variants_or_None)
                ai_text, spec, design_variants = architect.chat(prompt, history)

                if spec:
                    # FINAL_SITE_SPEC topildi → Claude sayt generatsiya qiladi
                    logger.info("FINAL_SITE_SPEC aniqlandi, Claude generatsiya boshlandi")
                    claude = ClaudeService()
                    new_schema = claude.generate_from_spec(spec)

                    if is_auth:
                        project = WebsiteProject.objects.create(
                            user=request.user,
                            title=new_schema.get("siteName", "AI Site"),
                            prompt=prompt,
                            language=language,
                            schema_data=new_schema,
                            status=ProjectStatus.COMPLETED,
                        )
                        ProjectVersion.objects.create(
                            project=project, prompt=spec, schema_data=new_schema,
                            intent="generate", version_number=1,
                        )
                        project_data = WebsiteProjectSerializer(project).data
                    else:
                        project_data = {
                            "id": None,
                            "title": new_schema.get("siteName", "AI Site"),
                            "status": "COMPLETED",
                            "schema_data": new_schema,
                        }

                    return Response({
                        "success": True,
                        "phase": "DONE",
                        "is_chat": False,
                        "project": project_data,
                        "architect_message": ai_text,
                        "message": f"✅ Sayt tayyor: «{project_data['title']}»",
                    })

                # Spec hali yo'q — davom etayotgan suhbat (Gemini)
                resp_data: dict = {
                    "success": True,
                    "phase": "ARCHITECT",
                    "is_chat": True,
                    "message": ai_text,
                }
                if design_variants:
                    resp_data["design_variants"] = design_variants
                return Response(resp_data)

            # ── 3. TO'G'RIDAN-TO'G'RI GENERATSIYA (qisqa yo'l) ───────────
            claude = ClaudeService()
            new_schema = claude.generate_full_site(prompt, language)

            if is_auth:
                project = WebsiteProject.objects.create(
                    user=request.user,
                    title=new_schema.get("siteName", "AI Site"),
                    prompt=prompt,
                    language=language,
                    schema_data=new_schema,
                    status=ProjectStatus.COMPLETED,
                )
                ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="generate", version_number=1,
                )
                project_data = WebsiteProjectSerializer(project).data
            else:
                project_data = {
                    "id": None,
                    "title": new_schema.get("siteName", "AI Site"),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                }

            return Response({
                "success": True,
                "phase": "DONE",
                "is_chat": False,
                "project": project_data,
                "message": f"✅ Sayt tayyor: «{project_data['title']}»",
            })

        except ValueError as exc:
            logger.warning("AI JSON xatosi: %s", exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError as exc:
            logger.error("AI runtime xatosi: %s", exc)
            return Response(
                {"success": False, "error": str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception as exc:
            logger.exception("AI router xatosi")
            return Response(
                {"success": False, "error": f"AI xizmatida xatolik: {exc}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"])
    def download_zip(self, request, pk=None):
        """
        ZIP yuklab olish.
        Birinchi marta: Claude frontend (HTML/CSS/JS) + backend (Node.js) kodni generatsiya
        qiladi va keshda saqlaydi. Keyingi marta keshdan yuklaydi.
        """
        project = self.get_object()
        try:
            # Kesh: generated_files allaqachon saqlangan bo'lsa ishlatamiz
            if project.generated_files and isinstance(project.generated_files, dict):
                zip_buffer = ExportService.generate_zip_from_files(
                    project, project.generated_files
                )
                logger.info("ZIP keshdan yuklandi project=%s", project.id)
            else:
                # Claude orqali to'liq kod generatsiyasi
                logger.info("Claude kod generatsiyasi boshlandi project=%s", project.id)
                claude = ClaudeService()
                generated_files = claude.generate_site_files(
                    project.schema_data or {}, project.language or "uz"
                )
                # Keshga saqlaymiz
                project.generated_files = generated_files
                project.save(update_fields=["generated_files"])
                zip_buffer = ExportService.generate_zip_from_files(project, generated_files)
                logger.info(
                    "ZIP yaratildi project=%s fayllar=%s",
                    project.id, list(generated_files.keys()),
                )
        except RuntimeError as exc:
            logger.error("Claude kod generatsiyasi xatosi project=%s: %s", project.id, exc)
            # Fallback: oddiy HTML ZIP
            try:
                zip_buffer = ExportService.generate_static_zip(project)
            except Exception:
                logger.exception("Fallback ZIP ham xato project=%s", project.id)
                return Response(
                    {"error": "ZIP eksport xatosi"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        except Exception:
            logger.exception("ZIP export xatosi project=%s", project.id)
            return Response(
                {"error": "Eksport xatosi"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_title = "".join(c for c in project.title if c.isalnum() or c in " -_").strip()
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=True, methods=["post"])
    def regenerate_code(self, request, pk=None):
        """Mavjud loyiha uchun kodni qaytadan generatsiya qiladi (keshni tozalaydi)."""
        project = self.get_object()
        project.generated_files = None
        project.save(update_fields=["generated_files"])
        return Response({"success": True, "message": "Kod keshi tozalandi. ZIP yuklaganda qayta generatsiya bo'ladi."})
