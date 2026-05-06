"""Template Schemas — instant 0-AI sayt generatsiyasi.

Foydalanuvchi shablon tanlasa, bu modul to'liq tayyor `schema_data` qaytaradi.
AI'ga umuman murojaat qilinmaydi — token tejamkor (cheap path).

Foydalanish:
    schema = build_schema_from_template(
        template_id="restaurant",
        business_name="Napoli Pizza",
        phone="+998 90 123 45 67",
        address="Toshkent, Amir Temur 1",
    )
    # → {"siteName": ..., "design": ..., "settings": ..., "pages": [...]}

Bu modulda 12 ta shablon to'liq tayyor — har birida 5-7 sahifa-section.
Frontend `SiteRenderer` to'g'ridan-to'g'ri render qiladi (AI generatsiya emas).
"""

from __future__ import annotations

import copy
import re
from typing import Any, Dict, List, Optional

# ─────────────────────────────────────────────────────────────────
# Shablon ma'lumotlari (12 ta industriya)
# ─────────────────────────────────────────────────────────────────
# Har shablon:
#   - design: niche/style/layout (SiteRenderer'ning "smart palette" trigger'lari)
#   - settings: rang palitra
#   - sections: list of (type, content) — content ichidagi {business_name},
#               {phone}, {address} placeholderlari runtime'da almashtiriladi.

