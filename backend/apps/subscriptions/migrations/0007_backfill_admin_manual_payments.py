# Data migration: mavjud ACTIVE obunalar uchun PaymentTransaction yozadi.
#
# Sababi: avval admin panel orqali qo'lda tarif rejasi berilgan obunalar
# `PaymentTransaction` yozmagani uchun "JAMI DAROMAD" da ko'rinmagan.
# Bu migration — har faol obunaga 'admin_manual' provider bilan SUCCESS to'lov
# yozadi (agar shu obuna uchun payment hali yo'q bo'lsa).
#
# Render `python manage.py migrate` da avtomatik ishga tushiradi.

from django.db import migrations
from django.utils import timezone


def backfill_payments(apps, schema_editor):
    Subscription = apps.get_model("subscriptions", "Subscription")
    PaymentTransaction = apps.get_model("payments", "PaymentTransaction")

    # ACTIVE obunalar
    active_subs = Subscription.objects.filter(status="ACTIVE").select_related(
        "user", "tariff",
    )

    created_count = 0
    for sub in active_subs:
        # Agar bu user+tariff uchun SUCCESS payment allaqachon bo'lsa — o'tkazib yuboramiz
        already = PaymentTransaction.objects.filter(
            user=sub.user,
            tariff=sub.tariff,
            status="SUCCESS",
        ).exists()
        if already:
            continue

        try:
            PaymentTransaction.objects.create(
                user=sub.user,
                tariff=sub.tariff,
                amount=sub.tariff.price,
                provider="admin_manual",
                status="SUCCESS",
                external_id=f"backfill_{sub.id}_{int(timezone.now().timestamp())}",
                verified_at=sub.created_at or timezone.now(),
                created_at=sub.created_at or timezone.now(),
            )
            created_count += 1
        except Exception as exc:  # pragma: no cover
            print(f"⚠️ Backfill failed for sub #{sub.id}: {exc}")

    if created_count:
        print(f"✅ Backfilled {created_count} admin_manual PaymentTransaction(s).")


def reverse_noop(apps, schema_editor):
    """Backfill'ni qaytarmaymiz — payment'lar saqlanib qoladi."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("subscriptions", "0006_tariff_max_active_sites_tariff_storage_limit_mb_and_more"),
        ("payments", "0002_sms_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_payments, reverse_noop),
    ]
