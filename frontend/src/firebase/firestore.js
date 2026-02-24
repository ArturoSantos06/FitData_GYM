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
  serverTimestamp
} from "firebase/firestore";
import { db } from "./config";

// ========== USUARIOS ==========
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
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: "Usuario no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const updateUser = async (uid, userData) => {
  try {
    await updateDoc(doc(db, "users", uid), {
      ...userData,
      updatedAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== MIEMBROS ==========
export const getMembers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "miembros"));
    const members = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: members };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getMemberByUserId = async (userId) => {
  try {
    const q = query(collection(db, "miembros"), where("userId", "==", userId));
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

export const createMember = async (memberData) => {
  try {
    const docRef = await addDoc(collection(db, "miembros"), {
      ...memberData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== MEMBRESÍAS ==========
export const getUserMemberships = async (userId) => {
  try {
    const q = query(
      collection(db, "memberships"),
      where("userId", "==", userId),
      orderBy("startDate", "desc")
    );
    const querySnapshot = await getDocs(q);
    const memberships = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: memberships };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const createMembership = async (membershipData) => {
  try {
    const docRef = await addDoc(collection(db, "memberships"), {
      ...membershipData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// ========== PRODUCTOS ==========
export const getProducts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
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

// ========== ASISTENCIAS ==========
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

// ========== VENTAS ==========
export const createSale = async (saleData) => {
  try {
    const docRef = await addDoc(collection(db, "ventas"), {
      ...saleData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getSales = async (limitNum = 100) => {
  try {
    const q = query(
      collection(db, "ventas"),
      orderBy("createdAt", "desc"),
      limit(limitNum)
    );
    const querySnapshot = await getDocs(q);
    const sales = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: sales };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
