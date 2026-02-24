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
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return { success: true, url: downloadURL };
  } catch (error) {
    return { success: false, error: error.message };
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
