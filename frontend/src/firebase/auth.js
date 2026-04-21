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
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Firebase loginUser error:', error);
    return { success: false, error: error.message, code: error.code || null };
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

export const registerTrainerByAdmin = async (payload) => {
  try {
    const registerFn = httpsCallable(functions, 'registerTrainerByAdmin');
    const result = await registerFn(payload);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en registerTrainerByAdmin:', error);
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

export const deactivateTrainerByAdmin = async (payload) => {
  try {
    const sourcePayload = (payload && typeof payload === 'object')
      ? payload
      : { trainerUid: payload };
    const normalizedPayload = {
      ...sourcePayload,
      trainerUid: String(
        sourcePayload?.trainerUid ||
        sourcePayload?.trainerId ||
        sourcePayload?.uid ||
        sourcePayload?.authUid ||
        sourcePayload?.trainerEmail ||
        sourcePayload?.id ||
        ''
      ).trim(),
    };

    if (!normalizedPayload.trainerUid) {
      return { success: false, error: 'Falta el identificador del entrenador' };
    }

    const deactivateFn = httpsCallable(functions, 'deactivateTrainerByAdmin');
    const result = await deactivateFn(normalizedPayload);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en deactivateTrainerByAdmin:', error);
    const friendlyError =
      error?.details ||
      error?.message ||
      error?.customData?.message ||
      'No se pudo desactivar al entrenador';

    return {
      success: false,
      error: friendlyError,
      code: error?.code || null
    };
  }
};

export const reactivateTrainerByAdmin = async (payload) => {
  try {
    const sourcePayload = (payload && typeof payload === 'object')
      ? payload
      : { trainerUid: payload };
    const normalizedPayload = {
      ...sourcePayload,
      trainerUid: String(
        sourcePayload?.trainerUid ||
        sourcePayload?.trainerId ||
        sourcePayload?.uid ||
        sourcePayload?.authUid ||
        sourcePayload?.trainerEmail ||
        sourcePayload?.id ||
        ''
      ).trim(),
    };

    if (!normalizedPayload.trainerUid) {
      return { success: false, error: 'Falta el identificador del entrenador' };
    }

    const reactivateFn = httpsCallable(functions, 'reactivateTrainerByAdmin');
    const result = await reactivateFn(normalizedPayload);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en reactivateTrainerByAdmin:', error);
    const friendlyError =
      error?.details ||
      error?.message ||
      error?.customData?.message ||
      'No se pudo reactivar al entrenador';

    return {
      success: false,
      error: friendlyError,
      code: error?.code || null
    };
  }
};

export const ensureUserClaim = async () => {
  try {
    // Forzar refresh del token para que cualquier claim ya emitido entre en vigor.
    if (auth.currentUser?.getIdToken) {
      await auth.currentUser.getIdToken(true);
    }
    return { success: true };
  } catch (error) {
    console.error('Error en ensureUserClaim:', error);
    try {
      if (auth.currentUser?.getIdToken) {
        await auth.currentUser.getIdToken(true);
      }
    } catch (refreshError) {
      console.warn('No se pudo refrescar el token tras fallar ensureUserClaim:', refreshError);
    }
    return { success: false, error: error.message };
  }
};

export const updateSelfProfile = async (payload) => {
  try {
    const fn = httpsCallable(functions, 'updateSelfProfile');
    const result = await fn(payload);
    return { success: true, data: result.data };
  } catch (error) {
    console.error('Error en updateSelfProfile:', error);
    const friendlyError =
      error?.details ||
      error?.message ||
      error?.customData?.message ||
      'No se pudo actualizar el perfil';

    return {
      success: false,
      error: friendlyError,
      code: error?.code || null,
    };
  }
};

// Logout
export const logoutUser = async () => {
  try {
    await signOut(auth);
    localStorage.removeItem('firebaseUser');
    localStorage.removeItem('token');
    localStorage.removeItem('trainer_token');
    localStorage.removeItem('trainer_username');
    localStorage.removeItem('nutritionist_token');
    localStorage.removeItem('nutritionist_username');
    return { success: true };
  } catch (error) {
    localStorage.removeItem('firebaseUser');
    localStorage.removeItem('token');
    localStorage.removeItem('trainer_token');
    localStorage.removeItem('trainer_username');
    localStorage.removeItem('nutritionist_token');
    localStorage.removeItem('nutritionist_username');
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

export const registerNutriologoByAdmin = async (payload) => {
  try {
    const normalizedPayload = {
      ...payload,
      email: String(payload.email || '').trim().toLowerCase(),
      password: String(payload.password || ''),
      firstName: String(payload.firstName || '').trim(),
      lastName: String(payload.lastName || '').trim(),
      especialidad: String(payload.especialidad || '').trim(),
    };

    const registerV2Fn = httpsCallable(functions, 'registerNutriologoByAdminV2');
    const resultV2 = await registerV2Fn(normalizedPayload);
    return { success: true, data: resultV2.data };
  } catch (error) {
    console.error('Error en registerNutriologoByAdminV2:', error);
    const friendlyError =
      error?.details?.message ||
      error?.details ||
      error?.message ||
      error?.customData?.message ||
      'No se pudo completar el registro del nutriólogo';

    return {
      success: false,
      error: friendlyError,
      code: error?.code || null,
      raw: error,
    };
  }
};