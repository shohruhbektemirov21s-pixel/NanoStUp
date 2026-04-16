from .base import *

DEBUG = True

ALLOWED_HOSTS = ["*"]

# In development, we use sqlite if DATABASE_URL is not provided
# but base.py already handles that via env.db() and default
