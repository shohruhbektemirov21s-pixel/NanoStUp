"""
Django ishga tushganda xavfsizlik muhitini tekshiradi.
Jiddiy muammo bo'lsa — xato yozib ogohlantiradi.
"""
import os
import sys

import django.apps


def run_security_checks(app_configs=None, **kwargs):  # noqa: ARG001
    errors = []
    warnings = []

    secret = os.environ.get("SECRET_KEY", "")
    if not secret:
        errors.append("SECRET_KEY .env da yo'q — server ishga tushirilmaydi!")
    elif "insecure" in secret.lower() or "default" in secret.lower() or len(secret) < 40:
        warnings.append("SECRET_KEY juda oddiy yoki qisqa — yangi kalit generatsiya qiling.")

    if os.environ.get("DEBUG", "False").lower() == "true":
        warnings.append("DEBUG=True — FAQAT local dev uchun. Serverda o'chiring!")

    allowed = os.environ.get("ALLOWED_HOSTS", "")
    if "*" in allowed and os.environ.get("DEBUG", "False").lower() != "true":
        errors.append("ALLOWED_HOSTS='*' production da ruxsat etilmaydi!")

    anthropic = os.environ.get("ANTHROPIC_API_KEY", "")
    if not anthropic:
        warnings.append("ANTHROPIC_API_KEY yo'q — AI funksiyalar ishlamaydi.")
    elif anthropic.startswith("sk-ant-api03-s5jUt"):
        errors.append(
            "⚠️  ANTHROPIC_API_KEY oshkor bo'lgan kalit! "
            "Darhol https://console.anthropic.com dan yangi kalit oling."
        )

    # Natijalar
    for err in errors:
        print(f"\033[91m[XAVFSIZLIK XATOSI] {err}\033[0m", file=sys.stderr)
    for warn in warnings:
        print(f"\033[93m[Ogohlantirish] {warn}\033[0m", file=sys.stderr)

    if errors:
        print(
            "\033[91m\n[!] Xavfsizlik xatolari topildi. "
            "Yuklandim, lekin DARHOL tuzating!\033[0m",
            file=sys.stderr,
        )

    return []  # Django check frameworki uchun
