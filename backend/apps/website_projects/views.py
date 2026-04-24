import logging
import secrets
import time
from collections import deque
from threading import Lock
from typing import Dict, Optional

from django.db.models import F
from django.http import HttpResponse
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response

from apps.accounts.models import (
    CHAT_COST_NANO,
    SITE_CREATION_COST,
    TOKENS_PER_NANO_COIN,
    COST_SIMPLE_NANO,
    COST_MEDIUM_NANO,
    COST_COMPLEX_NANO,
    COST_REVISION_NANO,
    COST_REVISION_SIMPLE_NANO,
    COST_REVISION_MEDIUM_NANO,
    COST_REVISION_COMPLEX_NANO,
    COST_FIRST_SITE_NANO,
    tokens_to_nano_coins,
)
from apps.ai_generation.services import AIRouterService, ArchitectService, ClaudeService
from apps.exports.services import ExportService
from apps.subscriptions.models import Subscription, SubscriptionStatus


# ── Tarif bo'yicha limitlar ───────────────────────────────────
# Free (obunasi yo'q) foydalanuvchi uchun default:
FREE_MAX_PAGES = 1
FREE_CAN_PUBLISH = False  # publik URL bermaymiz — faqat preview


def _get_user_limits(user) -> Dict[str, int]:
    """
    Foydalanuvchining faol obunasiga qarab limitlarini qaytaradi.
    Faol obuna bo'lmasa — FREE default.
    """
    if not user or not user.is_authenticated:
        return {"max_pages": FREE_MAX_PAGES, "can_publish": False}
    sub = (
        Subscription.objects
        .filter(user=user, status=SubscriptionStatus.ACTIVE)
        .select_related("tariff")
        .order_by("-end_date")
        .first()
    )
    if sub and sub.is_valid():
        tariff = sub.tariff
        return {
            "max_pages": int(tariff.pages_per_project_limit or 1),
            "can_publish": True,  # obuna bor — publik URL ishlaydi
        }
    return {"max_pages": FREE_MAX_PAGES, "can_publish": FREE_CAN_PUBLISH}

# ── TEST REJIMI ───────────────────────────────────────────────
# True bo'lsa — token balans tekshirilmaydi (cheklovsiz test).
# False — real balans tizimi ishlaydi (chat bonus + obuna nano koin).
TOKEN_LIMITS_DISABLED = False


def _auto_publish(project) -> None:
    """Loyihani avtomatik publik qiladi — slug beradi va is_published=True."""
    updates = []
    if not project.slug:
        project.slug = _generate_unique_slug(project.title)
        updates.append("slug")
    if not project.is_published:
        project.is_published = True
        project.published_at = timezone.now()
        updates += ["is_published", "published_at"]
    if updates:
        updates.append("updated_at")
        project.save(update_fields=updates)


def _estimate_complexity(schema: Dict) -> Dict:
    """Sayt murakkabligini hisoblaydi va nano koin narxini qaytaradi."""
    pages = schema.get("pages", [])
    section_count = sum(len(p.get("sections", [])) for p in pages)
    page_count = len(pages)

    if section_count <= 3 and page_count <= 1:
        level = "simple"
        label_uz = "Oddiy"
        color = "green"
        cost_nano = COST_SIMPLE_NANO   # 3 000 nano
    elif section_count <= 6 and page_count <= 2:
        level = "medium"
        label_uz = "O'rta"
        color = "yellow"
        cost_nano = COST_MEDIUM_NANO   # 4 000 nano
    else:
        level = "complex"
        label_uz = "Murakkab"
        color = "red"
        cost_nano = COST_COMPLEX_NANO  # 5 000 nano

    # Tahrir narxi: sayt murakkabligiga mos (300/400/500 nano)
    if level == "simple":
        revision_cost_nano = COST_REVISION_SIMPLE_NANO   # 300
    elif level == "medium":
        revision_cost_nano = COST_REVISION_MEDIUM_NANO   # 400
    else:
        revision_cost_nano = COST_REVISION_COMPLEX_NANO  # 500

    return {
        "level": level,
        "label": label_uz,
        "color": color,
        "sections": section_count,
        "pages": page_count,
        "cost_nano": cost_nano,
        "cost_tokens": cost_nano * TOKENS_PER_NANO_COIN,
        "revision_cost_nano": revision_cost_nano,
        "revision_cost_tokens": revision_cost_nano * TOKENS_PER_NANO_COIN,
    }

from .models import ChatMessage, ChatRole, Conversation, ProjectStatus, ProjectVersion, WebsiteProject
from .serializers import WebsiteProjectSerializer

logger = logging.getLogger(__name__)


