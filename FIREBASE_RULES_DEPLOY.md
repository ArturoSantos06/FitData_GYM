# Deploy de Reglas Firebase (fix definitivo trainerRoutines)

## 1) Reglas incluidas en este repo

- `firebase.firestore.rules`
- `firebase.storage.rules`
- `firebase.json`

Estas reglas corrigen los `permission-denied` para:

- Guardar rutinas en `trainerRoutines`
- Subir adjuntos PDF/imagen en `trainerRoutines/{memberId}/{archivo}`
- Leer rutinas y adjuntos para entrenador, admin y cliente dueño

## 2) Publicar reglas (una vez)

Desde la raiz del proyecto:

```powershell
npm install -g firebase-tools
firebase login
firebase use fitdatagym-f347a
firebase deploy --only firestore:rules,storage
```

## 3) Si usas Firebase Console (sin CLI)

- Firestore Database -> Rules: pega `firebase.firestore.rules`
- Storage -> Rules: pega `firebase.storage.rules`
- Publica ambos

## 4) Validacion

1. Cierra sesion y vuelve a iniciar como entrenador.
2. Guarda una rutina con PDF.
3. Debe guardar en Firestore y subir el archivo sin `permission-denied`.

## 5) Nota de claims

Las reglas aceptan cualquiera de estos claims:

- `trainer == true`
- `role == 'ENTRENADOR'`
- `role == 'TRAINER'`
- admin (`admin == true` o `role == 'ADMIN'`)
