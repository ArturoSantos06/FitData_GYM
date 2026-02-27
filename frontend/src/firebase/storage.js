import { 
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject
} from "firebase/storage";
import { storage } from "./config";

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
