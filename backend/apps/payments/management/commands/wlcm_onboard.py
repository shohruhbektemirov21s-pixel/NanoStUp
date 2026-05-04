"""
WLCM onboarding token'dan api_key + api_secret olish (bir martalik).

Hujjat: https://docs.wlcm.uz/onboarding-api

Foydalanish:
    python manage.py wlcm_onboard --token <ONBOARDING_TOKEN> [--name production-key]

Natija — terminal'da api_key/secret chiqadi va `.env` ga qo'shish ko'rsatmasi.
"""
from __future__ import annotations

import json

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "WLCM onboarding token'dan api_key + api_secret oladi"

    def add_arguments(self, parser):
        parser.add_argument(
            "--token", required=True,
            help="WLCM onboarding token (partner kabineti'dan)",
        )
        parser.add_argument(
            "--name", default="production-key",
            help="Yaratilayotgan API key uchun nom (default: production-key)",
        )
        parser.add_argument(
            "--base-url", default=None,
            help="WLCM base URL (default: settings.WLCM_BASE_URL)",
        )
        parser.add_argument(
            "--path", default="/api/v1/partners/onboarding/",
            help="Onboarding endpoint path (default: /api/v1/partners/onboarding/)",
        )

    def handle(self, *args, **opts):
        token = opts["token"].strip()
        name = opts["name"].strip()
        base = (opts["base_url"] or getattr(settings, "WLCM_BASE_URL", "") or "https://api.wlcm.uz").rstrip("/")
        path = opts["path"]
        url = f"{base}{path}"

        self.stdout.write(self.style.NOTICE(f"WLCM onboarding → {url}"))
        self.stdout.write(f"  token: {token[:8]}…{token[-4:]} ({len(token)} chars)")
        self.stdout.write(f"  name:  {name}\n")

        # 1) GET — token validatsiyasi
        try:
            r1 = requests.get(url, params={"token": token}, timeout=15)
        except requests.RequestException as exc:
            raise CommandError(f"GET so'rov xatosi: {exc}") from exc

        self.stdout.write(f"GET status: {r1.status_code}")
        try:
            self.stdout.write(f"GET body:   {r1.text[:300]}")
        except Exception:
            pass

        if r1.status_code >= 400:
            raise CommandError(
                f"Token validatsiyasi xato (HTTP {r1.status_code}). "
                f"Hujjat: https://docs.wlcm.uz/onboarding-api"
            )

        # 2) POST — api_key+secret yaratish
        try:
            r2 = requests.post(
                url,
                params={"token": token},
                json={"name": name},
                headers={"Content-Type": "application/json"},
                timeout=15,
            )
        except requests.RequestException as exc:
            raise CommandError(f"POST so'rov xatosi: {exc}") from exc

        self.stdout.write(f"\nPOST status: {r2.status_code}")
        try:
            data = r2.json()
        except json.JSONDecodeError:
            self.stdout.write(f"POST body (text): {r2.text[:400]}")
            raise CommandError("POST javobi JSON emas — yuqoridagi xom javobni tekshiring")

        self.stdout.write(f"POST body: {json.dumps(data, indent=2, ensure_ascii=False)}")

        if r2.status_code >= 400:
            raise CommandError(
                f"Onboarding xato (HTTP {r2.status_code}): {data.get('detail') or data}"
            )

        api_key = data.get("api_key")
        api_secret = data.get("api_secret")
        if not api_key or not api_secret:
            raise CommandError("Javobda api_key/api_secret topilmadi — yuqoridagi javobni ko'ring")

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("✓ WLCM onboarding muvaffaqiyatli!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write("Quyidagi qatorlarni Render dashboard → Environment ga qo'shing:")
        self.stdout.write("")
        self.stdout.write(self.style.WARNING(f"  WLCM_API_KEY={api_key}"))
        self.stdout.write(self.style.WARNING(f"  WLCM_API_SECRET={api_secret}"))
        self.stdout.write(self.style.WARNING("  WLCM_SANDBOX_MODE=False"))
        self.stdout.write("")
        self.stdout.write("Lokal test uchun .env'ga ham qo'shing va Django'ni qayta ishga tushiring.")
