# 🚀 AI Website Builder (Gemini + DeepSeek)

Ushbu platforma sun'iy intellekt yordamida bir necha soniya ichida professional veb-saytlar yaratish va ularni aqlli tahrirlash imkonini beruvchi mukammal tizimdir.

## 📖 Loyiha haqida

Ushbu loyiha shunchaki sayt yaratuvchi emas, balki **Sun'iy Intellekt va Inson hamkorligi**ni yangi bosqichga olib chiquvchi ekotizimdir.

### 🎯 Maqsad
Loyihaning asosiy maqsadi — dasturlashdan xabari bo'lmagan tadbirkorlar va ijodkorlar uchun bir necha daqiqa ichida **ishga tushirishga tayyor (production-ready)** veb-saytlar taqdim etish. 

### 🧠 Nega Dual AI (Gemini + DeepSeek)?
Biz loyihada ikkita turli AI modelini birlashtirish orqali eng yuqori samaradorlikka erishdik:
*   **DeepSeek Chat**: Platformaning "miyasi". U foydalanuvchi bilan muloqot qiladi, uning niyatini (intent) tushunadi va murakkab bo'lmagan savollarga tezkor javob beradi. Bu xarajatni kamaytiradi va platformaning "jonli" bo'lishini ta'minlaydi.
*   **Google Gemini (Flash/Pro)**: Platformaning "ustasi". U murakkab mantiqiy tuzilmalarni, ranglar psixologiyasini va zamonaviy UI/UX tendensiyalarini biladi. U faqat sayt sxemasi va kodini generatsiya qilish bilan shug'ullanadi.

### 🔄 Iterativ Tahrirlash falsafasi
Ko'plab AI generatorlari bir marta sayt yaratadi va tamom. Bizning platforma esa **iterativ (bosqichma-bosqich)** ishlaydi. Siz yaratilgan saytni xuddi dasturchi bilan gaplashayotgandek tahrirlashingiz mumkin:
— "Hero qismini kattaroq qil"
— "Rasm qo'sh"
— "Ranglar biroz yumshoqroq bo'lsin"
AI mavjud sxemani buzmasdan, faqatgina o'sha qismlarni aqlli ravishda o'zgartiradi.

### 📂 Kod Sifati va Eksport
Yaratilgan har bir sayt **Tailwind CSS** va zamonaviy shriftlar bilan boyitilgan. "ZIP Eksport" funksiyasi orqali siz shunchaki rasm emas, balki haqiqiy, optimallashtirilgan kodni olasiz. Bu kodni istalgan hostingga joylab, darhol ishlatsa bo'ladi.

## ✨ Asosiy funksiyalar

*   **Dual AI Routing**:
    *   **DeepSeek**: Umumiy suhbatlar, tushuntirishlar va yordam uchun (Tez va arzon).
    *   **Google Gemini (Flash/Pro)**: Veb-sayt sxemasini generatsiya qilish va dizaynni tahrirlash uchun.
*   **Iterativ Tahrirlash**: Butun saytni qayta qurmasdan, faqat kerakli qismlarni (ranglar, sectionlar, matnlar) o'zgartirish.
*   **ZIP Eksport**: Yaratilgan saytni bir marta bosish orqali yuklab olish va VS Code-da ishga tushirish.
*   **Aqlli Preview**: Desktop va Mobile versiyalarda real vaqtda natijani ko'rish.
*   **Ko'p tillilik**: O'zbek, Rus va Ingliz tillaridagi murakkab so'rovlarni tushunish.

## 🛠 Texnologiyalar

*   **Backend**: Django, Django REST Framework (DRF)
*   **Frontend**: Next.js 14, Tailwind CSS, Framer Motion
*   **AI Dvigatellari**: Google Gemini API, DeepSeek API
*   **Ma'lumotlar bazasi**: SQLite (Dev) / PostgreSQL (Prod)

## 📦 O'rnatish va ishga tushirish

### 1. Backendni sozlash
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements/base.txt
python manage.py migrate
python manage.py runserver
```

### 2. Frontendni sozlash
```bash
cd frontend
npm install
npm run dev
```

### 3. .env sozlamalari
Loyihaning ildiz (root) papkasida `.env` faylini yarating va quyidagi kalitlarni kiriting:
```env
GOOGLE_GENERATIVE_AI_API_KEY=Sizning_Gmail_API_Kalitingiz
DEEPSEEK_API_KEY=Sizning_DeepSeek_Kalitingiz
SECRET_KEY=django-insecure-random-key
DEBUG=True
```

## 🚀 Ishlatish bo'yicha qo'llanma

1.  **AI bilan suhbat**: "Salom", "Sen nima qila olasan?" kabi savollar bering — bunda DeepSeek javob beradi.
2.  **Sayt yaratish**: "Manga restoran uchun zamonaviy sayt qurib ber" deb yozing — Gemini saytni generatsiya qiladi.
3.  **Tahrirlash**: "Sayt ranglarini ko'k qil" yoki "Hero sectiondagi rasmni o'zgartir" deb buyruq bering.
4.  **Yuklab olish**: Sayt tayyor bo'lgach, "Download ZIP" orqali loyihani oling.

## 👨‍💻 Muallif va Yordam

Loyiha bo'yicha yordam, hostingga joylash yoki takliflar bo'lsa bog'laning:

*   **Dasturchi**: Temirov Shoxruhbek
*   **Telegram**: [@shohruhbek_2102](https://t.me/shohruhbek_2102)
*   **Telefon**: +998501093514

---
© 2026 AI Website Builder. Barcha huquqlar himoyalangan.
