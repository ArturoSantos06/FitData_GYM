# Configuración de Cloudinary para Imágenes (Media Files)

## ¿Por qué Cloudinary?

- ✅ **Gratis**: 25 GB almacenamiento + 25 GB ancho de banda/mes
- ✅ **CDN global**: imágenes rápidas en todo el mundo
- ✅ **Setup en 5 minutos**: sin AWS, sin tarjeta de crédito
- ✅ **Drag & drop**: subir imágenes desde el dashboard

---

## Paso 1: Crear cuenta en Cloudinary

1. Ve a: https://cloudinary.com/users/register_free
2. Regístrate con tu correo (o Google/GitHub)
3. Al terminar, verás tu **Dashboard** con:
   - **Cloud Name**: (ejemplo: `dxyz123abc`)
   - **API Key**: (ejemplo: `123456789012345`)
   - **API Secret**: (haz clic en "Reveal" para verla)

---

## Paso 2: Configurar variables en Render

Ve a tu servicio en Render → **Environment** y agrega estas 3 variables:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name_aqui
CLOUDINARY_API_KEY=tu_api_key_aqui
CLOUDINARY_API_SECRET=tu_api_secret_aqui
```

**Importante**: Copia exactamente los valores del Dashboard de Cloudinary.

---

## Paso 3: Subir tus imágenes a Cloudinary

### Opción A: Dashboard (Drag & Drop) - LA MÁS FÁCIL ✅

1. Ve a tu Dashboard de Cloudinary
2. Clic en **Media Library** (menú izquierdo)
3. Clic en **Upload** → **Upload Files**
4. Arrastra tus carpetas:
   - `media/productos/` → sube todas las imágenes de productos
   - `media/memberships/` → sube todas las imágenes de membresías
5. Las imágenes se suben automáticamente

**Tip**: Mantén los nombres de archivo originales para que coincidan con la base de datos.

### Opción B: Script Python (si tienes muchas imágenes)

```bash
cd C:\Users\santo\Documents\FITDATA\gym
python
```

```python
import cloudinary
import cloudinary.uploader
import os

# Configurar con tus credenciales
cloudinary.config(
    cloud_name = "tu_cloud_name",
    api_key = "tu_api_key",
    api_secret = "tu_api_secret"
)

# Subir carpeta de productos
for filename in os.listdir('media/productos'):
    if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
        filepath = os.path.join('media/productos', filename)
        result = cloudinary.uploader.upload(filepath, folder="productos")
        print(f"✓ Subido: {filename} → {result['secure_url']}")

# Subir carpeta de membresías
for filename in os.listdir('media/memberships'):
    if filename.endswith(('.png', '.jpg', '.jpeg', '.webp')):
        filepath = os.path.join('media/memberships', filename)
        result = cloudinary.uploader.upload(filepath, folder="memberships")
        print(f"✓ Subido: {filename} → {result['secure_url']}")
```

---

## Paso 4: Redeploy en Render

1. **Commit y push**:

   ```powershell
   cd C:\Users\santo\Documents\FITDATA\gym
   git add .
   git commit -m "Configure Cloudinary for media storage"
   git push origin main
   ```

2. **En Render**: Haz clic en "Manual Deploy" → "Deploy latest commit"

3. **Espera el deploy** (verás "Your service is live 🎉")

---

## Paso 5: Verificar que funciona

1. Abre el frontend: https://fit-data-gym.vercel.app
2. Ve a **Punto de Venta** o **Inventario**
3. Las imágenes ahora deberían cargar desde Cloudinary:
   - URLs tipo: `https://res.cloudinary.com/tu_cloud_name/image/upload/...`
4. No más errores 500 en `/media/`

---

## Gestión de imágenes desde el Dashboard

- **Ver todas las imágenes**: Media Library
- **Subir nuevas**: Upload button
- **Organizar en carpetas**: productos, memberships, etc.
- **Borrar imágenes**: Click derecho → Delete
- **Copiar URL pública**: Click en imagen → Copy URL

---

## Costos

**Plan Free (suficiente para un gym):**

- 25 GB de almacenamiento
- 25 GB de ancho de banda/mes
- Transformaciones ilimitadas (resize, crop, optimización)
- CDN global incluido

**Si excedes el límite** (poco probable):

- Plan Plus: $89/año (100 GB storage + 100 GB bandwidth)

---

## Troubleshooting

**Imágenes no cargan (403)**:

- Verifica que las 3 variables de entorno estén en Render
- Confirma que hiciste redeploy tras agregarlas

**Las URLs son diferentes**:

- Cloudinary genera URLs propias tipo `https://res.cloudinary.com/...`
- Django automáticamente las usa cuando subes una imagen nueva

**Imágenes antiguas no aparecen**:

- Sube manualmente las imágenes existentes desde Media Library
- O ejecuta el script Python de arriba

**Error "cloudinary not installed"**:

- Asegúrate de haber hecho redeploy tras actualizar `requirements.txt`

---

## Ventajas adicionales de Cloudinary

- **Optimización automática**: convierte a WebP, comprime sin perder calidad
- **Transformaciones on-the-fly**: resize, crop, filtros (sin editar la original)
- **Backup automático**: tus imágenes están respaldadas
- **Analytics**: ve cuánto ancho de banda usas

---

## Alternativas

Si Cloudinary no te convence:

- **AWS S3**: Más configuración, pero profesional
- **Backblaze B2**: Más económico que S3
- **Render Persistent Disk**: Requiere plan pago en Render

---

¡Listo! Con Cloudinary ya no tendrás problemas con las imágenes en producción. 🎉
