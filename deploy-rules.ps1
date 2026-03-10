# Script de Despliegue - Firestore Security Rules (Windows)
# Uso: .\deploy-rules.ps1

Write-Host "🚀 Desplegando Firestore Security Rules..." -ForegroundColor Cyan
Write-Host "" 

# Verificar si Firebase CLI está instalado
$firebaseCheck = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "📦 Instalando Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Verificar si estamos autenticados
Write-Host "🔐 Verificando autenticación..." -ForegroundColor Cyan
firebase projects:list *>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ No estás autenticado en Firebase" -ForegroundColor Red
    Write-Host "📝 Ejecuta: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Autenticación confirmada" -ForegroundColor Green
Write-Host "" 

# Desplegar reglas
Write-Host "📝 Desplegando Firestore Rules..." -ForegroundColor Cyan
firebase deploy --only firestore:rules --project fitdatagym-f347a

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡Firestore Security Rules desplegadas exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Espera 1-2 minutos para que las reglas se propaguen"
    Write-Host "2. Prueba el acceso desde la aplicación"
    Write-Host "3. Verifica los logs en Chrome DevTools (F12) Console"
    Write-Host ""
    Write-Host "🎯 Para probar las reglas:" -ForegroundColor Yellow
    Write-Host "   - Abre: https://console.firebase.google.com"
    Write-Host "   - Proyecto: fitdatagym-f347a"
    Write-Host "   - Firestore > Rules > Rules simulator"
} else {
    Write-Host ""
    Write-Host "❌ Error desplegando las reglas" -ForegroundColor Red
    exit 1
}
