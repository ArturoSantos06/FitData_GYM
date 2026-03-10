#!/usr/bin/env bash
# Salir si hay error
set -o errexit

# 1. Frontend
echo "Construyendo Frontend..."
cd frontend
npm install
npm run build
cd ..

# 2. Backend
echo "Instalando dependencias..."
pip install -r fase1/requirements.txt

# 3. Estáticos
echo "Recolectando estáticos..."
python fase1/manage.py collectstatic --no-input

# 4. Migraciones 
echo "Corriendo migraciones..."
python fase1/manage.py migrate

# 5. CARGAR TUS DATOS 
echo "Cargando respaldo de datos..."
python fase1/manage.py loaddata fase1/datos_gym.json
