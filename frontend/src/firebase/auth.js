import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "./config";

// Login con email y contraseña
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Registrar nuevo usuario 
export const registerUser = async (email, password, displayName) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar perfil con nombre
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    
    const newUser = userCredential.user;
    
    
    return { success: true, user: newUser };
  } catch (error) {
    return { success: false, error: error.message };
  }
};


export const createUserWithoutSessionChange = async (email, password, displayName) => {
  try {
    const createUserFn = httpsCallable(functions, 'createUserAccount');
    const result = await createUserFn({ email, password, displayName });
    
    return { 
      success: true, 
      user: { 
        uid: result.data.uid,
        email: result.data.email,
        displayName: displayName || null
      } 
    };
  } catch (error) {
    console.error('Error en createUserWithoutSessionChange:', error);
    return { success: false, error: error.message };
  }
};

export const registerClientByAdmin = async (payload) => {
  try {
    const registerFn = httpsCallable(functions, 'registerClientByAdmin');
    const result = await registerFn(payload);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en registerClientByAdmin:', error);
    const friendlyError =
      error?.details ||
      error?.message ||
      error?.customData?.message ||
      'No se pudo completar el registro';

    return {
      success: false,
      error: friendlyError,
      code: error?.code || null
    };
  }
};

export const updateClientEmailInAuth = async (newEmail, userId = null) => {
  try {
    const fn = httpsCallable(functions, 'updateClientEmail');
    const result = await fn({ newEmail, userId });
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en updateClientEmailInAuth:', error);
    return { success: false, error: error?.message || 'No se pudo actualizar el correo en autenticación' };
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Observar cambios en autenticación
export const onAuthChanged = (callback) => {
  return onAuthStateChanged(auth, callback);
};

// Obtener usuario actual
export const getCurrentUser = () => {
  return auth.currentUser;
};
