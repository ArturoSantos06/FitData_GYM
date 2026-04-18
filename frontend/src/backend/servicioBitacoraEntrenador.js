import {
  collection,
  createTrainerNote,
  db,
  deleteTrainerNote,
  getAllMembers,
  getAllTrainerNotes,
  getCurrentUser,
  getDocs,
  getTrainerNotesByMember,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  updateTrainerNote,
} from './firebase';
import { EVENTO_VISIBILIDAD_CLIENTES, filtrarClientesOcultos } from './visibilidadClientes';
import { normalizarTextoLlave } from './normalizacion';

export const obtenerEntrenadorActual = () => {
  const usuario = getCurrentUser();
  return usuario ? { uid: usuario.uid, email: usuario.email } : null;
};

export async function obtenerMiembrosAsignadosEntrenador() {
  const authUser = getCurrentUser();
  if (!authUser) return { success: false, error: 'No hay sesión activa de entrenador', data: [] };

  const [resultadoMiembros, asignaciones, porAuthUid, porDocId, porCorreo] = await Promise.all([
    getAllMembers(),
    getDocs(collection(db, 'client_trainer_assignments')),
    getUserByAuthUid(authUser.uid),
    getUser(authUser.uid),
    authUser.email ? getUserByEmail(authUser.email, authUser.uid) : Promise.resolve({ success: false }),
  ]);

  if (!resultadoMiembros.success) return { success: false, error: 'Error al cargar miembros', data: [] };

  const llavesEntrenador = new Set([authUser.uid, authUser.email].map(normalizarTextoLlave).filter(Boolean));
  [porAuthUid, porDocId, porCorreo]
    .filter((r) => r?.success && r?.data)
    .forEach((r) => [r.data.id, r.data.authUid, r.data.legacyId, r.data.email]
      .map(normalizarTextoLlave)
      .filter(Boolean)
      .forEach((llave) => llavesEntrenador.add(llave)));

  const llavesAsignadas = new Set();
  asignaciones.docs.forEach((docSnap) => {
    const asignacion = docSnap.data() || {};
    const estado = String(asignacion.status || asignacion.trainerStatus || 'active').toLowerCase();
    const idEntrenador = normalizarTextoLlave(asignacion.trainerId || asignacion.trainer_id);
    const correoEntrenador = normalizarTextoLlave(asignacion.trainerEmail || asignacion.trainer_email);
    if ((llavesEntrenador.has(idEntrenador) || llavesEntrenador.has(correoEntrenador)) && estado === 'active') {
      [asignacion.clientId, asignacion.memberId, docSnap.id]
        .map(normalizarTextoLlave)
        .filter(Boolean)
        .forEach((llave) => llavesAsignadas.add(llave));
    }
  });

  const asignados = filtrarClientesOcultos(resultadoMiembros.data || []).filter((miembro) => {
    const llavesMiembro = [miembro.id, miembro.userId, miembro.authUid, miembro.email].map(normalizarTextoLlave).filter(Boolean);
    return llavesMiembro.some((llave) => llavesAsignadas.has(llave));
  });

  return { success: true, data: asignados };
}

export async function obtenerConteoNotasBitacora() {
  const resultado = await getAllTrainerNotes();
  if (!resultado.success) return { success: false, error: 'Error al cargar el conteo de notas', data: {} };

  const conteos = resultado.data.reduce((acc, nota) => {
    const id = String(nota.memberId || '').trim();
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

  return { success: true, data: conteos };
}

export const obtenerNotasPorMiembro = async (memberId) => getTrainerNotesByMember(memberId);
export const crearNotaBitacora = async (payload) => createTrainerNote(payload);
export const actualizarNotaBitacora = async (noteId, note) => updateTrainerNote(noteId, { note });
export const eliminarNotaBitacora = async (noteId) => deleteTrainerNote(noteId);

export const suscribirseCambiosVisibilidadBitacora = (callback) => {
  const handler = () => callback();
  window.addEventListener(EVENTO_VISIBILIDAD_CLIENTES, handler);
  return () => window.removeEventListener(EVENTO_VISIBILIDAD_CLIENTES, handler);
};