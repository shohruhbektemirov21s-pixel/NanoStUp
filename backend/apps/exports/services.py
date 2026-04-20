import io
import zipfile
import json
from apps.website_projects.models import WebsiteProject

class ExportService:
    @staticmethod
    def generate_static_zip(project: WebsiteProject) -> io.BytesIO:
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # 1. Main HTML
            index_html = f"""
<!DOCTYPE html>
<html lang="{project.language}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{project.title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap" rel="stylesheet">
    <style>body {{ font-family: 'Outfit', sans-serif; }}</style>
</head>
<body class="bg-gray-50">
    <div id="root">
        <!-- AI Generated Content Placeholder -->
        <h1 class="text-6xl font-black text-center mt-32 text-zinc-900">{project.title}</h1>
        <p class="text-center text-zinc-500 mt-6 text-xl">Ushbu sayt AI Builder tomonidan muvaffaqiyatli yaratildi.</p>
        <div class="mt-20 max-w-4xl mx-auto p-10 bg-white rounded-[3rem] shadow-2xl border border-zinc-100">
             <h2 class="text-2xl font-bold mb-4">Loyiha haqida:</h2>
             <pre class="bg-zinc-50 p-6 rounded-2xl overflow-auto text-sm text-zinc-600">{json.dumps(project.schema_data, indent=2)}</pre>
        </div>
    </div>
</body>
</html>
"""
            zip_file.writestr('index.html', index_html.strip())
            
            # 2. README.md (Uzbek instructions)
            readme = f"""
# {project.title} - AI Generated Website

Ushbu loyiha AI Website Builder platformasi orqali avtomatik ravishda yaratildi.

## Loyihani ishga tushirish (VS Code):
1. Ushbu ZIP faylni biror papkaga extract qiling (oching).
2. VS Code dasturini oching va ushbu papkani tanlang.
3. `index.html` faylini brauzerda oching (yoki Live Server kengaytmasidan foydalaning).

## Dasturchi yordami kerakmi?
Agar sizga ushbu loyihani yanada mukammallashitirish, hostingga joylash yoki domen ulash bo'yicha yordam kerak bo'lsa, loyiha muallifi bilan bog'lanishingiz mumkin:

- **Telegram:** @shohruhbek_2102
- **Telefon:** +998501093514

---
*Yaratilgan sana: {project.created_at.strftime('%Y-%m-%d %H:%M')}*
"""
            zip_file.writestr('README.md', readme.strip())
            
            # 3. Schema JSON
            zip_file.writestr('schema_data.json', json.dumps(project.schema_data, indent=2))
        
        buffer.seek(0)
        return buffer
