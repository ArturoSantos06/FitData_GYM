import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';
import app, { auth, storage } from '../firebase/config';

const sanitizarNombreArchivo = (value) => {
  return String(value || 'archivo')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
};

// Subir imagen
export const subirImagen = async (file, path) => {
  try {
    if (!file) {
      throw new Error('No se seleccionó ningún archivo');
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten archivos de imagen');
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error('La imagen es muy grande. Máximo 5MB');
    }

    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString()
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { success: true, url: downloadURL };
  } catch (error) {
    let errorMessage = error.message;

    if (error.code === 'storage/unauthorized') {
      errorMessage = 'No tienes permisos para subir imágenes. Verifica que seas admin.';
    } else if (error.code === 'storage/canceled') {
      errorMessage = 'La subida fue cancelada';
    } else if (error.code === 'storage/unknown') {
      errorMessage = 'Error desconocido. Verifica que Firebase Storage esté configurado.';
    }

    return { success: false, error: errorMessage };
  }
};

// Eliminar imagen
export const eliminarImagen = async (path) => {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Subir documento de dieta (PDF, JPG, PNG — max 10 MB)
export const subirDocumentoDieta = async (file, memberId) => {
  try {
    if (!file) throw new Error('No se seleccionó ningún archivo');
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) throw new Error('Solo se permiten PDF, JPG o PNG');
    if (file.size > 10 * 1024 * 1024) throw new Error('El archivo supera el límite de 10 MB');

    const safeName = sanitizarNombreArchivo(file.name);
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

const forzarDescargaBlob = (blob, fileName) => {
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

const obtenerUrlFuncionDescargaDieta = () => {
  const customUrl = String(import.meta.env.VITE_DOWNLOAD_DIET_FILE_URL || '').trim();
  if (customUrl) return customUrl;
  const envProjectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim();
  const appProjectId = String(app?.options?.projectId || '').trim();
  const projectId = envProjectId || appProjectId || 'fitdatagym-f347a';
  if (!projectId) return '';
  return `https://us-east1-${projectId}.cloudfunctions.net/downloadDietFile`;
};

const extraerRutaStorageDesdeUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const marker = '/o/';
    const idx = parsed.pathname.indexOf(marker);
    if (idx === -1) return '';
    const encodedPath = parsed.pathname.slice(idx + marker.length);
    return decodeURIComponent(encodedPath || '').replace(/^\/+/, '');
  } catch {
    return '';
  }
};

const extraerTokenDesdeUrl = (url) => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get('token') || '';
  } catch {
    return '';
  }
};

// Descargar documento de dieta
export const descargarDocumentoDieta = async (storagePath, fileName, fallbackUrl = '') => {
  try {
    const safeName = String(fileName || 'archivo').trim() || 'archivo';
    const explicitStoragePath = typeof storagePath === 'string' && !storagePath.trim().startsWith('http')
      ? storagePath.trim()
      : '';
    const inferredStoragePath = extraerRutaStorageDesdeUrl(fallbackUrl);
    const resolvedStoragePath = explicitStoragePath || inferredStoragePath;
    const urlToken = extraerTokenDesdeUrl(fallbackUrl);

    if (!resolvedStoragePath) {
      return {
        success: false,
        error: 'No se encontró la ruta del archivo para descargar.'
      };
    }

    const fnUrl = obtenerUrlFuncionDescargaDieta();
    if (!fnUrl) {
      return {
        success: false,
        error: 'No hay endpoint de descarga configurado para este proyecto.'
      };
    }

    try {
      const idToken = await auth.currentUser?.getIdToken?.();
      if (!idToken) {
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente para descargar.');
      }
      const requestUrl = `${fnUrl}?path=${encodeURIComponent(resolvedStoragePath)}&name=${encodeURIComponent(safeName)}${urlToken ? `&token=${encodeURIComponent(urlToken)}` : ''}`;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`
        }
      });
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
      forzarDescargaBlob(blob, safeName);
      return { success: true };
    } catch (fnError) {
      return {
        success: false,
        error: fnError?.message || 'No se pudo completar la descarga automática del archivo.'
      };
    }
  } catch (error) {
    const rawError = String(error?.message || error || 'Error desconocido');
    if (/failed to fetch/i.test(rawError)) {
      return {
        success: false,
        error: 'No se pudo conectar para descargar el archivo. Revisa tu conexión o vuelve a intentar en unos segundos.'
      };
    }
    return { success: false, error: rawError };
  }
};

// Subir imagen de producto
export const subirImagenProducto = async (file, productId) => {
  const path = `productos/${productId}/${file.name}`;
  return await subirImagen(file, path);
};

// Subir imagen de membresía
export const subirImagenMembresia = async (file, membershipTypeId) => {
  const path = `memberships/${membershipTypeId}/${file.name}`;
  return await subirImagen(file, path);
};

// Subir avatar de miembro
export const subirAvatarMiembro = async (file, memberId) => {
  const path = `avatars/${memberId}/${file.name}`;
  return await subirImagen(file, path);
};

// Subir adjuntos de rutina (PDF o imagen)
export const subirAdjuntoRutina = async (file, memberId, trainerUid) => {
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

    const safeName = sanitizarNombreArchivo(file.name);
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
