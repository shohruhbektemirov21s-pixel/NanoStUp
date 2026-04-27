# NanoStUp — AI Website Builder: To'liq Loyiha Konteksti

> Bu fayl Windsurf Cascade AI uchun yozilgan — loyihaning hozirgi holati, arxitektura, API va barcha qilingan o'zgarishlar batafsil bayon qilingan.

---

## 1. LOYIHA HAQIDA

**Nomi:** NanoStUp — AI Website Builder (SaaS platforma)
**Maqsad:** Foydalanuvchi o'zbek tilida prompt yozadi → AI (Gemini arxitektor + Claude generator) professional veb-saytni JSON sxema sifatida yaratadi → `SiteRenderer` komponentida ko'rsatiladi → publik link orqali ulashish yoki ZIP yuklab olish mumkin.
**Muallif:** Shohruhbek Temirov (2026)
**Til:** UI — o'zbek / rus / ingliz (next-intl). AI javoblari — o'zbek tilida.
**Platforma:** Kali Linux (dev) · Render.com (prod)
**Prod URL:** `https://nanostup.uz` (frontend) · `https://nanostup-api.onrender.com` (backend)

---

## 2. TEXNOLOGIYALAR

### Backend
- **Django 6.0** + Django REST Framework 3.17
- **SimpleJWT** (access 60 daq, refresh 1 kun)
- **django-unfold** (zamonaviy admin UI)
- **drf-spectacular** (Swagger + ReDoc)
- **django-cors-headers**, **whitenoise**
- **anthropic** SDK — Claude (`claude-sonnet-4-6`), `max_tokens=15000`
- **google-genai** SDK — Gemini (`gemini-2.0-flash`) — Arxitektor uchun
- **psycopg2-binary** (PostgreSQL prod), **SQLite** (dev)
- Gunicorn: `--worker-class gthread --workers 2 --threads 4 --timeout 300`

### Frontend
- **Next.js 15** (App Router, Turbopack)
- **React 19** + **TypeScript 5**
- **Tailwind CSS 4** + **@radix-ui** + **framer-motion**
- **Zustand 5** — `authStore` (JWT + user + nano koin balans), `projectStore`
- **next-intl 4** (i18n: uz, ru, en)
- **axios** — oddiy API so'rovlar uchun (JWT interceptor bilan)
- **fetch + ReadableStream** — `process_prompt` uchun (streaming heartbeat)
- **lucide-react** (ikonlar)

### Deployment
- `render.yaml` — backend va frontend Render starter plan'da
- `BACKEND_INTERNAL_URL` — ichki server-to-server URL (Next.js SSR uchun)
- `NEXT_PUBLIC_API_URL` — brauzer uchun ommaviy API URL

---

## 3. SUBSCRIPTION & NANO KOIN TIZIMI

### Obuna (Subscription)
- Har bir tarif oylik limitlarga ega: `max_sites_per_month`, `max_active_sites`, va boshqa limitlar (`apps/subscriptions/models.py`).
- **Limit tekshiruvi:** Backend `can_create_site` usuli orqali joriy oydagi limitni tekshiradi.
- **Limit oshganda:** API javobi 402 HTTP status va `{limit_reached: true}` qaytaradi. Frontend maxsus modal/xabarnoma orqali ogohlantiradi va tarifni oshirishni taklif qiladi.
- **Oylik Reset:** `maybe_reset_period()` avtomatik "lazy" reset qiladi, shuningdek cron yoki scheduler uchun maxsus `reset_monthly_limits` buyrug'i yaratilgan.

### Nano Koin Narxlari (`apps/accounts/models.py`)
```python
COST_SIMPLE_NANO   = 3_000   # 1-3 sektsiyali sayt
COST_MEDIUM_NANO   = 4_000   # 4-6 sektsiyali sayt
COST_COMPLEX_NANO  = 5_000   # 7+ sektsiyali sayt
COST_REVISION_SIMPLE_NANO  = 300   # Oddiy o'zgartirish (rang, matn)
COST_REVISION_MEDIUM_NANO  = 400   # O'rta o'zgartirish (sektsiya qo'shish)
COST_REVISION_COMPLEX_NANO = 500   # Murakkab o'zgartirish (sahifa qo'shish)
TOKENS_PER_NANO_COIN = 10   # 1 nano koin = 10 token
DEFAULT_NANO_COINS = 3_000  # Yangi foydalanuvchi bonus
```

