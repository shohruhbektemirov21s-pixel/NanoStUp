# AI Website Builder

**Maqsad:** foydalanuvchi oddiy tilda (yoki sheva) biznesini tasvirlaydi — ilova **Gemini** yordamida ko‘p sahifali sayt sxemasini (JSON), **real-time preview** va **ZIP eksport** beradi. Next.js 14 (App Router), Tailwind CSS, Prisma/PostgreSQL, Telegram mini-app integratsiyasi qo‘llab-quvvatlanadi.

## Texnologik stek

| Katlam        | Texnologiya                                      |
|---------------|--------------------------------------------------|
| Frontend      | Next.js 14, React 18, Tailwind CSS, Framer Motion |
| AI            | Google Gemini (`GOOGLE_GENERATIVE_AI_API_KEY`), model: **gemini-2.0-flash** (`.env`) |
| Validatsiya   | Zod                                              |
| Ma’lumotlar   | Prisma + PostgreSQL                            |
| Holat         | Zustand (brauzer token hamyoni)                 |
| Til           | next-intl (`uz`, `ru`, `en`)                   |

## Tezkor boshlash

1. **Node.js** 20+ va **npm** o‘rnating.
2. [Visual Studio Code](https://code.visualstudio.com/) — tavsiya etilgan muharrir.
3. Loyiha papkasida:

```bash
npm install
cp .env.example .env
```

`.env` ichida kamida quyidagilarni to‘ldiring:

- `AI_PROVIDER=google`
- `GOOGLE_GENERATIVE_AI_API_KEY` — sizning [Google AI Studio](https://aistudio.google.com/) / Gemini kalitingiz
- `GOOGLE_GENERATIVE_AI_MODEL=gemini-2.0-flash` (standart)
- `DATABASE_URL` — PostgreSQL ulanishi
- `BUILDER_PASSWORD` va `BUILDER_SESSION_SECRET` — **sayt generatsiyasi** uchun majburiy kirish
- `ADMIN_PASSWORD` va `ADMIN_SESSION_SECRET` — `/uz/admin` paneli uchun

Keyin:

```bash
npx prisma migrate dev
npm run dev
```

Brauzerda ilova odatda `http://localhost:3000` (yoki `scripts/next-dev-port.mjs` chiqargan port). Avval **`/[locale]/builder-login`** sahifasidan kirish kerak — aks holda `/api/website/*` chaqiruvlari **401** qaytaradi.

## Loyiha skriptlari

| Buyruq           | Tavsif                    |
|------------------|---------------------------|
| `npm run dev`    | Development server        |
| `npm run build`  | Production build          |
| `npm run start`  | Production server         |
| `npm run test`   | Vitest testlari           |
| `npm run lint`   | ESLint                    |

## Serverga joylash

### Vercel

- Repozitoriyani Vercelga ulang.
- **Environment variables** ni Vercel Dashboard orqali `.env` dagi kabi kiriting (`DATABASE_URL`, Gemini kalitlari, `BUILDER_*`, `ADMIN_*`).
- Build: `npm run build`, Start: `npm run start` (yoki Vercel default).

### Docker (qisqa)

- `Dockerfile` loyihada bo‘lmasa, standart Node image asosida multi-stage build qiling: `node:20-alpine`, `npm ci`, `npm run build`, `npm run start`.
- `DATABASE_URL` konteyner ichidagi Postgres yoki managed xizmatga ishora qilishi kerak.

Batafsil ZIP va statik hosting bo‘yicha ilova ichidagi **Deployment** bo‘limi va ZIP ichidagi `README.md`dan foydalaning.

## Xavfsizlik eslatmalari

- **Admin** tugmasi navbar’da ko‘rinmaydi; panel: `/{locale}/admin` + `ADMIN_PASSWORD`.
- **AI generatsiyasi** faqat **builder sessiyasi** (`BUILDER_PASSWORD` orqali) yoki **admin sessiyasi** bilan.
- Lokal test uchun `.env`da `ALLOW_AI_WITHOUT_LOGIN=true` (faqat dev) — ishlab chiqarishda **o‘chiring**.

## Dasturchi bilan bog‘lanish

- Telefon: **+998501093514**
- Telegram: **[@shohruhbek_2102](https://t.me/shohruhbek_2102)**

---

© Loyiha: AI Website Builder. Huquqlar va integratsiya bo‘yicha yuqoridagi kontaktlardan foydalaning.
