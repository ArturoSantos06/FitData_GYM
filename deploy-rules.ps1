# Script de Despliegue - Firebase Security Rules (Windows)
# Uso: .\deploy-rules.ps1

$rootPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sourceFirestoreRules = Join-Path $rootPath "firestore.rules"
$frontendFirestoreRules = Join-Path $rootPath "frontend\firestore.rules"

Write-Host "🚀 Desplegando Firebase Security Rules..." -ForegroundColor Cyan
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

# Sincronizar copia auxiliar del frontend
if (Test-Path $frontendFirestoreRules) {
    Write-Host "🔄 Sincronizando frontend/firestore.rules..." -ForegroundColor Cyan
    Copy-Item $sourceFirestoreRules $frontendFirestoreRules -Force
}

# Desplegar reglas
Write-Host "📝 Desplegando Firestore y Storage Rules..." -ForegroundColor Cyan
firebase deploy --only "firestore:rules,storage" --project fitdatagym-f347a

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ ¡Firebase Security Rules desplegadas exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Próximos pasos:" -ForegroundColor Cyan
    Write-Host "1. Espera 1-2 minutos para que las reglas se propaguen"
    Write-Host "2. Prueba el acceso desde la aplicación"
    Write-Host "3. Si algo falla, revisa la consola del navegador y Firebase Rules"
    Write-Host ""
    Write-Host "🎯 Para probar las reglas:" -ForegroundColor Yellow
    Write-Host "   - Abre: https://console.firebase.google.com"
    Write-Host "   - Proyecto: fitdatagym-f347a"
    Write-Host "   - Firestore > Rules o Storage > Rules"
} else {
    Write-Host ""
    Write-Host "❌ Error desplegando las reglas" -ForegroundColor Red
    exit 1
}