### To'lov oqimi
1. Foydalanuvchi prompt yozadi
2. Frontend **optimistik** nano koin kamaytiradi (3000 yangi sayt, 300 revision)
3. `process_prompt` → backend AI generatsiya qiladi → `_deduct_for_generation()` chaqiradi
4. Avval `conversation.chat_budget_nano` (bonus), keyin `user.tokens_balance` (obuna) kamayadi
5. Backend yangi balansni `data.balance` da qaytaradi → frontend sinxronlaydi
6. `TOKEN_LIMITS_DISABLED = False` — real balans tizimi ishlaydi

---

## 4. ASOSIY OQIM — `process_prompt` (streaming)

### So'rov
```
POST /api/projects/process_prompt/
Authorization: Bearer <JWT>
Content-Type: application/json

{ "prompt": "...", "language": "uz", "project_id": null, "history": [], "images": [] }
```

### Frontend — `streamPost()` funksiyasi (`builder/page.tsx`)
```typescript
async function streamPost<T>(url, body, signal): Promise<T> {
  const fetchResp = await fetch(apiUrl, { method:'POST', headers, body: JSON.stringify(body), signal });
  const reader = fetchResp.body.getReader();
  let accumulated = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    accumulated += decode(value);
  }
  return JSON.parse(accumulated.trim()) as T;
}
```

### Backend — `process_prompt` wrapper (`views.py`)
```python
@action(detail=False, methods=["post"])
def process_prompt(self, request):
    result_q = Queue()
    threading.Thread(target=lambda: result_q.put(_process_prompt_impl(request))).start()

    def _stream():
        while True:
            try:
                data = result_q.get(timeout=4)
                yield json.dumps(data).encode()
                return
            except Empty:
                yield b" "   # keep-alive heartbeat

    return StreamingHttpResponse(_stream(), content_type="application/json")
```

### Javob turlari
```json
// Sayt tayyor (DONE):
{
  "success": true, "phase": "DONE", "is_chat": false,
  "project": { "id": "uuid", "title": "...", "schema_data": { ... } },
  "balance": { "tokens": 70000, "nano_coins": 7000, "cost_nano": 4000, "deduction": {...} }
}

// Balans yetarli emas (402):
{ "success": false, "insufficient_tokens": true, "required_nano": 4000, "current_nano": 500 }

// Limit tugadi (402):
{ "success": false, "limit_reached": true, "max_sites_per_month": 5, "sites_created_this_month": 5, "has_subscription": true }
```

---

## 5. XAVFSIZLIK VA DOMAIN RESTRICTION

- **API Tekshiruv:** `apps/website_projects/views.py` da `verify_domain` endpoint yaratilgan bo'lib, domen ruxsat etilgan ro'yxatga kirish-kirmasligini tasdiqlaydi.
- **Export qilingan kod (ZIP):** `apps/exports/services.py` faylida barcha generatsiya qilingan `.html` fayllarning eng oxiriga JavaScript tekshiruv kodi avtomatik qo'shiladi (`_inject_domain_protection`).
- Script external (noqonuniy) domenlardan saytni ochishni bloklaydi va "Ruxsat etilmagan domen" xabarnomasi bilan asosiy platformaga `nanostup.uz` ga yo'naltiradi.
- **Platforma hostingi:** Saytlar faqat obuna mavjud bo'lganda (`project.is_active` orqali tekshiriladi) platformada publik holda ishlaydi. Obuna muddati tugasa, `public_site` ularni ko'rsatmaydi (410 yoki 403 qaytaradi).

---

## 6. JSON SCHEMA FORMATI

Claude quyidagi formatda JSON qaytaradi:
```json
{
  "siteName": "Napoli Pizza",
  "settings": {
    "primaryColor": "#e85d04",
    "accentColor":  "#f48c06",
    "bgColor":      "#fff8f0",
    "textColor":    "#1a0a00",
    "font":         "Poppins"
  },
  "pages": [
    {
      "slug": "home",
      "title": "Bosh sahifa",
      "sections": [ ... ]
    }
  ]
}
```

### Rang palitralari (auto-fallback `SiteRenderer.tsx` da)
- Restoran/cafe → `#e85d04` (to'q to'q sariq)
- Tech/SaaS → `#6366f1` (binafsha)
- va boshqalar (14 ta palitrа)

---

## 7. `SiteRenderer.tsx` — RESPONSIVE RENDERING

- `useColors(settings, siteName, sectionTypes)` — design token'larni hisoblaydi
- `smartPalette(siteName, sections)` — sayt nomiga qarab rang palitrası tanlaydi
- Har bir section type uchun alohida komponent (responsive, mobile-first)
- Navbar: desktop + mobile hamburger menyu

---

## 8. PUBLIK SAYT (`/s/[slug]`)

```
/[locale]/s/[slug]/page.tsx  (server component)
  ↓ fetchPublicSite(slug) — backend'dan schema olinadi (faol obuna bo'lishi shart)
  ↓ PublicSiteView.tsx  (client component — AUTH TALAB QILMAYDI)
      ↓ <SiteRenderer schema={...} />
```

