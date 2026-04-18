import {
  collection,
  db,
  getCurrentUser,
  getDocs,
  getTrainerServiceSales,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  onAuthChanged,
  query,
  where,
  functions,
} from './firebase';
import { httpsCallable } from 'firebase/functions';

import { fechaDesdeFirebase, normalizarTextoLlave } from './normalizacion';

const esperarUsuarioEntrenador = () => {
  const usuarioActual = getCurrentUser();
  if (usuarioActual?.uid && usuarioActual?.email) return Promise.resolve(usuarioActual);

  return new Promise((resolve) => {
    let finalizado = false;
    const terminar = (usuario) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(idTimeout);
      cancelarEscucha();
      resolve(usuario || null);
    };

    const cancelarEscucha = onAuthChanged((usuario) => {
      if (usuario?.uid && usuario?.email) terminar(usuario);
    });

    const idTimeout = setTimeout(() => terminar(getCurrentUser()), 4000);
  });
};

const obtenerLlavesEntrenador = (usuarioAuth, resultadosUsuario) => {
  const llaves = new Set([usuarioAuth.uid, usuarioAuth.email].map(normalizarTextoLlave).filter(Boolean));

  resultadosUsuario
    .filter((resultado) => resultado?.success && resultado?.data)
    .forEach((resultado) => {
      [resultado.data.id, resultado.data.authUid, resultado.data.legacyId, resultado.data.email]
        .map(normalizarTextoLlave)
        .filter(Boolean)
        .forEach((llave) => llaves.add(llave));
    });

  return llaves;
};

const obtenerLlavesClientesAsignados = (asignacionesSnapshot, llavesEntrenador) => {
  const llavesClientes = new Set();

  asignacionesSnapshot.docs.forEach((docSnap) => {
    const asignacion = docSnap.data() || {};
    const estado = String(asignacion.status || asignacion.trainerStatus || 'active').toLowerCase();
    const idEntrenador = normalizarTextoLlave(asignacion.trainerId || asignacion.trainer_id);
    const correoEntrenador = normalizarTextoLlave(asignacion.trainerEmail || asignacion.trainer_email);
    const corresponde = llavesEntrenador.has(idEntrenador) || llavesEntrenador.has(correoEntrenador);

    if (!corresponde || estado !== 'active') return;

    [asignacion.clientId, asignacion.memberId, docSnap.id]
      .map(normalizarTextoLlave)
      .filter(Boolean)
      .forEach((llave) => llavesClientes.add(llave));
  });

  return llavesClientes;
};

const complementarVentasMesActual = async (ventasBase, llavesClientesAsignados) => {
  const ahora = new Date();
  const mesActual = ahora.getMonth() + 1;
  const anioActual = ahora.getFullYear();
  const ventas = [...ventasBase];

  try {
    const consultaVentas = query(collection(db, 'ventas'), where('tipo_venta', '==', 'SERVICIO_ENTRENAMIENTO'));
    const ventasSnapshot = await getDocs(consultaVentas);

    ventasSnapshot.docs.forEach((docSnap) => {
      const venta = docSnap.data() || {};
      const fechaVenta = fechaDesdeFirebase(venta.completedAt)
        || fechaDesdeFirebase(venta.updatedAt)
        || fechaDesdeFirebase(venta.createdAt)
        || fechaDesdeFirebase(venta.fecha);
      const idCliente = normalizarTextoLlave(venta.cliente_id || venta.cliente);

      if (!fechaVenta || fechaVenta.getMonth() + 1 !== mesActual || fechaVenta.getFullYear() !== anioActual) return;
      if (!idCliente || !llavesClientesAsignados.has(idCliente)) return;
      if (!ventas.find((item) => item.id === docSnap.id)) ventas.push({ id: docSnap.id, ...venta });
    });
  } catch (error) {
    console.warn('No se pudo leer ventas adicionales:', error?.message || error);
  }

  return { ventas, mesActual, anioActual };
};

