# AI Website Builder – No-Code Generatsiya Platformasi 🚀

Ushbu loyiha istalgan oddiy matnli tasvirdan (yoki sheva orqali berilgan buyruqdan) to'liq ishlaydigan, zamonaviy va **ko'p sahifali veb-saytlarni** avtomatik yaratib beruvchi aqlli (AI-driven) platformadir. Fokus **tezlik**, **jonli ko'rib chiqish (Real-time Preview)** va tayyor saytni **ZIP formatida yuklab olishga** qaratilgan.

## 🌟 Asosiy Imkoniyatlar (Features)
- **Matndan Vebsaytga:** Foydalanuvchining oddiy izohini (Prompt) Google Gemini AI vositasida professional `WebsiteSchema` JSON obyektiga aylantirish.
- **Jonli Preview (Iframe):** Sayt yozilish jarayonidayoq uni ekranda ko'rish va ichki havolalar orqali saytning turli sahifalarida kezish (In-memory Hash Routing bilan ishlangan maxsus himoyalangan Iframe texnologiyasi).
- **Zaxira Tizimi (Fail-safe Fallback):** API limitlariga tushib qolganda (Rate Limits 429) yoki tarmoq xatolarida dastur qotib qolmasligi uchun himoyalangan avtomatik **Zaxira Layout (Fallback Schema)** yechimi. Saytingiz har qanday holatda ishlashdan to'xtamaydi!
- **Eksport:** Yaratilgan saytni **Next.js app** yoki sof statik **HTML/CSS/JS** formatida tayyor ZIP qilib skachat qilish imkoniyati.
- **Mukammal Arxitektura (FSD):** Clean Code standartlari asosida, modullarga (`features/`, `shared/`, `lib/`) ajratilgan holda o'sib borishga moslashuvchan ulanishlar.
- **To'lov & Bot SDK:** Tizim Telegram Mini-App (Grammy) orqali kirish hamda `Payme` tranzaksiyalari (cheklarni o'qish - OCR) bilan to'liq integratsiya qilingan.

## 🛠 Texnologik Stek

| Daraja        | Texnologiya / Frameworklar                                      |
|---------------|--------------------------------------------------|
| **Frontend**  | Next.js (App Router), React 18, Tailwind CSS, Framer Motion |
| **Backend**   | Next.js API Routes, Server Actions, TypeScript |
| **Ma'lumotlar**| Prisma ORM, PostgreSQL |
| **AI/LLM**    | Google Gemini (Model: `gemini-1.5-flash` yoki `2.0`), OpenAI/DeepSeek (sozlanishi mumkin) |
| **Holat (State)** | Zustand (Brauzerda vaqtinchalik xotira va komponentlararo aloqa) |
| **Xalqaro Til** | `next-intl` orqali 3 xil tilda (`uz`, `ru`, `en`) |
| **Integratsiya**| Grammy (Telegram API), Payme API (Billing & Receipts) |

## 🚀 Tezkor Boshlash (Qo'llanma)

1. Kompyuteringizda Node.js o'rnatilganini tekshiring (v20+ tavsiya etiladi).
2. Loyihani yuklab olgach, papkaga kiring va paketlarni o'rnating:
   ```bash
   npm install
   ```
3. Atrof-muhit o'zgaruvchilarini (`.env`) tayyorlang:
   ```bash
   cp .env.example .env
   ```
   `.env` da eng muhim kalitlarni ko'rsating:
   - `AI_PROVIDER=google`
   - `GOOGLE_GENERATIVE_AI_API_KEY=sizning_gemini_kalitingiz`
   - `DATABASE_URL=postgresql://user:password@localhost:5432/dbname`
   
4. Database ulanishini tayyorlang va ishga tushiring:
   ```bash
   npx prisma db push
   # Yoki agar migratsiya kerak bo'lsa:
   npx prisma migrate dev
   ```

5. Loyihani rivojlantirish (dev) rejimida yoqing:
   ```bash
   npm run dev:clean
   ```

Tizim `http://localhost:3001` portida ochiladi (Eslatma: port manzili `scripts/next-dev-port.mjs` da va `.env` faylida ko'rsatilishiga qarab farq qilishi mumkin).

## 🗂 Loyiha strukturasi qisqacha

* `/src/app/` – Barcha sahifalar, Server API routerlar (saytni render va generate qilish markazi) va Middlewarelar.
* `/src/features/` – Alog'ida mustaqil mantiqiy bo'limlar (`home`, `builder` paneli va b.). Bu yerda UI va kichik logika mujassam.
* `/src/lib/` – Saytning "miyasi". AI API ulanishlari, `WebsiteSchema` Zod validatsiyalari, Xatoliklarni boshqarish, To'lov (`map-ai-engine.ts`) skriptlari.
* `/src/shared/` – Umumiy saqlanuvchi doimiy kodlar, Zustand store hamda `Preview` kodi (`build-preview-srcdoc.ts`) kabi core fayllar.
* `/prisma/` – Barcha ma'lumotlar bazasi jadvallari, obunalar (`Subscription`, `WebUser`, `WebsiteProject`) strukturasi.

## 🔒 Xavfsizlik 
- Tizimda admin panel va maxsus generation panellari parol (auth session) orqali qo'riqlanadi. 
- API limitiga ehtiyotkorlik bilan `ZodError` zaxira tizimi qo'yilgan. Quota Error holatida ham xavfsiz (fallback) UI yuklanishiga kafolat berilgan.

## 👤 Bog'lanish (Muallif)
Shu loyiha integratsiyasi, uni kengaytirish yoki texnik savollar yuzasidan bevosita quyidagi kontaktlarga murojaat qilishingiz mumkin:

- **Dasturchi:** Shohruhbek
- **Telefon:** +998501093514
- **Telegram:** [@shohruhbek_2102](https://t.me/shohruhbek_2102)

---
*Loyiha Premium arxitekturada "Production Ready" hisoblanib yozilgan.*