---

## 9. FOYDALANUVCHI BALANS (FRONTEND)

### `authStore.ts` (Zustand + persist)
```typescript
interface User {
  tokens_balance: number;   // asosiy (token'da)
  nano_coins: number;       // = tokens_balance / 10
}

updateBalance(tokens, nanoCoins)     // serverdan sinxronlash
optimisticDeductNano(nanoAmount)     // yuborish tugmasi bosilganda darhol kamaytirish
```

---

## 10. FAYL TUZILMASI

```
sayt yaratish/
├── backend/
│   ├── apps/
│   │   ├── accounts/
│   │   ├── ai_generation/
│   │   ├── website_projects/
│   │   ├── subscriptions/      ← Obuna, Tarif va Limit boshqaruv modellari, views
│   │   └── exports/            ← Zip generator, _inject_domain_protection xavfsizligi
│   ├── config/settings/
│   └── requirements/base.txt
│
├── frontend/src/
│   ├── app/[locale]/
│   │   ├── builder/page.tsx     ← ASOSIY: chat + preview + limit va insufficient token holatlari
│   │   ├── s/[slug]/page.tsx    ← Publik sayt (server component)
│   ├── features/builder/
│   ├── shared/api/axios.ts
│   └── store/
│
├── render.yaml                  ← Render.com deployment (starter plan)
├── .env                         ← Kalitlar (gitignore)
└── PROJECT_CONTEXT.md           ← Bu fayl (gitignore)
```

---

## 11. API ENDPOINTLARI

### Auth (`/api/accounts/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/register/` | Ro'yxatdan o'tish (+3000 nano bonus) |
| POST | `/login/` | JWT access + refresh |

### Loyihalar (`/api/projects/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| POST | `/process_prompt/` | **Asosiy endpoint — streaming JSON** (Limit check shu yerda) |
| GET | `/{id}/download_zip/` | ZIP yuklab olish (Domain Check JS skripti yopishtiriladi) |

### Publik (`/public/`)
| Metod | URL | Vazifa |
|-------|-----|--------|
| GET | `/sites/<slug>/` | Publik sayt schema'si (auth yo'q, lekin sayt egasi obunasi valid tekshiriladi) |
| GET | `/verify-domain/` | JS Script tomondan domain validligini tekshiradigan API |

---

## 12. ISHGA TUSHIRISH (LOCAL DEV)

```bash
# Backend
cd "/home/kali/Рабочий стол/sayt yaratish/backend"
DJANGO_SETTINGS_MODULE=config.settings.development venv/bin/python manage.py runserver

# Frontend
cd "/home/kali/Рабочий стол/sayt yaratish/frontend"
npm run dev
```

---

## 13. HOZIRGI HOLAT (2026-04-25)

- ✅ Backend streaming heartbeat — timeout yo'q
- ✅ Claude `max_tokens=15000` — to'liq, mukammal saytlar
- ✅ Nano koin real-time kamaymasi (optimistik + server sinxronizatsiya)
- ✅ Rang palitralari — 14 ta biznes turi uchun avtomatik rang
- ✅ **Subscription limit check:** `process_prompt` obuna asosida limitlarni boshqaradi. Frontend 402 orqali xabar ko'rsatadi.
- ✅ **Obuna reset logikasi:** lazy holatida (`maybe_reset_period`) ishlaydi. Bundan tashqari cron/task uchun `reset_monthly_limits` buyrug'i joriy etildi.
- ✅ **Domain restriction:** ZIP qilingan fayllar external (ruxsat etilmagan) domenlarga qo'yilganda kod avtomatik ishlamay qoladi (`verify_domain` orqali tekshiriladi).
- ✅ Render starter plan — server uxlamaydi

---

## 14. AI UCHUN ESLATMALAR

1. **Fayl yo'li** `/home/kali/Рабочий стол/sayt yaratish/` — doim to'liq yo'l ishlat.
2. **process_prompt** endi `StreamingHttpResponse` qaytaradi. Limit xabarnomalari oqim tarzida (success=False bilan) keladi.
3. **Frontend** `streamPost()` `fetch` API ishlatadi.
4. **Exported HTML files** ZIP sifatida ko'chirib olinganda JavaScript injection yordamida Domain Lock ishlaydi. 
5. **Migratsiyalar** — model o'zgarsa: `venv/bin/python manage.py makemigrations && migrate`.
6. **TOKEN_LIMITS_DISABLED** = `False` — real to'lov va obuna tizimi ishlaydi.

---

*Oxirgi yangilanish: 2026-04-25*
*Muallif: Shohruhbek Temirov*
