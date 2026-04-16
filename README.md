# AI Website Builder (Production-Ready)

A premium SaaS platform that builds complete multi-page websites from text prompts using Gemini AI.

## Project Structure
- `backend/`: Django REST Framework API + Django Channels.
- `frontend/`: Next.js 14 App Router + Tailwind CSS.

## Features
- **AI Generation**: Two-step pipeline (Blueprint -> Full Schema).
- **Subscription**: Real-time tariff management.
- **Preview**: Live renderer for AI-generated designs.
- **Export**: Generate static site ZIP files.
- **Auth**: JWT based secure authentication.

## Getting Started

### Backend Setup
1. `cd backend`
2. `pip install -r requirements/base.txt`
3. Create `.env` file:
   ```env
   SECRET_KEY=yoursecret
   DEBUG=True
   GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
   DATABASE_URL=postgres://user:pass@localhost:5432/dbname
   REDIS_URL=redis://localhost:6379/1
   ```
4. `python manage.py migrate`
5. `python manage.py runserver`

### Frontend Setup
1. `cd frontend`
2. `npm install`
3. Create `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```
4. `npm run dev`

## Production Notes
- Use `gunicorn`/`uvicorn` for deployment.
- Configure `CORS_ALLOWED_ORIGINS` in production.
- Use a persistent Redis instance for Channels.
- Set up Celery for long-running AI generation tasks.
