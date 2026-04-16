import React, { useEffect, useState } from 'react';
import { db, auth } from '../../../firebase/config';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { User, Star, Award, CheckCircle, Dumbbell } from 'lucide-react';
import { getCurrentUser, waitForAuthReady, createTrainerServiceSale, assignTrainerToClient, getClientTrainerAssignment, getTrainerReviews, addTrainerReview } from '../../../firebase';
import ConfirmModal from '../../ConfirmModal';
import SuccessModal from '../../SuccessModal';
import ErrorModal from '../../ErrorModal';
import ModalPagoServicioEntrenador from '../../ModalPagoServicioEntrenador';

const SERVICE_TYPE_LABELS = {
  PERSONAL: 'Personal',
  GRUPAL: 'Grupal',
};

const normalizeServiceType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('grupal') || raw.includes('group') || raw.includes('grupo')) return 'GRUPAL';
  if (raw.includes('personal') || raw.includes('individual') || raw.includes('uno a uno') || raw.includes('1 a 1')) return 'PERSONAL';
  if (raw === 'grupal') return 'GRUPAL';
  if (raw === 'personal') return 'PERSONAL';
  return '';
};

const formatMoney = (value) => Number(value || 0).toLocaleString();

const ListaEntrenadores = () => {
  const [entrenadores, setEntrenadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedEntrenador, setSelectedEntrenador] = useState(null);
  const [currentClientId, setCurrentClientId] = useState(null);
  const [assignedTrainerId, setAssignedTrainerId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [reviews, setReviews] = useState({});
  const [hoveredStars, setHoveredStars] = useState({});
  const [pendingTrainerSelection, setPendingTrainerSelection] = useState(null);
  const [pendingRating, setPendingRating] = useState(null);
  const [pendingPaymentTrainer, setPendingPaymentTrainer] = useState(null);
  const [selectedServiceType, setSelectedServiceType] = useState('PERSONAL');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('EFECTIVO');
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });

  const normalizeTrainerKey = (trainer = {}) => {
    const authUid = String(trainer.authUid || trainer.uid || trainer.id || '').trim().toLowerCase();
    const email = String(trainer.email || '').trim().toLowerCase();
    const displayName = String(trainer.displayName || '').trim().toLowerCase();
    return authUid || email || displayName;
  };

  const getTrainerServicePrice = (trainer = {}) => {
    const value = Number(
      trainer.trainerServicePrice ??
      trainer.personalServicePrice ??
      trainer.groupServicePrice ??
      trainer.servicePrice ??
      trainer.costoServicio ??
      trainer.costo_servicio ??
      trainer.price ??
      0
    );
    return Number.isFinite(value) && value > 0 ? value : 0;
  };

  const getTrainerServiceSettings = (trainer = {}) => {
    const legacyPrice = getTrainerServicePrice(trainer);
    const serviceOptions = trainer.serviceOptions || trainer.service_options || trainer.serviceTypes || trainer.service_types || {};
    const personalPrice = Number(
      trainer.personalServicePrice ??
      trainer.personal_service_price ??
      serviceOptions.personalPrice ??
      serviceOptions.personal_price ??
      legacyPrice
    );
    const groupPrice = Number(
      trainer.groupServicePrice ??
      trainer.group_service_price ??
      serviceOptions.groupPrice ??
      serviceOptions.group_price ??
      legacyPrice
    );
    const offersPersonal = trainer.offersPersonalService ?? trainer.personalServiceEnabled ?? serviceOptions.personal ?? serviceOptions.PERSONAL;
    const offersGroup = trainer.offersGroupService ?? trainer.groupServiceEnabled ?? serviceOptions.group ?? serviceOptions.GRUPAL;

    return {
      offersPersonal: offersPersonal === undefined ? legacyPrice > 0 : Boolean(offersPersonal),
      offersGroup: offersGroup === undefined ? legacyPrice > 0 : Boolean(offersGroup),
      personalPrice: Number.isFinite(personalPrice) && personalPrice > 0 ? personalPrice : legacyPrice,
      groupPrice: Number.isFinite(groupPrice) && groupPrice > 0 ? groupPrice : legacyPrice,
    };
  };

  const getTrainerServicePriceByType = (trainer = {}, serviceType = 'PERSONAL') => {
    const settings = getTrainerServiceSettings(trainer);
    const normalizedType = normalizeServiceType(serviceType) || 'PERSONAL';
    return normalizedType === 'GRUPAL' ? settings.groupPrice : settings.personalPrice;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        await waitForAuthReady();

        // Obtener cliente actual
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setError('No se pudo identificar al cliente actual');
          return;
        }
        setCurrentClientId(currentUser.uid);

        // Verificar si ya tiene entrenador asignado
        const assignment = await getClientTrainerAssignment(currentUser.uid);
        if (assignment.success) {
          setAssignedTrainerId(assignment.data.trainerId);
        }

        // Obtener lista de entrenadores
        console.log("Iniciando consulta de entrenadores a Firestore...");
        const q = query(collection(db, "users"), where("role", "in", ["trainer", "entrenador"]));
        const querySnapshot = await getDocs(q);

        const uniqueTrainers = [];
        const seenTrainerKeys = new Set();

        querySnapshot.docs.forEach((docSnap) => {
          const trainer = {
            id: docSnap.id,
            ...docSnap.data()
          };

          const trainerKey = normalizeTrainerKey(trainer);
          if (!trainerKey || seenTrainerKeys.has(trainerKey)) {
            return;
          }

          seenTrainerKeys.add(trainerKey);
          uniqueTrainers.push(trainer);
        });

        console.log("Entrenadores encontrados:", uniqueTrainers);
        setEntrenadores(uniqueTrainers);

        // Obtener reseñas
        if (uniqueTrainers.length > 0) {
          const trainerIds = uniqueTrainers.map(e => e.id);
          const reviewsResult = await getTrainerReviews(trainerIds);
          if (reviewsResult.success) {
            setReviews(reviewsResult.data);
          }
        }
      } catch (err) {
        console.error("Error detallado:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const calculateAverageRating = (trainerId) => {
    const trainerReviews = reviews[trainerId] || [];
    if (trainerReviews.length === 0) return null;
    const sum = trainerReviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / trainerReviews.length).toFixed(1);
  };

  const getReviewCount = (trainerId) => {
    return reviews[trainerId]?.length || 0;
  };

  const handleSelectEntrenador = async (entrenador) => {
    if (!currentClientId) {
      setErrorModal({
        isOpen: true,
        title: 'Sesión no identificada',
        message: 'No se pudo identificar al cliente actual.',
      });
      return;
    }

    if (assignedTrainerId) {
      setErrorModal({
        isOpen: true,
        title: 'Entrenador ya asignado',
        message: 'Ya tienes un entrenador asignado. Si deseas cambiar, contacta a recepción.',
      });
      return;
    }

    setPendingTrainerSelection(entrenador);
  };

  const confirmPayAndAssignTrainer = async () => {
    const trainerToPay = pendingPaymentTrainer;
    const amountValue = Number(String(paymentAmount).replace(',', '.'));
    const normalizedServiceType = normalizeServiceType(selectedServiceType) || 'PERSONAL';

    if (!trainerToPay || !currentClientId) return;

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setErrorModal({
        isOpen: true,
        title: 'Monto inválido',
        message: 'Ingresa un monto válido mayor a 0 para continuar.',
      });
      return;
    }

    setAssigning(true);
    try {
      const paymentResult = await createTrainerServiceSale({
        clientId: currentClientId,
        trainerId: trainerToPay.id,
        trainerName: trainerToPay.displayName || `${trainerToPay.firstName || ''} ${trainerToPay.lastName || ''}`.trim() || trainerToPay.nombre || 'Entrenador',
        trainerEmail: trainerToPay.email,
        amount: amountValue,
        paymentMethod,
        serviceType: normalizedServiceType,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'No se pudo registrar el pago.');
      }

      setPendingPaymentTrainer(null);
      setSelectedServiceType('PERSONAL');

      if (paymentResult.paymentStatus === 'pending') {
        setSuccessModal({
          isOpen: true,
          title: 'Pago pendiente de validación',
          message: 'Tu pago en efectivo fue registrado. Acude a recepción para validarlo y activar la asignación del entrenador.',
        });
      } else {
        const assignmentResult = await assignTrainerToClient(currentClientId, trainerToPay.id, { serviceType: normalizedServiceType });
        if (!assignmentResult.success) {
          throw new Error(assignmentResult.error || 'No se pudo asignar el entrenador.');
        }

        setAssignedTrainerId(trainerToPay.id);
        setSelectedEntrenador(trainerToPay);
        setSuccessModal({
          isOpen: true,
          title: 'Pago registrado y entrenador asignado',
          message: `Tu pago fue confirmado y se asignó a ${trainerToPay.displayName || `${trainerToPay.firstName || ''} ${trainerToPay.lastName || ''}`.trim() || trainerToPay.nombre || 'tu entrenador'}.`,
        });
      }
    } catch (err) {
      console.error('Error pagando y asignando entrenador:', err);
      setErrorModal({
        isOpen: true,
        title: 'Error al procesar pago',
        message: err.message || 'Inténtalo de nuevo en unos segundos.',
      });
    } finally {
      setAssigning(false);
    }
  };

  const confirmSelectEntrenador = async () => {
    const entrenador = pendingTrainerSelection;
    if (!entrenador || !currentClientId) return;

    const serviceSettings = getTrainerServiceSettings(entrenador);
    const serviceTypeOptions = [];
    if (serviceSettings.offersPersonal) serviceTypeOptions.push('PERSONAL');
    if (serviceSettings.offersGroup) serviceTypeOptions.push('GRUPAL');

    if (serviceTypeOptions.length === 0) {
      setPendingTrainerSelection(null);
      setErrorModal({
        isOpen: true,
        title: 'Servicios no configurados',
        message: 'Este entrenador aún no tiene servicios configurados. Contacta a recepción.',
      });
      return;
    }

    const defaultServiceType = serviceTypeOptions[0];
    setPendingTrainerSelection(null);
    setPendingPaymentTrainer({
      ...entrenador,
      serviceTypeOptions,
    });
    setSelectedServiceType(defaultServiceType);
    setPaymentAmount(String(getTrainerServicePriceByType(entrenador, defaultServiceType)));
    setPaymentMethod('EFECTIVO');
  };

  const handleServiceTypeChange = (serviceType) => {
    const normalizedType = normalizeServiceType(serviceType) || 'PERSONAL';
    setSelectedServiceType(normalizedType);
    if (pendingPaymentTrainer) {
      setPaymentAmount(String(getTrainerServicePriceByType(pendingPaymentTrainer, normalizedType)));
    }
  };

  const handleRateTrainer = async (trainerId, rating) => {
    if (!currentClientId) {
      setErrorModal({
        isOpen: true,
        title: 'Sesión no identificada',
        message: 'No se pudo identificar al cliente actual.',
      });
      return;
    }

    if (assignedTrainerId !== trainerId) {
      setErrorModal({
        isOpen: true,
        title: 'Calificación no permitida',
        message: 'Solo puedes calificar a tu entrenador asignado.',
      });
      return;
    }

    setPendingRating({ trainerId, rating });
  };

  const confirmRateTrainer = async () => {
    const ratingData = pendingRating;
    if (!ratingData?.trainerId || !ratingData?.rating) return;
    
    try {
      const result = await addTrainerReview(currentClientId, ratingData.trainerId, ratingData.rating);
      if (result.success) {
        setSuccessModal({
          isOpen: true,
          title: result.updated ? 'Calificación actualizada' : 'Calificación registrada',
          message: result.updated ? 'Tu calificación se actualizó correctamente.' : 'Gracias por calificar a tu entrenador.',
        });
        // Refresh reviews
        const trainerIds = entrenadores.map(e => e.id);
        const reviewsResult = await getTrainerReviews(trainerIds);
        if (reviewsResult.success) {
          setReviews(reviewsResult.data);
        }
      } else {
        setErrorModal({
          isOpen: true,
          title: 'Error al calificar',
          message: result.error || 'No se pudo registrar la calificación.',
        });
      }
    } catch (err) {
      console.error('Error calificando:', err);
      setErrorModal({
        isOpen: true,
        title: 'Error al procesar calificación',
        message: 'Inténtalo de nuevo en unos segundos.',
      });
    } finally {
      setPendingRating(null);
    }
  };

  if (error) return (
    <div className="p-6 text-center">
      <div className="bg-red-900/20 border border-red-500 rounded-xl p-4 text-red-400">
        <p className="font-semibold">Error al cargar entrenadores</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="p-6 text-center">
      <div className="animate-pulse">
        <div className="bg-slate-800 rounded-xl p-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="h-4 bg-slate-700 rounded w-3/4 mx-auto mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-1/2 mx-auto"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {assignedTrainerId && (
        <div className="bg-green-900/20 border border-green-500 rounded-xl p-4 text-green-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            <p className="font-semibold">Ya tienes un entrenador asignado</p>
          </div>
          <p className="text-sm mt-1">Si deseas cambiar de especialista, contacta a recepción del gimnasio.</p>
        </div>
      )}

      {entrenadores.length > 0 ? (
        <div
          className="grid gap-6 justify-center"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 260px))' }}
        >
          {entrenadores.map((e) => (
            <div
              key={e.id}
              className={`relative w-full bg-slate-900/60 border rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 ${
                selectedEntrenador?.id === e.id
                  ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/20'
                  : 'border-slate-700'
                }`}
            >
              {selectedEntrenador?.id === e.id && (
                <div className="absolute top-3 right-3">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                </div>
              )}

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Dumbbell className="w-8 h-8 text-blue-400" />
                </div>

                <div>
                  <h3 className="font-bold text-white text-lg">
                    {e.displayName || `${String(e.firstName || '').trim()} ${String(e.lastName || '').trim()}`.trim() || e.nombre || 'Sin nombre'}
                  </h3>
                  <p className="text-blue-400 text-sm font-medium">{e.especialidad || 'Entrenador Personal'}</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
                    {getTrainerServiceSettings(e).offersPersonal ? (
                      <span className="px-2 py-1 rounded-full bg-cyan-900/40 text-cyan-200 border border-cyan-700">
                        Personal ${formatMoney(getTrainerServicePriceByType(e, 'PERSONAL'))} MXN
                      </span>
                    ) : null}
                    {getTrainerServiceSettings(e).offersGroup ? (
                      <span className="px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-200 border border-emerald-700">
                        Grupal ${formatMoney(getTrainerServicePriceByType(e, 'GRUPAL'))} MXN
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {assignedTrainerId === e.id ? (
                    // Estrellas interactivas para calificar
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const trainerReviews = reviews[e.id] || [];
                        const myReview = trainerReviews.find(r => r.clientId === currentClientId);
                        const myRating = myReview ? myReview.rating : 0;
                        const displayRating = hoveredStars[e.id] || myRating;
                        const isFilled = star <= displayRating;

                        return (
                          <button
                            key={star}
                            onClick={() => handleRateTrainer(e.id, star)}
                            onMouseEnter={() => setHoveredStars(prev => ({ ...prev, [e.id]: star }))}
                            onMouseLeave={() => setHoveredStars(prev => ({ ...prev, [e.id]: 0 }))}
                            className="focus:outline-none"
                          >
                            <Star
                              className={`w-4 h-4 transition-colors ${isFilled ? 'text-amber-400 fill-current' : 'text-slate-600'}`}
                            />
                          </button>
                        );
                      })}
                      <span className="text-slate-400 text-xs ml-2">
                        {calculateAverageRating(e.id) ? `(${calculateAverageRating(e.id)})` : '(Sin calificaciones)'}
                      </span>
                    </div>
                  ) : (
                    // Estrellas estáticas mostrando promedio
                    <>
                      {[1, 2, 3, 4, 5].map((star) => {
                        const avgStr = calculateAverageRating(e.id);
                        const avg = avgStr ? parseFloat(avgStr) : null;
                        const filled = avg ? star <= Math.round(avg) : false;
                        return (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${filled ? 'text-amber-400 fill-current' : 'text-slate-600'}`}
                          />
                        );
                      })}
                      <span className="text-slate-400 text-xs ml-2">
                        {calculateAverageRating(e.id) ? `(${calculateAverageRating(e.id)})` : '(Sin reseñas)'}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Award className="w-4 h-4" />
                  <span>Certificado</span>
                </div>

                <button
                  onClick={() => handleSelectEntrenador(e)}
                  disabled={assigning || assignedTrainerId === e.id}
                  className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${assignedTrainerId === e.id
                      ? 'bg-green-600 hover:bg-green-500 text-white cursor-not-allowed'
                      : selectedEntrenador?.id === e.id
                        ? 'bg-blue-600 hover:bg-blue-500 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'
                    }`}
                >
                  {assigning && selectedEntrenador?.id === e.id ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mx-auto"></div>
                      Asignando...
                    </>
                  ) : assignedTrainerId === e.id ? (
                    <>
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Asignado
                    </>
                  ) : (
                    'Seleccionar'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">No se encontraron entrenadores disponibles</p>
          <p className="text-slate-500 text-sm mt-2">Estamos trabajando para expandir nuestro equipo de entrenadores.</p>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingTrainerSelection)}
        onClose={() => {
          if (!assigning) {
            setPendingTrainerSelection(null);
          }
        }}
        onConfirm={confirmSelectEntrenador}
        title="Confirmar entrenador"
        message={pendingTrainerSelection
          ? `¿Estas seguro de seleccionar a ${pendingTrainerSelection.displayName || `${pendingTrainerSelection.firstName || ''} ${pendingTrainerSelection.lastName || ''}`.trim() || pendingTrainerSelection.nombre || 'este entrenador'} como tu entrenador?\n\nEsto iniciara tu plan de entrenamiento personalizado.`
          : ''}
        confirmLabel={assigning ? 'Asignando...' : 'Si, Seleccionar'}
        variant="info"
      />

      <ModalPagoServicioEntrenador
        isOpen={Boolean(pendingPaymentTrainer)}
        title="Confirmar pago del servicio"
        subtitle={pendingPaymentTrainer
          ? `Para continuar con tu servicio de entrenamiento, elige el tipo de servicio y confirma el pago.`
          : ''}
        serviceType={selectedServiceType}
        serviceTypeOptions={(pendingPaymentTrainer?.serviceTypeOptions || []).map((type) => ({
          value: type,
          label: SERVICE_TYPE_LABELS[type] || type,
        }))}
        serviceTypeReadOnly={(pendingPaymentTrainer?.serviceTypeOptions || []).length <= 1}
        onServiceTypeChange={handleServiceTypeChange}
        value={paymentAmount}
        amountReadOnly={true}
        amountHelperText="El monto se ajusta automáticamente según el tipo de servicio seleccionado."
        paymentMethod={paymentMethod}
        onChange={setPaymentAmount}
        onPaymentMethodChange={setPaymentMethod}
        onConfirm={confirmPayAndAssignTrainer}
        confirmLabel={assigning ? 'Procesando...' : 'Pagar y asignar'}
        onClose={() => {
          setPendingPaymentTrainer(null);
          setSelectedServiceType('PERSONAL');
          setPaymentAmount('');
        }}
      />

      <ConfirmModal
        isOpen={Boolean(pendingRating)}
        onClose={() => setPendingRating(null)}
        onConfirm={confirmRateTrainer}
        title="Confirmar calificación"
        message={pendingRating
          ? `¿Calificar a este entrenador con ${pendingRating.rating} estrella(s)?`
          : ''}
        confirmLabel="Sí, Calificar"
        variant="info"
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '' })}
        title={successModal.title}
        message={successModal.message}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />
    </div>
  );
};

export default ListaEntrenadores;