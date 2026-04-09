import React, { useState, useEffect, useCallback } from 'react';
import { Clock, AlertCircle, CheckCircle, Dumbbell, Users } from 'lucide-react';
import {
  getUsers,
  getAllTrainerRoutines,
  getAllTrainerNotes,
  deactivateTrainerByAdmin,
  reactivateTrainerByAdmin,
  createTrainerPayment,
  getTrainerPayments,
} from '../../firebase';
import ConfirmModal from '../ConfirmModal';
import ErrorModal from '../ErrorModal';
import SuccessModal from '../SuccessModal';
import ClientesConServicioEntrenador from './ClientesConServicioEntrenador';
import EntrenadoresYPagos from './EntrenadoresYPagos';
import ModalEntradaPago from './ModalEntradaPago';

function GestionEntrenadores() {
  const [trainingServices, setTrainingServices] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [inactiveTrainers, setInactiveTrainers] = useState([]);
  const [trainerPayments, setTrainerPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('daysRemaining');
  const [activeTab, setActiveTab] = useState('clients');
  const [deactivatingTrainerId, setDeactivatingTrainerId] = useState('');
  const [reactivatingTrainerId, setReactivatingTrainerId] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '', subMessage: '' });
  const [modalPago, setModalPago] = useState({
    isOpen: false,
    trainerId: '',
    trainerName: '',
    trainerEmail: '',
    contractType: '',
    paymentMethod: 'DEPOSITO A CUENTA',
    amount: '',
    mes: 0,
    anio: 0,
  });
  const [filterMesPagos, setFilterMesPagos] = useState(new Date().getMonth() + 1);
  const [filterAnioPagos, setFilterAnioPagos] = useState(new Date().getFullYear());
  const [filterMesEntrenadores, setFilterMesEntrenadores] = useState(new Date().getMonth() + 1);
  const [filterAnioEntrenadores, setFilterAnioEntrenadores] = useState(new Date().getFullYear());

  const toMs = (value) => {
    if (!value) return 0;
    if (typeof value?.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const normalizeTrainerKey = (routine = {}) => {
    const uid = String(routine.createdBy || '').trim();
    const email = String(routine.trainerEmail || '').trim().toLowerCase();
    return uid || email || 'unknown-trainer';
  };

  const isTrainerUser = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    return Boolean(
      user.isActive !== false &&
      user.trainerStatus !== 'inactive' &&
      (
        role === 'trainer' ||
        role === 'entrenador' ||
        role === 'coach' ||
        user.isTrainer === true ||
        user.is_trainer === true
      )
    );
  };

  const isInactiveTrainerUser = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    const looksTrainer =
      role === 'inactive_trainer' ||
      role === 'trainer' ||
      role === 'entrenador' ||
      role === 'coach' ||
      user.trainer === true ||
      user.contractType ||
      user.tipoContrato;

    const isInactive =
      user.isActive === false ||
      user.trainerActive === false ||
      String(user.trainerStatus || '').toLowerCase() === 'inactive' ||
      String(user.contractStatus || '').toLowerCase() === 'inactive' ||
      role === 'inactive_trainer';

    return Boolean(looksTrainer && isInactive);
  };

  const loadTrainingData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersResult, routinesResult, notesResult, paymentsResult] = await Promise.all([
        getUsers(),
        getAllTrainerRoutines(),
        getAllTrainerNotes(),
        getTrainerPayments(),
      ]);

      const users = usersResult.success ? usersResult.data : [];
      const routines = routinesResult.success ? routinesResult.data : [];
      const notes = notesResult.success ? notesResult.data : [];
      const payments = paymentsResult.success ? paymentsResult.data : [];

      const trainerUsers = users.filter(isTrainerUser);
      const trainerUsersInactive = users.filter(isInactiveTrainerUser);
      const trainerMap = new Map();
      const inactiveTrainerMap = new Map();

      trainerUsers.forEach((u) => {
        const id = String(u.authUid || u.id || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        const canonicalKey = email || id;
        const fullName = (
          u.displayName ||
          `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim() ||
          u.username ||
          u.email ||
          'Entrenador'
        );

        const trainerData = {
          id: id || email,
          name: fullName,
          email: u.email || 'Sin correo',
          specialty: u.specialty || u.especialidad || 'General',
          rfc: u.rfc || u.RFC || '',
          clabe: u.clabe || u.CLABE || u.cuentaBancaria || u.numeroCuenta || u.accountNumber || '',
          bankAccount: u.cuentaBancaria || u.numeroCuenta || u.accountNumber || u.bankAccount || u.clabe || u.cuenta || '',
          bankName: u.banco || u.bankName || '',
          clientsSet: new Set(),
          activeContracts: 0,
          monthlyRevenue: Number(u.monthlyRevenue || u.ingresoMensual || 0),
          contractType: u.contractType || u.tipoContrato || 'Asignación por cliente',
        };

        if (canonicalKey) {
          const previous = trainerMap.get(canonicalKey);
          const shouldReplace = !previous || String(previous.name || '').length < String(fullName || '').length;
          trainerMap.set(canonicalKey, shouldReplace ? trainerData : previous);
        }
      });

      trainerUsersInactive.forEach((u) => {
        const id = String(u.authUid || u.id || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        const canonicalKey = email || id;
        const fullName = (
          u.displayName ||
          `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim() ||
          u.username ||
          u.email ||
          'Entrenador'
        );

        const trainerData = {
          id: id || email,
          name: fullName,
          email: u.email || 'Sin correo',
          specialty: u.specialty || u.especialidad || 'General',
          rfc: u.rfc || u.RFC || '',
          clabe: u.clabe || u.CLABE || u.cuentaBancaria || u.numeroCuenta || u.accountNumber || '',
          contractType: u.contractType || u.tipoContrato || 'Asignación por cliente',
        };

        if (canonicalKey) {
          const previous = inactiveTrainerMap.get(canonicalKey);
          const shouldReplace = !previous || String(previous.name || '').length < String(fullName || '').length;
          inactiveTrainerMap.set(canonicalKey, shouldReplace ? trainerData : previous);
        }
      });

      const serviceMap = new Map();
      routines.forEach((routine) => {
        const trainerKey = normalizeTrainerKey(routine);
        const trainerEmail = String(routine.trainerEmail || '').trim().toLowerCase();
        const trainerEntry = trainerMap.get(trainerKey) || trainerMap.get(trainerEmail) || null;

        const clientId = String(routine.memberId || '').trim();
        const updatedMs = toMs(routine.updatedAt || routine.createdAt);
        const daysSinceUpdate = updatedMs ? Math.floor((Date.now() - updatedMs) / (1000 * 60 * 60 * 24)) : 999;
        const daysRemaining = Math.max(0, 30 - daysSinceUpdate);
        const sessionsTotal = Array.isArray(routine.steps) ? routine.steps.length : 0;
        const serviceId = `${clientId || 'sin-cliente'}_${trainerKey}`;

        if (trainerEntry && clientId) {
          trainerEntry.clientsSet.add(clientId);
        }

        serviceMap.set(serviceId, {
          id: serviceId,
          clientName: routine.memberName || 'Cliente',
          clientEmail: routine.memberEmail || 'Sin correo',
          trainerName: trainerEntry?.name || (routine.trainerEmail || 'Entrenador'),
          serviceType: routine.routineName || 'Rutina personalizada',
          sessionsTotal,
          sessionsUsed: 0,
          endDate: routine.endDate || routine.updatedAt || new Date().toISOString(),
          status: daysRemaining > 0 ? 'active' : 'expired',
          daysRemaining,
          price: Number(routine.price || 0),
        });
      });

      const noteCountByTrainer = new Map();
      notes.forEach((note) => {
        const key = String(note.createdBy || '').trim() || String(note.trainerEmail || '').trim().toLowerCase();
        if (!key) return;
        const current = noteCountByTrainer.get(key) || 0;
        noteCountByTrainer.set(key, current + 1);
      });

      const consolidatedTrainers = [];
      const seen = new Set();
      trainerMap.forEach((trainer) => {
        if (!trainer?.id || seen.has(trainer.id)) return;
        seen.add(trainer.id);

        const notesCount = noteCountByTrainer.get(trainer.id) || noteCountByTrainer.get(String(trainer.email || '').toLowerCase()) || 0;
        const clientsCount = trainer.clientsSet.size;
        const baseRevenue = Number(trainer.monthlyRevenue || notesCount * 150 || 0);
        const revenueByClients = clientsCount > 0 ? baseRevenue : 0;
        consolidatedTrainers.push({
          ...trainer,
          clientsCount,
          activeContracts: clientsCount,
          monthlyRevenue: revenueByClients,
        });
      });

      const consolidatedInactiveTrainers = [];
      const seenInactive = new Set();
      inactiveTrainerMap.forEach((trainer) => {
        if (!trainer?.id || seenInactive.has(trainer.id)) return;
        seenInactive.add(trainer.id);
        consolidatedInactiveTrainers.push(trainer);
      });

      setTrainingServices(Array.from(serviceMap.values()));
      setTrainers(consolidatedTrainers);
      setInactiveTrainers(consolidatedInactiveTrainers);
      setTrainerPayments(payments);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainingData();
  }, [loadTrainingData]);

  const filteredServices = trainingServices
    .filter((service) => {
      const matchesSearch =
        service.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.clientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.trainerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.serviceType?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || service.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (sortBy === 'daysRemaining') return b.daysRemaining - a.daysRemaining;
      if (sortBy === 'name') return (a.clientName || '').localeCompare(b.clientName || '');
      if (sortBy === 'trainer') return (a.trainerName || '').localeCompare(b.trainerName || '');
      return 0;
    });

  const stats = {
    totalClients: trainingServices.length,
    activeServices: trainingServices.filter((s) => s.status === 'active').length,
    totalTrainers: trainers.length,
  };

  const getStatusBadge = (service) => {
    const { status, daysRemaining, sessionsTotal, sessionsUsed } = service;
    const sessionsPending = sessionsTotal - sessionsUsed;

    if (status === 'active' && daysRemaining > 7) {
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-3 py-1 bg-green-900/50 text-green-300 rounded-full text-xs font-semibold border border-green-600">
            <CheckCircle size={14} />
            {daysRemaining} días
          </span>
          <span className="text-xs text-gray-400">{sessionsPending} sesiones restantes</span>
        </div>
      );
    }

    if (status === 'active' && daysRemaining <= 7 && daysRemaining > 0) {
      return (
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-1 px-3 py-1 bg-yellow-900/50 text-yellow-300 rounded-full text-xs font-semibold border border-yellow-600">
            <Clock size={14} />
            {daysRemaining} días
          </span>
          <span className="text-xs text-gray-400">{sessionsPending} sesiones restantes</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-1 px-3 py-1 bg-red-900/50 text-red-300 rounded-full text-xs font-semibold border border-red-600">
          <AlertCircle size={14} />
          Vencido
        </span>
        <span className="text-xs text-gray-400">{sessionsUsed}/{sessionsTotal} sesiones</span>
      </div>
    );
  };

  const getFilteredMonthlyRevenue = (trainer, mes, anio) => {
    if (!trainer) return 0;
    const assignedClients = Number(trainer.clientsCount || trainer.activeContracts || 0);
    if (assignedClients <= 0) return 0;
    return Number(trainer.monthlyRevenue || 0);
  };

  const buildPaymentMethodForTrainer = (trainer) => {
    const bankAccount = String(trainer?.bankAccount || '').trim();
    const bankName = String(trainer?.bankName || '').trim();

    if (bankAccount) {
      const last4 = bankAccount.slice(-4);
      const bankPart = bankName ? `${bankName} ` : '';
      return `DEPOSITO A CUENTA ${bankPart}****${last4}`.trim();
    }

    return 'DEPOSITO A CUENTA';
  };

  const executeDeactivateTrainer = async (trainer) => {
    if (!trainer?.id) return;
    try {
      setDeactivatingTrainerId(trainer.id);
      const result = await deactivateTrainerByAdmin({ trainerId: trainer.id, trainerEmail: trainer.email });
      if (!result?.success) throw new Error(result?.error || 'No se pudo descontratar al entrenador.');
      await loadTrainingData();
    } catch (error) {
      console.error('Error al descontratar entrenador:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al descontratar',
        message: error.message || 'No se pudo descontratar al entrenador.',
      });
    } finally {
      setDeactivatingTrainerId('');
    }
  };

  const executeReactivateTrainer = async (trainer) => {
    if (!trainer?.id) return;
    try {
      setReactivatingTrainerId(trainer.id);
      const result = await reactivateTrainerByAdmin({ trainerId: trainer.id, trainerEmail: trainer.email });
      if (!result?.success) throw new Error(result?.error || 'No se pudo recontratar al entrenador.');
      await loadTrainingData();
    } catch (error) {
      console.error('Error al recontratar entrenador:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al recontratar',
        message: error.message || 'No se pudo recontratar al entrenador.',
      });
    } finally {
      setReactivatingTrainerId('');
    }
  };

  const handleDeactivateTrainer = (trainer) => {
    if (!trainer?.id) return;
    setPendingAction({ type: 'deactivate', trainer });
  };

  const handleReactivateTrainer = (trainer) => {
    if (!trainer?.id) return;
    setPendingAction({ type: 'reactivate', trainer });
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction?.trainer) return;
    const actionToRun = pendingAction;
    setPendingAction(null);
    if (actionToRun.type === 'deactivate') return executeDeactivateTrainer(actionToRun.trainer);
    return executeReactivateTrainer(actionToRun.trainer);
  };

  const handleTrainerPayment = async (trainer) => {
    const filteredRevenue = getFilteredMonthlyRevenue(trainer, filterMesEntrenadores, filterAnioEntrenadores);
    const hasRfc = Boolean(String(trainer?.rfc || trainer?.RFC || '').trim());
    const hasClabe = Boolean(String(trainer?.clabe || trainer?.CLABE || trainer?.bankAccount || '').trim());

    if (!hasRfc || !hasClabe) {
      setErrorModal({
        isOpen: true,
        title: 'Falta información fiscal',
        message: `${trainer?.name || 'El entrenador'} debe tener RFC y CLABE registrados en su perfil antes de poder recibir pagos.`,
      });
      return;
    }

    if (filteredRevenue <= 0) {
      setErrorModal({
        isOpen: true,
        title: 'Entrenador sin ingresos',
        message: `${trainer?.name || 'Entrenador'} no tiene ingresos registrados en el mes y año seleccionados. Cambia el periodo o registra ingresos antes de pagar.`,
      });
      return;
    }

    const suggestedAmount = filteredRevenue > 0 ? filteredRevenue : Number(trainer?.monthlyRevenue || 0);
    setModalPago({
      isOpen: true,
      trainerId: trainer.id,
      trainerName: trainer.name,
      trainerEmail: trainer.email,
      contractType: trainer.contractType,
      paymentMethod: buildPaymentMethodForTrainer(trainer),
      amount: suggestedAmount > 0 ? String(suggestedAmount) : '',
      mes: filterMesEntrenadores,
      anio: filterAnioEntrenadores,
    });
  };

  const handleConfirmarPagoModal = async () => {
    const parsedAmount = Number(String(modalPago.amount).replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setErrorModal({
        isOpen: true,
        title: 'Monto inválido',
        message: 'Ingresa un monto válido mayor a 0 para registrar el pago.',
      });
      return;
    }

    try {
      const paymentResult = await createTrainerPayment({
        trainerId: modalPago.trainerId,
        trainerName: modalPago.trainerName,
        trainerEmail: modalPago.trainerEmail,
        amount: parsedAmount,
        paymentMethod: modalPago.paymentMethod || 'DEPOSITO A CUENTA',
        contractType: modalPago.contractType,
      });

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'No se pudo registrar el pago.');
      }

      setModalPago({
        isOpen: false,
        trainerId: '',
        trainerName: '',
        trainerEmail: '',
        contractType: '',
        paymentMethod: 'DEPOSITO A CUENTA',
        amount: '',
        mes: 0,
        anio: 0,
      });
      await loadTrainingData();
      setSuccessModal({
        isOpen: true,
        title: 'Pago registrado',
        message: `Se registró el pago para ${modalPago.trainerName || 'el entrenador'}.`,
        subMessage: `Folio: ${paymentResult.folio}`,
      });
    } catch (error) {
      console.error('Error al registrar pago de entrenador:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al registrar pago',
        message: error.message || 'No se pudo registrar el pago del entrenador',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Dumbbell className="text-purple-400" />
            Gestión de Servicios de Entrenamiento
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-xl border border-blue-700/50 shadow-xl">
            <p className="text-blue-300 text-sm font-medium mb-1">Clientes con Servicio</p>
            <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
          </div>
          <div className="bg-linear-to-br from-green-900/50 to-green-800/30 p-6 rounded-xl border border-green-700/50 shadow-xl">
            <p className="text-green-300 text-sm font-medium mb-1">Servicios Activos</p>
            <p className="text-3xl font-bold text-white">{stats.activeServices}</p>
          </div>
          <div className="bg-linear-to-br from-purple-900/50 to-purple-800/30 p-6 rounded-xl border border-purple-700/50 shadow-xl">
            <p className="text-purple-300 text-sm font-medium mb-1">Total Entrenadores</p>
            <p className="text-3xl font-bold text-white">{stats.totalTrainers}</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'clients'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Clientes con Servicio
          </button>
          <button
            onClick={() => setActiveTab('trainers')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'trainers'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            💪 Entrenadores y Pagos
          </button>
        </div>

        {activeTab === 'clients' && (
          <ClientesConServicioEntrenador
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filteredServices={filteredServices}
            getStatusBadge={getStatusBadge}
          />
        )}

        {activeTab === 'trainers' && (
          <EntrenadoresYPagos
            trainers={trainers}
            inactiveTrainers={inactiveTrainers}
            trainerPayments={trainerPayments}
            filterMesEntrenadores={filterMesEntrenadores}
            setFilterMesEntrenadores={setFilterMesEntrenadores}
            filterAnioEntrenadores={filterAnioEntrenadores}
            setFilterAnioEntrenadores={setFilterAnioEntrenadores}
            filterMesPagos={filterMesPagos}
            setFilterMesPagos={setFilterMesPagos}
            filterAnioPagos={filterAnioPagos}
            setFilterAnioPagos={setFilterAnioPagos}
            getFilteredMonthlyRevenue={getFilteredMonthlyRevenue}
            handleTrainerPayment={handleTrainerPayment}
            handleDeactivateTrainer={handleDeactivateTrainer}
            handleReactivateTrainer={handleReactivateTrainer}
            deactivatingTrainerId={deactivatingTrainerId}
            reactivatingTrainerId={reactivatingTrainerId}
          />
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => {
          if (!deactivatingTrainerId && !reactivatingTrainerId) {
            setPendingAction(null);
          }
        }}
        onConfirm={handleConfirmPendingAction}
        title={pendingAction?.type === 'deactivate' ? 'Confirmar descontratación' : 'Confirmar recontratación'}
        message={pendingAction?.trainer
          ? `${pendingAction.type === 'deactivate' ? 'Se desactivará' : 'Se reactivará'} a ${pendingAction.trainer.name}.`
          : ''}
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Sí, Descontratar' : 'Sí, Recontratar'}
      />

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, title: '', message: '' })}
        title={errorModal.title}
        message={errorModal.message}
      />

      <SuccessModal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, title: '', message: '', subMessage: '' })}
        title={successModal.title}
        message={successModal.message}
        subMessage={successModal.subMessage}
      />

      <ModalEntradaPago
        isOpen={modalPago.isOpen}
        title="Registrar pago a entrenador"
        subtitle={`${modalPago.trainerName || 'Entrenador'} (${modalPago.mes ? new Date(2000, modalPago.mes - 1).toLocaleDateString('es-MX', { month: 'long' }) : ''} ${modalPago.anio || ''})`}
        value={modalPago.amount}
        onChange={(value) => setModalPago((prev) => ({ ...prev, amount: value }))}
        onClose={() => setModalPago({
          isOpen: false,
          trainerId: '',
          trainerName: '',
          trainerEmail: '',
          contractType: '',
          paymentMethod: 'DEPOSITO A CUENTA',
          amount: '',
          mes: 0,
          anio: 0,
        })}
        onConfirm={handleConfirmarPagoModal}
        confirmLabel="Registrar pago"
      />
    </div>
  );
}

export default GestionEntrenadores;
