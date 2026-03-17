import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { storage, auth } from "./config";

const DIET_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const DIET_MAX_FILE_SIZE = 10 * 1024 * 1024;

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

export const uploadDietDocument = async (file, memberId) => {
  try {
    if (!file) {
      throw new Error("No se seleccionó ningún archivo");
    }

    if (!DIET_ALLOWED_TYPES.includes(file.type)) {
      throw new Error("Solo se permiten archivos PDF, JPG o PNG");
    }

    if (file.size > DIET_MAX_FILE_SIZE) {
      throw new Error("El archivo es muy grande. Máximo 10MB");
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `dietas/${memberId}/${Date.now()}_${sanitizedName}`;
    const storageRef = ref(storage, path);
    const metadata = {
      contentType: file.type,
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        memberId: String(memberId)
      }
    };

    const snapshot = await uploadBytes(storageRef, file, metadata);
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      success: true,
      url: downloadURL,
      path,
      fileName: file.name,
      contentType: file.type,
      size: file.size
    };
  } catch (error) {
    let errorMessage = error.message;

    if (error.code === 'storage/unauthorized') {
      errorMessage = 'No tienes permisos para subir archivos al expediente';
    }

    return { success: false, error: errorMessage };
  }
};

export const downloadDietDocument = async (storagePath, fileName) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay sesión activa");

    const token = await user.getIdToken();
    const url = `https://us-east1-fitdatagym-f347a.cloudfunctions.net/downloadDietFile?path=${encodeURIComponent(storagePath)}&name=${encodeURIComponent(fileName || 'archivo')}`;

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `Error ${response.status}`);
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = fileName || 'archivo';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
