"""
Sayt egasi (owner) uchun qo'shimcha API endpoint'lari:
  - Image upload (drag&drop + Pillow compress + WebP)
  - Version list / restore (rollback UI uchun)

Mavjud `views.py` monolitiga aralashmaslik uchun alohida modul.
URL'lar `urls.py` ichida ulanadi.
"""
from __future__ import annotations

import hashlib
import io
import logging
import os
import uuid
from pathlib import Path
from typing import Optional

from django.conf import settings
from django.db import transaction
from rest_framework import permissions, status
from rest_framework.decorators import api_view, parser_classes, permission_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from .models import ProjectVersion, WebsiteProject

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Konfiguratsiya
# ─────────────────────────────────────────────────────────────

# Maksimal yuklash o'lchami (10 MB) — frontend'da ham bir xil bo'lishi kerak
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

# Saqlash uchun ruxsat etilgan kirish formatlari (Pillow tomonidan o'qiladi)
ALLOWED_INPUT_MIME = {
    "image/jpeg", "image/jpg", "image/png", "image/webp",
    "image/gif", "image/bmp", "image/tiff",
}

# Chiqishda — har doim WebP (zamonaviy, kichik hajm, alpha qo'llab-quvvatlaydi)
OUTPUT_FORMAT = "WEBP"
OUTPUT_EXT = "webp"
OUTPUT_QUALITY = 82  # 0-100, 82 = chiroyli + ~70-80% hajm tejash

# Eng uzun tomonning maksimal piksel — kattaroq rasmlar resize qilinadi
MAX_DIMENSION_PX = 1920

# Owner-uploaded rasmlar storage prefix — MEDIA_ROOT/sites/<project_id>/<hash>.webp
SITES_UPLOAD_PREFIX = "sites"


def _media_path(project_id: str, filename: str) -> Path:
    """MEDIA_ROOT/sites/<project_id>/<filename> — to'liq fayl yo'li."""
    base = Path(settings.MEDIA_ROOT) / SITES_UPLOAD_PREFIX / str(project_id)
    base.mkdir(parents=True, exist_ok=True)
    return base / filename


def _public_url(project_id: str, filename: str) -> str:
    """Foydalanuvchiga qaytariladigan publik URL."""
    media_url = settings.MEDIA_URL or "/media/"
    if not media_url.startswith("/"):
        media_url = "/" + media_url
    if not media_url.endswith("/"):
        media_url = media_url + "/"
    return f"{media_url}{SITES_UPLOAD_PREFIX}/{project_id}/{filename}"


def _compress_to_webp(raw_bytes: bytes) -> tuple[bytes, tuple[int, int]]:
    """
    Pillow bilan rasmni o'qib, max 1920px ga resize qilib, WebP'ga aylantiradi.
    Returns: (webp_bytes, (width, height))
    """
    # Pillow lazy import — Django boot vaqtida import qilinmasin
    from PIL import Image, ImageOps

    img = Image.open(io.BytesIO(raw_bytes))
    # EXIF orientation (telefon rasmlari uchun)
    img = ImageOps.exif_transpose(img)

    # Animatsiyali GIF uchun WebP saqlash mantig'i — birinchi frame
    if getattr(img, "is_animated", False):
        img.seek(0)

    # Resize — eng uzun tomonni MAX_DIMENSION_PX ga keltiramiz, aspect saqlab
    w, h = img.size
    longest = max(w, h)
    if longest > MAX_DIMENSION_PX:
        ratio = MAX_DIMENSION_PX / longest
        new_size = (int(w * ratio), int(h * ratio))
        img = img.resize(new_size, Image.LANCZOS)

    # WebP RGBA qo'llab-quvvatlaydi — alpha-mode'ni saqlaymiz
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.mode else "RGB")

    out = io.BytesIO()
    img.save(out, format=OUTPUT_FORMAT, quality=OUTPUT_QUALITY, method=6)
    return out.getvalue(), img.size


# ─────────────────────────────────────────────────────────────
# Image upload — POST /api/projects/owner/by_slug/<slug>/upload-image/
# ─────────────────────────────────────────────────────────────