def _deduct_for_generation(
    user, conversation: Optional[Conversation], cost_tokens: int,
) -> Dict[str, int]:
    """
    Kod generatsiyasi uchun to'lov olish.
    Birinchi navbatda conversation.chat_budget_nano (500 bonus) ishlatiladi,
    undan keyin user.tokens_balance (obuna) yechiladi.

    Returns: {"from_bonus": X_nano, "from_subscription": Y_tokens, "bonus_left": Z_nano}
    """
    cost_nano = cost_tokens // TOKENS_PER_NANO_COIN
    from_bonus = 0
    from_subscription = 0

    # 1. Bonus chat budjetidan yechamiz
    if conversation and conversation.chat_budget_nano > 0:
        from_bonus = min(conversation.chat_budget_nano, cost_nano)
        Conversation.objects.filter(id=conversation.id).update(
            chat_budget_nano=F("chat_budget_nano") - from_bonus,
        )
        conversation.refresh_from_db(fields=["chat_budget_nano"])

    # 2. Qolgan qismini obuna tokenlaridan yechamiz
    remaining_nano = cost_nano - from_bonus
    if remaining_nano > 0:
        from_subscription = remaining_nano * TOKENS_PER_NANO_COIN
        user.deduct_tokens(from_subscription)

    return {
        "from_bonus_nano": from_bonus,
        "from_subscription_tokens": from_subscription,
        "from_subscription_nano": from_subscription // TOKENS_PER_NANO_COIN,
        "bonus_left": conversation.chat_budget_nano if conversation else 0,
        "total_cost_nano": cost_nano,
    }


def _get_site_generation_cost_tokens(schema: Dict) -> int:
    """Schema murakkabligiga qarab nano koin narxini token sifatida qaytaradi."""
    complexity = _estimate_complexity(schema)
    return complexity["cost_tokens"]


def _is_first_site(user) -> bool:
    """Foydalanuvchining birinchi saytimi? (bepul)."""
    from .models import WebsiteProject
    return not WebsiteProject.objects.filter(user=user).exists()


