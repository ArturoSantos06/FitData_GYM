import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./config";

const getLocalMXDate = () => {
  // Store absolute current timestamp; presentation layer applies Mexico timezone.
  return Timestamp.now();
};

const getLocalMXDateISO = () => {
  return new Date().toISOString();
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const TRAINER_PAYMENTS_COLLECTION = "pagos_entrenadores";

const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

const TRAINER_SERVICE_TYPE_PERSONAL = 'PERSONAL';
const TRAINER_SERVICE_TYPE_GROUP = 'GRUPAL';

const normalizeTrainerServiceType = (value) => {
  const raw = normalizeText(value);
  if (!raw) return '';
  if (raw.includes('grupal') || raw.includes('group') || raw.includes('grupo')) {
    return TRAINER_SERVICE_TYPE_GROUP;
  }
  if (raw.includes('personal') || raw.includes('individual') || raw.includes('uno a uno') || raw.includes('1 a 1')) {
    return TRAINER_SERVICE_TYPE_PERSONAL;
  }
  if (raw === TRAINER_SERVICE_TYPE_GROUP.toLowerCase()) {
    return TRAINER_SERVICE_TYPE_GROUP;
  }
  if (raw === TRAINER_SERVICE_TYPE_PERSONAL.toLowerCase()) {
    return TRAINER_SERVICE_TYPE_PERSONAL;
  }
  return '';
};

const getTrainerServiceSettings = (trainerData = {}) => {
  const legacyPrice = Number(
    trainerData.personalServicePrice ??
    trainerData.groupServicePrice ??
    trainerData.trainerServicePrice ??
    trainerData.servicePrice ??
    trainerData.costoServicio ??
    trainerData.costo_servicio ??
    0
  );

  const serviceOptions = trainerData.serviceOptions || trainerData.service_options || trainerData.serviceTypes || trainerData.service_types || {};
  const personalPrice = Number(
    trainerData.personalServicePrice ??
    trainerData.personal_service_price ??
    serviceOptions.personalPrice ??
    serviceOptions.personal_price ??
    legacyPrice
  );
  const groupPrice = Number(
    trainerData.groupServicePrice ??
    trainerData.group_service_price ??
    serviceOptions.groupPrice ??
    serviceOptions.group_price ??
    legacyPrice
  );

  const offersPersonal = trainerData.offersPersonalService ?? trainerData.personalServiceEnabled ?? serviceOptions.personal ?? serviceOptions.PERSONAL;
  const offersGroup = trainerData.offersGroupService ?? trainerData.groupServiceEnabled ?? serviceOptions.group ?? serviceOptions.GRUPAL;

  return {
    offersPersonal: offersPersonal === undefined ? legacyPrice > 0 : Boolean(offersPersonal),
    offersGroup: offersGroup === undefined ? legacyPrice > 0 : Boolean(offersGroup),
    personalPrice: Number.isFinite(personalPrice) && personalPrice > 0 ? personalPrice : 0,
    groupPrice: Number.isFinite(groupPrice) && groupPrice > 0 ? groupPrice : 0,
  };
};

const getAuthenticatedUserId = () => auth.currentUser?.uid || null;

const isPermissionDeniedError = (error) => {
  const raw = String(error?.message || error || '');
  const code = String(error?.code || '');
  return /insufficient permissions|permission-denied/i.test(raw) || /permission-denied/i.test(code);
};

const isNotFoundError = (error) => {
  const raw = String(error?.message || error || '');
  const code = String(error?.code || '');
  return /not-found|no document to update/i.test(raw) || /not-found/i.test(code);
};

const normalizeFirestoreError = (error) => {
  const raw = String(error?.message || error || 'Error desconocido');
  if (isPermissionDeniedError(error)) {
    return 'No hay permisos suficientes para completar esta operacion en Firestore.';
  }
  return raw;
};

export const waitForAuthReady = (timeoutMs = 3500) =>
  new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    let settled = false;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(user || null);
    });

    const timeoutId = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      resolve(auth.currentUser || null);
    }, timeoutMs);
  });

const withAuthRetry = async (operation, maxAttempts = 4) => {
  await waitForAuthReady();

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      if (auth.currentUser?.getIdToken) {
        await auth.currentUser.getIdToken(true);
      }
      return await operation();
    } catch (error) {
      lastError = error;
      const isPermissionError = isPermissionDeniedError(error);
      if (!isPermissionError || !auth.currentUser || attempt === maxAttempts) {
        throw error;
      }

      await auth.currentUser.getIdToken(true);
      await delay(800 * attempt);
      await waitForAuthReady(1500 + attempt * 300);
    }
  }

  throw lastError;
};

// CATALOGO GLOBAL — ejercisedb.dev v1 (gratis, sin clave)
// Los 1500 ejercicios se cargan una vez y se cachean en memoria
// CATALOGO GLOBAL — ejercisedb.dev v1 (gratis, sin clave)
// Cache para búsqueda por texto
let _exCache = null;
let _exCachePromise = null;

const _delay = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE_URL = 'https://exercisedb.dev/api/v1/exercises?limit=100&offset=';
const FALLBACK_EXERCISES_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';

const buildFallbackImageUrl = (imagePath) => {
  if (!imagePath) return null;
  return encodeURI(`https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${imagePath}`);
};

const inferBodyPartsFromFallback = (ex = {}) => {
  const parts = new Set();
  const muscles = [
    ...(Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : []),
    ...(Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : []),
  ].map(normalizeText);

  if (normalizeText(ex.category) === 'cardio') parts.add('cardio');
  if (muscles.some((m) => ['pectorals', 'chest'].includes(m))) parts.add('chest');
  if (muscles.some((m) => ['lats', 'traps', 'middle back', 'lower back', 'back', 'spine'].includes(m))) parts.add('back');
  if (muscles.some((m) => ['shoulders', 'delts', 'deltoids'].includes(m))) parts.add('shoulders');
  if (muscles.some((m) => ['biceps', 'triceps', 'upper arms'].includes(m))) parts.add('upper arms');
  if (muscles.some((m) => ['forearms', 'brachialis', 'wrist flexors', 'wrist extensors', 'lower arms'].includes(m))) parts.add('lower arms');
  if (muscles.some((m) => ['glutes', 'hamstrings', 'quadriceps', 'quads', 'adductors', 'abductors', 'upper legs'].includes(m))) parts.add('upper legs');
  if (muscles.some((m) => ['calves', 'gastrocnemius', 'soleus', 'lower legs'].includes(m))) parts.add('lower legs');
  if (muscles.some((m) => ['abdominals', 'abs', 'obliques', 'waist'].includes(m))) parts.add('waist');

  if (parts.size === 0) {
    const fallback = normalizeText(ex.primaryMuscles?.[0] || ex.category || 'general');
    parts.add(fallback);
  }

  return Array.from(parts);
};

const loadAllExercises = () => {
  if (_exCache) return Promise.resolve(_exCache);
  if (_exCachePromise) return _exCachePromise;
  // 5 lotes de 3 páginas con 400ms entre lotes para evitar rate limiting
  _exCachePromise = (async () => {
    const all = [];
    for (let batch = 0; batch < 5; batch++) {
      if (batch > 0) await _delay(400);
      const offsets = [batch * 300, batch * 300 + 100, batch * 300 + 200].filter((o) => o < 1500);
      const pages = await Promise.all(
        offsets.map((offset) =>
          fetch(`${BASE_URL}${offset}`)
            .then((r) => (r.ok ? r.json() : { data: [] }))
            .then((j) => (Array.isArray(j?.data) ? j.data : []))
            .catch(() => [])
        )
      );
      pages.forEach((p) => all.push(...p));
    }

    // Fallback: el endpoint principal puede estar temporalmente caído.
    if (all.length === 0) {
      const fallbackResp = await fetch(FALLBACK_EXERCISES_URL);
      const fallbackJson = await fallbackResp.json();
      const fallbackExercises = Array.isArray(fallbackJson)
        ? fallbackJson.map((ex) => {
            const inferredBodyParts = inferBodyPartsFromFallback(ex);
            return {
              exerciseId: ex.id || '',
              id: ex.id || '',
              name: ex.name || '',
              bodyPart: inferredBodyParts[0] || ex.primaryMuscles?.[0] || ex.category || '',
              bodyParts: inferredBodyParts,
              target: ex.primaryMuscles?.[0] || '',
              targetMuscles: Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles : [],
              secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
              equipment: ex.equipment || '',
              equipments: ex.equipment ? [ex.equipment] : [],
              gifUrl: buildFallbackImageUrl(Array.isArray(ex.images) ? ex.images[0] : null),
              instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
            };
          })
        : [];
      all.push(...fallbackExercises);
    }

    _exCache = all;
    return _exCache;
  })();
  return _exCachePromise;
};

const mapExercise = (ex) => ({
  id: ex.exerciseId || ex.id || '',
  name: ex.name || '',
  nameLower: normalizeText(ex.name),
  movementPattern:
    (Array.isArray(ex.bodyParts) ? ex.bodyParts[0] : ex.bodyPart) ||
    (Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : ex.primaryMuscles) ||
    '',
  primaryMuscle:
    (Array.isArray(ex.targetMuscles) ? ex.targetMuscles[0] : ex.target) ||
    (Array.isArray(ex.primaryMuscles) ? ex.primaryMuscles[0] : ex.primaryMuscles) ||
    '',
  secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  tags: Array.isArray(ex.equipments)
    ? ex.equipments
    : (ex.equipment ? [ex.equipment] : []),
  gifUrl: ex.gifUrl || ex.gif || buildFallbackImageUrl(Array.isArray(ex.images) ? ex.images[0] : null) || null,
  instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
});

