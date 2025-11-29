"""
Django settings for gym project.
"""

from pathlib import Path
import os
import dj_database_url
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Cargar variables de entorno desde .env (solo en desarrollo)
load_dotenv(BASE_DIR / '.env')

# Detectar entorno
IS_RENDER = 'RENDER' in os.environ
IS_PRODUCTION = IS_RENDER or os.environ.get('ENVIRONMENT') == 'production'

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = 'django-insecure-_*o4hd8w_83i4di_k@5_%zg_==y3*&%0b8_bohf&iv$y^hv^8d'

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = not IS_PRODUCTION  # Si estamos en Render, Debug será False

ALLOWED_HOSTS = [
    'fitdata-api.onrender.com', 
    'localhost', 
    '127.0.0.1',
    '.onrender.com' # Comodín para Render
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Apps de terceros
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'django_vite',
    'cloudinary_storage',
    'cloudinary',

    # Tu app
    'gymapp',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'gym.cors_middleware.SimpleCorsMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware', 
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://pruebafitdatagym.netlify.app",
    "https://fit-data-gym.vercel.app", 
    "https://fitdata-api.onrender.com",
]

CORS_ALLOWED_ORIGINS = TRUSTED_ORIGINS
CSRF_TRUSTED_ORIGINS = TRUSTED_ORIGINS
CORS_ALLOW_CREDENTIALS = True

# Métodos y Headers permitidos
CORS_ALLOW_METHODS = ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']
CORS_ALLOW_HEADERS = ['accept', 'accept-encoding', 'authorization', 'content-type', 'dnt', 'origin', 'user-agent', 'x-csrftoken', 'x-requested-with']

ROOT_URLCONF = 'gym.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [ BASE_DIR / 'templates' ], 
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'gym.wsgi.application'

# --- BASE DE DATOS ---
# Si hay URL en el entorno (Render), usa PostgreSQL. Si no, usa tu SQL Server local.
if os.environ.get('DATABASE_URL'):
    DATABASES = {
        'default': dj_database_url.config(
            default=os.environ.get('DATABASE_URL'),
            conn_max_age=600,
            conn_health_checks=True,
        )
    }
else:
    # Configuración Local (SQL Server)
    DATABASES = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': 'FitDataDB',
            'HOST': r'(local)', 
            'USER': 'ArturoBD', 
            'PASSWORD': 'chichu2006', 
            'OPTIONS': {
                'driver': 'ODBC Driver 17 for SQL Server',
                'encrypt': 'yes',
                'trust_server_certificate': 'yes',
            },
        }
    }

# Validadores de Contraseña
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internacionalización
LANGUAGE_CODE = 'es-mx'
TIME_ZONE = 'America/Mexico_City'
USE_I18N = True
USE_TZ = True
DEFAULT_CHARSET = 'utf-8'

# --- ARCHIVOS ESTÁTICOS Y MEDIA ---
STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuración de WhiteNoise para servir archivos comprimidos
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# --- CONFIGURACIÓN DE MEDIA (Imágenes subidas) ---
if IS_PRODUCTION:
    # Producción: usar Cloudinary para archivos media
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
    
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
        api_key=os.environ.get('CLOUDINARY_API_KEY'),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET'),
        secure=True
    )
    
    DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'
    CLOUDINARY_STORAGE = {
        'CLOUD_NAME': os.environ.get('CLOUDINARY_CLOUD_NAME'),
        'API_KEY': os.environ.get('CLOUDINARY_API_KEY'),
        'API_SECRET': os.environ.get('CLOUDINARY_API_SECRET')
    }
else:
    # Desarrollo: usar almacenamiento local
    MEDIA_URL = '/media/'
    MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# --- CONFIGURACIÓN REST FRAMEWORK ---
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',  
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.AllowAny',
    ],
}

# --- CONFIGURACIÓN DE CORREO (GMAIL SMTP) ---
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True

# Credenciales del Gmail del proyecto
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', 'fitdatagym@gmail.com')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# Remitente del proyecto
DEFAULT_FROM_EMAIL = os.environ.get('DEFAULT_FROM_EMAIL', 'FitData GYM <fitdatagym@gmail.com>')

# Default primary key
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'