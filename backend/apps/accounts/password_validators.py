"""
Kuchli parol validatorlari.
"""
import re
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _


class StrongPasswordValidator:
    """
    Parol kamida:
    - 8 belgi
    - 1 ta katta harf
    - 1 ta kichik harf
    - 1 ta raqam
    - 1 ta maxsus belgi
    """

    def validate(self, password, user=None):
        errors = []
        if len(password) < 8:
            errors.append("Parol kamida 8 belgidan iborat bo'lishi kerak.")
        if not re.search(r"[A-Z]", password):
            errors.append("Kamida 1 ta katta harf (A-Z) bo'lishi kerak.")
        if not re.search(r"[a-z]", password):
            errors.append("Kamida 1 ta kichik harf (a-z) bo'lishi kerak.")
        if not re.search(r"\d", password):
            errors.append("Kamida 1 ta raqam (0-9) bo'lishi kerak.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=/\\]", password):
            errors.append("Kamida 1 ta maxsus belgi (!@#$% va h.k.) bo'lishi kerak.")
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            "Parol kamida 8 belgi: katta harf, kichik harf, raqam va maxsus belgi (!@#$%) bo'lishi kerak."
        )


class NoCommonPasswordValidator:
    """Eng ko'p ishlatiladigan parollarni bloklaydi."""

    BLOCKED = frozenset({
        "password", "12345678", "qwerty123", "admin123", "password1",
        "iloveyou", "sunshine", "football", "letmein", "welcome1",
        "monkey123", "dragon123", "master123", "123456789", "abc12345",
        "parol123", "salom123", "uzbek123",
    })

    def validate(self, password, user=None):
        if password.lower() in self.BLOCKED:
            raise ValidationError(
                "Bu parol juda keng tarqalgan. Yanada murakkab parol tanlang.",
                code="password_too_common",
            )

    def get_help_text(self):
        return _("Keng tarqalgan parollardan foydalanmang.")
