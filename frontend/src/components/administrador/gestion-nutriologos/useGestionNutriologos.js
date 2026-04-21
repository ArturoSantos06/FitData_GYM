import { useCallback, useEffect, useState } from 'react';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, getUsers, removeNutritionistFromClient, updateUser } from '../../../firebase';

export const useGestionNutriologos = () => {
  const [loading, setLoading] = useState(true);
  const [nutritionistServices, setNutritionistServices] = useState([]);
  const [nutritionists, setNutritionists] = useState([]);
  const [inactiveNutritionists, setInactiveNutritionists] = useState([]);
  const [unlinkingClientId, setUnlinkingClientId] = useState('');
  const [deactivatingNutritionistId, setDeactivatingNutritionistId] = useState('');
  const [reactivatingNutritionistId, setReactivatingNutritionistId] = useState('');
  const [pendingUnlinkService, setPendingUnlinkService] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, title: '', message: '', subMessage: '' });

  const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

  const getDisplayName = (user = {}, fallback = 'Cliente') => {
    const fullName = `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim();
    return user.displayName || fullName || user.username || user.nombre || user.email || fallback;
  };

  const registerLookupKeys = (map, keys, value) => {
    keys.forEach((key) => {
      const normalizedKey = normalizeLookupKey(key);
      if (normalizedKey) {
        map.set(normalizedKey, value);
      }
    });
  };

  const isNutritionistUser = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    const isAdminUser = ['admin', 'administrator', 'administrador'].includes(role) || user.isAdmin === true || user.admin === true;
    return Boolean(
      user.isActive !== false
      && user.nutritionistStatus !== 'inactive'
      && !isAdminUser
      && ['nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role)
    );
  };

  const isInactiveNutritionistUser = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    const isAdminUser = ['admin', 'administrator', 'administrador'].includes(role) || user.isAdmin === true || user.admin === true;
    const looksNutritionist =
      ['inactive_nutritionist', 'nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role)
      || user.nutritionist === true;

    const isInactive =
      user.isActive === false
      || user.nutritionistActive === false
      || String(user.nutritionistStatus || '').toLowerCase() === 'inactive'
      || String(user.contractStatus || '').toLowerCase() === 'inactive'
      || role === 'inactive_nutritionist';

    return Boolean(looksNutritionist && isInactive && !isAdminUser);
  };

  const loadNutritionData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersResult, nutritionistAssignmentsSnap] = await Promise.all([
        getUsers(),
        getDocs(collection(db, 'client_nutritionist_assignments')),
      ]);

      const users = usersResult.success ? usersResult.data : [];
      const nutritionistAssignments = nutritionistAssignmentsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

      const userMap = new Map();
      users.forEach((user) => {
        const userRecord = {
          id: String(user.id || '').trim(),
          email: String(user.email || '').trim(),
          name: getDisplayName(user, 'Usuario'),
        };

        registerLookupKeys(userMap, [user.id, user.authUid, user.legacyId, user.email], userRecord);
      });

      const nutritionistUsers = users.filter(isNutritionistUser);
      const nutritionistUsersInactive = users.filter(isInactiveNutritionistUser);
      const nutritionistMap = new Map();
      const inactiveNutritionistMap = new Map();

      nutritionistUsers.forEach((u) => {
        const id = String(u.authUid || u.id || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        const canonicalKey = email || id;
        const fullName = (
          u.displayName
          || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim()
          || u.username
          || u.email
          || 'Nutriólogo'
        );

        const nutritionistData = {
          id: id || email,
          name: fullName,
          email: u.email || 'Sin correo',
          specialty: u.specialty || u.especialidad || 'Nutrición general',
          clientsSet: new Set(),
        };

        if (canonicalKey) {
          const previous = nutritionistMap.get(canonicalKey);
          const shouldReplace = !previous || String(previous.name || '').length < String(fullName || '').length;
          nutritionistMap.set(canonicalKey, shouldReplace ? nutritionistData : previous);
        }

        registerLookupKeys(nutritionistMap, [id, email, canonicalKey], nutritionistData);
      });

      nutritionistUsersInactive.forEach((u) => {
        const id = String(u.authUid || u.id || '').trim();
        const email = String(u.email || '').trim().toLowerCase();
        const canonicalKey = email || id;
        const fullName = (
          u.displayName
          || `${u.firstName || u.first_name || ''} ${u.lastName || u.last_name || ''}`.trim()
          || u.username
          || u.email
          || 'Nutriólogo'
        );

        const nutritionistData = {
          id: id || email,
          name: fullName,
          email: u.email || 'Sin correo',
          specialty: u.specialty || u.especialidad || 'Nutrición general',
        };

        if (canonicalKey) {
          const previous = inactiveNutritionistMap.get(canonicalKey);
          const shouldReplace = !previous || String(previous.name || '').length < String(fullName || '').length;
          inactiveNutritionistMap.set(canonicalKey, shouldReplace ? nutritionistData : previous);
        }
      });

      const nutritionistServiceMap = new Map();
      nutritionistAssignments.forEach((assignment) => {
        const clientId = String(assignment.clientId || assignment.memberId || '').trim();
        const nutritionistId = String(assignment.nutritionistId || '').trim();
        const clientEntry = userMap.get(normalizeLookupKey(clientId)) || null;
        const nutritionistEntry =
          nutritionistMap.get(normalizeLookupKey(nutritionistId))
          || nutritionistMap.get(normalizeLookupKey(assignment.nutritionistEmail))
          || null;

        if (nutritionistEntry && clientId) {
          nutritionistEntry.clientsSet.add(clientId);
        }

        const assignedAtValue = assignment.assignedAt || assignment.createdAt || assignment.updatedAt || null;

        nutritionistServiceMap.set(`${clientId || 'sin-cliente'}_${nutritionistId || 'sin-nutriologo'}`, {
          id: assignment.id || `${clientId || 'sin-cliente'}_${nutritionistId || 'sin-nutriologo'}`,
          clientId,
          clientName: clientEntry?.name || assignment.clientName || assignment.memberName || 'Cliente',
          clientEmail: clientEntry?.email || assignment.clientEmail || assignment.memberEmail || 'Sin correo',
          nutritionistName: nutritionistEntry?.name || assignment.nutritionistName || assignment.nutritionistEmail || 'Nutriólogo',
          status: String(assignment.status || 'active'),
          assignedAt: assignedAtValue,
        });
      });

      const consolidatedNutritionists = [];
      const seenNutritionists = new Set();
      nutritionistMap.forEach((nutritionist) => {
        if (!nutritionist?.id || seenNutritionists.has(nutritionist.id)) return;
        seenNutritionists.add(nutritionist.id);
        consolidatedNutritionists.push({
          ...nutritionist,
          clientsCount: nutritionist.clientsSet.size,
        });
      });

      const consolidatedInactiveNutritionists = [];
      const seenInactiveNutritionists = new Set();
      inactiveNutritionistMap.forEach((nutritionist) => {
        if (!nutritionist?.id || seenInactiveNutritionists.has(nutritionist.id)) return;
        seenInactiveNutritionists.add(nutritionist.id);
        consolidatedInactiveNutritionists.push(nutritionist);
      });

      setNutritionistServices(Array.from(nutritionistServiceMap.values()));
      setNutritionists(consolidatedNutritionists);
      setInactiveNutritionists(consolidatedInactiveNutritionists);
    } catch (error) {
      console.error('Error al cargar gestión de nutriólogos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNutritionData();
  }, [loadNutritionData]);

  useEffect(() => {
    const nutritionistAssignmentsQuery = query(
      collection(db, 'client_nutritionist_assignments'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(nutritionistAssignmentsQuery, () => {
      loadNutritionData();
    });

    return () => unsubscribe();
  }, [loadNutritionData]);

  const executeUnlinkClient = async (service) => {
    if (!service?.clientId) return;

    try {
      setUnlinkingClientId(service.clientId);
      const result = await removeNutritionistFromClient(service.clientId);
      if (!result.success) {
        throw new Error(result.error || 'No se pudo desvincular al cliente.');
      }

      await loadNutritionData();
      setSuccessModal({
        isOpen: true,
        title: 'Cliente desvinculado',
        message: `${service.clientName || 'El cliente'} ya no tiene nutriólogo asignado.`,
        subMessage: '',
      });
    } catch (error) {
      console.error('Error al desvincular cliente de nutriólogo:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al desvincular',
        message: error.message || 'No se pudo desvincular al cliente del nutriólogo.',
      });
    } finally {
      setUnlinkingClientId('');
      setPendingUnlinkService(null);
    }
  };

  const handleUnlinkClient = (service) => {
    if (!service?.clientId) return;
    setPendingUnlinkService(service);
  };

  const executeDeactivateNutritionist = async (nutritionist) => {
    if (!nutritionist?.id) return;
    try {
      setDeactivatingNutritionistId(nutritionist.id);
      const result = await updateUser(nutritionist.id, {
        isActive: false,
        nutritionistActive: false,
        nutritionistStatus: 'inactive',
        role: 'inactive_nutritionist',
      });
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo descontratar al nutriólogo.');
      }

      await loadNutritionData();
      setSuccessModal({
        isOpen: true,
        title: 'Nutriólogo descontratado',
        message: `${nutritionist.name || 'El nutriólogo'} fue desactivado correctamente.`,
        subMessage: '',
      });
    } catch (error) {
      console.error('Error al descontratar nutriólogo:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al descontratar',
        message: error.message || 'No se pudo descontratar al nutriólogo.',
      });
    } finally {
      setDeactivatingNutritionistId('');
      setPendingAction(null);
    }
  };

  const executeReactivateNutritionist = async (nutritionist) => {
    if (!nutritionist?.id) return;
    try {
      setReactivatingNutritionistId(nutritionist.id);
      const result = await updateUser(nutritionist.id, {
        isActive: true,
        nutritionistActive: true,
        nutritionistStatus: 'active',
        role: 'nutritionist',
      });
      if (!result?.success) {
        throw new Error(result?.error || 'No se pudo recontratar al nutriólogo.');
      }

      await loadNutritionData();
      setSuccessModal({
        isOpen: true,
        title: 'Nutriólogo recontratado',
        message: `${nutritionist.name || 'El nutriólogo'} fue reactivado correctamente.`,
        subMessage: '',
      });
    } catch (error) {
      console.error('Error al recontratar nutriólogo:', error);
      setErrorModal({
        isOpen: true,
        title: 'Error al recontratar',
        message: error.message || 'No se pudo recontratar al nutriólogo.',
      });
    } finally {
      setReactivatingNutritionistId('');
      setPendingAction(null);
    }
  };

  const handleDeactivateNutritionist = (nutritionist) => {
    if (!nutritionist?.id) return;
    setPendingAction({ type: 'deactivate', nutritionist });
  };

  const handleReactivateNutritionist = (nutritionist) => {
    if (!nutritionist?.id) return;
    setPendingAction({ type: 'reactivate', nutritionist });
  };

  const handleConfirmPendingAction = async () => {
    if (!pendingAction?.nutritionist) return;
    if (pendingAction.type === 'deactivate') {
      await executeDeactivateNutritionist(pendingAction.nutritionist);
      return;
    }
    await executeReactivateNutritionist(pendingAction.nutritionist);
  };

  const stats = {
    totalClients: nutritionistServices.length,
    activeServices: nutritionistServices.filter((s) => String(s.status || '').toLowerCase() === 'active').length,
    totalNutritionists: nutritionists.length,
  };

  return {
    cargando: loading,
    serviciosNutricion: nutritionistServices,
    nutriologos: nutritionists,
    nutriologosInactivos: inactiveNutritionists,
    idClienteDesvinculando: unlinkingClientId,
    idNutriologoDesactivando: deactivatingNutritionistId,
    idNutriologoReactivando: reactivatingNutritionistId,
    desvinculacionPendiente: pendingUnlinkService,
    accionPendiente: pendingAction,
    modalError: errorModal,
    modalExito: successModal,
    estadisticas: stats,
    setModalError: setErrorModal,
    setModalExito: setSuccessModal,
    manejarDesvincularCliente: handleUnlinkClient,
    ejecutarDesvincularCliente: executeUnlinkClient,
    manejarDesactivarNutriologodescrip: handleDeactivateNutritionist,
    manejarReactivarNutriologodescrip: handleReactivateNutritionist,
    manejarConfirmarAccionPendiente: handleConfirmPendingAction,
    setAccionPendiente: setPendingAction,
    setDesvinculacionPendiente: setPendingUnlinkService,
  };
};
