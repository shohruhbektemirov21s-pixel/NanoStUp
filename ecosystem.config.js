// PM2 ecosystem — NanoStUp AI
// Ishlatish: pm2 start ecosystem.config.js
// To'xtatish: pm2 stop all
// Holat: pm2 status
// Loglar: pm2 logs

const ROOT = __dirname;

module.exports = {
  apps: [
    // ── Frontend (Next.js) ──────────────────────────────
    {
      name: 'nanostup-frontend',
      cwd: `${ROOT}/frontend`,
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8000/api',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: `${ROOT}/logs/frontend-err.log`,
      out_file: `${ROOT}/logs/frontend-out.log`,
    },

    // ── Backend (Django / Gunicorn) ─────────────────────
    {
      name: 'nanostup-backend',
      cwd: `${ROOT}/backend`,
      script: 'venv/bin/gunicorn',
      args: 'config.wsgi:application --bind 127.0.0.1:8000 --workers 2 --timeout 120',
      interpreter: 'none',
      env: {
        DJANGO_SETTINGS_MODULE: 'config.settings.development',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: `${ROOT}/logs/backend-err.log`,
      out_file: `${ROOT}/logs/backend-out.log`,
    },
  ],
};
