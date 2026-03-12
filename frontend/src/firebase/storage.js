import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { storage } from "./config";

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
    
    if (file.size > 5 * 1024 * 1024) { // 5MB límite
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
    
    // Mensajes descriptivos según el tipo de error
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
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        memberId: String(memberId || ''),
        trainerUid: String(trainerUid || ''),
      },
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const url = await getDownloadURL(snapshot.ref);

    return { success: true, url, path };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