TEMPLATES: Dict[str, Dict[str, Any]] = {

    # ── 1. Restoran ────────────────────────────────────────────────
    "restaurant": {
        "design": {"style": "luxury", "layoutPattern": "split-hero", "mood": "warm",
                   "niche": "restaurant"},
        "settings": {"primaryColor": "#7B3F00", "accentColor": "#D4AF37",
                     "bgColor": "#FFF8F0", "font": "Playfair Display"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Mazali ovqatlar — iliq muhitda",
                "description": "Eng yangi mahsulotlardan tayyorlangan an'anaviy va zamonaviy taomlar. Oilaviy kechalar uchun ideal joy.",
                "ctaText": "Stol bron qilish",
                "cta2Text": "Menyu",
                "badge": "Tashkentdagi #1 restoran",
            }},
            {"type": "menu", "content": {
                "title": "Bizning menyu",
                "subtitle": "Eng sevimli taomlarimizdan tanlang",
                "categories": [
                    {"name": "Asosiy taomlar", "items": [
                        {"name": "Plov", "price": "45 000 so'm", "description": "An'anaviy o'zbek plovi"},
                        {"name": "Manti", "price": "38 000 so'm", "description": "Qo'y go'shtidan tayyorlangan"},
                        {"name": "Lag'mon", "price": "35 000 so'm", "description": "Issiq qaymoqli sho'rvada"},
                    ]},
                    {"name": "Salatlar", "items": [
                        {"name": "Sezar", "price": "32 000 so'm", "description": "Klassik retsept"},
                        {"name": "Yangi sabzavot", "price": "25 000 so'm", "description": "Mavsumiy sabzavotlar"},
                    ]},
                ],
            }},
            {"type": "gallery", "content": {
                "title": "Galereya",
                "subtitle": "Iliq muhit va mazali taomlar",
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar nima deyishadi",
                "items": [
                    {"name": "Aziz Karimov", "role": "Doimiy mijoz", "quote": "Eng yaxshi plov shu yerda! Har juma keladi."},
                    {"name": "Madina Yusupova", "role": "Bloger", "quote": "Atmosfera ham, taomlar ham mukammal."},
                    {"name": "Bobur Toshev", "role": "Kichik tadbirkor", "quote": "Korporativ tushliklar uchun ideal joy."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Bog'lanish",
                "subtitle": "Bron qilish yoki savol uchun",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Har kuni 10:00 — 23:00",
            }},
        ],
    },

    # ── 2. Cafe ────────────────────────────────────────────────────
    "cafe": {
        "design": {"style": "minimal", "layoutPattern": "centered-hero", "mood": "cozy",
                   "niche": "cafe"},
        "settings": {"primaryColor": "#3E2723", "accentColor": "#A1887F",
                     "bgColor": "#FAF7F2", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Specialty kofe va shirinliklar",
                "description": "Har kuni yangi qovurilgan donalar, qo'lda tayyorlangan shirinliklar. Tinch joy — ish yoki uchrashuv uchun.",
                "ctaText": "Menyuni ko'rish",
                "badge": "☕ Premium kofe",
            }},
            {"type": "features", "content": {
                "title": "Nima taklif qilamiz",
                "items": [
                    {"icon": "☕", "title": "Specialty kofe", "description": "Eng yaxshi 100% arabica donalar"},
                    {"icon": "🥐", "title": "Yangi shirinliklar", "description": "Har kuni o'z pekarimizda pishiriladi"},
                    {"icon": "📚", "title": "Tinch muhit", "description": "Wi-Fi va ishlash uchun qulay zonalar"},
                    {"icon": "🌱", "title": "Eko mahsulotlar", "description": "Mahalliy fermerlardan"},
                ],
            }},
            {"type": "menu", "content": {
                "title": "Mashhur taomlarimiz",
                "categories": [
                    {"name": "Kofe", "items": [
                        {"name": "Espresso", "price": "18 000 so'm"},
                        {"name": "Cappuccino", "price": "25 000 so'm"},
                        {"name": "Flat White", "price": "28 000 so'm"},
                        {"name": "Latte", "price": "27 000 so'm"},
                    ]},
                    {"name": "Shirinliklar", "items": [
                        {"name": "Cheesecake", "price": "32 000 so'm"},
                        {"name": "Tiramisu", "price": "35 000 so'm"},
                        {"name": "Croissant", "price": "18 000 so'm"},
                    ]},
                ],
            }},
            {"type": "gallery", "content": {"title": "Bizning joyimiz"}},
            {"type": "contact", "content": {
                "title": "Bizni topish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Du-Ya: 08:00 — 22:00",
            }},
        ],
    },

    # ── 3. Klinika ─────────────────────────────────────────────────
    "clinic": {
        "design": {"style": "corporate", "layoutPattern": "split-hero", "mood": "trustworthy",
                   "niche": "medical"},
        "settings": {"primaryColor": "#1565C0", "accentColor": "#42A5F5",
                     "bgColor": "#FFFFFF", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Sog'liqingiz — bizning vazifamiz",
                "description": "Tajribali shifokorlar, zamonaviy uskunalar va individual yondashuv. Hayotingizni eng yaxshi mutaxassislarga ishoning.",
                "ctaText": "Qabulga yozilish",
                "cta2Text": "Xizmatlar",
                "badge": "✓ 15+ yillik tajriba",
                "stats": [
                    {"value": "10000+", "label": "Tinchligan bemor"},
                    {"value": "25+", "label": "Mutaxassislar"},
                    {"value": "15", "label": "Yillik tajriba"},
                ],
            }},
            {"type": "services", "content": {
                "title": "Xizmatlarimiz",
                "subtitle": "Sizga kerakli barcha tibbiy xizmatlar",
                "items": [
                    {"icon": "🩺", "title": "Terapevt", "description": "Umumiy ko'rik va konsultatsiya"},
                    {"icon": "🦷", "title": "Stomatologiya", "description": "Tish davolash va estetika"},
                    {"icon": "👶", "title": "Pediatriya", "description": "Bolalar shifokori"},
                    {"icon": "❤️", "title": "Kardiologiya", "description": "ECG, UZI va konsultatsiya"},
                    {"icon": "🧠", "title": "Nevropatologiya", "description": "Asab tizimi muammolari"},
                    {"icon": "🔬", "title": "Laboratoriya", "description": "Analizlar — tezkor natija"},
                ],
            }},
            {"type": "team", "content": {
                "title": "Bizning shifokorlarimiz",
                "subtitle": "Yuqori malakali mutaxassislar",
                "members": [
                    {"name": "Dr. Akmal Yusupov", "role": "Bosh shifokor", "bio": "20+ yil tajriba, terapevt"},
                    {"name": "Dr. Nodira Karimova", "role": "Pediatr", "bio": "Bolalar sog'lig'i mutaxassisi"},
                    {"name": "Dr. Bobur Toshmatov", "role": "Stomatolog", "bio": "Estetik stomatologiya"},
                ],
            }},
            {"type": "pricing", "content": {
                "title": "Xizmat narxlari",
                "tiers": [
                    {"name": "Konsultatsiya", "price": "150 000 so'm", "features": ["Shifokor ko'rigi", "Tashxis", "Tavsiyalar"]},
                    {"name": "Tibbiy ko'rik", "price": "450 000 so'm", "features": ["UZI tekshirish", "Qon tahlili", "EKG", "Yakuniy hulosa"], "highlighted": True},
                    {"name": "Yillik kuzatuv", "price": "2 500 000 so'm", "features": ["Cheklanmagan ko'rik", "Barcha analizlar", "24/7 maslahat"]},
                ],
            }},
            {"type": "faq", "content": {
                "title": "Tez-tez beriladigan savollar",
                "items": [
                    {"question": "Qabulga qanday yozilish mumkin?", "answer": "Telefon orqali yoki saytdan online yozilishingiz mumkin."},
                    {"question": "Sug'urta qabul qilinadimi?", "answer": "Ha, asosiy sug'urta kompaniyalari bilan ishlaymiz."},
                    {"question": "Bolalar qabuli necha yoshdan?", "answer": "Pediatrlarimiz 0 yoshdan 16 yoshgacha bolalarni qabul qiladi."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Qabulga yozilish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Har kuni 08:00 — 20:00",
            }},
        ],
    },

    # ── 4. Salon ───────────────────────────────────────────────────
    "beauty": {
        "design": {"style": "luxury", "layoutPattern": "image-first-hero", "mood": "elegant",
                   "niche": "beauty"},
        "settings": {"primaryColor": "#AD1457", "accentColor": "#F8BBD0",
                     "bgColor": "#FFF0F5", "font": "Playfair Display"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Go'zallik — bu san'at",
                "description": "Professional ustalar, premium mahsulotlar va sevib bajarilgan ish. Sizning go'zalligingizni ochib beramiz.",
                "ctaText": "Yozilish",
                "badge": "💅 Premium salon",
            }},
            {"type": "services", "content": {
                "title": "Xizmatlarimiz",
                "items": [
                    {"icon": "💇‍♀️", "title": "Soch parvarishi", "description": "Olov, bo'yash, styling"},
                    {"icon": "💅", "title": "Manikur va pedikur", "description": "Klassik, gel, dizayn"},
                    {"icon": "✨", "title": "Yuz parvarishi", "description": "Tozalash, niqob, massaj"},
                    {"icon": "👁️", "title": "Kosh va kiprik", "description": "Bo'yash, korreksiya, naroshchivanie"},
                    {"icon": "💄", "title": "Makiyaj", "description": "Kunlik, kechki, to'y"},
                    {"icon": "🌸", "title": "SPA", "description": "Tana parvarishi va massaj"},
                ],
            }},
            {"type": "pricing", "content": {
                "title": "Narxlar",
                "tiers": [
                    {"name": "Standart paket", "price": "350 000 so'm", "features": ["Soch yuvish va styling", "Klassik manikur", "Yuz tozalash"]},
                    {"name": "Premium paket", "price": "750 000 so'm", "features": ["Soch bo'yash + styling", "Gel manikur va pedikur", "Yuz parvarishi", "Bonus: massaj"], "highlighted": True},
                    {"name": "VIP paket", "price": "1 500 000 so'm", "features": ["To'liq parvarish", "Makiyaj", "SPA", "Shaxsiy kabinet"]},
                ],
            }},
            {"type": "team", "content": {
                "title": "Bizning ustalar",
                "members": [
                    {"name": "Madina", "role": "Bosh ustaxona", "bio": "10+ yil tajriba"},
                    {"name": "Dilfuza", "role": "Manikur ustasi", "bio": "Sertifikatli mutaxassis"},
                    {"name": "Sevara", "role": "Vizajist", "bio": "Hollywood texnikasi"},
                ],
            }},
            {"type": "gallery", "content": {"title": "Bizning ishlarimiz"}},
            {"type": "contact", "content": {
                "title": "Yozilish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Du-Sh: 09:00 — 21:00",
            }},
        ],
    },

    # ── 5. Internet do'kon ──────────────────────────────────────────
    "shop": {
        "design": {"style": "modern", "layoutPattern": "centered-hero", "mood": "bold",
                   "niche": "shop"},
        "settings": {"primaryColor": "#0F172A", "accentColor": "#F59E0B",
                     "bgColor": "#FFFFFF", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Sifatli mahsulotlar — yaxshi narxlarda",
                "description": "Ishonchli mahsulotlar, tezkor yetkazib berish va doimiy chegirmalar. Ehtiyojingizni ko'rib chiqing.",
                "ctaText": "Katalog",
                "cta2Text": "Aksiyalar",
                "badge": "🎁 Bepul yetkazib berish",
            }},
            {"type": "products", "content": {
                "title": "Mashhur mahsulotlar",
                "subtitle": "Mijozlar tanlovi",
                "items": [
                    {"name": "Mahsulot 1", "price": "299 000 so'm", "description": "Yuqori sifat, 12 oy kafolat"},
                    {"name": "Mahsulot 2", "price": "459 000 so'm", "description": "Mijozlar bahosi 4.8/5"},
                    {"name": "Mahsulot 3", "price": "189 000 so'm", "description": "Eng arzon narx"},
                    {"name": "Mahsulot 4", "price": "899 000 so'm", "description": "Premium liniya"},
                ],
            }},
            {"type": "features", "content": {
                "title": "Nima uchun bizni tanlash",
                "items": [
                    {"icon": "🚚", "title": "Tezkor yetkazib berish", "description": "Toshkentda 1 kunda"},
                    {"icon": "✅", "title": "Sifat kafolati", "description": "12 oy garantiya"},
                    {"icon": "💳", "title": "Qulay to'lov", "description": "Naqd, karta, online"},
                    {"icon": "📞", "title": "24/7 qo'llab-quvvatlash", "description": "Doimiy yordam"},
                ],
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar fikri",
                "items": [
                    {"name": "Sherzod", "role": "Mijoz", "quote": "Tezkor yetkazdilar, sifati a'lo!"},
                    {"name": "Nilufar", "role": "Mijoz", "quote": "Qadoqlash juda chiroyli — sovg'a uchun ideal."},
                    {"name": "Otabek", "role": "Mijoz", "quote": "Narxlar boshqalardan arzonroq, sifati esa baland."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Bog'lanish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Har kuni 09:00 — 21:00",
            }},
        ],
    },

    # ── 6. Portfolio ───────────────────────────────────────────────
    "portfolio": {
        "design": {"style": "dark", "layoutPattern": "premium-dark", "mood": "creative",
                   "niche": "portfolio"},
        "settings": {"primaryColor": "#0A0A0A", "accentColor": "#A855F7",
                     "bgColor": "#0F0F0F", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Dizayner & Kreator",
                "description": "Brendlarni yorqin va esda qoladigan qiladigan vizual yechimlar yarataman. UI/UX, brending, illustratsiya.",
                "ctaText": "Ishlarim",
                "cta2Text": "Bog'lanish",
                "badge": "💼 Mavjud loyiha uchun",
            }},
            {"type": "gallery", "content": {
                "title": "Tanlangan ishlar",
                "subtitle": "So'nggi loyihalar",
            }},
            {"type": "features", "content": {
                "title": "Xizmatlar",
                "items": [
                    {"icon": "🎨", "title": "Brand identity", "description": "Logo, color, tipografiya"},
                    {"icon": "📱", "title": "UI/UX dizayn", "description": "Web va mobile ilova"},
                    {"icon": "🖼️", "title": "Illustratsiya", "description": "Custom rasm va ikonkalar"},
                    {"icon": "📦", "title": "Qadoq dizayn", "description": "Mahsulot uchun"},
                ],
            }},
            {"type": "about", "content": {
                "title": "Men haqimda",
                "description": "5+ yil dizayn sohasida ishlayapman. 100+ brendlar bilan hamkorlik. Apple, Google va Awwwards ilhomidagi yondashuv.",
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar fikri",
                "items": [
                    {"name": "Aziza Bekova", "role": "CEO, Beksoft", "quote": "Loyiha uchun mukammal yondashuv. Tavsiya qilaman!"},
                    {"name": "Ravshan Ergashev", "role": "Marketing direktor", "quote": "Brendimiz 2 baravar yaxshi tanildi."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Loyiha boshlaymizmi?",
                "phone": "{phone}",
                "address": "{address}",
            }},
        ],
    },

    # ── 7. Agentlik ────────────────────────────────────────────────
    "agency": {
        "design": {"style": "bold-gradient", "layoutPattern": "gradient-modern", "mood": "bold",
                   "niche": "agency"},
        "settings": {"primaryColor": "#7C3AED", "accentColor": "#EC4899",
                     "bgColor": "#FFFFFF", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Brendingizni o'sishga olib chiqamiz",
                "description": "Strategiya, dizayn va marketing — bitta jamoada. 50+ muvaffaqiyatli loyiha tajribasi bilan.",
                "ctaText": "Loyiha boshlash",
                "cta2Text": "Keyslar",
                "badge": "🏆 2025 yil agentligi",
                "stats": [
                    {"value": "50+", "label": "Tugatilgan loyiha"},
                    {"value": "98%", "label": "Mijoz mamnuniyati"},
                    {"value": "12+", "label": "Sanoatlar"},
                ],
            }},
            {"type": "services", "content": {
                "title": "Xizmatlarimiz",
                "items": [
                    {"icon": "🎯", "title": "Strategiya", "description": "Marketing va brand strategy"},
                    {"icon": "🎨", "title": "Dizayn", "description": "Brand identity, web, mobile"},
                    {"icon": "📈", "title": "Digital marketing", "description": "SEO, SMM, kontekstli reklama"},
                    {"icon": "💻", "title": "Web ishlab chiqish", "description": "Custom sayt va ilovalar"},
                    {"icon": "📹", "title": "Video produksiya", "description": "Reklama, brending"},
                    {"icon": "📊", "title": "Tahlil va hisobot", "description": "Data-driven natijalar"},
                ],
            }},
            {"type": "stats", "content": {
                "title": "Raqamlarda biz",
                "items": [
                    {"value": "50+", "label": "Mijoz"},
                    {"value": "2M+", "label": "Erishgan auditoriya"},
                    {"value": "300%", "label": "O'rtacha ROI"},
                    {"value": "5", "label": "Yillik tajriba"},
                ],
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar fikri",
                "items": [
                    {"name": "Bobur Karimov", "role": "CEO, TechCorp", "quote": "Eng yaxshi sherik — natijalar 3 baravar oshdi."},
                    {"name": "Madina Rashidova", "role": "Marketing direktori", "quote": "Strategiya va ijro — mukammal."},
                ],
            }},
            {"type": "cta", "content": {
                "title": "Loyiha boshlashga tayyormisiz?",
                "subtitle": "Bepul konsultatsiya — 30 daqiqa",
                "ctaText": "Bog'lanish",
            }},
            {"type": "contact", "content": {
                "title": "Bog'lanish",
                "phone": "{phone}",
                "address": "{address}",
            }},
        ],
    },

    # ── 8. O'quv markaz ────────────────────────────────────────────
    "school": {
        "design": {"style": "modern", "layoutPattern": "split-hero", "mood": "friendly",
                   "niche": "education"},
        "settings": {"primaryColor": "#0EA5E9", "accentColor": "#10B981",
                     "bgColor": "#FFFFFF", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Ilmga yangi yo'l",
                "description": "Zamonaviy uslubda dars, tajribali o'qituvchilar va kichik guruhlar. Bilim — kelajakka kalit.",
                "ctaText": "Kursga yozilish",
                "cta2Text": "Kurslar",
                "badge": "🎓 5000+ bitiruvchi",
            }},
            {"type": "services", "content": {
                "title": "Bizning kurslar",
                "items": [
                    {"icon": "💻", "title": "IT kurslari", "description": "Web, mobile, data science"},
                    {"icon": "🌍", "title": "Chet tillari", "description": "Ingliz, rus, koreys"},
                    {"icon": "🧮", "title": "Matematika", "description": "Maktab va abituriyent"},
                    {"icon": "📚", "title": "Maktab tayyorlash", "description": "1-sinfga tayyorlov"},
                    {"icon": "🎨", "title": "Ijodiy kurslar", "description": "Rasm, musiqa, tanci"},
                    {"icon": "🎯", "title": "IELTS / SAT", "description": "Xalqaro imtihonlar"},
                ],
            }},
            {"type": "pricing", "content": {
                "title": "Narxlar",
                "tiers": [
                    {"name": "Standart", "price": "500 000 so'm/oy", "features": ["8 mashg'ulot", "Guruh formatda", "Materiallar bepul"]},
                    {"name": "Premium", "price": "900 000 so'm/oy", "features": ["12 mashg'ulot", "Mini guruh (5 kishi)", "Shaxsiy yondashuv", "Online qo'llab-quvvatlash"], "highlighted": True},
                    {"name": "VIP", "price": "1 800 000 so'm/oy", "features": ["Cheklanmagan", "1-on-1 darslar", "24/7 qo'llab-quvvatlash"]},
                ],
            }},
            {"type": "testimonials", "content": {
                "title": "Bitiruvchilar fikri",
                "items": [
                    {"name": "Dilshod", "role": "IT kursi bitiruvchisi", "quote": "Endi xalqaro kompaniyada ishlayapman!"},
                    {"name": "Nilufar", "role": "IELTS kursi", "quote": "8.0 ball oldim, universitetga kirdim."},
                    {"name": "Bobur", "role": "Matematika kursi", "quote": "Imtihonda 90% — barcha rahmat o'qituvchilarga."},
                ],
            }},
            {"type": "faq", "content": {
                "title": "Tez-tez beriladigan savollar",
                "items": [
                    {"question": "Sinov darsi bormi?", "answer": "Ha, har kursimizda bepul sinov darsi bor."},
                    {"question": "Sertifikat beriladi?", "answer": "Ha, bitiruvchilarga davlat namunasidagi sertifikat."},
                    {"question": "Online dars bormi?", "answer": "Ha, ko'pchilik kurslarimiz online ham mavjud."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Yozilish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Har kuni 08:00 — 20:00",
            }},
        ],
    },

    # ── 9. Fitnes ──────────────────────────────────────────────────
    "fitness": {
        "design": {"style": "dark", "layoutPattern": "bold-hero", "mood": "energetic",
                   "niche": "fitness"},
        "settings": {"primaryColor": "#0A0A0A", "accentColor": "#84CC16",
                     "bgColor": "#0A0A0A", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Kuch. Energiya. Natija.",
                "description": "Zamonaviy uskunalar, tajribali trenerlar va sizga moslashtirilgan dasturlar. Bugundan boshlang!",
                "ctaText": "Birinchi dars BEPUL",
                "cta2Text": "Mashg'ulotlar",
                "badge": "💪 #1 fitnes klubi",
            }},
            {"type": "services", "content": {
                "title": "Bizning mashg'ulotlar",
                "items": [
                    {"icon": "🏋️", "title": "Trenajer zal", "description": "200+ uskuna"},
                    {"icon": "🧘", "title": "Yoga", "description": "Hatha, vinyasa, ashtanga"},
                    {"icon": "🥊", "title": "Boks", "description": "Texnika va kondisiyon"},
                    {"icon": "🏃", "title": "Kardio zonalar", "description": "50+ qurilma"},
                    {"icon": "💃", "title": "Group fitness", "description": "Zumba, pilates, HIIT"},
                    {"icon": "🏊", "title": "Suzish basseyni", "description": "25 m, 4 yo'lka"},
                ],
            }},
            {"type": "pricing", "content": {
                "title": "A'zolik narxlari",
                "tiers": [
                    {"name": "Oylik", "price": "500 000 so'm", "features": ["Trenajer zal", "Group fitness", "Dush + raznachilnik"]},
                    {"name": "3 oylik", "price": "1 200 000 so'm", "features": ["Hammasi standart", "Bepul shaxsiy trener (1 dars)", "Suzish basseyni"], "highlighted": True},
                    {"name": "Yillik", "price": "3 500 000 so'm", "features": ["Cheklanmagan", "10 ta shaxsiy dars", "Diyetolog konsultatsiyasi", "Sport oziq-ovqati 20% chegirma"]},
                ],
            }},
            {"type": "team", "content": {
                "title": "Bizning trenerlarimiz",
                "members": [
                    {"name": "Akmal", "role": "Bosh trener", "bio": "10+ yil tajriba, IFBB Pro"},
                    {"name": "Madina", "role": "Yoga ustasi", "bio": "RYT-500 sertifikat"},
                    {"name": "Bobur", "role": "Boks trener", "bio": "Sport ustasi"},
                ],
            }},
            {"type": "gallery", "content": {"title": "Klubimiz"}},
            {"type": "contact", "content": {
                "title": "Bizga qo'shilish",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Har kuni 06:00 — 23:00",
            }},
        ],
    },

    # ── 10. Ko'chmas mulk ──────────────────────────────────────────
    "realestate": {
        "design": {"style": "minimal", "layoutPattern": "split-hero", "mood": "trustworthy",
                   "niche": "realestate"},
        "settings": {"primaryColor": "#1E3A8A", "accentColor": "#F97316",
                     "bgColor": "#FFFFFF", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Sizning yangi uyingiz — bu yerda",
                "description": "Toshkent va viloyatlarda eng yaxshi takliflar. Tekshirilgan ob'ektlar, shaffof shartnomalar.",
                "ctaText": "Ob'ektlar",
                "cta2Text": "Bog'lanish",
                "badge": "🏠 1500+ ob'ekt",
            }},
            {"type": "services", "content": {
                "title": "Xizmatlarimiz",
                "items": [
                    {"icon": "🏘️", "title": "Sotish", "description": "Kvartira, uy, tijorat"},
                    {"icon": "🔑", "title": "Ijara", "description": "Uzoq va qisqa muddatga"},
                    {"icon": "🏗️", "title": "Yangi qurilish", "description": "Eng yaxshi konstruktorlardan"},
                    {"icon": "📋", "title": "Yuridik xizmat", "description": "Shartnoma va ro'yxatdan o'tish"},
                ],
            }},
            {"type": "products", "content": {
                "title": "Joriy takliflar",
                "items": [
                    {"name": "2-xonali kvartira, Yunusobod", "price": "85 000 USD", "description": "65 m², yangi qurilish, repair"},
                    {"name": "3-xonali kvartira, Mirzo Ulug'bek", "price": "120 000 USD", "description": "85 m², 2 lift, panaroma"},
                    {"name": "Hovli, Qibray", "price": "65 000 USD", "description": "5 sotix, 2 qavatli"},
                    {"name": "Tijorat ofis, markaz", "price": "1 500 USD/oy", "description": "120 m², premium klassi"},
                ],
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar fikri",
                "items": [
                    {"name": "Sherzod K.", "role": "Mijoz", "quote": "Yaxshi xonadon topdik, hammasi shaffof."},
                    {"name": "Nilufar T.", "role": "Mijoz", "quote": "Tezkor va malakali yondashuv."},
                ],
            }},
            {"type": "contact", "content": {
                "title": "Konsultatsiya",
                "phone": "{phone}",
                "address": "{address}",
                "workingHours": "Du-Sh: 09:00 — 19:00",
            }},
        ],
    },

    # ── 11. SaaS / Startap ─────────────────────────────────────────
    "saas": {
        "design": {"style": "startup", "layoutPattern": "saas-landing", "mood": "innovative",
                   "niche": "saas"},
        "settings": {"primaryColor": "#6366F1", "accentColor": "#22D3EE",
                     "bgColor": "#0F172A", "font": "Inter"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Biznesingizni avtomatlashtiring",
                "description": "Bitta platformada barchasi: avtomatlashtirish, tahlil va integratsiyalar. 14 kun bepul sinov.",
                "ctaText": "Bepul boshlash",
                "cta2Text": "Demo ko'rish",
                "badge": "✨ Yangi: AI yordamchi",
                "stats": [
                    {"value": "10K+", "label": "Foydalanuvchi"},
                    {"value": "99.9%", "label": "Uptime"},
                    {"value": "150+", "label": "Integratsiya"},
                ],
            }},
            {"type": "features", "content": {
                "title": "Asosiy imkoniyatlar",
                "subtitle": "Sizga kerakli barcha vositalar",
                "items": [
                    {"icon": "⚡", "title": "Tezlik", "description": "Millisekundlarda javob"},
                    {"icon": "🔒", "title": "Xavfsizlik", "description": "SOC2 sertifikat, end-to-end shifrlash"},
                    {"icon": "🤖", "title": "AI avtomatlashtirish", "description": "Aqlli skript va trigger"},
                    {"icon": "📊", "title": "Tahlil", "description": "Real-time dashboard va hisobotlar"},
                    {"icon": "🔌", "title": "Integratsiyalar", "description": "Slack, Zapier, 150+ API"},
                    {"icon": "🌍", "title": "Global", "description": "10 tilda, 25 valyutada"},
                ],
            }},
            {"type": "pricing", "content": {
                "title": "Sodda narx — yashirin to'lovlarsiz",
                "subtitle": "Istalgan paytda bekor qilishingiz mumkin",
                "tiers": [
                    {"name": "Starter", "price": "$19/oy", "features": ["1 foydalanuvchi", "Asosiy imkoniyatlar", "Email qo'llab-quvvatlash"]},
                    {"name": "Pro", "price": "$49/oy", "features": ["5 foydalanuvchi", "Barcha imkoniyatlar", "Prioritet qo'llab-quvvatlash", "Custom integratsiyalar"], "highlighted": True},
                    {"name": "Enterprise", "price": "Bog'laning", "features": ["Cheklanmagan", "SLA 99.99%", "Shaxsiy menedjer", "On-premise variant"]},
                ],
            }},
            {"type": "testimonials", "content": {
                "title": "Mijozlar nima deyishadi",
                "items": [
                    {"name": "Sarah M.", "role": "CEO, TechFlow", "quote": "Vaqtimiz 60% tejaldi. Eng yaxshi sarmoya."},
                    {"name": "John K.", "role": "CTO, DataCo", "quote": "Integratsiyalar mukammal — 5 daqiqada ishga tushirdik."},
                    {"name": "Aida R.", "role": "Marketing, GrowthHub", "quote": "ROI 5x oshdi. Tavsiya qilaman!"},
                ],
            }},
            {"type": "faq", "content": {
                "title": "Tez-tez beriladigan savollar",
                "items": [
                    {"question": "Bepul sinov bormi?", "answer": "Ha, 14 kunlik to'liq imkoniyatlarga ega bepul sinov."},
                    {"question": "Karta talab qilinadimi?", "answer": "Yo'q, sinov uchun karta kerak emas."},
                    {"question": "Ma'lumotlarim xavfsizmi?", "answer": "Albatta. SOC2 sertifikatga egamiz va shifrlash standartlariga rioya qilamiz."},
                ],
            }},
            {"type": "cta", "content": {
                "title": "Bugun boshlang",
                "subtitle": "14 kun bepul. Karta talab qilinmaydi.",
                "ctaText": "Bepul akkaunt yaratish",
            }},
        ],
    },

    # ── 12. Blog / Magazin ─────────────────────────────────────────
    "blog": {
        "design": {"style": "editorial", "layoutPattern": "magazine-layout", "mood": "elegant",
                   "niche": "news"},
        "settings": {"primaryColor": "#1F2937", "accentColor": "#DC2626",
                     "bgColor": "#FFFFFF", "font": "Playfair Display"},
        "sections": [
            {"type": "hero", "content": {
                "title": "{business_name}",
                "subtitle": "Hikoyalar. Tahlillar. Inspiratsiya.",
                "description": "Eng dolzarb mavzular bo'yicha chuqur maqolalar va intervyular. Bilim va ilhom — har kuni.",
                "ctaText": "So'nggi maqolalar",
                "badge": "📰 Haftalik 50K+ o'quvchi",
            }},
            {"type": "blog", "content": {
                "title": "So'nggi maqolalar",
                "items": [
                    {"title": "2026 yilda raqamli marketingni o'zgartiradigan trendlar", "excerpt": "AI va personalizatsiya — yangi me'yor", "category": "Marketing", "date": "2026-05-01"},
                    {"title": "Startaplar uchun 10 ta muhim maslahat", "excerpt": "Investorlardan jonli tajriba", "category": "Biznes", "date": "2026-04-28"},
                    {"title": "Mahalliy brendning yutuqlari", "excerpt": "Toshkentdan global bozorlarga", "category": "Hikoya", "date": "2026-04-25"},
                    {"title": "Texnologiyaning kelajagi: 5 ta bashorat", "excerpt": "Mutaxassislar fikri", "category": "Texnologiya", "date": "2026-04-22"},
                ],
            }},
            {"type": "features", "content": {
                "title": "Asosiy bo'limlar",
                "items": [
                    {"icon": "💼", "title": "Biznes", "description": "Strategiya, marketing, financelar"},
                    {"icon": "💻", "title": "Texnologiya", "description": "AI, veb, mobil dunyosi"},
                    {"icon": "🌍", "title": "Hikoyalar", "description": "Insonlar va qiziqarli yo'llar"},
                    {"icon": "📚", "title": "Madaniyat", "description": "Kitoblar, kino, ijod"},
                ],
            }},
            {"type": "cta", "content": {
                "title": "Yangi maqolalardan habardor bo'ling",
                "subtitle": "Haftalik newsletter — eng yaxshilari pochtangizga",
                "ctaText": "Obuna bo'lish",
            }},
            {"type": "contact", "content": {
                "title": "Bog'lanish",
                "phone": "{phone}",
                "address": "{address}",
            }},
        ],
    },
}


