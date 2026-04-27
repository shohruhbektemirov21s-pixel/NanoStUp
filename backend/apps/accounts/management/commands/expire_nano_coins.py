"""
30 kundan ko'p ishlatilmagan nano koin balanslarini 0'ga tushiradi.

Ishlatish:
    python manage.py expire_nano_coins              # haqiqiy reset
    python manage.py expire_nano_coins --dry-run    # faqat ko'rsatadi, tegmaydi

Render Cron Job (har kuni 03:00):
    python manage.py expire_nano_coins
"""
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.accounts.models import NANO_COIN_EXPIRY_DAYS, User


class Command(BaseCommand):
    help = "30 kundan ko'p ishlatilmagan nano koin balanslarini 0'ga tushiradi."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Faqat ko'rsatadi, balansni o'zgartirmaydi.",
        )

    def handle(self, *args, **opts):
        dry = opts.get("dry_run", False)
        threshold = timezone.now() - timedelta(days=NANO_COIN_EXPIRY_DAYS)

        # Muddati o'tgan foydalanuvchilar
        expired_qs = User.objects.filter(
            tokens_balance__gt=0,
            nano_coins_last_used_at__isnull=False,
            nano_coins_last_used_at__lt=threshold,
        )
        count = expired_qs.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS(
                "✅ Muddati o'tgan foydalanuvchilar yo'q."
            ))
            return

        # Hisobot
        total_nano_lost = 0
        for u in expired_qs.values("email", "tokens_balance"):
            tokens = u["tokens_balance"]
            nano = tokens // 10
            total_nano_lost += nano
            self.stdout.write(
                f"  • {u['email']}: {nano:,} nano koin"
                + (" [DRY-RUN]" if dry else "")
            )

        if dry:
            self.stdout.write(self.style.WARNING(
                f"\n[DRY-RUN] {count} ta user, jami {total_nano_lost:,} nano koin "
                f"reset qilinardi. Real reset uchun --dry-run olib tashlang."
            ))
            return

        # Real reset
        expired_qs.update(tokens_balance=0)
        self.stdout.write(self.style.SUCCESS(
            f"\n✅ {count} ta foydalanuvchi balansi 0'ga tushirildi. "
            f"Jami: {total_nano_lost:,} nano koin."
        ))
