import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  addTrainerReview,
  assignTrainerToClient,
  createTrainerServiceSale,
  db,
  getClientTrainerAssignment,
  getCurrentUser,
  getTrainerReviews,
  waitForAuthReady,
} from './firebase';

const normalizarLlaveEntrenador = (entrenador = {}) => {
  const authUid = String(entrenador.authUid || entrenador.uid || entrenador.id || '').trim().toLowerCase();
  const email = String(entrenador.email || '').trim().toLowerCase();
  const nombre = String(entrenador.displayName || '').trim().toLowerCase();
  return authUid || email || nombre;
};

const esEntrenadorDisponible = (entrenador = {}) => {
  const role = String(entrenador.role || entrenador.user_type || '').toLowerCase();
  const status = String(entrenador.trainerStatus || entrenador.contractStatus || '').toLowerCase();

  return Boolean(
    entrenador.isActive !== false &&
    status !== 'inactive' &&
    (role === 'trainer' || role === 'entrenador')
  );
};

export async function cargarEstadoServicioEntrenadores() {
  await waitForAuthReady();
  const currentUser = getCurrentUser();
  if (!currentUser) return { success: false, error: 'No se pudo identificar al cliente actual' };

  const assignment = await getClientTrainerAssignment(currentUser.uid);

  const q = query(collection(db, 'users'), where('role', 'in', ['trainer', 'entrenador']));
  const querySnapshot = await getDocs(q);

  const entrenadores = [];
  const llaves = new Set();
  querySnapshot.docs.forEach((docSnap) => {
    const entrenador = { id: docSnap.id, ...docSnap.data() };
    const llave = normalizarLlaveEntrenador(entrenador);
    if (llave && !llaves.has(llave) && esEntrenadorDisponible(entrenador)) {
      llaves.add(llave);
      entrenadores.push(entrenador);
    }
  });

  const trainerIds = entrenadores.map((item) => item.id);
  const reviewsResult = await getTrainerReviews(trainerIds);

  return {
    success: true,
    data: {
      currentClientId: currentUser.uid,
      assignedTrainerId: assignment.success ? assignment.data.trainerId : null,
      entrenadores,
      reviews: reviewsResult.success ? reviewsResult.data : {},
    },
  };
}

export const refrescarResenasEntrenadores = async (idsEntrenadores) => getTrainerReviews(idsEntrenadores);

export async function registrarPagoServicioEntrenador({
  clientId,
  entrenador,
  amount,
  paymentMethod,
  serviceType,
}) {
  return createTrainerServiceSale({
    clientId,
    trainerId: entrenador.id,
    trainerName: entrenador.displayName || `${entrenador.firstName || ''} ${entrenador.lastName || ''}`.trim() || entrenador.nombre || 'Entrenador',
    trainerEmail: entrenador.email,
    amount,
    paymentMethod,
    serviceType,
  });
}

export const asignarEntrenadorACliente = async ({ clientId, trainerId, serviceType }) =>
  assignTrainerToClient(clientId, trainerId, { serviceType });

export const guardarCalificacionEntrenador = async ({ clientId, trainerId, rating }) =>
  addTrainerReview(clientId, trainerId, rating);