export const searchExerciseCatalog = async ({ text = '', bodyPart = '', movementPattern = '', limitCount = 8 } = {}) => {
  try {
    const bp = bodyPart || movementPattern;
    const normalizedText = normalizeText(text);
    const safeLimit = Math.max(1, Math.min(Number(limitCount) || 8, 100));

    const all = await loadAllExercises();

    const filtered = all
      .filter((ex) => {
        const bpMatch = !bp || (Array.isArray(ex.bodyParts) ? ex.bodyParts : [ex.bodyPart || ''])
          .some((b) => normalizeText(b) === normalizeText(bp));
        const nameMatch = !normalizedText || normalizeText(ex.name).includes(normalizedText);
        return bpMatch && nameMatch;
      })
      .slice(0, safeLimit)
      .map(mapExercise);

    return { success: true, data: filtered };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// USUARIOS
export const createUser = async (uid, userData) => {
  try {
    await setDoc(doc(db, "users", uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUser = async (uid) => {
  try {
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      const userData = docSnap.data();
      return {
        success: true,
        data: {
          ...userData,
          legacyId: userData.id ?? null,
          id: docSnap.id,
        },
      };
    }
    return { success: false, error: "Usuario no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email, preferredAuthUid = null) => {
  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return { success: false, error: "Usuario no encontrado" };
    }

    const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const preferredUid = String(preferredAuthUid || auth.currentUser?.uid || '').trim();

      const sortedDocs = [...querySnapshot.docs].sort((a, b) => {
        const aData = a.data() || {};
        const bData = b.data() || {};

        const aAuthMatch = preferredUid && String(aData.authUid || '') === preferredUid ? 1 : 0;
        const bAuthMatch = preferredUid && String(bData.authUid || '') === preferredUid ? 1 : 0;
        if (aAuthMatch !== bAuthMatch) return bAuthMatch - aAuthMatch;

        const aRoleTrainer = String(aData.role || '').toLowerCase() === 'trainer' ? 1 : 0;
        const bRoleTrainer = String(bData.role || '').toLowerCase() === 'trainer' ? 1 : 0;
        if (aRoleTrainer !== bRoleTrainer) return bRoleTrainer - aRoleTrainer;

        const aHasContract = aData.contractType || aData.tipoContrato || aData.contract_type ? 1 : 0;
        const bHasContract = bData.contractType || bData.tipoContrato || bData.contract_type ? 1 : 0;
        if (aHasContract !== bHasContract) return bHasContract - aHasContract;

        return 0;
      });

      const docSnap = sortedDocs[0];
      const userData = docSnap.data();
      return {
        success: true,
        data: {
          ...userData,
          legacyId: userData.id ?? null,
          id: docSnap.id,
        },
      };
    }

    const originalEmail = String(email || '').trim();
    if (originalEmail && originalEmail !== normalizedEmail) {
      const qOriginal = query(collection(db, "users"), where("email", "==", originalEmail));
      const querySnapshotOriginal = await getDocs(qOriginal);
      if (!querySnapshotOriginal.empty) {
        const docSnap = querySnapshotOriginal.docs[0];
        const userData = docSnap.data();
        return {
          success: true,
          data: {
            ...userData,
            legacyId: userData.id ?? null,
            id: docSnap.id,
          },
        };
      }
    }

    return { success: false, error: "Usuario no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserByAuthUid = async (authUid) => {
  try {
    const q = query(collection(db, "users"), where("authUid", "==", authUid), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const userData = docSnap.data();
      return {
        success: true,
        data: {
          ...userData,
          legacyId: userData.id ?? null,
          id: docSnap.id,
        },
      };
    }
    return { success: false, error: "Usuario no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUser = async (uid, userData) => {
  try {
    const payload = {
      ...userData,
      updatedAt: serverTimestamp()
    };

    const candidateDocIds = Array.from(new Set([
      String(uid || '').trim(),
      String(auth.currentUser?.uid || '').trim(),
    ].filter(Boolean)));

    const updatedDocIds = new Set();

    for (const docId of candidateDocIds) {
      try {
        await updateDoc(doc(db, "users", docId), payload);
        updatedDocIds.add(docId);
      } catch (err) {
        if (!isPermissionDeniedError(err) && !isNotFoundError(err)) {
          throw err;
        }
      }
    }

    const currentAuthUid = String(auth.currentUser?.uid || '').trim();
    const currentEmail = String(auth.currentUser?.email || '').trim().toLowerCase();

    const fallbackQueries = [];
    if (currentAuthUid) {
      fallbackQueries.push(query(collection(db, "users"), where("authUid", "==", currentAuthUid)));
    }
    if (currentEmail) {
      fallbackQueries.push(query(collection(db, "users"), where("email", "==", currentEmail)));
    }

    for (const q of fallbackQueries) {
      try {
        const snap = await getDocs(q);
        if (snap.empty) continue;
        for (const docSnap of snap.docs) {
          await updateDoc(doc(db, "users", docSnap.id), payload);
          updatedDocIds.add(docSnap.id);
        }
      } catch (err) {
        if (!isPermissionDeniedError(err) && !isNotFoundError(err)) {
          throw err;
        }
      }
    }

    if (updatedDocIds.size > 0) {
      return { success: true, updatedIds: Array.from(updatedDocIds) };
    }

    return { success: false, error: 'Missing or insufficient permissions.' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map(doc => {
      const userData = doc.data();
      return {
        ...userData,
        legacyId: userData.id ?? null,
        id: doc.id,
      };
    });
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// MIEMBROS
export const getMembers = async () => {
  try {
    const querySnapshot = await withAuthRetry(() => getDocs(collection(db, "miembros")));
    const members = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: members };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

// Alias para compatibilidad
export const getAllMembers = getMembers;

export const getMemberByUserId = async (userId) => {
  try {
    const candidates = [userId];
    const numericId = Number(userId);
    if (!Number.isNaN(numericId)) candidates.push(numericId);

    const snapshots = await Promise.all(
      candidates.map((candidate) =>
        withAuthRetry(() => getDocs(query(collection(db, "miembros"), where("userId", "==", candidate))))
      )
    );

    const docSnap = snapshots.find((snap) => !snap.empty)?.docs?.[0];

    if (docSnap) {
      const data = docSnap.data();
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...data,
          qr_code: data.qr_code || data.qrCode || "",
          avatar_color: data.avatar_color || data.avatarColor || "#6366f1"
        }
      };
    }
    return { success: false, error: "Miembro no encontrado" };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const updateMemberByUserId = async (userId, memberData = {}) => {
  try {
    const candidates = [userId];
    const numericId = Number(userId);
    if (!Number.isNaN(numericId)) candidates.push(numericId);

    const snapshots = await Promise.all(
      candidates.map((candidate) =>
        withAuthRetry(() => getDocs(query(collection(db, "miembros"), where("userId", "==", candidate), limit(1))))
      )
    );

    const docSnap = snapshots.find((snap) => !snap.empty)?.docs?.[0];
    if (!docSnap) {
      return { success: false, error: "Miembro no encontrado" };
    }

    const payload = {};
    if (memberData.telefono !== undefined) payload.telefono = memberData.telefono;
    if (memberData.email !== undefined) payload.email = memberData.email;
    if (memberData.nombre !== undefined) payload.nombre = memberData.nombre;
    if (memberData.apellido !== undefined) payload.apellido = memberData.apellido;

    await updateDoc(doc(db, "miembros", docSnap.id), {
      ...payload,
      updatedAt: serverTimestamp()
    });

    return { success: true, id: docSnap.id };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const getMemberByAuthUid = async (authUid) => {
  try {
    const q = query(collection(db, "miembros"), where("authUid", "==", authUid), limit(1));
    const querySnapshot = await withAuthRetry(() => getDocs(q));
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      return {
        success: true,
        data: {
          id: docSnap.id,
          ...data,
          qr_code: data.qr_code || data.qrCode || "",
          avatar_color: data.avatar_color || data.avatarColor || "#6366f1"
        }
      };
    }
    return { success: false, error: "Miembro no encontrado" };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const createMember = async (memberData) => {
  try {
    const normalizedMemberData = {
      userId: memberData.userId,
      nombre: memberData.nombre || memberData.firstName || "",
      apellido: memberData.apellido || memberData.lastName || "",
      email: memberData.email || "",
      telefono: memberData.telefono || "",
      qr_code: memberData.qr_code || memberData.qrCode || "",
      qrCode: memberData.qr_code || memberData.qrCode || "",
      avatar_color: memberData.avatar_color || memberData.avatarColor || "#6366f1",
      avatarColor: memberData.avatar_color || memberData.avatarColor || "#6366f1",
      active: memberData.active ?? true
    };

    const docRef = await addDoc(collection(db, "miembros"), {
      ...normalizedMemberData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// MEMBRESÍAS
export const getUserMemberships = async (userId) => {
  try {
    const toDateOnly = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        return value.includes("T") ? value.split("T")[0] : value;
      }
      const parsed = value?.toDate?.() || new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
    };

    const normalizeMembership = (docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        legacyId: data.id ?? null,
        id: docSnap.id,
        userId: data.userId || data.user || userId,
        membershipName: data.membershipName || data.membershipTypeName || data.tipo_nombre || "",
        durationDays: data.durationDays ?? data.duration_days ?? null,
        startDate: toDateOnly(data.startDate || data.start_date),
        endDate: toDateOnly(data.endDate || data.end_date)
      };
    };

    const candidates = [userId];
    const numericId = Number(userId);
    if (!Number.isNaN(numericId)) candidates.push(numericId);

    const membershipQueries = [];
    candidates.forEach((candidate) => {
      membershipQueries.push(
        query(collection(db, "memberships"), where("userId", "==", candidate)),
        query(collection(db, "memberships"), where("user", "==", candidate))
      );
    });

    const snapshots = await Promise.all(membershipQueries.map((q) => getDocs(q)));
    const dedupDocs = new Map();
    snapshots.forEach((snap) => {
      snap.docs.forEach((d) => dedupDocs.set(d.id, d));
    });

    const docs = Array.from(dedupDocs.values());

    const memberships = docs
      .map(normalizeMembership)
      .sort((a, b) => {
        const dateA = new Date(a.startDate || a.endDate || 0).getTime();
        const dateB = new Date(b.startDate || b.endDate || 0).getTime();
        return dateB - dateA;
      });

    return { success: true, data: memberships };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserMembershipsByAuthUid = async (authUid, userEmail = null) => {
  try {
    const toDateOnly = (value) => {
      if (!value) return null;
      if (typeof value === "string") {
        return value.includes("T") ? value.split("T")[0] : value;
      }
      const parsed = value?.toDate?.() || new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().split("T")[0];
    };

    const normalizeMembership = (docSnap) => {
      const data = docSnap.data();
      return {
        ...data,
        legacyId: data.id ?? null,
        id: docSnap.id,
        userId: data.userId || data.user || "",
        membershipName: data.membershipName || data.membershipTypeName || data.tipo_nombre || "",
        durationDays: data.durationDays ?? data.duration_days ?? null,
        startDate: toDateOnly(data.startDate || data.start_date),
        endDate: toDateOnly(data.endDate || data.end_date)
      };
    };

    const queries = [query(collection(db, "memberships"), where("authUid", "==", authUid))];
    if (userEmail) {
      queries.push(query(collection(db, "memberships"), where("userEmail", "==", userEmail)));
    }

    const snapshots = await Promise.all(queries.map((q) => getDocs(q)));
    const dedupDocs = new Map();
    snapshots.forEach((snap) => {
      snap.docs.forEach((d) => dedupDocs.set(d.id, d));
    });

    const memberships = Array.from(dedupDocs.values())
      .map(normalizeMembership)
      .sort((a, b) => {
        const dateA = new Date(a.startDate || a.endDate || 0).getTime();
        const dateB = new Date(b.startDate || b.endDate || 0).getTime();
        return dateB - dateA;
      });

    return { success: true, data: memberships };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const getNextNumericDocId = async (collectionName) => {
  const querySnapshot = await getDocs(collection(db, collectionName));
  let maxId = 0;

  querySnapshot.docs.forEach((docSnap) => {
    const numericId = parseInt(docSnap.id, 10);
    if (!Number.isNaN(numericId) && numericId > maxId) {
      maxId = numericId;
    }
  });

  return (maxId + 1).toString();
};

export const createMembership = async (membershipData) => {
  try {
    const newId = await getNextNumericDocId("memberships");

    await setDoc(doc(db, "memberships", newId), {
      ...membershipData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return { success: true, id: newId };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// MEMBERSHIP TYPES (Planes)
export const getMembershipTypes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "membershipTypes"));
    const types = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: types };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createMembershipType = async (typeData) => {
  try {
    const docRef = await addDoc(collection(db, "membershipTypes"), {
      name: typeData.name,
      price: typeData.price,
      duration_days: typeData.duration_days,
      image: typeData.image || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateMembershipType = async (typeId, typeData) => {
  try {
    await updateDoc(doc(db, "membershipTypes", typeId), {
      name: typeData.name,
      price: typeData.price,
      duration_days: typeData.duration_days,
      ...(typeData.image && { image: typeData.image }),
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteMembershipType = async (typeId) => {
  try {
    await deleteDoc(doc(db, "membershipTypes", typeId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const assignMembership = async (assignmentData) => {
  try {
    const { userId, membershipTypeId, paymentMethod, montoRecibido, forceRenew } = assignmentData;

    const getMexicoDateOnly = () => {
      // en-CA returns YYYY-MM-DD and avoids UTC day shifts in Americas
      return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Mexico_City" }).format(new Date());
    };

    const parseDateOnly = (dateStr) => {
      if (!dateStr || typeof dateStr !== "string") return null;
      const [y, m, d] = dateStr.split("-").map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d, 0, 0, 0, 0);
    };
    
    // 1. Verificar si el usuario ya tiene membresía activa
    const existingMemberships = await getUserMemberships(userId);
    if (existingMemberships.success && existingMemberships.data.length > 0) {
      const todayLocal = parseDateOnly(getMexicoDateOnly()) || new Date();
      const activeMembership = existingMemberships.data.find(m => {
        const rawEndDate = m.endDate || m.end_date;
        const endDate = parseDateOnly(rawEndDate) || (rawEndDate?.toDate?.() || new Date(rawEndDate));
        if (!endDate || Number.isNaN(endDate.getTime())) return false;
        endDate.setHours(0, 0, 0, 0);
        return endDate >= todayLocal;
      });
      
      if (activeMembership && !forceRenew) {
        const activeMembershipEndDate = activeMembership.endDate || activeMembership.end_date;
        return { 
          success: false, 
          conflict: true,
          message: "El cliente ya tiene una membresía activa",
          detail: `La membresía actual vence el ${new Date(activeMembershipEndDate).toLocaleDateString('es-MX')}`,
          existingMembership: activeMembership
        };
      }
    }
    
    // 2. Obtener tipo de membresía para calcular fechas
    const membershipTypeDoc = await getDoc(doc(db, "membershipTypes", membershipTypeId));
    if (!membershipTypeDoc.exists()) {
      return { success: false, error: "Tipo de membresía no encontrado" };
    }
    
    const membershipType = membershipTypeDoc.data();

    // 2.1 Obtener datos de usuario para mostrar en listados
    const userDoc = await getDoc(doc(db, "users", userId));
    const userData = userDoc.exists() ? userDoc.data() : {};
    const userFullName = [userData.firstName, userData.lastName].filter(Boolean).join(" ").trim();
    const userName = userData.username || userFullName || (userData.email ? userData.email.split("@")[0] : "");
    
    // 3. Calcular fechas de vigencia
    const startDate = getMexicoDateOnly();
    const endDate = parseDateOnly(startDate) || new Date();
    const durationDays = Number(membershipType.duration_days || 0);
    if (durationDays <= 1) {
      endDate.setHours(0, 0, 0, 0);
    } else {
      endDate.setDate(endDate.getDate() + durationDays);
    }
    const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;
    
    // 4. Crear o actualizar membresía existente del usuario
    const membershipData = {
      user: userId,
      membershipType: membershipTypeId,
      userId: userId,
      authUid: userData.authUid || userId,
      userName: userName || "",
      userFullName: userFullName || "",
      userEmail: userData.email || "",
      membershipName: membershipType.name,
      membershipTypeName: membershipType.name,
      membershipImage: membershipType.image || null,
      membershipPrice: membershipType.price,
      startDate: startDate,
      endDate: endDateStr,
      durationDays: durationDays,
      paymentMethod: paymentMethod,
      montoRecibido: montoRecibido,
      updatedAt: serverTimestamp()
    };
    const membershipByUserQuery = query(
      collection(db, "memberships"),
      where("userId", "==", userId),
      limit(1)
    );
    const membershipByUserSnapshot = await getDocs(membershipByUserQuery);

    const legacyMembershipQuery = query(
      collection(db, "memberships"),
      where("user", "==", userId),
      limit(1)
    );
    const legacyMembershipSnapshot = await getDocs(legacyMembershipQuery);

    const membershipDoc = membershipByUserSnapshot.docs[0] || legacyMembershipSnapshot.docs[0] || null;

    let membershipId;
    let isRenewal = false;
    if (membershipDoc) {
      await updateDoc(doc(db, "memberships", membershipDoc.id), membershipData);
      membershipId = membershipDoc.id;
      isRenewal = true;
    } else {
      const newId = await getNextNumericDocId("memberships");
      await setDoc(doc(db, "memberships", newId), {
        ...membershipData,
        createdAt: serverTimestamp()
      });
      membershipId = newId;
    }

    const membershipPrice = Number(membershipType.price || 0);
    let saleFolio = null;

    if (membershipPrice > 0) {
      const payMethod = paymentMethod || "EFECTIVO";
      const receivedAmount = payMethod === "EFECTIVO"
        ? (Number(montoRecibido) || membershipPrice)
        : membershipPrice;
      const conceptLabel = isRenewal ? "Renovación" : "Membresía";

      saleFolio = generateSaleFolio();

      await addDoc(collection(db, "ventas"), {
        folio: saleFolio,
        cliente: userId,
        cliente_id: userId,
        cliente_username: userName || userData.username || userData.email || "Cliente anónimo",
        cliente_email: userData.email || null,
        clienteEmail: userData.email || null,
        clienteNombre: userFullName || userName || userData.email || "Cliente",
        metodo_pago: payMethod,
        total: membershipPrice,
        monto_recibido: receivedAmount,
        detalle_productos: JSON.stringify([
          {
            nombre: `${conceptLabel}: ${membershipType.name}`,
            precio: membershipPrice,
            cantidad: 1
          }
        ]),
        tipo_venta: isRenewal ? "RENOVACION_MEMBRESIA" : "ALTA_MEMBRESIA",
        createdAt: getLocalMXDate(),
        fecha: getLocalMXDateISO()
      });
    }

    return { 
      success: true, 
      message: "Membresía asignada correctamente",
      id: membershipId,
      membershipData,
      saleFolio
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// PRODUCTOS
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const products = querySnapshot.docs.map(doc => {
      const data = doc.data();
      // Normalizar el campo de imagen (puede ser 'imagen' o 'image')
      const imageUrl = data.imagen || data.image;
      
      // Log para diagnóstico
      if (!imageUrl || imageUrl.trim() === '') {
        console.warn(`⚠️ Producto "${data.nombre}" sin imagen URL`);
      } else if (!imageUrl.startsWith('http')) {
        console.warn(`⚠️ Producto "${data.nombre}" URL inválida: ${imageUrl}`);
      }
      
      return {
        id: doc.id,
        ...data,
        imagen: imageUrl, // Garantizar que el campo se llame 'imagen'
        image: imageUrl   // También disponible como 'image' para compatibilidad
      };
    });
    
    const summary = {
      total: products.length,
      conImagen: products.filter(p => p.imagen && p.imagen.trim() !== '' && p.imagen.startsWith('http')).length,
      sinImagen: products.filter(p => !p.imagen || p.imagen.trim() === '').length,
      urlInvalida: products.filter(p => p.imagen && !p.imagen.startsWith('http') && p.imagen.trim() !== '').length
    };
    
    console.log('%c📊 ESTADO DE IMÁGENES', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.table(summary);
    
    return { success: true, data: products };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createProduct = async (productData) => {
  try {
    const docRef = await addDoc(collection(db, "productos"), {
      ...productData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateProduct = async (productId, productData) => {
  try {
    await updateDoc(doc(db, "productos", productId), {
      ...productData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteProduct = async (productId) => {
  try {
    await deleteDoc(doc(db, "productos", productId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// INVENTARIO
export const getInventoryEntries = async (limitNum = 100) => {
  try {
    const q = query(
      collection(db, "inventario_entradas"),
      orderBy("fecha", "desc"),
      limit(limitNum)
    );
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: entries };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createInventoryEntry = async (entryData) => {
  try {
    const { productoId, cantidad, usuarioNombre } = entryData;
    
    // 1. Obtener producto actual
    const productDoc = await getDoc(doc(db, "productos", productoId));
    if (!productDoc.exists()) {
      return { success: false, error: "Producto no encontrado" };
    }
    
    const productData = productDoc.data();
    const newStock = (productData.stock || 0) + cantidad;
    
    // 2. Actualizar stock del producto
    await updateDoc(doc(db, "productos", productoId), {
      stock: newStock
    });
    
    // 3. Crear registro de entrada
    const entryRecord = {
      producto: productoId,
      producto_nombre: productData.nombre,
      cantidad: cantidad,
      usuario_nombre: usuarioNombre || 'Sistema',
      fecha: new Date().toISOString()
    };
    
    const docRef = await addDoc(collection(db, "inventario_entradas"), entryRecord);
    
    return { success: true, id: docRef.id, newStock };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ASISTENCIAS
export const createAttendance = async (attendanceData) => {
  try {
    const docRef = await addDoc(collection(db, "asistencias"), {
      ...attendanceData,
      checkInTime: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateAttendanceCheckout = async (attendanceId) => {
  try {
    await updateDoc(doc(db, "asistencias", attendanceId), {
      checkOutTime: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMemberByQRCode = async (qrCode) => {
  try {
    const normalizedQr = String(qrCode || "").trim();
    if (!normalizedQr) {
      return { success: false, error: "Miembro no encontrado" };
    }

    const qrCandidates = [normalizedQr, normalizedQr.toUpperCase()];
    for (const candidate of qrCandidates) {
      const bySnakeCase = query(collection(db, "miembros"), where("qr_code", "==", candidate));
      const bySnakeCaseSnapshot = await getDocs(bySnakeCase);
      if (!bySnakeCaseSnapshot.empty) {
        const docSnap = bySnakeCaseSnapshot.docs[0];
        const data = docSnap.data();
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...data,
            qr_code: data.qr_code || data.qrCode || "",
            avatar_color: data.avatar_color || data.avatarColor || "#6366f1"
          }
        };
      }

      const byCamelCase = query(collection(db, "miembros"), where("qrCode", "==", candidate));
      const byCamelCaseSnapshot = await getDocs(byCamelCase);
      if (!byCamelCaseSnapshot.empty) {
        const docSnap = byCamelCaseSnapshot.docs[0];
        const data = docSnap.data();
        return {
          success: true,
          data: {
            id: docSnap.id,
            ...data,
            qr_code: data.qr_code || data.qrCode || "",
            avatar_color: data.avatar_color || data.avatarColor || "#6366f1"
          }
        };
      }
    }

    const legacyPrefix = "FD-USER";
    if (normalizedQr.toUpperCase().startsWith(legacyPrefix)) {
      const legacyUserId = normalizedQr.slice(legacyPrefix.length);
      if (legacyUserId) {
        const byUserId = query(collection(db, "miembros"), where("userId", "==", legacyUserId));
        const byUserIdSnapshot = await getDocs(byUserId);
        if (!byUserIdSnapshot.empty) {
          const docSnap = byUserIdSnapshot.docs[0];
          const data = docSnap.data();
          return {
            success: true,
            data: {
              id: docSnap.id,
              ...data,
              qr_code: data.qr_code || data.qrCode || "",
              avatar_color: data.avatar_color || data.avatarColor || "#6366f1"
            }
          };
        }
      }
    }

    return { success: false, error: "Miembro no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const checkInMember = async (qrCode) => {
  try {
    // 1. Buscar miembro por QR
    const memberResult = await getMemberByQRCode(qrCode);
    if (!memberResult.success) {
      return { success: false, error: "Código QR no válido" };
    }
    
    const member = memberResult.data;
    
    // 2. Verificar si ya tiene check-in activo hoy (sin requerir índice compuesto)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "asistencias"),
      where("memberId", "==", member.id)
    );

    const existingAttendance = await getDocs(q);
    const activeCheckIn = existingAttendance.docs.find(docSnap => {
      const data = docSnap.data();
      if (data.fecha_hora_salida) return false;

      const rawEntry = data.fecha_hora_entrada || data.checkInTime?.toDate?.() || data.createdAt?.toDate?.();
      const entryDate = rawEntry instanceof Date ? rawEntry : new Date(rawEntry);
      if (Number.isNaN(entryDate.getTime())) return false;

      return entryDate >= today;
    });
    
    if (activeCheckIn) {
      return { 
        success: false, 
        error: `${member.nombre} ${member.apellido} ya hizo check-in y no ha salido`,
        hasActiveCheckIn: true
      };
    }
    
    // 3. Verificar membresía activa
    const membershipsQuery = query(
      collection(db, "memberships"),
      where("userId", "==", member.userId)
    );
    
    const membershipsSnapshot = await getDocs(membershipsQuery);
    const activeMembership = membershipsSnapshot.docs.find(doc => {
      const data = doc.data();
      const rawEndDate = data.endDate || data.end_date;
      const endDate = rawEndDate?.toDate?.() || new Date(rawEndDate);
      return endDate >= new Date();
    });
    
    if (!activeMembership) {
      return { 
        success: false, 
        error: `Membresía vencida o inexistente`,
        miembro: `${member.nombre} ${member.apellido}`
      };
    }
    
    // 4. Crear registro de asistencia
    const attendanceData = {
      memberId: member.id,
      userId: member.userId,
      miembro_nombre: `${member.nombre} ${member.apellido}`,
      miembro_avatar_color: member.avatar_color || '#1D4ED8',
      fecha_hora_entrada: new Date().toISOString(),
      checkInTime: serverTimestamp(),
      fecha_hora_salida: null,
      acceso_permitido: true,
      tiempo_en_gym: "En curso",
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "asistencias"), attendanceData);
    
    return { 
      success: true, 
      message: `✅ Check-in exitoso: ${member.nombre} ${member.apellido}`,
      id: docRef.id
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const checkOutMember = async (qrCode) => {
  try {
    // 1. Buscar miembro por QR
    const memberResult = await getMemberByQRCode(qrCode);
    if (!memberResult.success) {
      return { success: false, error: "Código QR no válido" };
    }
    
    const member = memberResult.data;
    
    // 2. Buscar check-in activo del día (sin requerir índice compuesto)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, "asistencias"),
      where("memberId", "==", member.id)
    );

    const attendanceSnapshot = await getDocs(q);
    const activeCheckIn = attendanceSnapshot.docs.find(docSnap => {
      const data = docSnap.data();
      if (data.fecha_hora_salida) return false;

      const rawEntry = data.fecha_hora_entrada || data.checkInTime?.toDate?.() || data.createdAt?.toDate?.();
      const entryDate = rawEntry instanceof Date ? rawEntry : new Date(rawEntry);
      if (Number.isNaN(entryDate.getTime())) return false;

      return entryDate >= today;
    });
    
    if (!activeCheckIn) {
      return { 
        success: false, 
        error: `${member.nombre} ${member.apellido} no tiene check-in activo`
      };
    }
    
    // 3. Actualizar con hora de salida y calcular tiempo
    const checkInData = activeCheckIn.data();
    const checkInTime = new Date(checkInData.fecha_hora_entrada);
    const checkOutTime = new Date();
    const diffMs = checkOutTime - checkInTime;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    const tiempoEnGym = `${hours}h ${mins}m`;
    
    await updateDoc(doc(db, "asistencias", activeCheckIn.id), {
      fecha_hora_salida: checkOutTime.toISOString(),
      checkOutTime: serverTimestamp(),
      tiempo_en_gym: tiempoEnGym
    });
    
    return { 
      success: true, 
      message: `✅ Check-out exitoso: ${member.nombre} ${member.apellido}`,
      tiempo_en_gym: tiempoEnGym
    };
    
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAttendances = async (filters = {}) => {
  try {
    const q = query(collection(db, "asistencias"), limit(200));
    const querySnapshot = await getDocs(q);

    const toIsoString = (value) => {
      if (!value) return null;
      if (value.toDate) return value.toDate().toISOString();
      if (typeof value === "string") return value;
      try {
        return new Date(value).toISOString();
      } catch {
        return null;
      }
    };

    let attendances = querySnapshot.docs.map(doc => {
      const data = doc.data();
      const checkInIso = data.fecha_hora_entrada || toIsoString(data.checkInTime) || toIsoString(data.createdAt);
      const checkOutIso = data.fecha_hora_salida || toIsoString(data.checkOutTime);
      const miembroNombre = data.miembro_nombre || data.memberName || data.userName || data.userEmail || (data.userId ? `Usuario ${data.userId}` : "N/A");

      let tiempoEnGym = data.tiempo_en_gym;
      if (!tiempoEnGym && checkInIso) {
        const start = new Date(checkInIso);
        const end = checkOutIso ? new Date(checkOutIso) : new Date();
        const diffMs = end - start;
        if (!Number.isNaN(diffMs)) {
          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          tiempoEnGym = `${hours}h ${mins}m`;
        }
      }

      return {
        id: doc.id,
        ...data,
        miembro_nombre: miembroNombre,
        fecha_hora_entrada: checkInIso,
        fecha_hora_salida: checkOutIso,
        tiempo_en_gym: tiempoEnGym || "En curso"
      };
    });

    // Filtro por fecha (client-side, compatible con ambos formatos)
    if (filters.fecha) {
      const [year, month, day] = String(filters.fecha).split("-").map(Number);
      const startDate = new Date(year, (month || 1) - 1, day || 1, 0, 0, 0, 0);
      const endDate = new Date(year, (month || 1) - 1, day || 1, 23, 59, 59, 999);
      attendances = attendances.filter(att => {
        if (!att.fecha_hora_entrada) return false;
        const checkIn = new Date(att.fecha_hora_entrada);
        if (Number.isNaN(checkIn.getTime())) return false;
        return checkIn >= startDate && checkIn <= endDate;
      });
    }

    // Filtro de búsqueda por nombre (client-side)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      attendances = attendances.filter(att =>
        att.miembro_nombre?.toLowerCase().includes(searchLower)
      );
    }

    // Ordenar por fecha descendente (client-side)
    attendances.sort((a, b) => {
      const dateA = a.fecha_hora_entrada ? new Date(a.fecha_hora_entrada) : new Date(0);
      const dateB = b.fecha_hora_entrada ? new Date(b.fecha_hora_entrada) : new Date(0);
      return dateB - dateA;
    });

    return { success: true, data: attendances };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// VENTAS
const generateSaleFolio = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `V-${timestamp}-${random}`;
};

const TRAINER_SERVICE_SALE_TYPE = 'SERVICIO_ENTRENAMIENTO';
const TRAINER_SERVICE_PENDING_STATUS = 'pending';
const TRAINER_SERVICE_COMPLETED_STATUS = 'completed';

export const createSale = async (saleData) => {
  try {
    const { cliente_id, metodo_pago, total, productos, monto_recibido } = saleData;
    
    // 1. Validar y actualizar stock de cada producto
    for (const item of productos) {
      const productDoc = await getDoc(doc(db, "productos", item.id));
      if (!productDoc.exists()) {
        return { success: false, error: `Producto ${item.nombre} no encontrado` };
      }
      
      const productData = productDoc.data();
      if (productData.stock < item.cantidad) {
        return { success: false, error: `Stock insuficiente para ${item.nombre}` };
      }
      
      // Actualizar stock
      const newStock = productData.stock - item.cantidad;
      await updateDoc(doc(db, "productos", item.id), {
        stock: newStock
      });
    }
    
    // 2. Generar folio único (timestamp + random)
    const folio = generateSaleFolio();
    
    // 3. Obtener información del cliente si existe
    let cliente_username = null;
    let cliente_email = null;
    let clienteNombre = null;
    if (cliente_id) {
      const userDoc = await getDoc(doc(db, "users", cliente_id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const nombre = userData.firstName || userData.first_name || "";
        const apellido = userData.lastName || userData.last_name || "";
        const nombreCompleto = `${nombre} ${apellido}`.trim();
        cliente_username = userData.username || userData.email;
        cliente_email = userData.email;
        clienteNombre = nombreCompleto || userData.displayName || userData.username || userData.email || "Cliente";
      }
    }
    
    // 4. Crear registro de venta
    const ventaData = {
      folio: folio,
      cliente: cliente_id || null,
      cliente_id: cliente_id || null,
      cliente_username: cliente_username,
      cliente_email: cliente_email,
      clienteEmail: cliente_email,
      clienteNombre: clienteNombre,
      metodo_pago: metodo_pago,
      total: total,
      monto_recibido: monto_recibido || total,
      detalle_productos: JSON.stringify(productos),
      createdAt: getLocalMXDate(),
      fecha: getLocalMXDateISO()
    };
    
    const docRef = await addDoc(collection(db, "ventas"), ventaData);
    
    return { 
      success: true, 
      id: docRef.id,
      folio: folio
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createTrainerServiceSale = async (saleData) => {
  try {
    const {
      clientId,
      clientEmail,
      clientName,
      trainerId,
      trainerName,
      trainerEmail,
      amount,
      paymentMethod = 'EFECTIVO',
      serviceType = '',
    } = saleData || {};

    const totalAmount = Number(amount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { success: false, error: 'Ingresa un monto válido para el servicio de entrenamiento.' };
    }

    const folio = generateSaleFolio();
    const safeClientId = String(clientId || '').trim();
    const safeTrainerId = String(trainerId || '').trim();
    const normalizedPaymentMethod = String(paymentMethod || 'EFECTIVO').trim().toUpperCase();
    const normalizedServiceType = normalizeTrainerServiceType(serviceType);
    const initialPaymentStatus = normalizedPaymentMethod === 'EFECTIVO'
      ? TRAINER_SERVICE_PENDING_STATUS
      : TRAINER_SERVICE_COMPLETED_STATUS;

    let trainerServiceLabel = '';
    let trainerServicePrice = Number(amount || 0);

    if (safeTrainerId) {
      const trainerDoc = await withAuthRetry(() => getDoc(doc(db, 'users', safeTrainerId)));
      if (trainerDoc.exists()) {
        const trainerData = trainerDoc.data();
        const serviceSettings = getTrainerServiceSettings(trainerData);
        const resolvedTrainerServiceType = normalizedServiceType || (serviceSettings.offersPersonal && !serviceSettings.offersGroup
          ? TRAINER_SERVICE_TYPE_PERSONAL
          : (!serviceSettings.offersPersonal && serviceSettings.offersGroup
            ? TRAINER_SERVICE_TYPE_GROUP
            : ''));

        const serviceTypeValue = normalizeTrainerServiceType(resolvedTrainerServiceType);
        if (!serviceTypeValue) {
          return { success: false, error: 'Debes seleccionar un tipo de servicio válido.' };
        }

        if (serviceTypeValue === TRAINER_SERVICE_TYPE_PERSONAL) {
          if (!serviceSettings.offersPersonal) {
            return { success: false, error: 'Este entrenador no ofrece servicio personal.' };
          }
          trainerServicePrice = serviceSettings.personalPrice;
          trainerServiceLabel = 'Personal';
        } else {
          if (!serviceSettings.offersGroup) {
            return { success: false, error: 'Este entrenador no ofrece servicio grupal.' };
          }
          trainerServicePrice = serviceSettings.groupPrice;
          trainerServiceLabel = 'Grupal';
        }
      }
    }

    if (!normalizedServiceType) {
      return { success: false, error: 'Selecciona si el servicio será personal o grupal.' };
    }

    if (!Number.isFinite(trainerServicePrice) || trainerServicePrice <= 0) {
      return { success: false, error: 'El entrenador no tiene un precio válido configurado para este servicio.' };
    }

    const existingSalesQuery = query(collection(db, 'ventas'), where('cliente_id', '==', safeClientId));
    const existingSalesSnap = await withAuthRetry(() => getDocs(existingSalesQuery));
    const hasPendingSale = existingSalesSnap.docs.some((docSnap) => {
      const data = docSnap.data();
      const type = String(data.tipo_venta || data.tipoVenta || '').trim();
      const status = String(data.payment_status || '').trim().toLowerCase();
      return type === TRAINER_SERVICE_SALE_TYPE && status === TRAINER_SERVICE_PENDING_STATUS;
    });

    if (hasPendingSale) {
      return { success: false, error: 'Ya existe un pago de entrenamiento pendiente de validación en recepción.' };
    }

    let cliente_username = null;
    let cliente_email = String(clientEmail || '').trim() || null;
    let clienteNombre = String(clientName || '').trim() || null;

    if (safeClientId) {
      try {
        const userDoc = await getDoc(doc(db, 'users', safeClientId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const nombre = userData.firstName || userData.first_name || '';
          const apellido = userData.lastName || userData.last_name || '';
          const nombreCompleto = `${nombre} ${apellido}`.trim();
          cliente_username = userData.username || userData.email;
          cliente_email = userData.email || cliente_email;
          clienteNombre = nombreCompleto || userData.displayName || userData.username || userData.email || clienteNombre || 'Cliente';
        }
      } catch {
        // Usamos los datos disponibles en el cliente si no se puede leer users.
      }
    }

    const receivedAmount = trainerServicePrice;

    await withAuthRetry(() => addDoc(collection(db, 'ventas'), {
      folio,
      cliente: safeClientId || null,
      cliente_id: safeClientId || null,
      cliente_auth_uid: safeClientId || null,
      cliente_username,
      cliente_email,
      clienteEmail: cliente_email,
      clienteNombre,
      trainerId: safeTrainerId || null,
      trainer_id: safeTrainerId || null,
      trainer_email: String(trainerEmail || '').trim() || null,
      trainerEmail: String(trainerEmail || '').trim() || null,
      trainer_name: String(trainerName || 'Entrenador').trim(),
      trainerName: String(trainerName || 'Entrenador').trim(),
      service_type: normalizedServiceType,
      serviceType: normalizedServiceType,
      service_label: trainerServiceLabel,
      serviceLabel: trainerServiceLabel,
      trainer_service_price: trainerServicePrice,
      trainerServicePrice: trainerServicePrice,
      metodo_pago: normalizedPaymentMethod,
      total: trainerServicePrice,
      monto_recibido: receivedAmount,
      payment_status: initialPaymentStatus,
      tipo_venta: TRAINER_SERVICE_SALE_TYPE,
      detalle_productos: JSON.stringify([
        {
          nombre: `Servicio ${trainerServiceLabel || 'de entrenamiento'}: ${trainerName || 'Entrenador'}`,
          precio: trainerServicePrice,
          cantidad: 1,
        }
      ]),
      createdAt: getLocalMXDate(),
      fecha: getLocalMXDateISO(),
    }));

    return { success: true, folio, paymentStatus: initialPaymentStatus };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: 'No hay permisos para registrar el pago del servicio de entrenamiento.' };
    }
    return { success: false, error: error.message };
  }
};

export const hasClientPaidTrainerService = async (clientId, trainerId = null, serviceType = null) => {
  try {
    const safeClientId = String(clientId || '').trim();
    if (!safeClientId) {
      return { success: true, paid: false };
    }

    const q = query(collection(db, 'ventas'), where('cliente_id', '==', safeClientId));
    const snap = await withAuthRetry(() => getDocs(q));

    const match = snap.docs.find((docSnap) => {
      const data = docSnap.data();
      const type = String(data.tipo_venta || data.tipoVenta || '').trim();
      if (type !== TRAINER_SERVICE_SALE_TYPE) return false;

      const status = String(data.payment_status || '').trim().toLowerCase();
      if (status !== TRAINER_SERVICE_COMPLETED_STATUS) return false;

      if (!trainerId) return true;
      const normalizedTrainerId = String(trainerId).trim();
      const saleTrainerId = String(data.trainerId || data.trainer_id || '').trim();
      if (saleTrainerId !== normalizedTrainerId) return false;

      const requestedServiceType = normalizeTrainerServiceType(serviceType || data.serviceType || data.service_type || '');
      if (!requestedServiceType) return true;

      const saleServiceType = normalizeTrainerServiceType(data.serviceType || data.service_type || '');
      return saleServiceType === requestedServiceType;
    });

    return { success: true, paid: Boolean(match), data: match ? { id: match.id, ...match.data() } : null };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: 'No hay permisos para consultar pagos del servicio de entrenamiento.' };
    }
    return { success: false, error: error.message };
  }
};

export const getTrainerServiceSales = async () => {
  try {
    // Try to get all SERVICIO_ENTRENAMIENTO sales (may fail with permission denied)
    const q = query(collection(db, 'ventas'), where('tipo_venta', '==', TRAINER_SERVICE_SALE_TYPE));
    const snapshot = await withAuthRetry(() => getDocs(q));
    const sales = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

    // Filter by current month client-side
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const filtered = sales.filter((sale) => {
      const saleDate = sale.createdAt?.toDate?.() || new Date(sale.fecha || 0);
      return saleDate >= startOfMonth && saleDate <= endOfMonth;
    });

    filtered.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.fecha || 0);
      const bDate = b.createdAt?.toDate?.() || new Date(b.fecha || 0);
      return bDate - aDate;
    });

    return { success: true, data: filtered };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      try {
        await waitForAuthReady();
        const currentUser = auth.currentUser;
        const uid = String(currentUser?.uid || '').trim();
        const email = String(currentUser?.email || '').trim();

        if (!uid && !email) {
          return { success: false, error: 'No hay sesión activa para consultar pagos de servicios.' };
        }

        const queries = [];
        if (uid) {
          queries.push(query(collection(db, 'ventas'), where('trainerId', '==', uid)));
          queries.push(query(collection(db, 'ventas'), where('trainer_id', '==', uid)));
        }
        if (email) {
          queries.push(query(collection(db, 'ventas'), where('trainerEmail', '==', email)));
          queries.push(query(collection(db, 'ventas'), where('trainer_email', '==', email)));
        }

        const snapshots = await Promise.all(queries.map((qRef) => withAuthRetry(() => getDocs(qRef))));

        const salesMap = new Map();
        snapshots.forEach((snap) => {
          snap.docs.forEach((docSnap) => {
            const sale = { id: docSnap.id, ...docSnap.data() };
            const type = String(sale.tipo_venta || sale.tipoVenta || '').trim();
            if (type !== TRAINER_SERVICE_SALE_TYPE) return;
            salesMap.set(docSnap.id, sale);
          });
        });

        const sales = Array.from(salesMap.values());
        
        // Filter by current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        
        const filtered = sales.filter((sale) => {
          const saleDate = sale.createdAt?.toDate?.() || new Date(sale.fecha || 0);
          return saleDate >= startOfMonth && saleDate <= endOfMonth;
        });

        filtered.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(a.fecha || 0);
          const bDate = b.createdAt?.toDate?.() || new Date(b.fecha || 0);
          return bDate - aDate;
        });

        return { success: true, data: filtered };
      } catch {
        return { success: false, error: 'No hay permisos para consultar pagos de servicios de entrenamiento.' };
      }
    }
    return { success: false, error: error.message };
  }
};

export const completeTrainerServicePayment = async (saleId) => {
  try {
    const safeSaleId = String(saleId || '').trim();
    if (!safeSaleId) {
      return { success: false, error: 'saleId es requerido' };
    }

    const saleRef = doc(db, 'ventas', safeSaleId);
    const saleSnap = await withAuthRetry(() => getDoc(saleRef));
    if (!saleSnap.exists()) {
      return { success: false, error: 'Pago no encontrado' };
    }

    const saleData = saleSnap.data();
    const saleType = String(saleData.tipo_venta || saleData.tipoVenta || '').trim();
    if (saleType !== TRAINER_SERVICE_SALE_TYPE) {
      return { success: false, error: 'La venta no corresponde a un servicio de entrenamiento.' };
    }

    const paymentStatus = String(saleData.payment_status || '').trim().toLowerCase();
    if (paymentStatus === TRAINER_SERVICE_COMPLETED_STATUS) {
      return { success: true, alreadyCompleted: true };
    }

    const clientId = String(saleData.cliente_id || saleData.cliente || saleData.cliente_auth_uid || '').trim();
    const trainerId = String(saleData.trainerId || saleData.trainer_id || '').trim();
    if (!clientId || !trainerId) {
      return { success: false, error: 'El pago no tiene cliente o entrenador asociado.' };
    }

    const saleServiceType = normalizeTrainerServiceType(saleData.serviceType || saleData.service_type || '');
    const saleServiceLabel = String(saleData.serviceLabel || saleData.service_label || '').trim() || (saleServiceType === TRAINER_SERVICE_TYPE_GROUP ? 'Grupal' : 'Personal');

    await withAuthRetry(() => updateDoc(saleRef, {
      payment_status: TRAINER_SERVICE_COMPLETED_STATUS,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));

    const assignmentRef = doc(db, 'client_trainer_assignments', clientId);
    const assignmentSnap = await withAuthRetry(() => getDoc(assignmentRef));
    if (!assignmentSnap.exists()) {
      await withAuthRetry(() =>
        setDoc(assignmentRef, {
          clientId,
          trainerId,
          serviceType: saleServiceType || TRAINER_SERVICE_TYPE_PERSONAL,
          serviceLabel: saleServiceLabel,
          servicePrice: Number(saleData.total || saleData.trainerServicePrice || 0),
          assignedAt: serverTimestamp(),
          status: 'active',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          saleId: safeSaleId,
        })
      );
      return { success: true, assigned: true };
    }

    return { success: true, assigned: false };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: 'No hay permisos para completar este pago.' };
    }
    return { success: false, error: error.message };
  }
};

export const createMembershipSale = async (saleData) => {
  try {
    const {
      cliente_id,
      metodo_pago,
      total,
      membership_name,
      monto_recibido,
      tipo_venta = "ALTA_MEMBRESIA",
      sellerId = null,
      sellerEmail = null,
      vendedorId = null,
      vendedorEmail = null,
      cliente_auth_uid = null,
      cliente_nombre_override = null,
      cliente_email_override = null
    } = saleData;

    const folio = generateSaleFolio();

    let cliente_username = null;
    let cliente_email = null;
    let clienteNombre = null;

    if (cliente_id) {
      try {
        const userDoc = await withAuthRetry(() => getDoc(doc(db, "users", String(cliente_id))));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const nombre = userData.firstName || userData.first_name || "";
          const apellido = userData.lastName || userData.last_name || "";
          const nombreCompleto = `${nombre} ${apellido}`.trim();
          cliente_username = userData.username || userData.email;
          cliente_email = userData.email;
          clienteNombre = nombreCompleto || userData.displayName || userData.username || userData.email || "Cliente";
        }
      } catch {
        // Si no se puede leer users por reglas, usamos overrides y continuamos con la venta.
      }
    }

    if (!cliente_email && cliente_email_override) {
      cliente_email = String(cliente_email_override || '').trim();
    }

    if (!clienteNombre && cliente_nombre_override) {
      clienteNombre = String(cliente_nombre_override || '').trim();
    }

    const totalNumber = Number(total || 0);
    const payMethod = metodo_pago || "EFECTIVO";
    const receivedAmount = payMethod === "EFECTIVO"
      ? (Number(monto_recibido) || totalNumber)
      : totalNumber;

    await withAuthRetry(() => addDoc(collection(db, "ventas"), {
      folio,
      cliente: cliente_id || null,
      cliente_id: cliente_id || null,
      cliente_auth_uid: cliente_auth_uid || null,
      cliente_username,
      cliente_email,
      clienteEmail: cliente_email,
      clienteNombre,
      sellerId: sellerId || vendedorId || null,
      sellerEmail: sellerEmail || vendedorEmail || null,
      vendedorId: vendedorId || sellerId || null,
      vendedorEmail: vendedorEmail || sellerEmail || null,
      metodo_pago: payMethod,
      total: totalNumber,
      monto_recibido: receivedAmount,
      detalle_productos: JSON.stringify([
        {
          nombre: `Membresía: ${membership_name || "Membresía"}`,
          precio: totalNumber,
          cantidad: 1
        }
      ]),
      tipo_venta: tipo_venta,
      createdAt: getLocalMXDate(),
      fecha: getLocalMXDateISO()
    }));

    return { success: true, folio };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: 'No hay permisos para registrar este cobro en ventas.' };
    }
    return { success: false, error: error.message };
  }
};

export const createTrainerPayment = async (paymentData) => {
  try {
    const {
      trainerId,
      trainerName,
      trainerEmail,
      amount,
      paymentMethod = "DEPOSITO A CUENTA",
      contractType = null,
    } = paymentData;

    const totalAmount = Number(amount || 0);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return { success: false, error: "Monto inválido para pago de entrenador." };
    }

    const folio = `PT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await withAuthRetry(() => addDoc(collection(db, TRAINER_PAYMENTS_COLLECTION), {
      folio,
      categoria: "EGRESO",
      trainer_id: String(trainerId || ""),
      trainer_email: String(trainerEmail || ""),
      trainer_nombre: String(trainerName || "Entrenador"),
      contract_type: contractType || null,
      metodo_pago: paymentMethod,
      total: totalAmount,
      monto_recibido: totalAmount,
      detalle_productos: JSON.stringify([
        {
          nombre: `Pago entrenador: ${trainerName || "Entrenador"}`,
          precio: totalAmount,
          cantidad: 1,
        }
      ]),
      createdAt: getLocalMXDate(),
      fecha: getLocalMXDateISO(),
    }));

    return { success: true, folio };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: "No hay permisos para registrar pago de entrenador." };
    }
    return { success: false, error: error.message };
  }
};

export const getTrainerPayments = async (trainerId = null) => {
  try {
    const normalizedTrainerId = trainerId ? String(trainerId).trim() : null;
    const paymentQuery = normalizedTrainerId
      ? query(
          collection(db, TRAINER_PAYMENTS_COLLECTION),
          where("trainer_id", "==", normalizedTrainerId)
        )
      : query(collection(db, TRAINER_PAYMENTS_COLLECTION));

    const snapshot = await withAuthRetry(() => getDocs(paymentQuery));
    let payments = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    payments.sort((a, b) => {
      const aDate = a.createdAt?.toDate?.() || new Date(a.fecha || 0);
      const bDate = b.createdAt?.toDate?.() || new Date(b.fecha || 0);
      return bDate - aDate;
    });

    return { success: true, data: payments };
  } catch (error) {
    if (isPermissionDeniedError(error)) {
      return { success: false, error: "No hay permisos para consultar pagos de entrenadores." };
    }
    return { success: false, error: error.message };
  }
};

export const getSaleByFolio = async (folio) => {
  try {
    if (!folio) {
      return { success: false, exists: false, error: "Folio requerido" };
    }

    const salesQuery = query(
      collection(db, "ventas"),
      where("folio", "==", String(folio)),
      limit(1)
    );

    const snapshot = await getDocs(salesQuery);
    if (snapshot.empty) {
      return { success: true, exists: false };
    }

    const docSnap = snapshot.docs[0];
    return {
      success: true,
      exists: true,
      data: { id: docSnap.id, ...docSnap.data() }
    };
  } catch (error) {
    return { success: false, exists: false, error: error.message };
  }
};

export const getSales = async (filters = {}) => {
  try {
    const limitValue = filters.limit || 100;

    const mapDocs = (querySnapshot) => querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    let sales = [];

    if (filters.userId || filters.userEmail || filters.username) {
      const fieldQueries = [];

      if (filters.userId) {
        const userIdCandidates = [filters.userId];
        const numericUserId = Number(filters.userId);
        if (!Number.isNaN(numericUserId)) userIdCandidates.push(numericUserId);

        userIdCandidates.forEach((candidate) => {
          fieldQueries.push(
            query(collection(db, "ventas"), where("cliente", "==", candidate), limit(limitValue)),
            query(collection(db, "ventas"), where("cliente_id", "==", candidate), limit(limitValue)),
            query(collection(db, "ventas"), where("userId", "==", candidate), limit(limitValue))
          );
        });
      }

      if (filters.userEmail) {
        fieldQueries.push(
          query(collection(db, "ventas"), where("cliente_email", "==", filters.userEmail), limit(limitValue)),
          query(collection(db, "ventas"), where("clienteEmail", "==", filters.userEmail), limit(limitValue)),
          query(collection(db, "ventas"), where("email", "==", filters.userEmail), limit(limitValue))
        );
      }

      if (filters.username) {
        fieldQueries.push(
          query(collection(db, "ventas"), where("cliente_username", "==", filters.username), limit(limitValue)),
          query(collection(db, "ventas"), where("cliente", "==", filters.username), limit(limitValue))
        );
      }

      const snapshots = await Promise.allSettled(fieldQueries.map(q => getDocs(q)));
      const mergedById = new Map();

      snapshots.forEach((result) => {
        if (result.status === "fulfilled") {
          const docs = mapDocs(result.value);
          docs.forEach((sale) => {
            mergedById.set(sale.id, sale);
          });
        }
      });

      sales = Array.from(mergedById.values());
      
      sales.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt || 0);
        return dateB - dateA;
      });
      sales = sales.slice(0, limitValue);
    } else {
      const q = query(collection(db, "ventas"), orderBy("createdAt", "desc"), limit(limitValue));
      const querySnapshot = await getDocs(q);
      sales = mapDocs(querySnapshot);
    }

    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// HEALTH PROFILES
export const createHealthProfile = async (healthData) => {
  try {
    let completedData = { ...healthData };
    
    if (healthData.memberId && !healthData.userId) {
      try {
        const memberDoc = await getDoc(doc(db, "miembros", healthData.memberId));
        if (memberDoc.exists() && memberDoc.data().userId) {
          completedData.userId = memberDoc.data().userId;
        }
      } catch (err) {
        console.warn('No se pudo obtener userId del miembro:', err);
      }
    }

    const canonicalId = String(completedData.memberId || completedData.userId || "").trim();
    if (!canonicalId) {
      return { success: false, error: "No se pudo determinar el ID canónico de la ficha" };
    }

    const profileRef = doc(db, "healthProfiles", canonicalId);
    const existingCanonical = await getDoc(profileRef);

    const normalizedPayload = {
      ...completedData,
      memberId: String(completedData.memberId || canonicalId),
      userId: String(completedData.userId || canonicalId),
      userIdDisplay: String(completedData.userIdDisplay || canonicalId),
      age: completedData.age ?? completedData.edad ?? null,
      edad: completedData.edad ?? completedData.age ?? null
    };

    const getLocalMXDate = () => {
      const now = new Date();
      const mexicoOffset = -6 * 60; 
      const localDate = new Date(now.getTime() + (now.getTimezoneOffset() + mexicoOffset) * 60000);
      return localDate;
    };

    if (existingCanonical.exists()) {
      await updateDoc(profileRef, {
        ...normalizedPayload,
        updatedAt: getLocalMXDate()
      });
      return { success: true, id: canonicalId, updated: true };
    }

    const qMember = query(collection(db, "healthProfiles"), where("memberId", "==", normalizedPayload.memberId));
    const memberSnapshot = await getDocs(qMember);
    const qUser = query(collection(db, "healthProfiles"), where("userId", "==", normalizedPayload.userId));
    const userSnapshot = await getDocs(qUser);
    const legacyProfileDoc = memberSnapshot.docs[0] || userSnapshot.docs[0] || null;

    await setDoc(profileRef, {
      ...normalizedPayload,
      createdAt: legacyProfileDoc ? (legacyProfileDoc.data().createdAt || getLocalMXDate()) : getLocalMXDate(),
      updatedAt: getLocalMXDate()
    }, { merge: true });

    if (legacyProfileDoc && legacyProfileDoc.id !== canonicalId) {
      await deleteDoc(doc(db, "healthProfiles", legacyProfileDoc.id));
    }

    return { success: true, id: canonicalId, updated: Boolean(legacyProfileDoc) };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getHealthProfileByMemberId = async (memberId) => {
  try {
    const canonicalRef = doc(db, "healthProfiles", String(memberId));
    const canonicalSnap = await getDoc(canonicalRef);
    if (canonicalSnap.exists()) {
      const data = canonicalSnap.data();
      return { success: true, data: { id: canonicalSnap.id, ...data, age: data.age ?? data.edad ?? null, edad: data.edad ?? data.age ?? null } };
    }

    const q = query(collection(db, "healthProfiles"), where("memberId", "==", memberId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const profileDoc = querySnapshot.docs[0];
      const data = profileDoc.data();
      return { success: true, data: { id: profileDoc.id, ...data, age: data.age ?? data.edad ?? null, edad: data.edad ?? data.age ?? null } };
    }
    return { success: false, error: "Perfil de salud no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMemberByEmail = async (email) => {
  try {
    const q = query(collection(db, "miembros"), where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, data: { id: doc.id, ...doc.data() } };
    }
    return { success: false, error: "Miembro no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// NOTAS PRIVADAS DEL ENTRENADOR

export const createOrUpdateTrainerRoutine = async (routineData) => {
  try {
    const memberId = String(routineData?.memberId || '').trim();
    const trainerUid = String(routineData?.createdBy || '').trim();
    if (!memberId) {
      return { success: false, error: 'memberId es requerido' };
    }

    const canonicalRef = doc(db, 'trainerRoutines', memberId);
    const memberRoutineRef = doc(db, 'memberRoutines', memberId);
    const trainerScopedId = trainerUid ? `${memberId}_${trainerUid}` : '';
    const trainerScopedRef = trainerScopedId ? doc(db, 'trainerRoutines', trainerScopedId) : null;

    const payload = {
      memberId,
      memberName: routineData.memberName || '',
      memberEmail: routineData.memberEmail || '',
      memberAuthUid: routineData.memberAuthUid || '',
      memberUserId: routineData.memberUserId || '',
      routineName: routineData.routineName || '',
      days: Array.isArray(routineData.days) ? routineData.days : [],
      steps: Array.isArray(routineData.steps) ? routineData.steps : [],
      files: Array.isArray(routineData.files) ? routineData.files : [],
      createdBy: routineData.createdBy || '',
      trainerEmail: routineData.trainerEmail || '',
      ownerUid: trainerUid,
      updatedAt: serverTimestamp(),
    };

    const upsertRoutineDoc = async (routineRef) => {
      try {
        await withAuthRetry(() => updateDoc(routineRef, payload));
        return;
      } catch (error) {
        if (!isNotFoundError(error)) {
          throw error;
        }
      }

      await withAuthRetry(() =>
        setDoc(
          routineRef,
          {
            ...payload,
            createdAt: serverTimestamp(),
          },
          { merge: true }
        )
      );
    };

    try {
      await upsertRoutineDoc(canonicalRef);
      await upsertRoutineDoc(memberRoutineRef);
      return { success: true, id: memberId };
    } catch (error) {
      const isPermissionError = isPermissionDeniedError(error);
      if (!isPermissionError || !trainerScopedRef) {
        await upsertRoutineDoc(memberRoutineRef);
        return { success: true, id: `memberRoutines_${memberId}`, fallback: true };
      }

      try {
        await upsertRoutineDoc(trainerScopedRef);
        await upsertRoutineDoc(memberRoutineRef);
        return { success: true, id: trainerScopedId, fallback: true };
      } catch {
        await upsertRoutineDoc(memberRoutineRef);
        return { success: true, id: `memberRoutines_${memberId}`, fallback: true };
      }
    }
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const getTrainerRoutineByMember = async (memberId) => {
  try {
    const canonicalId = String(memberId || '').trim();
    if (!canonicalId) {
      return { success: false, error: 'memberId es requerido' };
    }

    const authUid = String(auth.currentUser?.uid || '').trim();
    const docCandidates = [canonicalId];
    if (authUid) {
      docCandidates.unshift(`${canonicalId}_${authUid}`);
    }

    for (const candidateId of docCandidates) {
      try {
        const routineRef = doc(db, 'trainerRoutines', candidateId);
        const routineSnap = await withAuthRetry(() => getDoc(routineRef));
        if (routineSnap.exists()) {
          return { success: true, data: { id: routineSnap.id, ...routineSnap.data() } };
        }
      } catch (error) {
        const isPermissionError = isPermissionDeniedError(error);
        if (!isPermissionError) throw error;
      }
    }

    try {
      const memberRoutineSnap = await withAuthRetry(() => getDoc(doc(db, 'memberRoutines', canonicalId)));
      if (memberRoutineSnap.exists()) {
        return { success: true, data: { id: memberRoutineSnap.id, ...memberRoutineSnap.data() } };
      }
    } catch (error) {
      const isPermissionError = isPermissionDeniedError(error);
      if (!isPermissionError) throw error;
    }

    const queryCandidates = [
      query(collection(db, 'trainerRoutines'), where('memberId', '==', canonicalId), limit(1)),
    ];

    for (const q of queryCandidates) {
      try {
        const querySnapshot = await withAuthRetry(() => getDocs(q));
        if (!querySnapshot.empty) {
          const routineDoc = querySnapshot.docs[0];
          return { success: true, data: { id: routineDoc.id, ...routineDoc.data() } };
        }
      } catch (error) {
        const isPermissionError = isPermissionDeniedError(error);
        if (!isPermissionError) throw error;
      }
    }

    return { success: false, error: 'Rutina no encontrada' };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const subscribeTrainerRoutineByMember = (memberId, onRoutineChange) => {
  const canonicalId = String(memberId || '').trim();
  if (!canonicalId || typeof onRoutineChange !== 'function') {
    return () => {};
  }

  const routineRef = doc(db, 'trainerRoutines', canonicalId);
  const memberRoutineRef = doc(db, 'memberRoutines', canonicalId);

  const emitFallbackRoutine = async () => {
    try {
      const memberRoutineSnap = await getDoc(memberRoutineRef);
      if (memberRoutineSnap.exists()) {
        onRoutineChange({ id: memberRoutineSnap.id, ...memberRoutineSnap.data() });
        return;
      }

      const q = query(collection(db, 'trainerRoutines'), where('memberId', '==', canonicalId), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const routineDoc = querySnapshot.docs[0];
        onRoutineChange({ id: routineDoc.id, ...routineDoc.data() });
        return;
      }

      onRoutineChange(null);
    } catch {
      onRoutineChange(null);
    }
  };

  return onSnapshot(
    routineRef,
    async (routineSnap) => {
      try {
        if (routineSnap.exists()) {
          onRoutineChange({ id: routineSnap.id, ...routineSnap.data() });
          return;
        }

        await emitFallbackRoutine();
      } catch {
        await emitFallbackRoutine();
      }
    },
    async () => {
      await emitFallbackRoutine();
    }
  );
};

export const getAllTrainerRoutines = async () => {
  try {
    const q = query(collection(db, 'trainerRoutines'), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const routines = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data()
    }));
    return { success: true, data: routines };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteTrainerRoutineByMember = async (memberId) => {
  try {
    const canonicalId = String(memberId || '').trim();
    if (!canonicalId) {
      return { success: false, error: 'memberId es requerido' };
    }

    const authUid = String(auth.currentUser?.uid || '').trim();
    const targetIds = authUid ? [`${canonicalId}_${authUid}`, canonicalId] : [canonicalId];

    let deletedAny = false;
    for (const targetId of targetIds) {
      try {
        await withAuthRetry(() => deleteDoc(doc(db, 'trainerRoutines', targetId)));
        deletedAny = true;
      } catch (error) {
        const isPermissionError = isPermissionDeniedError(error) || isNotFoundError(error);
        if (!isPermissionError) throw error;
      }
    }

    try {
      await withAuthRetry(() => deleteDoc(doc(db, 'memberRoutines', canonicalId)));
      deletedAny = true;
    } catch (error) {
      const isPermissionError = isPermissionDeniedError(error) || isNotFoundError(error);
      if (!isPermissionError) throw error;
    }

    if (!deletedAny) {
      return { success: false, error: 'No se encontro una rutina eliminable para este entrenador.' };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const createTrainerNote = async (noteData) => {
  try {
    const docRef = await addDoc(collection(db, "trainerNotes"), {
      ...noteData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getTrainerNotesByMember = async (memberId) => {
  try {
    const q = query(
      collection(db, "trainerNotes"), 
      where("memberId", "==", memberId),
      orderBy("updatedAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: notes };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllTrainerNotes = async () => {
  try {
    const q = query(collection(db, "trainerNotes"), orderBy("updatedAt", "desc"));
    const querySnapshot = await getDocs(q);
    const notes = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: notes };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getAllClientTrainerAssignments = async () => {
  try {
    const q = query(collection(db, 'client_trainer_assignments'), orderBy('updatedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const assignments = querySnapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return { success: true, data: assignments };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateTrainerNote = async (noteId, noteData) => {
  try {
    const noteRef = doc(db, "trainerNotes", noteId);
    await updateDoc(noteRef, {
      ...noteData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteTrainerNote = async (noteId) => {
  try {
    await deleteDoc(doc(db, "trainerNotes", noteId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// REPOSITORIO DE DIETAS
export const getAllDietFiles = async () => {
  try {
    const q = query(collection(db, 'dietFiles'), orderBy('createdAt', 'desc'));
    const snap = await withAuthRetry(() => getDocs(q));
    const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getDietFilesByMember = async (memberId) => {
  try {
    const safeMemberId = String(memberId || '').trim();
    if (!safeMemberId) {
      return { success: true, data: [] };
    }

    const q = query(collection(db, 'dietFiles'), where('memberId', '==', safeMemberId));
    const snap = await withAuthRetry(() => getDocs(q));
    const data = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || a.updatedAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createDietFileRecord = async (recordData) => {
  try {
    const ownerUid = String(auth.currentUser?.uid || '');
    const docRef = await withAuthRetry(() =>
      addDoc(collection(db, 'dietFiles'), {
        ...recordData,
        ownerUid,
        uploadedByUid: ownerUid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const deleteDietFileRecord = async (fileId) => {
  try {
    await withAuthRetry(() => deleteDoc(doc(db, 'dietFiles', fileId)));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// NUTRICIONIST ASSIGNMENTS
export const assignNutritionistToClient = async (clientId, nutritionistId) => {
  try {
    // Verificar si ya tiene asignado
    const existing = await getClientNutritionistAssignment(clientId);
    if (existing.success && existing.data) {
      return { success: false, error: 'Ya tienes un nutriólogo asignado' };
    }

    await withAuthRetry(() =>
      setDoc(doc(db, 'client_nutritionist_assignments', clientId), {
        clientId,
        nutritionistId,
        assignedAt: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getClientNutritionistAssignment = async (clientId) => {
  try {
    await waitForAuthReady();
    const docSnap = await withAuthRetry(() => getDoc(doc(db, 'client_nutritionist_assignments', clientId)));
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: false, error: 'No encontrado' };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const removeNutritionistFromClient = async (clientId) => {
  try {
    await withAuthRetry(() => deleteDoc(doc(db, 'client_nutritionist_assignments', clientId)));
    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

// NUTRITIONIST REVIEWS
export const addNutritionistReview = async (clientId, nutritionistId, rating, comment = '') => {
  try {
    await waitForAuthReady();
    const authUid = getAuthenticatedUserId();
    if (!authUid) {
      return { success: false, error: 'No hay sesión activa. Por favor inicia sesión.' };
    }
    if (!clientId || clientId !== authUid) {
      clientId = authUid;
    }

    if (auth.currentUser?.getIdToken) {
      await auth.currentUser.getIdToken(true);
    }

    console.debug('addNutritionistReview', { authUid, clientId, nutritionistId, rating, comment });

    // Si ya existe reseña previa, permitir actualizarla aunque la asignación haya cambiado.
    const existingQuery = query(
      collection(db, 'nutritionist_reviews'),
      where('clientId', '==', clientId),
      where('nutritionistId', '==', nutritionistId),
      limit(1)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      await withAuthRetry(() =>
        updateDoc(doc(db, 'nutritionist_reviews', existingDoc.id), {
          rating: Math.max(1, Math.min(5, rating)),
          comment: comment.trim(),
          updatedAt: serverTimestamp(),
        })
      );
      return { success: true, updated: true };
    }

    // Para una nueva reseña, sí exigimos asignación activa con el nutriólogo.
    const assignment = await getClientNutritionistAssignment(clientId);
    if (!assignment.success || assignment.data.nutritionistId !== nutritionistId) {
      return { success: false, error: 'Solo puedes calificar a tu nutriólogo asignado' };
    }

    await withAuthRetry(() =>
      addDoc(collection(db, 'nutritionist_reviews'), {
        clientId,
        nutritionistId,
        rating: Math.max(1, Math.min(5, rating)), // Clamp 1-5
        comment: comment.trim(),
        createdAt: serverTimestamp()
      })
    );
    return { success: true };
  } catch (error) {
    console.error('addNutritionistReview failed', error);
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const getNutritionistReviews = async (nutritionistIds) => {
  try {
    if (!nutritionistIds || nutritionistIds.length === 0) {
      return { success: true, data: {} };
    }

    const reviewsQuery = query(
      collection(db, 'nutritionist_reviews'),
      where('nutritionistId', 'in', nutritionistIds.slice(0, 10)) // Firestore limita a 10 en 'in'
    );
    const querySnap = await getDocs(reviewsQuery);

    const reviewsByNutri = {};
    querySnap.docs.forEach(doc => {
      const data = doc.data();
      const nutriId = data.nutritionistId;
      if (!reviewsByNutri[nutriId]) {
        reviewsByNutri[nutriId] = [];
      }
      reviewsByNutri[nutriId].push(data);
    });

    return { success: true, data: reviewsByNutri };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// TRAINER ASSIGNMENTS
export const assignTrainerToClient = async (clientId, trainerId, options = {}) => {
  try {
    const serviceTypeOption = typeof options === 'string' ? options : options.serviceType;
    const paymentCheck = await hasClientPaidTrainerService(clientId, trainerId, serviceTypeOption);
    if (!paymentCheck.success) {
      return { success: false, error: paymentCheck.error || 'No se pudo validar el pago del servicio.' };
    }

    if (!paymentCheck.paid) {
      return { success: false, error: 'Primero debes pagar el servicio de entrenamiento en el gimnasio.' };
    }

    // Verificar si ya tiene asignado
    const existing = await getClientTrainerAssignment(clientId);
    if (existing.success && existing.data) {
      return { success: false, error: 'Ya tienes un entrenador asignado' };
    }

    await withAuthRetry(() =>
      setDoc(doc(db, 'client_trainer_assignments', clientId), {
        clientId,
        trainerId,
        serviceType: normalizeTrainerServiceType(serviceTypeOption) || normalizeTrainerServiceType(paymentCheck.data?.serviceType || paymentCheck.data?.service_type || '') || TRAINER_SERVICE_TYPE_PERSONAL,
        serviceLabel: paymentCheck.data?.serviceLabel || paymentCheck.data?.service_label || (normalizeTrainerServiceType(serviceTypeOption) === TRAINER_SERVICE_TYPE_GROUP ? 'Grupal' : 'Personal'),
        servicePrice: Number(paymentCheck.data?.total || paymentCheck.data?.trainerServicePrice || paymentCheck.data?.trainer_service_price || 0),
        saleId: paymentCheck.data?.id || null,
        assignedAt: serverTimestamp(),
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    );
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getClientTrainerAssignment = async (clientId) => {
  try {
    await waitForAuthReady();
    const docSnap = await withAuthRetry(() => getDoc(doc(db, 'client_trainer_assignments', clientId)));
    if (docSnap.exists()) {
      return { success: true, data: docSnap.data() };
    }
    return { success: false, error: 'No encontrado' };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const removeTrainerFromClient = async (clientId) => {
  try {
    const safeClientId = String(clientId || '').trim();
    if (!safeClientId) {
      return { success: false, error: 'clientId es requerido' };
    }

    await withAuthRetry(() => deleteDoc(doc(db, 'client_trainer_assignments', safeClientId)));
    return { success: true };
  } catch (error) {
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

// TRAINER REVIEWS
export const addTrainerReview = async (clientId, trainerId, rating, comment = '') => {
  try {
    await waitForAuthReady();
    const authUid = getAuthenticatedUserId();
    if (!authUid) {
      return { success: false, error: 'No hay sesión activa. Por favor inicia sesión.' };
    }
    if (!clientId || clientId !== authUid) {
      clientId = authUid;
    }

    if (auth.currentUser?.getIdToken) {
      await auth.currentUser.getIdToken(true);
    }

    console.debug('addTrainerReview', { authUid, clientId, trainerId, rating, comment });

    // Si ya existe reseña previa, permitir actualizarla aunque la asignación haya cambiado.
    const existingQuery = query(
      collection(db, 'trainer_reviews'),
      where('clientId', '==', clientId),
      where('trainerId', '==', trainerId),
      limit(1)
    );
    const existingSnap = await getDocs(existingQuery);
    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      await withAuthRetry(() =>
        updateDoc(doc(db, 'trainer_reviews', existingDoc.id), {
          rating: Math.max(1, Math.min(5, rating)),
          comment: comment.trim(),
          updatedAt: serverTimestamp(),
        })
      );
      return { success: true, updated: true };
    }

    // Para una nueva reseña, sí exigimos asignación activa con el entrenador.
    const assignment = await getClientTrainerAssignment(clientId);
    if (!assignment.success || assignment.data.trainerId !== trainerId) {
      return { success: false, error: 'Solo puedes calificar a tu entrenador asignado' };
    }

    await withAuthRetry(() =>
      addDoc(collection(db, 'trainer_reviews'), {
        clientId,
        trainerId,
        rating: Math.max(1, Math.min(5, rating)), // Clamp 1-5
        comment: comment.trim(),
        createdAt: serverTimestamp()
      })
    );
    return { success: true };
  } catch (error) {
    console.error('addTrainerReview failed', error);
    return { success: false, error: normalizeFirestoreError(error) };
  }
};

export const getTrainerReviews = async (trainerIds) => {
  try {
    if (!trainerIds || trainerIds.length === 0) {
      return { success: true, data: {} };
    }

    const reviewsQuery = query(
      collection(db, 'trainer_reviews'),
      where('trainerId', 'in', trainerIds.slice(0, 10)) // Firestore limita a 10 en 'in'
    );
    const querySnap = await getDocs(reviewsQuery);

    const reviewsByTrainer = {};
    querySnap.docs.forEach(doc => {
      const data = doc.data();
      const trainerId = data.trainerId;
      if (!reviewsByTrainer[trainerId]) {
        reviewsByTrainer[trainerId] = [];
      }
      reviewsByTrainer[trainerId].push(data);
    });

    return { success: true, data: reviewsByTrainer };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

