from django.apps import AppConfig


class SiteRendererConfig(AppConfig):
    """
    Publik saytlarni server-side Django HTML template'lar orqali render qiladi.

    Arxitektura:
      - Next.js: auth, dashboard, builder, site-admin (interactive UI)
      - Django (bu app): /sites/<slug>/ — publik saytlar (static HTML, minimal JS)
    AI faqat content beradi; layout va template — backend tomondan tanlanadi.
    """
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.site_renderer"
    verbose_name = "Site Renderer (HTML)"