@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def owner_upload_image(request, slug: str):
    """
    Sayt egasi rasm yuklaydi.
    - Multipart form: `file` (image)
    - Pillow bilan compress + WebP'ga aylantiradi
    - MEDIA_ROOT/sites/<project_id>/<sha256>.webp ga saqlaydi
    - Public URL qaytaradi: /media/sites/<project_id>/<hash>.webp
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )

    upload = request.FILES.get("file")
    if upload is None:
        return Response(
            {"success": False, "error": "Fayl yuborilmadi (`file` field kerak)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Hajm tekshiruvi ──
    if upload.size > MAX_UPLOAD_BYTES:
        return Response({
            "success": False,
            "error": f"Fayl juda katta. Maksimum: {MAX_UPLOAD_BYTES // (1024 * 1024)} MB.",
            "max_bytes": MAX_UPLOAD_BYTES,
        }, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)

    # ── Content-type tekshiruvi (Pillow ham keyin tekshiradi) ──
    content_type = (upload.content_type or "").lower().strip()
    if content_type and content_type not in ALLOWED_INPUT_MIME:
        return Response({
            "success": False,
            "error": f"Qo'llab-quvvatlanmaydigan format: {content_type}. "
                     f"Faqat: JPEG, PNG, WebP, GIF, BMP, TIFF.",
            "allowed": sorted(ALLOWED_INPUT_MIME),
        }, status=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    # ── Pillow bilan o'qish va compress ──
    try:
        raw = upload.read()
    except Exception as e:
        logger.warning("Failed to read upload: %s", e)
        return Response(
            {"success": False, "error": "Faylni o'qib bo'lmadi."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        webp_bytes, (out_w, out_h) = _compress_to_webp(raw)
    except Exception as e:
        logger.warning("Pillow failed: %s", e, exc_info=True)
        return Response(
            {"success": False, "error": "Rasmni qayta ishlab bo'lmadi (noto'g'ri format yoki buzilgan fayl)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ── Hash bilan deduplikatsiya — bir xil rasm ikki marta saqlanmaydi ──
    sha = hashlib.sha256(webp_bytes).hexdigest()[:16]
    filename = f"{sha}.{OUTPUT_EXT}"
    full_path = _media_path(str(project.id), filename)
    if not full_path.exists():
        try:
            with open(full_path, "wb") as fh:
                fh.write(webp_bytes)
        except OSError as e:
            logger.error("Failed to write upload: %s", e)
            return Response(
                {"success": False, "error": "Saqlash imkonsiz (server xatosi)."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    public_url = _public_url(str(project.id), filename)
    return Response({
        "success": True,
        "url": public_url,
        "width": out_w,
        "height": out_h,
        "size_bytes": len(webp_bytes),
        "format": OUTPUT_EXT,
        "original_size_bytes": len(raw),
        "compression_ratio": round(len(raw) / max(len(webp_bytes), 1), 2),
    })


# ─────────────────────────────────────────────────────────────
# Versiya tarixi — list & restore
# ─────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_list_versions(request, slug: str):
    """
    GET /api/projects/owner/by_slug/<slug>/versions/

    Sayt egasi uchun versiyalar tarixi:
      - oxirgisidan boshlab, eng yangisi yuqorida
      - har bir yozuv: id, version_number, intent, created_at, prompt qisqartma
      - schema_data — preview uchun (lekin frontend kerak bo'lganda alohida olishi mumkin)
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )

    versions = list(
        project.versions.order_by("-version_number")
        .values("id", "version_number", "intent", "prompt", "created_at")[:50]
    )
    # Prompt'ni qisqartiramiz (UI uchun) — to'liq matn alohida endpoint orqali
    for v in versions:
        v["id"] = str(v["id"])
        prompt = v.get("prompt") or ""
        v["prompt_preview"] = (prompt[:120] + "…") if len(prompt) > 120 else prompt
        del v["prompt"]

    return Response({
        "success": True,
        "project_id": str(project.id),
        "current_version": project.versions.count(),
        "versions": versions,
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def owner_get_version(request, slug: str, version_id: str):
    """
    GET /api/projects/owner/by_slug/<slug>/versions/<version_id>/

    Bitta versiyaning to'liq schema_data — preview uchun.
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        version = project.versions.get(id=version_id)
    except ProjectVersion.DoesNotExist:
        return Response(
            {"success": False, "error": "Versiya topilmadi."},
            status=status.HTTP_404_NOT_FOUND,
        )

    return Response({
        "success": True,
        "version": {
            "id": str(version.id),
            "version_number": version.version_number,
            "intent": version.intent,
            "prompt": version.prompt,
            "schema_data": version.schema_data,
            "created_at": version.created_at,
        },
    })


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def owner_restore_version(request, slug: str, version_id: str):
    """
    POST /api/projects/owner/by_slug/<slug>/versions/<version_id>/restore/

    Tanlangan versiyani tiklaydi:
      - Joriy schema_data yangi versiya sifatida saqlanadi (joriy holatni yo'qotmaslik uchun)
      - Eski versiya schema'si project.schema_data ga o'rnatiladi
      - generated_files keshini tozalaymiz (qayta render uchun)
    """
    try:
        project = WebsiteProject.objects.get(slug=slug, user=request.user)
    except WebsiteProject.DoesNotExist:
        return Response(
            {"success": False, "error": "Sayt topilmadi yoki sizniki emas."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        target_version = project.versions.get(id=version_id)
    except ProjectVersion.DoesNotExist:
        return Response(
            {"success": False, "error": "Versiya topilmadi."},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Tranzaksiyada — yarim qolish bo'lmasin
    with transaction.atomic():
        # 1) Joriy holatni yangi versiya qilib saqlaymiz (rollback'dan oldingi snapshot)
        try:
            ProjectVersion.objects.create(
                project=project,
                prompt=f"(snapshot before restoring v{target_version.version_number})",
                schema_data=project.schema_data or {},
                intent="auto_snapshot_before_restore",
                version_number=project.versions.count() + 1,
            )
        except Exception:
            logger.warning("Failed to snapshot before restore", exc_info=True)

        # 2) Eski versiyaning schema'sini joriy qilamiz
        project.schema_data = target_version.schema_data
        update_fields = ["schema_data", "updated_at"]
        if project.generated_files:
            project.generated_files = None
            update_fields.append("generated_files")
        project.save(update_fields=update_fields)

        # 3) "Restored" yozuvini ham versiyaga qo'shamiz (audit trail)
        try:
            ProjectVersion.objects.create(
                project=project,
                prompt=f"(restored from v{target_version.version_number})",
                schema_data=target_version.schema_data,
                intent="restore",
                version_number=project.versions.count() + 1,
            )
        except Exception:
            logger.warning("Failed to log restore event", exc_info=True)

    return Response({
        "success": True,
        "message": f"✅ v{target_version.version_number} muvaffaqiyatli tiklandi.",
        "project": {
            "id": str(project.id),
            "title": project.title,
            "schema_data": project.schema_data,
            "slug": project.slug,
            "updated_at": project.updated_at,
        },
    })
