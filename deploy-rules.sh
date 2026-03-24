#!/bin/bash

# Script de Despliegue - Firebase Security Rules
# Uso: ./deploy-rules.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_FIRESTORE_RULES="$SCRIPT_DIR/firebase.firestore.rules"
SOURCE_STORAGE_RULES="$SCRIPT_DIR/firebase.storage.rules"

echo "🚀 Desplegando Firebase Security Rules..."
echo ""

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado"
    echo "📦 Instalando Firebase CLI..."
    npm install -g firebase-tools
fi

# Verificar si estamos autenticados
echo "🔐 Verificando autenticación..."
if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ No estás autenticado en Firebase"
    echo "📝 Ejecuta: firebase login"
    exit 1
fi

echo "✅ Autenticación confirmada"
echo ""

if [ ! -f "$SOURCE_FIRESTORE_RULES" ]; then
    echo "❌ No se encontró firebase.firestore.rules"
    exit 1
fi

if [ ! -f "$SOURCE_STORAGE_RULES" ]; then
    echo "❌ No se encontró firebase.storage.rules"
    exit 1
fi

# Desplegar reglas
echo "📝 Desplegando Firestore y Storage Rules..."
firebase deploy --only firestore:rules,storage --project fitdatagym-f347a

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Firebase Security Rules desplegadas exitosamente!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Espera 1-2 minutos para que las reglas se propaguen"
    echo "2. Prueba el acceso desde la aplicación"
    echo "3. Si algo falla, revisa la consola del navegador y Firebase Rules"
    echo ""
    echo "🎯 Para probar las reglas:"
    echo "   - Abre: https://console.firebase.google.com"
    echo "   - Proyecto: fitdatagym-f347a"
    echo "   - Firestore > Rules o Storage > Rules"
else
    echo ""
    echo "❌ Error desplegando las reglas"
    exit 1
fi
