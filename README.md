# 🏋️‍♂️ FitData-GYM

> **Descripción:** FitData GYM es un sistema web integral diseñado para transformar la administración de gimnasios que buscan dejar atrás el papel y el caos operativo. Nuestra solución centraliza la gestión de socios, automatiza el control de membresías y agiliza el acceso en recepción, eliminando las pérdidas financieras por falta de seguimiento. Con FitData GYM, convertimos datos dispersos en información útil, permitiendo a los dueños recuperar el control de su negocio y mejorar la experiencia de sus clientes desde el primer día.

---

## 👥 Equipo

- Arturo Santos López
- Leonardo Castillo Paredes
- Agustín Byron Hernández Escamilla
- Joely Balam Reyes
- William Escamilla Cervante

---

## 💻 Stack Tecnológico

### Fase 1 
| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Django + Django REST Framework |
| Base de Datos | SQL Server (desarrollo) / PostgreSQL (producción) |

### 🚀 Fase 2 
| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Firebase (Cloud Functions) |
| Base de Datos | Firestore |

---

## 🖥️ Visualizar el proyecto en local

### Requisitos previos

Asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) v18 o superior
- npm (incluido con Node.js)
- Una cuenta de [Firebase](https://firebase.google.com/) con un proyecto creado

---

### 1. Clonar el repositorio

```bash
git clone https://github.com/<tu-usuario>/FitData-GYM.git
cd FitData-GYM
```

---

### 2. Configurar variables de entorno del Frontend

Dentro de la carpeta `frontend/`, crea un archivo llamado **`.env`** con las credenciales del proyecto Firebase:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
VITE_FIREBASE_MEASUREMENT_ID=tu_measurement_id
```

---

### 3. Instalar dependencias del Frontend

```bash
cd frontend
npm install
```

---

### 4. Ejecutar en modo desarrollo

```bash
npm run dev
```

---

### 5. Instalar y ejecutar Cloud Functions localmente

```bash
cd ../functions
npm install
```


