import { useEffect, useState } from 'react';
import {
  asignarEntrenadorACliente,
  cargarEstadoServicioEntrenadores,
  guardarCalificacionEntrenador,
  refrescarResenasEntrenadores,
  registrarPagoServicioEntrenador,
} from './servicioEntrenadores';
import {
  normalizarTipoServicio,
  obtenerConfiguracionServicio,
  obtenerPrecioPorTipoServicio,
} from './utilidadesServicioEntrenador';

export function useServicioEntrenadores() {
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

  const refrescarResenas = async (listaEntrenadores = entrenadores) => {
    const ids = listaEntrenadores.map((item) => item.id);
    const resultado = await refrescarResenasEntrenadores(ids);
    if (resultado.success) setReviews(resultado.data);
  };

  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const resultado = await cargarEstadoServicioEntrenadores();
        if (!resultado.success) {
          setError(resultado.error || 'No se pudo cargar la información de servicios');
          return;
        }

        const estado = resultado.data || {};
        const listaEntrenadores = estado.entrenadores || [];
        setCurrentClientId(estado.currentClientId || null);
        setAssignedTrainerId(estado.assignedTrainerId || null);
        setEntrenadores(listaEntrenadores);
        setReviews(estado.reviews || {});

        if (listaEntrenadores.length > 0 && !estado.reviews) {
          await refrescarResenas(listaEntrenadores);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, []);

  const calcularPromedio = (trainerId) => {
    const rese = reviews[trainerId] || [];
    if (rese.length === 0) return null;
    const suma = rese.reduce((acc, r) => acc + r.rating, 0);
    return (suma / rese.length).toFixed(1);
  };

  const seleccionarEntrenador = (entrenador) => {
    if (!currentClientId) return setErrorModal({ isOpen: true, title: 'Sesión no identificada', message: 'No se pudo identificar al cliente actual.' });
    if (assignedTrainerId) return setErrorModal({ isOpen: true, title: 'Entrenador ya asignado', message: 'Ya tienes un entrenador asignado. Si deseas cambiar, contacta a recepción.' });
    setPendingTrainerSelection(entrenador);
  };

  const confirmarSeleccionEntrenador = () => {
    const entrenador = pendingTrainerSelection;
    if (!entrenador) return;

    const config = obtenerConfiguracionServicio(entrenador);
    const tipos = [];
    if (config.offersPersonal) tipos.push('PERSONAL');
    if (config.offersGroup) tipos.push('GRUPAL');

    if (tipos.length === 0) {
      setPendingTrainerSelection(null);
      setErrorModal({ isOpen: true, title: 'Servicios no configurados', message: 'Este entrenador aún no tiene servicios configurados. Contacta a recepción.' });
      return;
    }

    const tipoDefault = tipos[0];
    setPendingTrainerSelection(null);
    setPendingPaymentTrainer({ ...entrenador, serviceTypeOptions: tipos });
    setSelectedServiceType(tipoDefault);
    setPaymentAmount(String(obtenerPrecioPorTipoServicio(entrenador, tipoDefault)));
    setPaymentMethod('EFECTIVO');
  };

  const cambiarTipoServicio = (tipo) => {
    const normalizado = normalizarTipoServicio(tipo) || 'PERSONAL';
    setSelectedServiceType(normalizado);
    if (pendingPaymentTrainer) {
      setPaymentAmount(String(obtenerPrecioPorTipoServicio(pendingPaymentTrainer, normalizado)));
    }
  };

  const confirmarPagoYAsignacion = async () => {
    const entrenador = pendingPaymentTrainer;
    const monto = Number(String(paymentAmount).replace(',', '.'));
    const tipo = normalizarTipoServicio(selectedServiceType) || 'PERSONAL';
    if (!entrenador || !currentClientId || !Number.isFinite(monto) || monto <= 0) {
      return setErrorModal({ isOpen: true, title: 'Monto inválido', message: 'Ingresa un monto válido mayor a 0 para continuar.' });
    }

    setAssigning(true);
    try {
      const pago = await registrarPagoServicioEntrenador({
        clientId: currentClientId,
        entrenador,
        amount: monto,
        paymentMethod,
        serviceType: tipo,
      });
      if (!pago.success) throw new Error(pago.error || 'No se pudo registrar el pago.');

      setPendingPaymentTrainer(null);
      setSelectedServiceType('PERSONAL');

      if (pago.paymentStatus === 'pending') {
        setSuccessModal({ isOpen: true, title: 'Pago pendiente de validación', message: 'Tu pago en efectivo fue registrado. Acude a recepción para validarlo y activar la asignación del entrenador.' });
      } else {
        const asignacion = await asignarEntrenadorACliente({
          clientId: currentClientId,
          trainerId: entrenador.id,
          serviceType: tipo,
        });
        if (!asignacion.success) throw new Error(asignacion.error || 'No se pudo asignar el entrenador.');

        setAssignedTrainerId(entrenador.id);
        setSelectedEntrenador(entrenador);
        setSuccessModal({ isOpen: true, title: 'Pago registrado y entrenador asignado', message: `Tu pago fue confirmado y se asignó a ${entrenador.displayName || `${entrenador.firstName || ''} ${entrenador.lastName || ''}`.trim() || entrenador.nombre || 'tu entrenador'}.` });
      }
    } catch (err) {
      setErrorModal({ isOpen: true, title: 'Error al procesar pago', message: err.message || 'Inténtalo de nuevo en unos segundos.' });
    } finally {
      setAssigning(false);
    }
  };

  const solicitarCalificacion = (trainerId, rating) => {
    if (!currentClientId) return setErrorModal({ isOpen: true, title: 'Sesión no identificada', message: 'No se pudo identificar al cliente actual.' });
    if (assignedTrainerId !== trainerId) return setErrorModal({ isOpen: true, title: 'Calificación no permitida', message: 'Solo puedes calificar a tu entrenador asignado.' });
    setPendingRating({ trainerId, rating });
  };

  const confirmarCalificacion = async () => {
    if (!pendingRating?.trainerId || !pendingRating?.rating) return;
    try {
      const resultado = await guardarCalificacionEntrenador({
        clientId: currentClientId,
        trainerId: pendingRating.trainerId,
        rating: pendingRating.rating,
      });
      if (!resultado.success) {
        setErrorModal({ isOpen: true, title: 'Error al calificar', message: resultado.error || 'No se pudo registrar la calificación.' });
      } else {
        setSuccessModal({ isOpen: true, title: resultado.updated ? 'Calificación actualizada' : 'Calificación registrada', message: resultado.updated ? 'Tu calificación se actualizó correctamente.' : 'Gracias por calificar a tu entrenador.' });
        await refrescarResenas();
      }
    } finally {
      setPendingRating(null);
    }
  };

  return {
    entrenadores, loading, error, selectedEntrenador, assignedTrainerId, assigning, currentClientId,
    reviews, hoveredStars, pendingTrainerSelection, pendingRating, pendingPaymentTrainer,
    selectedServiceType, paymentAmount, paymentMethod, successModal, errorModal,
    setHoveredStars, setPaymentAmount, setPaymentMethod, setPendingTrainerSelection,
    setPendingPaymentTrainer, setSelectedServiceType, setPendingRating, setSuccessModal, setErrorModal,
    calcularPromedio, seleccionarEntrenador, confirmarSeleccionEntrenador, cambiarTipoServicio,
    confirmarPagoYAsignacion, solicitarCalificacion, confirmarCalificacion,
  };
}