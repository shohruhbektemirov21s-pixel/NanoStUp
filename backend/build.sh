#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Installing dependencies..."
pip install -r requirements.txt

echo "Running migrations..."
python manage.py migrate --noinput
python manage.py migrate accounts --noinput
python manage.py showmigrations accounts

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "✅ Build tugadi!"
