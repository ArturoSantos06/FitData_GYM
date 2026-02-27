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
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    }
    return { success: false, error: "Usuario no encontrado" };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email) => {
  try {
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
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

export const getUsers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, data: users };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// MIEMBROS
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

// MEMBRESÍAS
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
    
    // 1. Verificar si el usuario ya tiene membresía activa
    const existingMemberships = await getUserMemberships(userId);
    if (existingMemberships.success && existingMemberships.data.length > 0) {
      const activeMembership = existingMemberships.data.find(m => {
        const endDate = m.end_date?.toDate?.() || new Date(m.end_date);
        return endDate >= new Date();
      });
      
      if (activeMembership && !forceRenew) {
        return { 
          success: false, 
          conflict: true,
          message: "El cliente ya tiene una membresía activa",
          detail: `La membresía actual vence el ${new Date(activeMembership.end_date).toLocaleDateString('es-MX')}`,
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
    const now = new Date();
    const startDate = now.toISOString().split('T')[0];
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + membershipType.duration_days);
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // 4. Crear membresía
    const membershipData = {
      user: userId,
      membershipType: membershipTypeId,
      userId: userId,
      userName: userName || "",
      userFullName: userFullName || "",
      userEmail: userData.email || "",
      membershipName: membershipType.name,
      membershipTypeName: membershipType.name,
      membershipPrice: membershipType.price,
      startDate: startDate,
      endDate: endDateStr,
      durationDays: membershipType.duration_days,
      paymentMethod: paymentMethod,
      montoRecibido: montoRecibido,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, "memberships"), membershipData);
    
    return { 
      success: true, 
      message: "Membresía asignada correctamente",
      id: docRef.id,
      membershipData
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
    const q = query(collection(db, "miembros"), where("qr_code", "==", qrCode));
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

export const checkInMember = async (qrCode) => {
  try {
    // 1. Buscar miembro por QR
    const memberResult = await getMemberByQRCode(qrCode);
    if (!memberResult.success) {
      return { success: false, error: "Código QR no válido" };
    }
    
    const member = memberResult.data;
    
    // 2. Verificar si ya tiene check-in activo hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, "asistencias"),
      where("memberId", "==", member.id),
      where("fecha_hora_entrada", ">=", today)
    );
    
    const existingAttendance = await getDocs(q);
    const activeCheckIn = existingAttendance.docs.find(doc => !doc.data().fecha_hora_salida);
    
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
      const endDate = data.end_date?.toDate() || new Date(data.end_date);
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
    
    // 2. Buscar check-in activo del día
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const q = query(
      collection(db, "asistencias"),
      where("memberId", "==", member.id),
      where("fecha_hora_entrada", ">=", today.toISOString())
    );
    
    const attendanceSnapshot = await getDocs(q);
    const activeCheckIn = attendanceSnapshot.docs.find(doc => !doc.data().fecha_hora_salida);
    
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
      const startDate = new Date(filters.fecha);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filters.fecha);
      endDate.setHours(23, 59, 59, 999);
      attendances = attendances.filter(att => {
        if (!att.fecha_hora_entrada) return false;
        const checkIn = new Date(att.fecha_hora_entrada);
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
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    const folio = `V-${timestamp}-${random}`;
    
    // 3. Obtener información del cliente si existe
    let cliente_username = null;
    let cliente_email = null;
    if (cliente_id) {
      const userDoc = await getDoc(doc(db, "users", cliente_id));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        cliente_username = userData.username || userData.email;
        cliente_email = userData.email;
      }
    }
    
    // 4. Crear registro de venta
    const ventaData = {
      folio: folio,
      cliente: cliente_id || null,
      cliente_username: cliente_username,
      cliente_email: cliente_email,
      metodo_pago: metodo_pago,
      total: total,
      monto_recibido: monto_recibido || total,
      detalle_productos: JSON.stringify(productos),
      createdAt: serverTimestamp(),
      fecha: new Date().toISOString()
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

export const getSales = async (filters = {}) => {
  try {
    const constraints = [];
    
    // Filtro por userId
    if (filters.userId) {
      constraints.push(where("cliente", "==", filters.userId));
    }
    
    // Ordenar por fecha descendente
    constraints.push(orderBy("createdAt", "desc"));
    constraints.push(limit(filters.limit || 100));
    
    const q = query(collection(db, "ventas"), ...constraints);
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

// HEALTH PROFILES
export const createHealthProfile = async (healthData) => {
  try {
    const docRef = await addDoc(collection(db, "healthProfiles"), {
      ...healthData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getHealthProfileByMemberId = async (memberId) => {
  try {
    const q = query(collection(db, "healthProfiles"), where("memberId", "==", memberId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      return { success: true, data: { id: doc.id, ...doc.data() } };
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

// DIAGNÓSTICO DE IMÁGENES
export const getProductsWithoutImages = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "productos"));
    const productsWithoutImages = querySnapshot.docs
      .filter(doc => {
        const data = doc.data();
        const image = data.imagen || data.image;
        return !image || (typeof image === 'string' && image.trim() === '');
      })
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    return { success: true, data: productsWithoutImages, count: productsWithoutImages.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Función para diagnosticar estado de imágenes
export const diagnosisImages = async () => {
  try {
    const allProducts = await getProducts();
    if (!allProducts.success) throw new Error(allProducts.error);
    
    const withImages = allProducts.data.filter(p => {
      const img = p.imagen || p.image;
      return img && typeof img === 'string' && img.trim() !== '';
    });
    
    const withoutImages = allProducts.data.filter(p => {
      const img = p.imagen || p.image;
      return !img || (typeof img === 'string' && img.trim() === '');
    });
    
    console.log('=== DIAGNÓSTICO DE IMÁGENES ===');
    console.log(`Total de productos: ${allProducts.data.length}`);
    console.log(`Con imágenes: ${withImages.length}`);
    console.log(`Sin imágenes: ${withoutImages.length}`);
    console.log('Productos sin imágenes:', withoutImages.map(p => ({ id: p.id, nombre: p.nombre })));
    
    return {
      success: true,
      total: allProducts.data.length,
      withImages: withImages.length,
      withoutImages: withoutImages.length,
      productsWithoutImages: withoutImages
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

