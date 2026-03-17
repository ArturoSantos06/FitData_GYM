import { 
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import app, { storage } from "./config";

const sanitizeFileName = (value) => {
  return String(value || 'archivo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
};

// Subir imagen
export const uploadImage = async (file, path) => {
  try {
    // Validaciones
    if (!file) {
      throw new Error("No se seleccionó ningún archivo");
    }
    
    if (!file.type.startsWith('image/')) {
      throw new Error("Solo se permiten archivos de imagen");
    }
    
    if (file.size > 5 * 1024 * 1024) { 
      throw new Error("La imagen es muy grande. Máximo 5MB");
    }
    
    console.log(`📤 Subiendo imagen: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
    console.log(`📍 Ruta: ${path}`);
    
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        'uploadedAt': new Date().toISOString()
      }
    };
    
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('✅ Imagen subida exitosamente');
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`🔗 URL generada: ${downloadURL.substring(0, 60)}...`);
    
    return { success: true, url: downloadURL };
  } catch (error) {
    console.error('❌ Error subiendo imagen:', error);
    
    let errorMessage = error.message;
    
    if (error.code === 'storage/unauthorized') {
      errorMessage = "No tienes permisos para subir imágenes. Verifica que seas admin.";
    } else if (error.code === 'storage/canceled') {
      errorMessage = "La subida fue cancelada";
    } else if (error.code === 'storage/unknown') {
      errorMessage = "Error desconocido. Verifica que Firebase Storage esté configurado.";
    }
    
    return { success: false, error: errorMessage };
  }
};

// Eliminar imagen
export const deleteImage = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir documento de dieta (PDF, JPG, PNG — max 10 MB)
export const uploadDietDocument = async (file, memberId) => {
  try {
    if (!file) throw new Error('No se seleccionó ningún archivo');
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) throw new Error('Solo se permiten PDF, JPG o PNG');
    if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el límite de 10 MB');

    const safeName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const path = `dietFiles/${memberId}/${timestamp}_${safeName}`;
    const metadata = {
      contentType: file.type,
      customMetadata: { uploadedAt: new Date().toISOString(), memberId: String(memberId || '') }
    };

    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snapshot.ref);
    return { success: true, url, path, fileName: safeName, contentType: file.type, size: file.size };
  } catch (error) {
    if (error?.code === 'storage/unauthorized') {
      return { success: false, error: 'Sin permisos de Storage. Verifica las reglas de almacenamiento.' };
    }
    return { success: false, error: error.message };
  }
};

const triggerBlobDownload = (blob, fileName) => {
  const safeName = String(fileName || 'archivo').replace(/[\r\n]/g, ' ').trim() || 'archivo';
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = safeName;
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(objectUrl);
};

const downloadFromDirectUrl = async (url, safeName) => {
  if (!url) {
    return { success: false, error: 'No hay URL disponible para descargar este archivo.' };
  }

  try {
    const response = await fetch(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error('No se pudo descargar el archivo desde su URL directa.');
    }
    const blob = await response.blob();
    triggerBlobDownload(blob, safeName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error?.message || 'No se pudo descargar automáticamente desde URL directa.' };
  }
};

const getDietDownloadFunctionUrl = () => {
  const customUrl = String(import.meta.env.VITE_DOWNLOAD_DIET_FILE_URL || '').trim();
  if (customUrl) return customUrl;
  const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  if (!projectId) return '';
  return `https://us-east1-${projectId}.cloudfunctions.net/downloadDietFile`;
};

const extractStoragePathFromUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/o\/([^/]+)$/);
    if (!match?.[1]) return '';
    return decodeURIComponent(match[1]);
  } catch {
    return '';
  }
};

const extractTokenFromUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('token') || '';
  } catch {
    return '';
  }
};