def _can_afford_nano(user, conversation, cost_nano: int) -> bool:
    """Chat bonus + obuna birga yetadimi? (nano koin)."""
    if cost_nano == 0:
        return True
    bonus = conversation.chat_budget_nano if conversation else 0
    sub_nano = (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN
    return (bonus + sub_nano) >= cost_nano


def _insufficient_balance_response(user, conversation, cost_nano: int, action: str = "sayt yaratish"):
    """Balans yetmasa — aniq xabar bilan 402 Response qaytaradi."""
    bonus = conversation.chat_budget_nano if conversation else 0
    total_nano = (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN + bonus
    return Response({
        "success": False,
        "insufficient_tokens": True,
        "error": (
            f"⚠️ Nano koin yetarli emas!\n\n"
            f"📌 {action} uchun: {cost_nano:,} nano koin\n"
            f"💰 Sizning balansingiz: {total_nano:,} nano koin\n\n"
            f"Yangi nano koin sotib olish uchun: /pricing"
        ),
        "required_nano": cost_nano,
        "current_nano": total_nano,
        "chat_bonus_nano": bonus,
        "subscription_nano": (user.tokens_balance or 0) // TOKENS_PER_NANO_COIN,
        "pricing_url": "/pricing",
    }, status=status.HTTP_402_PAYMENT_REQUIRED)


def _can_afford_generation(user, conversation: Optional[Conversation], cost_tokens: int) -> bool:
    """Chat bonus + obuna birga yetadimi? (token)."""
    cost_nano = cost_tokens // TOKENS_PER_NANO_COIN
    return _can_afford_nano(user, conversation, cost_nano)


# ─────────────────────────────────────────────────────────────
# Chat tarixi helperlari
# ─────────────────────────────────────────────────────────────

def _get_or_create_conversation(
    user,
    conversation_id: Optional[str],
    language: str,
    first_prompt: str,
) -> Optional[Conversation]:
    """Mavjud suhbatni topadi yoki yangisini yaratadi. Anonymous user uchun None qaytaradi."""
    if not user or not user.is_authenticated:
        return None
    if conversation_id:
        try:
            return Conversation.objects.get(id=conversation_id, user=user)
        except Conversation.DoesNotExist:
            pass
    # Yangi suhbat — sarlavha birinchi promptdan kesilgan qismi
    title = first_prompt.strip().replace("\n", " ")[:80] or "Yangi suhbat"
    return Conversation.objects.create(user=user, language=language, title=title)


def _save_message(
    conversation: Optional[Conversation],
    role: str,
    content: str,
    intent: str = "",
    metadata: Optional[dict] = None,
    tokens_input: int = 0,
    tokens_output: int = 0,
    duration_ms: int = 0,
    project_version: Optional[ProjectVersion] = None,
) -> Optional[ChatMessage]:
    """Bitta xabarni DB'ga yozadi va suhbatning agregat hisoblarini yangilaydi."""
    if conversation is None or not content:
        return None
    msg = ChatMessage.objects.create(
        conversation=conversation,
        role=role,
        content=content[:10000],  # juda uzun xabarlarni cheklaymiz
        intent=intent,
        metadata=metadata,
        tokens_input=tokens_input,
        tokens_output=tokens_output,
        duration_ms=duration_ms,
        project_version=project_version,
    )
    # Agregatlarni atomik yangilaymiz
    Conversation.objects.filter(id=conversation.id).update(
        total_messages=F("total_messages") + 1,
        total_tokens_input=F("total_tokens_input") + tokens_input,
        total_tokens_output=F("total_tokens_output") + tokens_output,
    )
    return msg


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

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def process_prompt(self, request):
        """
        Arxitektor oqimi (FAQAT ro'yxatdan o'tgan foydalanuvchilar):
          1. Foydalanuvchi bilan muloqot (ArchitectService)
          2. FINAL_SITE_SPEC tayyor bo'lganda ClaudeService sayt generatsiya qiladi
          3. Mavjud loyiha bo'lsa — revise rejimi
        """
        prompt = (request.data.get("prompt") or "").strip()
        project_id = request.data.get("project_id")
        conversation_id = request.data.get("conversation_id")
        language = request.data.get("language", "uz")
        # Frontend arxitektor suhbat tarixini yuboradi
        history: list = request.data.get("history", [])
        # Ixtiyoriy: rasmlar (base64) — ArchitectService/Claude vision uchun
        # Format: [{"media_type": "image/jpeg", "data": "<base64>"}, ...]
        # Orqaga moslik uchun `image` (dict) ham qabul qilinadi.
        images_raw = request.data.get("images")
        if not images_raw:
            single = request.data.get("image")
            images_raw = [single] if isinstance(single, dict) else []
        if not isinstance(images_raw, list):
            images_raw = []
        images: list[dict] = []
        for it in images_raw[:5]:  # max 5 ta rasm
            if isinstance(it, dict) and it.get("data"):
                if len(it.get("data", "")) > 7_500_000:
                    return Response(
                        {"success": False, "error": "Rasm juda katta (har biri max ~5 MB)."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                images.append(it)

        if not prompt and not images:
            return Response(
                {"success": False, "error": "Prompt yoki rasm kutilmoqda."},
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
        # Agar loyiha mavjud va foydalanuvchi rasm yuborgan bo'lsa — bu REVISE
        # (rasm odatda "shunga o'xshash qil" yoki "shu yerga qo'sh" degan ma'noda).
        if project_id and images and intent == "CHAT":
            intent = "REVISE"

        # Foydalanuvchi tarif limitlari (max_pages, can_publish)
        user_limits = _get_user_limits(request.user)
        logger.info("AI request user=%s intent=%s project=%s images=%d limits=%s",
                    getattr(request.user, "id", "guest"), intent, project_id,
                    len(images), user_limits)

        # ── Suhbatni topamiz yoki yaratamiz, user xabarini saqlaymiz ──
        conversation = _get_or_create_conversation(
            request.user, conversation_id, language, prompt,
        )
        _save_message(conversation, ChatRole.USER, prompt, intent=intent)

        # Agar intent generatsiya bo'lsa (yangi sayt yoki REVISE) — balansni tekshiramiz.
        # CHAT va ARCHITECT muloqot bosqichi bepul bo'ladi (faqat gaplashish).
        # ARCHITECT keyinchalik FINAL_SITE_SPEC yig'ib Claude generatsiyaga o'tganda
        # ichkarida yana tekshiriladi (quyidagi blokda).
        if is_auth and intent == "REVISE" and not TOKEN_LIMITS_DISABLED:
            # Joriy schema murakkabligiga qarab narx: 300/400/500 nano
            _rev_schema = {}
            if project_id:
                try:
                    _rev_proj = WebsiteProject.objects.get(id=project_id, user=request.user)
                    _rev_schema = _rev_proj.schema_data or {}
                except Exception:
                    pass
            _rev_complexity = _estimate_complexity(_rev_schema) if _rev_schema else {"revision_cost_nano": COST_REVISION_SIMPLE_NANO}
            revision_cost = _rev_complexity.get("revision_cost_nano", COST_REVISION_SIMPLE_NANO)
            if not _can_afford_nano(request.user, conversation, revision_cost):
                return _insufficient_balance_response(
                    request.user, conversation, revision_cost,
                    action=f"saytni tahrirlash ({revision_cost} nano)"
                )

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
                # 1-bosqich: Gemini rasm+matnni tahlil qilib Claude uchun aniq
                # ingliz ko'rsatma (instruction) tayyorlaydi.
                try:
                    architect = ArchitectService()
                    claude_instruction = architect.plan_revision(
                        prompt, project.schema_data or {}, images=images,
                    )
                    logger.info("Gemini → Claude instruction: %s", claude_instruction[:300])
                except Exception:
                    logger.exception("plan_revision xatosi — foydalanuvchi matni to'g'ridan yuboriladi")
                    claude_instruction = prompt

                # 2-bosqich: Claude tayyor ko'rsatma bo'yicha schema'ni yangilaydi
                gen_start = time.monotonic()
                claude = ClaudeService()
                new_schema, usage = claude.revise_site(
                    claude_instruction, project.schema_data or {}, language,
                )
                gen_ms = int((time.monotonic() - gen_start) * 1000)
                # Haqiqiy Claude xarajati = input + output token (10 tok = 1 nano)
                actual_cost_tokens = max(
                    (usage.get("input_tokens", 0) + usage.get("output_tokens", 0)),
                    CHAT_COST_NANO * TOKENS_PER_NANO_COIN,  # minimum = 1 chat = 5000 tokens
                )
                project.schema_data = new_schema
                project.status = ProjectStatus.COMPLETED
                project.save(update_fields=["schema_data", "status", "updated_at"])
                if user_limits["can_publish"]:
                    _auto_publish(project)  # REVISE — obuna bor, publik URL beramiz
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="revise", version_number=project.versions.count() + 1,
                )
                # Suhbatni loyihaga bog'laymiz va AI xabarini saqlaymiz
                if conversation and not conversation.project_id:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                _save_message(
                    conversation, ChatRole.ASSISTANT,
                    f"✅ Sayt yangilandi: «{project.title}»",
                    intent="REVISE",
                    tokens_input=usage.get("input_tokens", 0),
                    tokens_output=usage.get("output_tokens", 0),
                    duration_ms=gen_ms,
                    project_version=version,
                    metadata={"project_id": str(project.id), "title": project.title},
                )
                # Nano koin yechamiz — REVISE uchun 300/400/500 nano (murakkablikka qarab)
                deduction = None
                if not TOKEN_LIMITS_DISABLED:
                    rev_complexity_data = _estimate_complexity(new_schema)
                    revision_cost_tokens = rev_complexity_data["revision_cost_tokens"]
                    try:
                        deduction = _deduct_for_generation(
                            request.user, conversation, revision_cost_tokens,
                        )
                    except ValueError:
                        return Response({
                            "success": False,
                            "error": "Nano koin balansi yetarli emas.",
                            "insufficient_tokens": True,
                        }, status=status.HTTP_402_PAYMENT_REQUIRED)

                _final_complexity = _estimate_complexity(new_schema)
                return Response({
                    "success": True,
                    "phase": "DONE",
                    "is_chat": False,
                    "project": WebsiteProjectSerializer(project).data,
                    "message": f"✅ Sayt yangilandi: «{project.title}»",
                    "conversation_id": str(conversation.id) if conversation else None,
                    "revision_cost_nano": _final_complexity["revision_cost_nano"],
                    "balance": {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost": actual_cost_tokens,
                        "cost_nano": _final_complexity["revision_cost_nano"],
                        "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                        "deduction": deduction,
                    },
                })

            # ── 2. GEMINI ARXITEKTOR SUHBAT ──────────────────────────────
            if intent in ("ARCHITECT", "CHAT"):
                architect = ArchitectService()
                # Gemini: (ai_text, spec_or_None, design_variants_or_None)
                ai_text, spec, design_variants = architect.chat(prompt, history, images=images)

                if spec:
                    # FINAL_SITE_SPEC topildi → Claude sayt generatsiya qiladi
                    # Generatsiyadan oldin balansni tekshiramiz (auth user uchun)
                    logger.info("FINAL_SITE_SPEC aniqlandi, Claude generatsiya boshlandi")
                    gen_start = time.monotonic()
                    claude = ClaudeService()
                    new_schema, usage = claude.generate_from_spec(
                        spec, max_pages=user_limits["max_pages"],
                    )
                    gen_ms = int((time.monotonic() - gen_start) * 1000)
                    complexity = _estimate_complexity(new_schema)

                    # Murakkablikka qarab narx aniqlanadi
                    # Birinchi sayt — BEPUL (0 nano)
                    site_cost_nano = COST_FIRST_SITE_NANO if (is_auth and _is_first_site(request.user)) else complexity["cost_nano"]
                    site_cost_tokens = site_cost_nano * TOKENS_PER_NANO_COIN

                    # Balans tekshirish (spec topilgandan keyin)
                    if is_auth and site_cost_nano > 0 and not TOKEN_LIMITS_DISABLED and not _can_afford_nano(
                        request.user, conversation, site_cost_nano,
                    ):
                        action_label = f"{complexity['label']} sayt yaratish ({site_cost_nano:,} nano)"
                        return _insufficient_balance_response(
                            request.user, conversation, site_cost_nano, action=action_label
                        )
                    logger.info(
                        "Claude schema: type=%s keys=%s siteName=%s pages=%s sections_in_first_page=%s",
                        type(new_schema).__name__,
                        list(new_schema.keys()) if isinstance(new_schema, dict) else "N/A",
                        new_schema.get("siteName") if isinstance(new_schema, dict) else "N/A",
                        len(new_schema.get("pages", [])) if isinstance(new_schema, dict) else "N/A",
                        (len(new_schema["pages"][0].get("sections", []))
                         if isinstance(new_schema, dict) and new_schema.get("pages") else "N/A"),
                    )

                    balance_data: Optional[dict] = None
                    if is_auth:
                        project = WebsiteProject.objects.create(
                            user=request.user,
                            title=new_schema.get("siteName", "AI Site"),
                            prompt=prompt,
                            language=language,
                            schema_data=new_schema,
                            status=ProjectStatus.COMPLETED,
                        )
                        if user_limits["can_publish"]:
                            _auto_publish(project)  # Yangi sayt — obunada publik URL
                        version = ProjectVersion.objects.create(
                            project=project, prompt=spec, schema_data=new_schema,
                            intent="generate", version_number=1,
                        )
                        # Suhbatni bu loyihaga bog'laymiz + AI javobini saqlaymiz
                        if conversation:
                            Conversation.objects.filter(id=conversation.id).update(project=project)
                            _save_message(
                                conversation, ChatRole.ASSISTANT,
                                f"✅ Sayt tayyor: «{project.title}»",
                                intent="GENERATE",
                                tokens_input=usage.get("input_tokens", 0),
                                tokens_output=usage.get("output_tokens", 0),
                                duration_ms=gen_ms,
                                project_version=version,
                                metadata={
                                    "project_id": str(project.id),
                                    "title": project.title,
                                    "complexity": complexity,
                                    "architect_message": ai_text,
                                },
                            )
                        # Nano koin yechamiz (complexity ga qarab: 3000/4000/5000 nano)
                        if not TOKEN_LIMITS_DISABLED and site_cost_nano > 0:
                            try:
                                deduction = _deduct_for_generation(
                                    request.user, conversation, site_cost_tokens,
                                )
                                balance_data = {
                                    "tokens": request.user.tokens_balance,
                                    "nano_coins": request.user.nano_coins,
                                    "cost_nano": site_cost_nano,
                                    "cost": site_cost_tokens,
                                    "is_first_site": site_cost_nano == 0,
                                    "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                                    "deduction": deduction,
                                }
                            except ValueError:
                                logger.warning("Token yechishda muammo user=%s", request.user.id)
                        elif site_cost_nano == 0:
                            balance_data = {
                                "tokens": request.user.tokens_balance,
                                "nano_coins": request.user.nano_coins,
                                "cost_nano": 0,
                                "cost": 0,
                                "is_first_site": True,
                                "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                            }
                        project_data = WebsiteProjectSerializer(project).data
                    else:
                        project_data = {
                            "id": None,
                            "title": new_schema.get("siteName", "AI Site"),
                            "status": "COMPLETED",
                            "schema_data": new_schema,
                        }

                    resp = {
                        "success": True,
                        "phase": "DONE",
                        "is_chat": False,
                        "project": project_data,
                        "architect_message": ai_text,
                        "message": f"✅ Sayt tayyor: «{project_data['title']}»",
                        "stats": {
                            "generation_time_ms": gen_ms,
                            "input_tokens": usage.get("input_tokens", 0),
                            "output_tokens": usage.get("output_tokens", 0),
                            "complexity": complexity,
                        },
                    }
                    if balance_data:
                        resp["balance"] = balance_data
                    if conversation:
                        resp["conversation_id"] = str(conversation.id)
                    return Response(resp)

                # Spec hali yo'q — davom etayotgan suhbat (Gemini)
                # AI javobini va (bo'lsa) variantlarni tarixga yozamiz
                _save_message(
                    conversation, ChatRole.ASSISTANT, ai_text,
                    intent="ARCHITECT" if design_variants else intent,
                    metadata={"design_variants": design_variants} if design_variants else None,
                )
                resp_data: dict = {
                    "success": True,
                    "phase": "ARCHITECT",
                    "is_chat": True,
                    "message": ai_text,
                }
                if design_variants:
                    resp_data["design_variants"] = design_variants
                if conversation:
                    resp_data["conversation_id"] = str(conversation.id)
                return Response(resp_data)

            # ── 3. TO'G'RIDAN-TO'G'RI GENERATSIYA (qisqa yo'l) ───────────
            # Birinchi sayt bepul, qolganlar complexity ga qarab narxlanadi
            is_first = is_auth and _is_first_site(request.user)
            site_cost_nano = COST_FIRST_SITE_NANO if is_first else COST_MEDIUM_NANO  # schema yo'q — o'rta narx
            site_cost_tokens = site_cost_nano * TOKENS_PER_NANO_COIN

            # Balans tekshirish (auth user uchun)
            if is_auth and site_cost_nano > 0 and not TOKEN_LIMITS_DISABLED and not _can_afford_nano(
                request.user, conversation, site_cost_nano,
            ):
                return _insufficient_balance_response(
                    request.user, conversation, site_cost_nano,
                    action=f"sayt yaratish ({site_cost_nano:,} nano)"
                )

            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema, usage = claude.generate_full_site(
                prompt, language, max_pages=user_limits["max_pages"],
            )
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            complexity = _estimate_complexity(new_schema)
            # HAQIQIY Claude xarajati (input + output token, min = 5 000 token)
            actual_cost_tokens2 = max(
                (usage.get("input_tokens", 0) + usage.get("output_tokens", 0)),
                CHAT_COST_NANO * TOKENS_PER_NANO_COIN,
            )

            balance_data2: Optional[dict] = None
            if is_auth:
                project = WebsiteProject.objects.create(
                    user=request.user,
                    title=new_schema.get("siteName", "AI Site"),
                    prompt=prompt,
                    language=language,
                    schema_data=new_schema,
                    status=ProjectStatus.COMPLETED,
                )
                if user_limits["can_publish"]:
                    _auto_publish(project)  # Yangi sayt — obunada publik URL
                version = ProjectVersion.objects.create(
                    project=project, prompt=prompt, schema_data=new_schema,
                    intent="generate", version_number=1,
                )
                if conversation:
                    Conversation.objects.filter(id=conversation.id).update(project=project)
                    _save_message(
                        conversation, ChatRole.ASSISTANT,
                        f"✅ Sayt tayyor: «{project.title}»",
                        intent="GENERATE",
                        tokens_input=usage.get("input_tokens", 0),
                        tokens_output=usage.get("output_tokens", 0),
                        duration_ms=gen_ms,
                        project_version=version,
                        metadata={
                            "project_id": str(project.id),
                            "title": project.title,
                            "complexity": complexity,
                        },
                    )
                if not TOKEN_LIMITS_DISABLED and site_cost_nano > 0:
                    try:
                        deduction2 = _deduct_for_generation(
                            request.user, conversation, site_cost_tokens,
                        )
                        balance_data2 = {
                            "tokens": request.user.tokens_balance,
                            "nano_coins": request.user.nano_coins,
                            "cost_nano": site_cost_nano,
                            "cost": site_cost_tokens,
                            "is_first_site": is_first,
                            "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                            "deduction": deduction2,
                        }
                    except ValueError:
                        logger.warning("Token yechishda muammo user=%s", request.user.id)
                elif is_first:
                    balance_data2 = {
                        "tokens": request.user.tokens_balance,
                        "nano_coins": request.user.nano_coins,
                        "cost_nano": 0, "cost": 0, "is_first_site": True,
                        "chat_bonus_left": conversation.chat_budget_nano if conversation else 0,
                    }
                project_data = WebsiteProjectSerializer(project).data
            else:
                project_data = {
                    "id": None,
                    "title": new_schema.get("siteName", "AI Site"),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                }

            resp2 = {
                "success": True,
                "phase": "DONE",
                "is_chat": False,
                "project": project_data,
                "message": f"✅ Sayt tayyor: «{project_data['title']}»",
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": usage.get("input_tokens", 0),
                    "output_tokens": usage.get("output_tokens", 0),
                    "complexity": complexity,
                },
            }
            if balance_data2:
                resp2["balance"] = balance_data2
            if conversation:
                resp2["conversation_id"] = str(conversation.id)
            return Response(resp2)

        except ValueError as exc:
            logger.warning("AI JSON xatosi: %s", exc)
            return Response(
                {"success": False, "error": "AI javobi to'liq emas. Iltimos, qayta urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except RuntimeError as exc:
            logger.error("AI runtime xatosi: %s", exc)
            return Response(
                {"success": False, "error": "AI xizmati hozircha ishlamayapti. Iltimos, birozdan keyin urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("AI router xatosi")
            return Response(
                {"success": False, "error": "Server xatoligi. Iltimos, keyinroq urinib ko'ring."},
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
    def generate_files(self, request, pk=None):
        """
        Loyihaning barcha kod fayllarini (HTML/CSS/JS/Node.js) JSON ko'rinishida
        qaytaradi. Frontend IDE ko'rinishida ko'rsatish va alohida yuklab olish uchun.
        Kesh bor bo'lsa — undan olinadi.
        """
        project = self.get_object()
        try:
            if project.generated_files and isinstance(project.generated_files, dict):
                return Response({
                    "success": True,
                    "files": project.generated_files,
                    "cached": True,
                })
            claude = ClaudeService()
            files = claude.generate_site_files(
                project.schema_data or {}, project.language or "uz"
            )
            project.generated_files = files
            project.save(update_fields=["generated_files"])
            return Response({
                "success": True,
                "files": files,
                "cached": False,
            })
        except RuntimeError as exc:
            logger.error("generate_files xatosi project=%s: %s", project.id, exc)
            return Response(
                {"success": False, "error": "Fayl generatsiyasi hozircha ishlamayapti. Iltimos, keyinroq urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("generate_files kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def generate_files_inline(self, request):
        """
        Login talab qilmasdan schema_data dan kod fayllarini generatsiya qiladi.
        Frontend IDE ko'rinishi uchun.
        """
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        # DEBUG: nima keldi?
        logger.info(
            "generate_files_inline: type=%s keys=%s",
            type(schema_data).__name__,
            list(schema_data.keys()) if isinstance(schema_data, dict) else "N/A",
        )

        if not schema_data or not isinstance(schema_data, dict):
            return Response(
                {
                    "success": False,
                    "error": "schema_data talab qilinadi.",
                    "debug": {
                        "received_type": type(schema_data).__name__,
                        "is_none": schema_data is None,
                        "is_dict": isinstance(schema_data, dict),
                        "request_keys": list(request.data.keys()),
                    },
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Rate limit
        rl_key = f"ip:{_get_client_ip(request)}"
        if not _ai_rate_limiter.allow(rl_key):
            return Response(
                {"success": False, "error": "Juda ko'p so'rov. Bir daqiqadan keyin urinib ko'ring."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        try:
            claude = ClaudeService()
            files = claude.generate_site_files(schema_data, language)
            return Response({"success": True, "files": files})
        except RuntimeError as exc:
            logger.error("generate_files_inline xatosi: %s", exc)
            return Response(
                {"success": False, "error": "Fayl generatsiyasi hozircha ishlamayapti. Iltimos, keyinroq urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("generate_files_inline kutilmagan xato")
            return Response(
                {"success": False, "error": "Fayllar generatsiyasida xatolik"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["post"])
    def regenerate_code(self, request, pk=None):
        """Mavjud loyiha uchun kodni qaytadan generatsiya qiladi (keshni tozalaydi)."""
        project = self.get_object()
        project.generated_files = None
        project.save(update_fields=["generated_files"])
        return Response({"success": True, "message": "Kod keshi tozalandi. ZIP yuklaganda qayta generatsiya bo'ladi."})

    @action(detail=False, methods=["post"], permission_classes=[permissions.AllowAny])
    def export_zip(self, request):
        """
        Login talab qilmasdan schema_data dan ZIP yaratadi.
        Frontend sxemani yuboradi, biz HTML ZIP qaytaramiz.
        """
        schema_data = request.data.get("schema_data")
        title = str(request.data.get("title", "my-site"))[:100]
        language = str(request.data.get("language", "uz"))

        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        # Vaqtincha loyiha ob'ekti yaratamiz (DB ga saqlamasdan)
        class TempProject:
            schema_data = None
            generated_files = None
            language = "uz"
            created_at = None

            def __init__(self, sd, lang, t):
                import datetime
                self.schema_data = sd
                self.language = lang
                self.title = t
                self.created_at = datetime.datetime.now()

        temp = TempProject(schema_data, language, title)

        try:
            zip_buffer = ExportService.generate_static_zip(temp)
        except Exception:
            logger.exception("export_zip xatosi")
            return Response({"error": "ZIP yaratishda xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        safe_title = "".join(c for c in title if c.isalnum() or c in " -_").strip() or "site"
        resp = HttpResponse(zip_buffer.getvalue(), content_type="application/zip")
        resp["Content-Disposition"] = f'attachment; filename="{safe_title}.zip"'
        return resp

    @action(detail=False, methods=["post"], permission_classes=[permissions.IsAuthenticated])
    def revise_inline(self, request):
        """
        Mavjud schema ni tahrirlaydi (FAQAT ro'yxatdan o'tgan foydalanuvchilar).
        schema_data + prompt yuboriladi, yangi schema qaytariladi.
        """
        prompt = (request.data.get("prompt") or "").strip()
        schema_data = request.data.get("schema_data")
        language = str(request.data.get("language", "uz"))

        if not prompt:
            return Response({"error": "Prompt talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)
        if not schema_data or not isinstance(schema_data, dict):
            return Response({"error": "schema_data talab qilinadi."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            gen_start = time.monotonic()
            claude = ClaudeService()
            new_schema = claude.revise_site(prompt, schema_data, language)
            gen_ms = int((time.monotonic() - gen_start) * 1000)
            complexity = _estimate_complexity(new_schema)

            # revise_site usage ma'lumot qaytarmaydi — oddiy dict
            return Response({
                "success": True,
                "phase": "DONE",
                "project": {
                    "id": None,
                    "title": new_schema.get("siteName", schema_data.get("siteName", "AI Site")),
                    "status": "COMPLETED",
                    "schema_data": new_schema,
                },
                "stats": {
                    "generation_time_ms": gen_ms,
                    "input_tokens": 0,
                    "output_tokens": 0,
                    "complexity": complexity,
                },
                "message": "✅ Sayt yangilandi.",
            })
        except RuntimeError as exc:
            logger.error("revise_inline xatosi: %s", exc)
            return Response(
                {"success": False, "error": "AI xizmati hozircha ishlamayapti. Iltimos, keyinroq urinib ko'ring."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        except Exception:
            logger.exception("revise_inline kutilmagan xato")
            return Response({"success": False, "error": "AI xizmatida xatolik"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ─────────────────────────────────────────────────────────────
# Publish / Share — publik sayt uchun slug generatsiyasi
# ─────────────────────────────────────────────────────────────

def _generate_unique_slug(title: str) -> str:
    """Saytni publik URL uchun unikal slug (masalan: 'napoli-pizza-a3f2')."""
    base = slugify(title or "site", allow_unicode=False)[:60] or "site"
    # Takrorlanmaslik uchun qisqa tasodifiy qo'shimcha
    for _ in range(5):
        candidate = f"{base}-{secrets.token_hex(2)}"  # 4 belgi hex
        if not WebsiteProject.objects.filter(slug=candidate).exists():
            return candidate
    # juda qattiq holat — uzunroq random
    return f"{base}-{secrets.token_hex(4)}"


# WebsiteProjectViewSet ga qo'shimcha action'lar (publish/unpublish)
def publish(self, request, pk=None):
    project = self.get_object()
    if not project.schema_data:
        return Response(
            {"success": False, "error": "Sayt hali generatsiya qilinmagan."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not project.slug:
        project.slug = _generate_unique_slug(project.title)
    project.is_published = True
    project.published_at = timezone.now()
    project.save(update_fields=["slug", "is_published", "published_at", "updated_at"])
    return Response({
        "success": True,
        "slug": project.slug,
        "is_published": True,
        "published_at": project.published_at,
        "public_url": f"/s/{project.slug}",
    })


def unpublish(self, request, pk=None):
    project = self.get_object()
    project.is_published = False
    project.save(update_fields=["is_published", "updated_at"])
    return Response({"success": True, "is_published": False})


WebsiteProjectViewSet.publish = action(detail=True, methods=["post"])(publish)
WebsiteProjectViewSet.unpublish = action(detail=True, methods=["post"])(unpublish)


# ─────────────────────────────────────────────────────────────
# Publik sayt endpoint — auth talab qilmaydi
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def public_site(request, slug: str):
    """
    /api/public/sites/<slug>/ — Publik URL uchun sayt sxemasini qaytaradi.
    Faqat `is_published=True` bo'lgan loyihalar ko'rinadi.
    """
    try:
        project = WebsiteProject.objects.only(
            "id", "title", "schema_data", "language",
            "slug", "is_published", "view_count", "updated_at",
        ).get(slug=slug, is_published=True)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki o'chirilgan."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # View counter — atomik inkrement
    WebsiteProject.objects.filter(pk=project.pk).update(view_count=F("view_count") + 1)

    return Response({
        "success": True,
        "site": {
            "title": project.title,
            "schema_data": project.schema_data,
            "language": project.language,
            "slug": project.slug,
            "view_count": project.view_count + 1,
            "updated_at": project.updated_at,
        },
    })


# ─────────────────────────────────────────────────────────────
# Suhbat tarixi API
# ─────────────────────────────────────────────────────────────

from .serializers import ConversationDetailSerializer, ConversationListSerializer


class ConversationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Foydalanuvchi suhbatlari tarixi.
      GET /api/conversations/         → barcha suhbatlar ro'yxati
      GET /api/conversations/<id>/    → bitta suhbat + barcha xabarlar
      DELETE /api/conversations/<id>/ → suhbatni o'chirish
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ["get", "delete", "head", "options"]

    def get_queryset(self):
        qs = Conversation.objects.filter(user=self.request.user).select_related("project")
        if self.action == "retrieve":
            qs = qs.prefetch_related("messages")
        return qs

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def destroy(self, request, *args, **kwargs):
        """Suhbatni o'chirish — tegishli xabarlar CASCADE orqali o'chadi."""
        instance = self.get_object()
        instance.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