# ─────────────────────────────────────────────────────────────────
# Schema builder
# ─────────────────────────────────────────────────────────────────


_PLACEHOLDER_RE = re.compile(r"\{(business_name|phone|address)\}")


def _substitute(value: Any, mapping: Dict[str, str]) -> Any:
    """{business_name} kabi placeholderlarni rekursiv almashtir."""
    if isinstance(value, str):
        return _PLACEHOLDER_RE.sub(lambda m: mapping.get(m.group(1), m.group(0)), value)
    if isinstance(value, list):
        return [_substitute(v, mapping) for v in value]
    if isinstance(value, dict):
        return {k: _substitute(v, mapping) for k, v in value.items()}
    return value


def list_template_ids() -> List[str]:
    return list(TEMPLATES.keys())


def build_schema_from_template(
    template_id: str,
    business_name: str,
    phone: Optional[str] = None,
    address: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """Tayyor schema'ni qaytaradi (AI chaqirilmaydi).

    Returns:
        SiteRenderer kuta oladigan format yoki noto'g'ri template_id bo'lsa None.
    """
    tpl = TEMPLATES.get(template_id)
    if not tpl:
        return None

    business_name = (business_name or "").strip() or "Mening saytim"
    phone = (phone or "").strip() or "+998 90 000 00 00"
    address = (address or "").strip() or "Toshkent shahri"

    mapping = {
        "business_name": business_name,
        "phone": phone,
        "address": address,
    }

    sections = _substitute(copy.deepcopy(tpl["sections"]), mapping)

    return {
        "siteName": business_name,
        "settings": copy.deepcopy(tpl["settings"]),
        "design": copy.deepcopy(tpl["design"]),
        "pages": [
            {
                "slug": "home",
                "title": "Home",
                "sections": sections,
            }
        ],
    }
