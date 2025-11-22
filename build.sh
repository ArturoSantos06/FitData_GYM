#!/usr/bin/env bash
# Salir si hay error
set -o errexit

# 1. Construir el Frontend
echo "Construyendo Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Instalar dependencias Backend
echo "Instalando dependencias de Python..."
pip install -r requirements.txt

# 3. Recolectar estáticos
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --no-input

# 4. Migraciones
echo "Corriendo migraciones..."
python manage.py migrate

# 6. CREAR SUPERUSUARIO (DESPUÉS, solo si hace falta)
echo "Verificando superusuario..."
python create_superuser.py

# 7. CORRECCIONES
echo "Corrigiendo errores de texto..."
python fix_typos.py