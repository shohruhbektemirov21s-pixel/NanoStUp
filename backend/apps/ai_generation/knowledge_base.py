"""Knowledge base for AI chat — pre-built variants used in:
    1. Builder chat   → /ai/suggestions/?context=builder
    2. Site-admin     → /ai/suggestions/?context=admin  +  /ai/admin-assist/

Bu modul deyarli statik ma'lumotlardan iborat — eski tarmoq so'rovisiz tezkor
javob beradi. Mos kelmasa, `views.AdminAssistView` Gemini'ga (google_search
grounding bilan) o'tkazib yuboradi.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────────────────────────
# 1. Template Gallery (Builder — bo'sh ekran)
# ─────────────────────────────────────────────────────────────────
# Har bir shablon foydalanuvchi tugmasini bosgach `prompt`'ni chatga to'liq
# joylashtiradi. Promptlar sifatli javob olishga tuzilgan (ranglar, sahifalar,
# uslub aniq aytilgan).

TEMPLATE_GALLERY: List[Dict[str, Any]] = [
    {
        "id": "restaurant",
        "icon": "🍽️",
        "label": {"uz": "Restoran", "ru": "Ресторан", "en": "Restaurant"},
        "description": {
            "uz": "Menyu, bron, galereya bilan",
            "ru": "С меню, бронированием и галереей",
            "en": "Menu, booking, gallery",
        },
        "prompt": (
            "Premium restoran sayti yarat. Iliq jigarrang/oltin ranglar, "
            "katta hero rasm bilan. Sahifalar: bosh, menyu (kategoriyalar), "
            "galereya, bron qilish, biz haqimizda, kontakt. Ish vaqti, "
            "manzil, telefon ko'rsatilsin."
        ),
    },
    {
        "id": "cafe",
        "icon": "☕",
        "label": {"uz": "Kafe / Coffee shop", "ru": "Кафе", "en": "Cafe"},
        "description": {
            "uz": "Mehmondo'st, qulay dizayn",
            "ru": "Уютный, тёплый дизайн",
            "en": "Cozy, warm design",
        },
        "prompt": (
            "Zamonaviy coffee shop sayti yarat. Minimal dizayn, krem va "
            "to'q jigarrang ranglar. Bosh sahifa, kofe menyusi, "
            "galereya (interier rasmlari), biz haqimizda va kontakt sahifalari."
        ),
    },
    {
        "id": "clinic",
        "icon": "🏥",
        "label": {"uz": "Klinika / Tibbiyot", "ru": "Клиника", "en": "Clinic"},
        "description": {
            "uz": "Ishonchli, professional",
            "ru": "Доверительный, профессиональный",
            "en": "Trustworthy, professional",
        },
        "prompt": (
            "Zamonaviy tibbiy klinika sayti. Toza oq fon, ko'k aksent, "
            "professional tipografiya. Sahifalar: bosh, xizmatlar, "
            "shifokorlar, narxlar, qabul yozilish, kontakt. Ishonch va "
            "tajribani ta'kidlovchi matnlar."
        ),
    },
    {
        "id": "beauty",
        "icon": "💅",
        "label": {"uz": "Salon / Go'zallik", "ru": "Салон красоты", "en": "Beauty salon"},
        "description": {
            "uz": "Lyuks, hashamatli his",
            "ru": "Люкс, элегантность",
            "en": "Luxury, elegant",
        },
        "prompt": (
            "Premium go'zallik saloni sayti. Pushti-oltin gradientlar, "
            "elegant tipografiya, yumshoq animatsiyalar. Sahifalar: bosh, "
            "xizmatlar (sochga, yuzga, qo'l-oyoq), ustalar, galereya, "
            "yozilish, kontakt."
        ),
    },
    {
        "id": "shop",
        "icon": "🛍️",
        "label": {"uz": "Internet do'kon", "ru": "Интернет-магазин", "en": "Online store"},
        "description": {
            "uz": "Mahsulot katalogi bilan",
            "ru": "С каталогом товаров",
            "en": "Product catalog",
        },
        "prompt": (
            "E-commerce sayt yarat. Mahsulot kartochkalari (rasm, narx, "
            "tugma), filtrlash, savatcha. Sahifalar: bosh, katalog, "
            "kategoriyalar, bitta mahsulot, biz haqimizda, kontakt. "
            "Zamonaviy minimal dizayn."
        ),
    },
    {
        "id": "portfolio",
        "icon": "🎨",
        "label": {"uz": "Portfolio", "ru": "Портфолио", "en": "Portfolio"},
        "description": {
            "uz": "Dizayner / freelancer",
            "ru": "Для дизайнеров и фрилансеров",
            "en": "For designers / freelancers",
        },
        "prompt": (
            "Dizayner portfolio sayti. Quyuq fon, jonli aksent rang, "
            "katta proyekt galereyasi. Sahifalar: bosh (hero + ko'rsatish), "
            "ishlar, men haqimda, ko'nikmalar, kontakt."
        ),
    },
    {
        "id": "agency",
        "icon": "💼",
        "label": {"uz": "Agentlik / Studio", "ru": "Агентство", "en": "Agency"},
        "description": {
            "uz": "Marketing / dizayn studiya",
            "ru": "Маркетинг / дизайн-студия",
            "en": "Marketing / design studio",
        },
        "prompt": (
            "Premium digital agentlik sayti. Botir gradientlar, jasur "
            "tipografiya. Sahifalar: bosh, xizmatlar, keyslar (ishlar), "
            "jamoa, narxlar, kontakt. Ishonch raqamlari (mijozlar, "
            "loyihalar) ko'rsatilsin."
        ),
    },
    {
        "id": "school",
        "icon": "🎓",
        "label": {"uz": "O'quv markaz", "ru": "Учебный центр", "en": "Learning center"},
        "description": {
            "uz": "Kurslar va mashg'ulotlar",
            "ru": "Курсы и тренинги",
            "en": "Courses & training",
        },
        "prompt": (
            "Zamonaviy o'quv markaz sayti. Yorqin ko'k-yashil ranglar, "
            "do'stona tipografiya. Sahifalar: bosh, kurslar (kartochkalar), "
            "o'qituvchilar, narxlar, ro'yxatdan o'tish, kontakt. Bitiruvchilar "
            "natijalari (testimonial) ko'rsatilsin."
        ),
    },
    {
        "id": "fitness",
        "icon": "💪",
        "label": {"uz": "Fitnes / Sport zal", "ru": "Фитнес-клуб", "en": "Gym / Fitness"},
        "description": {
            "uz": "Energiya va kuch",
            "ru": "Энергия и сила",
            "en": "Energy & power",
        },
        "prompt": (
            "Fitnes klubi sayti. Quyuq fon, neon yashil/sariq aksent, "
            "kuchli vizual. Sahifalar: bosh, mashg'ulotlar, trenerlar, "
            "narxlar (a'zolik), galereya, kontakt."
        ),
    },
    {
        "id": "realestate",
        "icon": "🏠",
        "label": {"uz": "Ko'chmas mulk", "ru": "Недвижимость", "en": "Real estate"},
        "description": {
            "uz": "Uy, kvartira, ofis",
            "ru": "Дома, квартиры, офисы",
            "en": "Homes, apartments, offices",
        },
        "prompt": (
            "Ko'chmas mulk agentligi sayti. Toza oq, navy ko'k aksent. "
            "Sahifalar: bosh, joriy ob'ektlar (kartochkalar bilan), "
            "xizmatlar (sotish, ijara), agentlar, kontakt."
        ),
    },
    {
        "id": "saas",
        "icon": "🚀",
        "label": {"uz": "SaaS / Startap", "ru": "SaaS / Стартап", "en": "SaaS / Startup"},
        "description": {
            "uz": "Mahsulot landing'i",
            "ru": "Лендинг продукта",
            "en": "Product landing",
        },
        "prompt": (
            "Premium SaaS landing page. Quyuq fon, gradient (binafsha→ko'k), "
            "katta hero, mahsulot ekran ko'rinishi, imkoniyatlar (3-6 ta), "
            "narxlar, FAQ, CTA. Bitta uzun sahifa (one-pager) yoki bosh + "
            "narxlar + kontakt."
        ),
    },
    {
        "id": "blog",
        "icon": "📝",
        "label": {"uz": "Blog / Magazin", "ru": "Блог / Журнал", "en": "Blog / Magazine"},
        "description": {
            "uz": "Maqolalar va yangiliklar",
            "ru": "Статьи и новости",
            "en": "Articles & news",
        },
        "prompt": (
            "Zamonaviy blog sayti. Toza oq, serif tipografiya, o'qish uchun "
            "qulay. Sahifalar: bosh (so'nggi maqolalar), kategoriyalar, "
            "muallif haqida, kontakt. SEO uchun moslashtirilgan."
        ),
    },
]

# ─────────────────────────────────────────────────────────────────
# 2. Builder — kontekstli tezkor promptlar (chat ostidagi chips)
# ─────────────────────────────────────────────────────────────────
# `phase` ga qarab javob beradi:
#   - "idle": sayt hali yaratilmagan — boshlang'ich savollar
#   - "done": sayt yaratildi — tahrirlash buyruqlari

BUILDER_QUICK_PROMPTS: Dict[str, List[Dict[str, str]]] = {
    "idle": [
        {"icon": "🎯", "text_uz": "Sayt 1 sahifali bo'lsin", "text_ru": "Сделай одностраничный сайт", "text_en": "Make it a one-pager"},
        {"icon": "🎨", "text_uz": "Quyuq mavzu (dark mode)", "text_ru": "Тёмная тема", "text_en": "Use dark theme"},
        {"icon": "📱", "text_uz": "Mobile-friendly bo'lsin", "text_ru": "Сделай мобильным", "text_en": "Make it mobile-friendly"},
        {"icon": "📞", "text_uz": "Telefon va Telegram qo'sh", "text_ru": "Добавь телефон и Telegram", "text_en": "Add phone & Telegram"},
        {"icon": "📍", "text_uz": "Manzil va xarita qo'sh", "text_ru": "Добавь адрес и карту", "text_en": "Add address & map"},
    ],
    "done": [
        {"icon": "🎨", "text_uz": "Hero rangini o'zgartir", "text_ru": "Поменяй цвет hero", "text_en": "Change hero color"},
        {"icon": "✏️", "text_uz": "Sarlavha matnini yaxshilab yoz", "text_ru": "Перепиши заголовок", "text_en": "Rewrite the headline"},
        {"icon": "🖼️", "text_uz": "Boshqa rasm tanlab ber", "text_ru": "Подбери другие картинки", "text_en": "Pick different images"},
        {"icon": "➕", "text_uz": "Yangi sahifa: Bog'lanish", "text_ru": "Добавь страницу Контакты", "text_en": "Add a Contact page"},
        {"icon": "💬", "text_uz": "FAQ bo'limi qo'sh", "text_ru": "Добавь раздел FAQ", "text_en": "Add FAQ section"},
        {"icon": "⭐", "text_uz": "Mijoz fikrlari (testimonial)", "text_ru": "Добавь отзывы клиентов", "text_en": "Add testimonials"},
        {"icon": "💰", "text_uz": "Narxlar jadvalini qo'sh", "text_ru": "Добавь таблицу цен", "text_en": "Add pricing table"},
        {"icon": "🔍", "text_uz": "SEO ni yaxshilab ber", "text_ru": "Улучши SEO", "text_en": "Improve SEO"},
    ],
}


# ─────────────────────────────────────────────────────────────────
# 3. Site-admin — FAQ (sayt egasi uchun)
# ─────────────────────────────────────────────────────────────────
# Har FAQ entry: triggerlar (kalit so'zlar) + 3 tilda javob.
# `match_faq` foydalanuvchi savolidagi so'zlar bilan trigger ro'yxatini
# solishtirib, eng mos javobni qaytaradi.

ADMIN_FAQ: List[Dict[str, Any]] = [
    {
        "id": "publish",
        "triggers": ["publish", "chiqar", "ulash", "опубликов", "выложить"],
        "question": {
            "uz": "Saytimni qanday qilib publik qilaman?",
            "ru": "Как опубликовать сайт?",
            "en": "How do I publish my site?",
        },
        "answer": {
            "uz": "Builder'da \"Publish\" tugmasini bosing. Sayt darhol "
                  "`https://nanostup.uz/s/<sizning-slug>` manzilida ochiladi. "
                  "Slug'ni keyinroq Sozlamalar bo'limida o'zgartirishingiz mumkin.",
            "ru": "Нажмите кнопку «Publish» в редакторе. Сайт сразу станет доступен "
                  "по адресу `https://nanostup.uz/s/<ваш-slug>`. Slug можно изменить "
                  "позже в разделе «Настройки».",
            "en": "Click the \"Publish\" button in the builder. Your site will be "
                  "live at `https://nanostup.uz/s/<your-slug>` immediately. You can "
                  "rename the slug later under Settings.",
        },
    },
    {
        "id": "domain",
        "triggers": ["domen", "domain", "shaxsiy", "свой", "домен", "custom"],
        "question": {
            "uz": "Shaxsiy domen (masalan myshop.uz) qanday ulash mumkin?",
            "ru": "Как подключить свой домен (например, myshop.uz)?",
            "en": "How do I connect a custom domain?",
        },
        "answer": {
            "uz": "1) Tarif **Pro** yoki **Business** bo'lsin.\n"
                  "2) Sozlamalar → Domen bo'limiga o'ting va domeningizni kiriting.\n"
                  "3) Domen registratorida CNAME yozuvini qo'shing: `proxy.nanostup.uz`.\n"
                  "4) Tasdiqlash tugmasini bosing — odatda 5-30 daqiqada ulanadi.",
            "ru": "1) Тариф должен быть **Pro** или **Business**.\n"
                  "2) Перейдите в Настройки → Домен и введите свой домен.\n"
                  "3) В панели регистратора добавьте CNAME-запись: `proxy.nanostup.uz`.\n"
                  "4) Нажмите «Подтвердить» — обычно подключается за 5-30 минут.",
            "en": "1) You need a **Pro** or **Business** plan.\n"
                  "2) Go to Settings → Domain and enter your domain.\n"
                  "3) At your registrar, add a CNAME record pointing to `proxy.nanostup.uz`.\n"
                  "4) Click \"Verify\" — usually connects within 5-30 minutes.",
        },
    },
    {
        "id": "site_not_visible",
        "triggers": ["ko'rinmayapti", "ochilmayapti", "не открыва", "не видно", "not loading"],
        "question": {
            "uz": "Saytim ochilmayapti, nima qilay?",
            "ru": "Сайт не открывается, что делать?",
            "en": "My site isn't loading, what should I do?",
        },
        "answer": {
            "uz": "Eng ko'p sabablar:\n"
                  "• **Obuna muddati tugagan** — Sozlamalardan tarifni yangilang.\n"
                  "• **Sayt publish qilinmagan** — Builder'da Publish bosing.\n"
                  "• **Custom domen DNS hali tarqalmagan** — 30 daqiqa kuting yoki "
                  "`https://nanostup.uz/s/<slug>` orqali ochib ko'ring.",
            "ru": "Частые причины:\n"
                  "• **Подписка истекла** — продлите тариф в Настройках.\n"
                  "• **Сайт не опубликован** — нажмите Publish в редакторе.\n"
                  "• **DNS своего домена ещё не распространился** — подождите 30 минут "
                  "или откройте через `https://nanostup.uz/s/<slug>`.",
            "en": "Common causes:\n"
                  "• **Subscription expired** — renew your plan in Settings.\n"
                  "• **Site not published** — click Publish in the builder.\n"
                  "• **Custom domain DNS still propagating** — wait 30 min or open "
                  "via `https://nanostup.uz/s/<slug>`.",
        },
    },
    {
        "id": "edit_text",
        "triggers": ["matn", "yozuv", "tekst", "текст", "edit", "tahrir"],
        "question": {
            "uz": "Saytdagi matnni qanday tahrirlayman?",
            "ru": "Как изменить текст на сайте?",
            "en": "How do I edit the text on my site?",
        },
        "answer": {
            "uz": "Site-admin'da **Matn** tabiga o'ting — har bir bo'limning sarlavha, "
                  "tavsif va tugma yozuvlari alohida maydonda. O'zgartirib **Saqlash**ni bosing.",
            "ru": "В Site-admin откройте вкладку **Текст** — заголовки, описания и "
                  "кнопки каждой секции редактируются отдельно. Сохраните изменения.",
            "en": "In Site-admin, open the **Text** tab — each section's heading, "
                  "description and button copy are editable separately. Click Save.",
        },
    },
    {
        "id": "edit_images",
        "triggers": ["rasm", "surat", "image", "картин", "фото", "photo"],
        "question": {
            "uz": "Rasmlarni qanday almashtirsam bo'ladi?",
            "ru": "Как заменить картинки?",
            "en": "How do I replace images?",
        },
        "answer": {
            "uz": "Site-admin → **Matn** yoki **Dizayn** tabida rasm maydonida "
                  "yuklash tugmasini bosing. JPEG/PNG/WebP, max 5 MB. Yangi rasm "
                  "darhol public saytda ko'rinadi.",
            "ru": "Site-admin → **Текст** или **Дизайн**: нажмите кнопку загрузки "
                  "в поле картинки. JPEG/PNG/WebP, до 5 МБ. Изменения видны сразу.",
            "en": "Site-admin → **Text** or **Design** tab: click the upload button "
                  "next to the image field. JPEG/PNG/WebP, up to 5 MB. Live immediately.",
        },
    },
    {
        "id": "subscription_renew",
        "triggers": ["obuna", "tarif", "to'lov", "подписк", "тариф", "оплат", "subscribe", "renew", "plan"],
        "question": {
            "uz": "Obunani qanday yangilayman?",
            "ru": "Как продлить подписку?",
            "en": "How do I renew my subscription?",
        },
        "answer": {
            "uz": "Profil → Tariflar yoki to'g'ridan-to'g'ri `/pricing` sahifasiga o'ting. "
                  "Kerakli paket tanlang va WLCM orqali to'lov qiling. To'lov tasdiqlangach, "
                  "saytlaringiz darhol ishga tushadi va nano-tangalar balansga qo'shiladi.",
            "ru": "Профиль → Тарифы или откройте страницу `/pricing`. Выберите пакет и "
                  "оплатите через WLCM. После подтверждения оплаты сайты сразу активируются "
                  "и нано-монеты зачислятся на баланс.",
            "en": "Profile → Plans or go to `/pricing`. Pick a tier and pay via WLCM. "
                  "Once the payment is confirmed, your sites go live and nano-coins are "
                  "added to your balance.",
        },
    },
    {
        "id": "seo",
        "triggers": ["seo", "google", "qidiruv", "поиск", "search", "meta", "title"],
        "question": {
            "uz": "Saytim Google'da yaxshi chiqishi uchun nima qilay?",
            "ru": "Как улучшить позиции сайта в Google?",
            "en": "How can I improve my Google rankings?",
        },
        "answer": {
            "uz": "1) Sozlamalardan **Sayt nomi** va **meta-tavsif** ni aniq yozing "
                  "(kalit so'zlar bilan).\n"
                  "2) Hero matnida nima qilishingizni 1-jumlada aytib bering.\n"
                  "3) Har sahifaga unikal H1 sarlavha qo'ying.\n"
                  "4) Rasmlar fayl nomida kalit so'z bo'lsin (masalan `tashkent-pizza.jpg`).\n"
                  "5) Custom domen ulasangiz — Google Search Console'da ro'yxatdan o'ting.",
            "ru": "1) В Настройках укажите чёткое **название сайта** и **мета-описание** "
                  "с ключевыми словами.\n"
                  "2) В hero-секции одной фразой опишите, чем вы занимаетесь.\n"
                  "3) На каждой странице должен быть уникальный H1.\n"
                  "4) Имена файлов картинок должны содержать ключи (`tashkent-pizza.jpg`).\n"
                  "5) Подключите свой домен и зарегистрируйтесь в Google Search Console.",
            "en": "1) Set a clear **site title** and **meta description** with keywords "
                  "in Settings.\n"
                  "2) In the hero, describe what you do in one sentence.\n"
                  "3) Use a unique H1 on each page.\n"
                  "4) Use keyword-rich image filenames (e.g. `tashkent-pizza.jpg`).\n"
                  "5) Connect a custom domain and submit to Google Search Console.",
        },
    },
    {
        "id": "speed",
        "triggers": ["sekin", "tezlik", "медлен", "скорост", "slow", "speed", "performance"],
        "question": {
            "uz": "Saytim sekin ochilyapti, nima qilish kerak?",
            "ru": "Сайт грузится медленно, что делать?",
            "en": "My site is slow, what should I do?",
        },
        "answer": {
            "uz": "Asosiy sabab — og'ir rasmlar:\n"
                  "• Hero rasm 1920×1080 dan katta bo'lmasin (max 300 KB).\n"
                  "• PNG o'rniga **WebP** ishlatib ko'ring.\n"
                  "• Bir sahifada 8-10 tadan ortiq rasm qo'ymaslikni tavsiya qilamiz.\n"
                  "Saytlarimiz Frankfurt'dagi serverdan beriladi — O'zbekistondan o'rtacha 200 ms.",
            "ru": "Главная причина — тяжёлые картинки:\n"
                  "• Hero не больше 1920×1080 (до 300 KB).\n"
                  "• Используйте **WebP** вместо PNG.\n"
                  "• Не больше 8-10 картинок на странице.\n"
                  "Сайты раздаются из Франкфурта — пинг из Узбекистана ~200 ms.",
            "en": "The main cause is heavy images:\n"
                  "• Hero image should be max 1920×1080 (under 300 KB).\n"
                  "• Use **WebP** instead of PNG.\n"
                  "• Avoid more than 8-10 images per page.\n"
                  "Sites are served from Frankfurt — ~200 ms latency from Uzbekistan.",
        },
    },
    {
        "id": "versions",
        "triggers": ["versiya", "tarix", "qayta", "версия", "истори", "восстанов", "rollback", "history", "restore"],
        "question": {
            "uz": "Eski versiyaga qanday qaytaman?",
            "ru": "Как откатить сайт к старой версии?",
            "en": "How do I roll back to an older version?",
        },
        "answer": {
            "uz": "Site-admin → **Tarix** tabida saqlangan barcha versiyalar bor. "
                  "Birini tanlab **Tiklash** tugmasini bosing — joriy holat avtomatik "
                  "snapshot sifatida saqlanadi (xavfsiz orqaga qaytish).",
            "ru": "Site-admin → вкладка **История** — там все сохранённые версии. "
                  "Выберите нужную и нажмите **Восстановить** — текущее состояние "
                  "автоматически сохранится снапшотом (безопасный откат).",
            "en": "Site-admin → **History** tab lists all saved versions. Pick one and "
                  "click **Restore** — the current state is auto-saved as a snapshot "
                  "(safe rollback).",
        },
    },
    {
        "id": "delete_site",
        "triggers": ["o'chir", "удал", "delete", "remove"],
        "question": {
            "uz": "Saytni qanday o'chiraman?",
            "ru": "Как удалить сайт?",
            "en": "How do I delete a site?",
        },
        "answer": {
            "uz": "Dashboard → loyiha kartochkasi → uch nuqta menyusi → **O'chirish**. "
                  "Diqqat: o'chirilgan saytni qaytarib bo'lmaydi.",
            "ru": "Dashboard → карточка проекта → меню (три точки) → **Удалить**. "
                  "Внимание: удалённый сайт восстановить нельзя.",
            "en": "Dashboard → project card → three-dot menu → **Delete**. "
                  "Warning: deleted sites cannot be restored.",
        },
    },
    {
        "id": "tokens",
        "triggers": ["nano", "token", "tanga", "монет", "coin", "balans", "balance"],
        "question": {
            "uz": "Nano-tangalar nima va qachon ishlatiladi?",
            "ru": "Что такое нано-монеты и когда они тратятся?",
            "en": "What are nano-coins and when are they spent?",
        },
        "answer": {
            "uz": "Nano-tanga — AI generatsiya valyutasi. Har bir to'liq sayt yaratish "
                  "yoki katta tahrir ~50-150 nano oladi. Profil → Balans bo'limida "
                  "qancha qolganligini ko'rasiz. Tarif sotib olganda avtomatik to'ldiriladi.",
            "ru": "Нано-монеты — валюта AI-генерации. Полное создание или крупная правка "
                  "сайта стоит ~50-150 нано. Текущий баланс — в Профиле. При покупке "
                  "тарифа баланс пополняется автоматически.",
            "en": "Nano-coins are the AI generation currency. A full site build or major "
                  "edit costs ~50-150 nano. See your balance under Profile. Buying a plan "
                  "tops it up automatically.",
        },
    },
    {
        "id": "language",
        "triggers": ["til", "tilga", "язык", "language", "перевод", "translate"],
        "question": {
            "uz": "Saytni ikki tilda qila olamanmi?",
            "ru": "Можно ли сделать сайт на нескольких языках?",
            "en": "Can I make a multi-language site?",
        },
        "answer": {
            "uz": "Hozirda har sayt bitta asosiy tilda. Boshqa tilda variant kerak bo'lsa: "
                  "Builder'da \"saytning ruscha versiyasini ham yarat\" deb yozing — "
                  "AI yangi sahifalar to'plamini qo'shadi.",
            "ru": "Сейчас один сайт = один язык. Чтобы добавить версию на другом: в "
                  "Builder напишите «добавь английскую версию сайта» — AI создаст "
                  "дополнительный набор страниц.",
            "en": "For now each site is single-language. To add another version, tell the "
                  "Builder: \"add a Russian version of the site\" — AI will create an "
                  "additional set of pages.",
        },
    },
]


# ─────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────


def _normalize(s: str) -> str:
    return re.sub(r"[^\w\s']+", " ", (s or "").lower()).strip()


def match_faq(query: str, lang: str = "uz") -> Optional[Dict[str, Any]]:
    """FAQ ichidan eng mos javobni topadi.

    Algoritm: har FAQ entry'sining triggerlarini query bilan substring solishtir
    va eng ko'p moslangan entry'ni qaytar. Hech kim mos kelmasa — None.

    Returns:
        {"id": ..., "question": str, "answer": str} yoki None.
    """
    q = _normalize(query)
    if not q or len(q) < 3:
        return None

    best: Optional[Dict[str, Any]] = None
    best_score = 0
    for entry in ADMIN_FAQ:
        score = sum(1 for t in entry["triggers"] if t in q)
        if score > best_score:
            best_score = score
            best = entry

    if not best or best_score == 0:
        return None

    lang_key = lang if lang in ("uz", "ru", "en") else "uz"
    return {
        "id": best["id"],
        "question": best["question"].get(lang_key, best["question"]["uz"]),
        "answer": best["answer"].get(lang_key, best["answer"]["uz"]),
        "matched_triggers": best_score,
    }


def get_templates(lang: str = "uz") -> List[Dict[str, Any]]:
    """Builder boshlang'ich ekrani uchun shablon ro'yxatini bersi tilda qaytaradi."""
    lang_key = lang if lang in ("uz", "ru", "en") else "uz"
    return [
        {
            "id": t["id"],
            "icon": t["icon"],
            "label": t["label"][lang_key],
            "description": t["description"][lang_key],
            "prompt": t["prompt"],
        }
        for t in TEMPLATE_GALLERY
    ]


def get_quick_prompts(phase: str = "idle", lang: str = "uz") -> List[Dict[str, str]]:
    """Builder chat'i uchun tezkor prompt chips."""
    lang_key = lang if lang in ("uz", "ru", "en") else "uz"
    bucket = BUILDER_QUICK_PROMPTS.get(phase, BUILDER_QUICK_PROMPTS["idle"])
    return [
        {"icon": p["icon"], "text": p[f"text_{lang_key}"]}
        for p in bucket
    ]


def get_admin_faqs(lang: str = "uz") -> List[Dict[str, Any]]:
    """Site-admin uchun FAQ ro'yxati (kichik card grid)."""
    lang_key = lang if lang in ("uz", "ru", "en") else "uz"
    return [
        {
            "id": f["id"],
            "question": f["question"][lang_key],
            "answer": f["answer"][lang_key],
        }
        for f in ADMIN_FAQ
    ]
