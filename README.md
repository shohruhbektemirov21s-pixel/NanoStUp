# NanoStUp — AI Website Builder

> O'zbek tilida prompt yozing — AI professional veb-sayt yaratib beradi.

**Gemini** arxitektor sifatida savollar beradi, **Claude** to'liq saytni JSON schema'da yaratadi, **SiteRenderer** uni jonli saytga aylantiradi.

🌐 **Prod:** [nanostup.uz](https://nanostup.uz) · [API](https://nanostup-api.onrender.com/api/docs)

---

## Xususiyatlar

- 💬 **AI Arxitektor** — Gemini foydalanuvchi bilan suhbat qurib, sayt spetsifikatsiyasini yig'adi
- ⚡ **Claude generatsiya** — `max_tokens=15000` bilan mukammal, to'liq sayt
- 🎨 **Avtomatik rang palitralari** — 14 ta biznes turi: restoran, salon, gym, klinika, tech va boshqalar
- 📱 **Responsive** — mobil, tablet, desktop
- 🔗 **Publik link** — login talab qilmaydi (`/s/slug`)
- 📦 **ZIP eksport** — `index.html + CSS + JS + Express backend`
- 💎 **Nano koin tizimi** — oddiy 3000, o'rta 4000, murakkab 5000 nano
- ⏱️ **Streaming** — uzoq generatsiya timeout bermaydi (server heartbeat)
- 🌍 **3 til** — o'zbek, rus, ingliz

---

## Texnologiyalar

| Qatlam | Stack |
|--------|-------|
| **Backend** | Django 6 + DRF 3.17 + SimpleJWT + django-unfold |
| **Frontend** | Next.js 15 + React 19 + TypeScript + Tailwind CSS 4 |
| **AI** | Anthropic Claude `claude-sonnet-4-6` + Google Gemini `gemini-2.0-flash` |
| **State** | Zustand 5 (authStore + projectStore) |
| **i18n** | next-intl 4 (uz · ru · en) |
| **DB** | SQLite (dev) · PostgreSQL (prod) |
| **Deploy** | Render.com starter plan · Gunicorn gthread |

---

## Tez ishga tushirish

### Talablar
- Python 3.11+
- Node.js 20+
- `.env` fayl (quyida namuna)

### Backend

```bash
cd "/home/kali/Рабочий стол/sayt yaratish/backend"
DJANGO_SETTINGS_MODULE=config.settings.development venv/bin/python manage.py runserver
# → http://127.0.0.1:8000
```

### Frontend

```bash
cd "/home/kali/Рабочий стол/sayt yaratish/frontend"
npm run dev
# → http://127.0.0.1:3000/uz
```

> **Kali Linux eslatma:** `venv/bin/python` — to'liq yo'l bilan ishlatish shart. `python` system Python'ga ko'rsatadi.

---

## .env fayl

Loyiha ildizida `.env` bo'lishi kerak:

```env
# Django
SECRET_KEY=uzoq-tasodifiy-kalit
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DATABASE_URL=sqlite:////to'liq/yo'l/backend/db.sqlite3

# AI
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6
GOOGLE_GENERATIVE_AI_API_KEY=AIza...
GOOGLE_GENERATIVE_AI_MODEL=gemini-2.0-flash

# Admin URL (xavfsizlik)
ADMIN_URL=mening-yashirin-admin-url

# Token limiti (test uchun True, prod False)
TOKEN_LIMITS_DISABLED=False
```

Frontend `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

---

## AI qanday ishlaydi

```
Foydalanuvchi prompt yozadi
         ↓
  AIRouterService.detect_intent()
         ↓
   ┌─────┴──────────┬──────────┐
CHAT           ARCHITECT     REVISE
   │               │              │
Gemini        Gemini          Gemini
chat()    suhbat + spec     plan_revision()
                  ↓              ↓
          FINAL_SITE_SPEC   Claude
                  ↓         revise_site()
            Claude                ↓
        generate_from_spec()  yangilangan
                  ↓            schema
           JSON schema
                  ↓
        SiteRenderer (frontend)
        jonli sayt ko'rsatiladi
```

---

## Nano koin tizimi

| Amal | Narx |
|------|------|
| Oddiy sayt (1–3 sektsiya) | 3 000 nano |
| O'rta sayt (4–6 sektsiya) | 4 000 nano |
| Murakkab sayt (7+ sektsiya) | 5 000 nano |
| Revision — oddiy | 300 nano |
| Revision — o'rta | 400 nano |
| Revision — murakkab | 500 nano |
| Yangi foydalanuvchi bonusi | 3 000 nano |

---

## Section turlari

| Type | Ko'rinish |
|------|-----------|
| `hero` | Katta sarlavha + tavsif + CTA |
| `features` | 3 ustunli kartalar |
| `services` | Xizmatlar ro'yxati |
| `stats` | Raqamlar va ko'rsatkichlar |
| `pricing` | Tarif planlari |
| `contact` | Email · telefon · manzil |
| `about` | Kompaniya haqida |
| `testimonials` | Mijoz sharhlari |
| `gallery` | Rasm galereyasi |
| `team` | Jamoa a'zolari |
| `faq` | Ko'p so'raladigan savollar |
| `menu` | Taom/mahsulot menyusi |
| `cta` | Harakat chaqiruvi banneri |

---

## API endpointlari

### Auth (`/api/accounts/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/register/` | Ro'yxatdan o'tish |
| POST | `/login/` | JWT access + refresh |
| POST | `/token/refresh/` | Token yangilash |
| GET | `/me/` | Joriy foydalanuvchi |

### Loyihalar (`/api/projects/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/process_prompt/` | **Asosiy — streaming JSON** |
| POST | `/revise_inline/` | Guest revision |
| GET | `/{id}/download_zip/` | ZIP |

### Publik (`/public/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| GET | `/sites/<slug>/` | Publik schema (auth yo'q) |

---

## Muhim sahifalar (local)

| Sahifa | URL |
|--------|-----|
| Bosh sahifa | http://127.0.0.1:3000/uz |
| AI Builder | http://127.0.0.1:3000/uz/builder |
| Kirish | http://127.0.0.1:3000/uz/login |
| Admin panel | http://127.0.0.1:8000/17210707admin |
| Swagger | http://127.0.0.1:8000/api/docs |

---

## Tez-tez uchraydigan muammolar

| Muammo | Yechim |
|--------|--------|
| `No module named 'unfold'` | `venv/bin/python` ishlatish |
| `ECONNABORTED` timeout | `streamPost()` ishlatilgan — ko'rinmaydi endi |
| `502 Bad Gateway` | Claude/Gemini API kalit yoki quota |
| Sayt faqat qora/oq | `smartPalette()` ishlaydi — sayt nomini tekshiring |
| Nano koin kamaymaydi | `.env` da `TOKEN_LIMITS_DISABLED=False` ekanini tekshiring |
| Publik link login so'raydi | `PublicSiteView` ishlatilishi kerak (Guard emas) |

---

## Deployment (Render.com)

`render.yaml` — backend + frontend ikkalasi ham starter plan'da:

```bash
# Backend start command:
gunicorn config.wsgi:application \
  --bind 0.0.0.0:$PORT \
  --workers 2 --worker-class gthread --threads 4 \
  --timeout 300 --graceful-timeout 30

# Build:
./build.sh
```

---

*Muallif: Shohruhbek Temirov · NanoStUp · 2026*
