# AI Website Builder

AI yordamida matn kiritib to'liq, tayyor sayt yaratadigan SaaS platforma.  
Django 6 + Next.js 16 + Google Gemini / Anthropic Claude.

---

## Texnologiyalar

| Qatlam | Texnologiya |
|--------|-------------|
| Backend | Django 6, Django REST Framework, SimpleJWT |
| Frontend | Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS |
| AI | Google Gemini 2.0 Flash (asosiy), Anthropic Claude (ixtiyoriy) |
| Ma'lumotlar bazasi | SQLite (dev) · PostgreSQL (prod) |
| Admin panel | django-unfold (premium UI) |
| API hujjatlari | drf-spectacular (Swagger + ReDoc) |
| Auth | JWT (access 60 daqiqa · refresh 1 kun) |
| Export | ZIP (statik HTML + Tailwind CDN) |

---

## Loyiha tuzilmasi

```
sayt yaratish/
├── backend/                        # Django backend
│   ├── apps/
│   │   ├── accounts/               # Foydalanuvchi modeli (email-based), JWT auth
│   │   ├── ai_generation/          # GeminiService — sayt generatsiyasi
│   │   ├── website_projects/       # WebsiteProject modeli, process_prompt endpoint
│   │   ├── exports/                # ZIP eksport xizmati
│   │   ├── subscriptions/          # Obuna va tariflar
│   │   ├── payments/               # To'lov integratsiyasi
│   │   └── notifications/          # WebSocket bildirishnomalar (Channels)
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py             # Asosiy sozlamalar
│   │   │   └── development.py      # SQLite + InMemoryChannelLayer (Redis kerak emas)
│   │   ├── urls.py                 # URL marshrutlari
│   │   └── wsgi.py                 # WSGI server
│   ├── requirements/
│   │   └── base.txt                # Python kutubxonalari
│   ├── manage.py
│   └── db.sqlite3                  # SQLite bazasi (dev)
│
├── frontend/                       # Next.js frontend
│   ├── src/
│   │   ├── app/[locale]/
│   │   │   ├── page.tsx            # Bosh sahifa
│   │   │   ├── builder/page.tsx    # AI Builder (asosiy sahifa)
│   │   │   ├── login/page.tsx      # Kirish
│   │   │   ├── register/page.tsx   # Ro'yxatdan o'tish
│   │   │   └── pricing/page.tsx    # Tariflar
│   │   ├── features/builder/
│   │   │   ├── SiteRenderer.tsx    # Generated saytni render qiladi
│   │   │   └── sections/           # hero, features, stats, pricing, contact...
│   │   ├── shared/api/axios.ts     # API client (JWT interceptor)
│   │   └── store/
│   │       ├── authStore.ts        # Zustand: auth holati
│   │       └── projectStore.ts     # Zustand: joriy loyiha
│   └── .env.local                  # NEXT_PUBLIC_API_URL
│
├── start-backend.sh                # Backend ishga tushirish skripti
├── start-frontend.sh               # Frontend ishga tushirish skripti
└── .env                            # API kalitlar va sozlamalar
```

---

## Tez ishga tushirish

### Talablar

- Python 3.11+
- Node.js 20+
- Git

### 1-qadam — O'rnatish va ishga tushirish

**Terminal 1 — Backend:**

```bash
cd "/home/kali/Рабочий стол/sayt yaratish"
bash start-backend.sh
```

**Terminal 2 — Frontend:**

```bash
cd "/home/kali/Рабочий стол/sayt yaratish"
bash start-frontend.sh
```

Skriptlar avtomatik ravishda:
- venv yaratadi va paketlarni o'rnatadi
- migratsiyalarni bajaradi
- admin superuser yaratadi (`admin@admin.com` / `admin1234`)
- serverni ishga tushiradi

### 2-qadam — Brauzerda ochish

| Sahifa | URL |
|--------|-----|
| Bosh sahifa | http://127.0.0.1:3000/en |
| AI Builder | http://127.0.0.1:3000/en/builder |
| Kirish | http://127.0.0.1:3000/en/login |
| Ro'yxatdan o'tish | http://127.0.0.1:3000/en/register |
| Tariflar | http://127.0.0.1:3000/en/pricing |
| Admin panel | http://127.0.0.1:8000/admin |
| API Swagger | http://127.0.0.1:8000/api/docs |
| API ReDoc | http://127.0.0.1:8000/api/redoc |

---

## Muhim: buyruq to'g'ri yozilishi

Kali Linux da `source venv/bin/activate` qilgandan keyin ham `python` system Python'ga ko'rsatadi.  
**Har doim venv Python'ni to'liq yo'l bilan ishlatish kerak:**

```bash
# ✅ To'g'ri
DJANGO_SETTINGS_MODULE=config.settings.development venv/bin/python manage.py runserver 127.0.0.1:8000

# ❌ Noto'g'ri (system Python ishlatadi — unfold topilmaydi)
python manage.py runserver
```

```bash
# ✅ Paket o'rnatish — to'g'ri
venv/bin/pip install -r requirements/base.txt

# ❌ Noto'g'ri (fayl nomini argument sifatida o'tkazadi)
pip install requirements/base.txt
```

---

## .env fayl

Loyiha ildizida `.env` fayli bo'lishi kerak:

```env
# Google Gemini (asosiy AI)
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
GOOGLE_GENERATIVE_AI_MODEL=gemini-2.0-flash

# Anthropic Claude (ixtiyoriy)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Ma'lumotlar bazasi (dev: SQLite, prod: PostgreSQL)
DATABASE_URL=sqlite:////to'liq/yo'l/backend/db.sqlite3

# Django
SECRET_KEY=almashtirish-kerak-bu-qiymatni
DEBUG=True
ALLOWED_HOSTS=*
```

