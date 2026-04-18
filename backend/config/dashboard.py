from django.utils.translation import gettext_lazy as _
from unfold.components import Card, Chart, Table

def get_admin_dashboard(request):
    return [
        Card(
            title=_("Overall Stats"),
            items=[
                {"label": _("Active Users"), "value": "1.2k"},
                {"label": _("Daily Generations"), "value": "450"},
                {"label": _("Monthly Revenue"), "value": "$12.4k"},
            ]
        ),
        Chart(
            title=_("Site Generations (Last 7 Days)"),
            type="bar",
            data={
                "labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "datasets": [{"label": "Generations", "data": [45, 52, 38, 65, 48, 23, 15]}]
            }
        )
    ]