const obtenerLlavesClientesPagados = (ventas, llavesClientesAsignados, mesActual, anioActual) => {
  const llavesPagadas = new Set();

  ventas.forEach((venta) => {
    const estadoPago = String(venta.payment_status || '').trim().toLowerCase();
    if (estadoPago !== 'completed') return;

    const llavesVenta = [
      venta.cliente_id,
      venta.cliente,
      venta.cliente_auth_uid,
      venta.clienteEmail,
      venta.cliente_email,
      venta.cliente_email_override,
    ].map(normalizarTextoLlave).filter(Boolean);

    const fechaVenta = fechaDesdeFirebase(venta.completedAt)
      || fechaDesdeFirebase(venta.updatedAt)
      || fechaDesdeFirebase(venta.createdAt)
      || fechaDesdeFirebase(venta.fecha);

    if (!fechaVenta || fechaVenta.getMonth() + 1 !== mesActual || fechaVenta.getFullYear() !== anioActual) return;
    if (!llavesVenta.some((llave) => llavesClientesAsignados.has(llave))) return;

    llavesVenta.forEach((llave) => llavesPagadas.add(llave));
  });

  return llavesPagadas;
};

export async function obtenerClientesDesvinculacion() {
  const usuarioAuth = await esperarUsuarioEntrenador();
  if (!usuarioAuth) return [];

  const [miembrosSnapshot, asignacionesSnapshot, porAuthUid, porDocId, porCorreo, ventasEntrenador] = await Promise.all([
    getDocs(collection(db, 'miembros')),
    getDocs(collection(db, 'client_trainer_assignments')),
    getUserByAuthUid(usuarioAuth.uid),
    getUser(usuarioAuth.uid),
    usuarioAuth.email ? getUserByEmail(usuarioAuth.email, usuarioAuth.uid) : Promise.resolve({ success: false }),
    getTrainerServiceSales(),
  ]);

  const llavesEntrenador = obtenerLlavesEntrenador(usuarioAuth, [porAuthUid, porDocId, porCorreo]);
  const llavesClientesAsignados = obtenerLlavesClientesAsignados(asignacionesSnapshot, llavesEntrenador);

  const ventasBase = ventasEntrenador?.success ? ventasEntrenador.data : [];
  const { ventas, mesActual, anioActual } = await complementarVentasMesActual(ventasBase, llavesClientesAsignados);
  const llavesClientesPagados = obtenerLlavesClientesPagados(ventas, llavesClientesAsignados, mesActual, anioActual);

  return miembrosSnapshot.docs
    .map((docSnap) => {
      const datos = docSnap.data() || {};
      const llavesMiembro = [docSnap.id, datos.userId, datos.authUid, datos.email]
        .map(normalizarTextoLlave)
        .filter(Boolean);

      if (!llavesMiembro.some((llave) => llavesClientesAsignados.has(llave))) return null;

      return {
        id: docSnap.id,
        nombre: datos.nombre ? `${datos.nombre} ${datos.apellido || ''}`.trim() : 'Sin nombre',
        pagoAlCorriente: llavesMiembro.some((llave) => llavesClientesPagados.has(llave)),
        estadoServicio: 'activo',
        archivado: Boolean(datos.archivado),
        eliminado: Boolean(datos.eliminado),
      };
    })
    .filter((cliente) => cliente && !cliente.eliminado);
}

const actualizarVisibilidadCliente = async ({ memberId, archivado, eliminado }) => {
  const callable = httpsCallable(functions, 'actualizarVisibilidadCliente');
  const result = await callable({ memberId, archivado, eliminado });
  return result?.data || { success: false, error: 'No se pudo actualizar el cliente.' };
};

export async function archivarClienteDesvinculacion(memberId, archivado) {
  return actualizarVisibilidadCliente({ memberId, archivado: Boolean(archivado) });
}

export async function eliminarClienteDesvinculacion(memberId) {
  return actualizarVisibilidadCliente({ memberId, eliminado: true });
}