---

## API endpointlari

### Auth

| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/api/accounts/register/` | Ro'yxatdan o'tish |
| POST | `/api/accounts/login/` | Kirish (JWT access + refresh) |
| POST | `/api/accounts/token/refresh/` | Tokenni yangilash |
| GET | `/api/accounts/me/` | Joriy foydalanuvchi ma'lumoti |

### Loyihalar

| Metod | URL | Vazifa |
|-------|-----|--------|
| GET | `/api/projects/` | Loyihalar ro'yxati |
| POST | `/api/projects/process_prompt/` | AI ga so'rov yuborish |
| GET | `/api/projects/{id}/download_zip/` | ZIP yuklab olish |

### `process_prompt/` so'rovi

```json
{
  "prompt": "Toshkentdagi shirinliklar do'koni uchun zamonaviy sayt yarat",
  "language": "uz",
  "project_id": "optional-uuid-agar-mavjud-loyiha-bo'lsa"
}
```

Javob (yangi sayt):
```json
{
  "success": true,
  "is_chat": false,
  "ai_type": "GEMINI",
  "project": {
    "id": "uuid",
    "title": "Shirinliklar do'koni",
    "status": "COMPLETED",
    "schema_data": { "siteName": "...", "pages": [...] }
  }
}
```

Javob (oddiy savol):
```json
{
  "success": true,
  "is_chat": true,
  "message": "Men sayt yaratib beradigan AI yordamchisiman..."
}
```

---

## AI qanday ishlaydi

```
Foydalanuvchi matn kiritadi
        ↓
AIRouterService.detect_intent()
        ↓
  ┌─────┴──────┐
CHAT          GENERATE
  │               │
GeminiService  GeminiService
 .chat()       .generate_full_site()
                   │
            JSON schema qaytadi
                   │
         SiteRenderer (frontend)
         saytni render qiladi
```

**`AIRouterService`** promptni tahlil qiladi:
- `"yarat"`, `"build"`, `"create"` → **GENERATE**
- `"salom"`, `"?"` so'roq → **CHAT**
- Mavjud loyiha bo'lib, buyruq berilsa → **GENERATE** (tahrirlash)

**`GeminiService`** Gemini REST API ga `httpx` orqali to'g'ridan-to'g'ri murojaat qiladi — `google-generativeai` paketi kerak emas.

---

## Frontend arxitekturasi

```
src/app/[locale]/builder/page.tsx
├── Chat panel (o'ng taraf)
│   └── Prompt kiritish → api.post('/projects/process_prompt/')
├── Preview canvas (markazda)
│   └── SiteRenderer (schema_data dan HTML render)
└── Sidebar (ikon tugmalar)
```

**Zustand store:**
- `authStore` — JWT token + foydalanuvchi ma'lumoti (localStorage'da saqlanadi)
- `projectStore` — joriy loyiha va uning sxemasi

**i18n:** `next-intl` — o'zbek (`uz`), rus (`ru`), ingliz (`en`) tillari

---

## Render qilinadigan section turlari

| Type | Ko'rinish |
|------|-----------|
| `hero` | Katta sarlavha + tavsif + CTA tugma |
| `features` | 3 ustunli kartalar grid |
| `stats` | Raqamlar va ko'rsatkichlar |
| `pricing` | Tarif planlari |
| `contact` | Email + telefon + manzil |
| `about` | Kompaniya haqida (hero uslubida) |
| `services` | Xizmatlar ro'yxati (features uslubida) |

---

## Admin panel

URL: **http://127.0.0.1:8000/admin**  
Login: `admin@admin.com` / `admin1234`

Mavjud bo'limlar:
- **Users** — foydalanuvchilar ro'yxati, tahrirlash, parol o'zgartirish
- **Website Projects** — barcha loyihalar, status, generatsiya tarixi
- **Project Versions** — har bir AI generatsiyasi versiyasi
- **Subscriptions** — obunalar va tariflar
- **Payments** — to'lovlar

---

## Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|--------|--------|
| `No module named 'unfold'` | `python` o'rniga `venv/bin/python` ishlating |
| `venv/bin/python3: not found` | venv boshqa kompyuterda yaratilgan — `python3 -m venv venv` qayta yarating |
| `Connection refused` | Backend ishlamayapti — `start-backend.sh` ni bajaring |
| `CORS error` | `CORS_ALLOW_ALL_ORIGINS=True` dev sozlamada bor, tekshiring |
| Gemini `429 quota` | Bir daqiqa kuting, keyin qayta urining |
| `No module named 'config.wsgi'` | `config/wsgi.py` mavjud ekanligini tekshiring |
| Frontend `localhost` ulanmaydi | `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api` — `localhost` emas `127.0.0.1` |

---

## Ishlab chiqarish uchun qo'shimcha sozlamalar

```env
# .env (production)
DEBUG=False
SECRET_KEY=tasodifiy-uzoq-va-murakkab-kalit
ALLOWED_HOSTS=sizning-domeningiz.uz,www.sizning-domeningiz.uz
DATABASE_URL=postgresql://user:pass@localhost:5432/aibuilder
CORS_ALLOWED_ORIGINS=https://sizning-domeningiz.uz
CORS_ALLOW_ALL_ORIGINS=False
```

```bash
# Static fayllarni yig'ish
DJANGO_SETTINGS_MODULE=config.settings.production venv/bin/python manage.py collectstatic

# Gunicorn bilan ishga tushirish
venv/bin/gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

---

*Yaratuvchi: Shohruhbek · AI Website Builder — 2026*
