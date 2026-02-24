#!/bin/bash

# Script de Despliegue - Firestore Security Rules
# Uso: ./deploy-rules.sh

echo "🚀 Desplegando Firestore Security Rules..."
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

# Desplegar reglas
echo "📝 Desplegando Firestore Rules..."
firebase deploy --only firestore:rules --project fitdatagym-f347a

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Firestore Security Rules desplegadas exitosamente!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Espera 1-2 minutos para que las reglas se propaguen"
    echo "2. Prueba el acceso desde la aplicación"
    echo "3. Verifica los logs en Chrome DevTools (F12) Console"
    echo ""
    echo "🎯 Para probar las reglas:"
    echo "   - Abre: https://console.firebase.google.com"
    echo "   - Proyecto: fitdatagym-f347a"
    echo "   - Firestore > Rules > Rules simulator"
else
    echo ""
    echo "❌ Error desplegando las reglas"
    exit 1
fi