// Descargar documento de dieta 
export const downloadDietDocument = async (storagePath, fileName, fallbackUrl = '') => {
  try {
    const safeName = String(fileName || 'archivo').trim() || 'archivo';
    const explicitStoragePath = typeof storagePath === 'string' && !storagePath.trim().startsWith('http')
      ? storagePath.trim()
      : '';
    const inferredStoragePath = extractStoragePathFromUrl(fallbackUrl);
    const resolvedStoragePath = explicitStoragePath || inferredStoragePath;
    const urlToken = extractTokenFromUrl(fallbackUrl);

    const fnUrl = getDietDownloadFunctionUrl();
    if (fnUrl && resolvedStoragePath) {
      try {
        const requestUrl = `${fnUrl}?path=${encodeURIComponent(resolvedStoragePath)}&name=${encodeURIComponent(safeName)}${urlToken ? `&token=${encodeURIComponent(urlToken)}` : ''}`;
        const response = await fetch(requestUrl, { method: 'GET' });
        if (!response.ok) {
          let serverMessage = '';
          try {
            const payload = await response.json();
            serverMessage = payload?.error || '';
          } catch {
            serverMessage = '';
          }
          throw new Error(serverMessage || 'No se pudo descargar el archivo desde el servidor.');
        }

        const blob = await response.blob();
        triggerBlobDownload(blob, safeName);
        return { success: true };
      } catch (fnError) {
        const directResult = await downloadFromDirectUrl(fallbackUrl, safeName);
        if (directResult.success) {
          return { success: true };
        }

        return {
          success: false,
          error: fnError?.message || directResult.error || 'No se pudo completar la descarga automática del archivo.'
        };
      }
    }

    if (fallbackUrl) {
      return await downloadFromDirectUrl(fallbackUrl, safeName);
    }

    return { success: false, error: 'No se encontró la ruta segura para descargar este archivo.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir imagen de producto
export const uploadProductImage = async (file, productId) => {
  const path = `productos/${productId}/${file.name}`;
  return await uploadImage(file, path);
};

// Subir imagen de membresía
export const uploadMembershipImage = async (file, membershipTypeId) => {
  const path = `memberships/${membershipTypeId}/${file.name}`;
  return await uploadImage(file, path);
};

// Subir avatar de miembro
export const uploadMemberAvatar = async (file, memberId) => {
  const path = `avatars/${memberId}/${file.name}`;
  return await uploadImage(file, path);
};

// Subir adjuntos de rutina (PDF o imagen)
export const uploadRoutineAttachment = async (file, memberId, trainerUid) => {
  try {
    if (!file) {
      throw new Error('No se selecciono ningun archivo');
    }

    const isImage = file.type?.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) {
      throw new Error('Solo se permiten imagenes o PDF');
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new Error('El archivo es muy grande. Maximo 10MB');
    }

    const safeName = sanitizeFileName(file.name);
    const timestamp = Date.now();
    const path = `trainerRoutines/${memberId}/${timestamp}_${safeName}`;
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        memberId: String(memberId || ''),
        trainerUid: String(trainerUid || ''),
      },
    };

    const bucketFromEnv = String(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim();
    const bucketCandidates = [];
    if (bucketFromEnv) {
      bucketCandidates.push(bucketFromEnv);
      if (bucketFromEnv.endsWith('.firebasestorage.app')) {
        bucketCandidates.push(bucketFromEnv.replace('.firebasestorage.app', '.appspot.com'));
      } else if (bucketFromEnv.endsWith('.appspot.com')) {
        bucketCandidates.push(bucketFromEnv.replace('.appspot.com', '.firebasestorage.app'));
      }
    }

    const uniqueBuckets = [...new Set(bucketCandidates.filter(Boolean))];
    const storageInstances = [storage, ...uniqueBuckets.map((bucket) => getStorage(app, `gs://${bucket}`))];

    let lastError = null;
    for (const storageInstance of storageInstances) {
      try {
        const storageRef = ref(storageInstance, path);
        const snapshot = await uploadBytes(storageRef, file, metadata);
        const url = await getDownloadURL(snapshot.ref);
        return { success: true, url, path };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error('No se pudo subir el archivo al bucket de Storage.');
  } catch (error) {
    if (error?.code === 'storage/unauthorized') {
      return {
        success: false,
        code: 'storage/unauthorized',
        error: 'No hay permisos de Storage para adjuntar archivos. La rutina se guardara sin esos adjuntos.',
      };
    }

    return { success: false, code: error?.code || null, error: error.message };
  }
};
