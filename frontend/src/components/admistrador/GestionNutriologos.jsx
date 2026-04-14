import React, { useCallback, useEffect, useState } from 'react';
import { Salad, Users, Stethoscope, Unlink } from 'lucide-react';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, getUsers, removeNutritionistFromClient, updateUser } from '../../firebase';
import ConfirmModal from '../ConfirmModal';
import ErrorModal from '../ErrorModal';
import SuccessModal from '../SuccessModal';

function GestionNutriologos() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('clients');
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
    return Boolean(
      user.isActive !== false
      && user.nutritionistStatus !== 'inactive'
      && ['nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role)
    );
  };

  const isInactiveNutritionistUser = (user = {}) => {
    const role = String(user.role || user.user_type || '').toLowerCase();
    const looksNutritionist =
      ['inactive_nutritionist', 'nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role)
      || user.nutritionist === true
      || user.especialidad
      || user.specialty;

    const isInactive =
      user.isActive === false
      || user.nutritionistActive === false
      || String(user.nutritionistStatus || '').toLowerCase() === 'inactive'
      || String(user.contractStatus || '').toLowerCase() === 'inactive'
      || role === 'inactive_nutritionist';

    return Boolean(looksNutritionist && isInactive);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-8 flex items-center justify-center">
        <div className="text-white text-xl">Cargando datos...</div>
      </div>
    );
  }

  const stats = {
    totalClients: nutritionistServices.length,
    activeServices: nutritionistServices.filter((s) => String(s.status || '').toLowerCase() === 'active').length,
    totalNutritionists: nutritionists.length,
  };

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

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 via-gray-900 to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Salad className="text-cyan-400" />
            Gestión de Servicios de Nutriólogo
          </h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-linear-to-br from-cyan-900/50 to-cyan-800/30 p-6 rounded-xl border border-cyan-700/50 shadow-xl">
            <p className="text-cyan-300 text-sm font-medium mb-1">Clientes con Servicio</p>
            <p className="text-3xl font-bold text-white">{stats.totalClients}</p>
          </div>
          <div className="bg-linear-to-br from-emerald-900/50 to-emerald-800/30 p-6 rounded-xl border border-emerald-700/50 shadow-xl">
            <p className="text-emerald-300 text-sm font-medium mb-1">Servicios Activos</p>
            <p className="text-3xl font-bold text-white">{stats.activeServices}</p>
          </div>
          <div className="bg-linear-to-br from-blue-900/50 to-blue-800/30 p-6 rounded-xl border border-blue-700/50 shadow-xl">
            <p className="text-blue-300 text-sm font-medium mb-1">Nutriólogos Contratados</p>
            <p className="text-3xl font-bold text-white">{stats.totalNutritionists}</p>
          </div>
        </div>

        <div className="flex gap-2 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('clients')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'clients'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            👥 Clientes con Servicio
          </button>
          <button
            onClick={() => setActiveTab('nutritionists')}
            className={`px-6 py-3 font-semibold transition-all ${
              activeTab === 'nutritionists'
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            🥗 Nutriólogos
          </button>
        </div>

        {activeTab === 'clients' && (
          <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users size={22} className="text-cyan-300" />
              Clientes con Servicio de Nutriólogo ({nutritionistServices.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/80">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Cliente</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Estado</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Fecha de asignación</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {nutritionistServices.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-400">No hay clientes con servicio de nutriólogo.</td>
                  </tr>
                ) : (
                  nutritionistServices.map((service) => {
                    const assignedDate = service.assignedAt?.toDate?.() || new Date(service.assignedAt || 0);
                    const status = String(service.status || '').toLowerCase();
                    return (
                      <tr key={service.id} className="hover:bg-gray-700/20 transition-colors">
                        <td className="py-4 px-6">
                          <p className="text-white font-semibold">{service.clientName}</p>
                          <p className="text-gray-400 text-xs">{service.clientEmail}</p>
                        </td>
                        <td className="py-4 px-6 text-cyan-300 font-medium text-sm">{service.nutritionistName}</td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            status === 'active'
                              ? 'bg-green-900/50 text-green-300 border border-green-600'
                              : 'bg-gray-700 text-gray-300 border border-gray-600'
                          }`}>
                            {status === 'active' ? 'Activo' : (service.status || 'N/D')}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-gray-300 text-sm">
                          {Number.isNaN(assignedDate.getTime()) ? 'Sin fecha' : assignedDate.toLocaleDateString('es-MX')}
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleUnlinkClient(service)}
                            disabled={!service.clientId || unlinkingClientId === service.clientId}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Unlink size={16} />
                            {unlinkingClientId === service.clientId ? 'Desvinculando...' : 'Desvincular'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          </div>
        )}

        {activeTab === 'nutritionists' && (
          <>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Stethoscope size={22} className="text-blue-300" />
              Nutriólogos Contratados ({nutritionists.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900/80">
                <tr>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Clientes Asignados</th>
                  <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {nutritionists.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-400">No hay nutriólogos contratados.</td>
                  </tr>
                ) : (
                  nutritionists.map((nutritionist) => (
                    <tr key={nutritionist.id} className="hover:bg-gray-700/20 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-white font-semibold">{nutritionist.name}</p>
                        <p className="text-gray-400 text-xs">{nutritionist.email}</p>
                      </td>
                      <td className="py-4 px-6 text-blue-300 text-sm">{nutritionist.specialty || 'Nutrición general'}</td>
                      <td className="py-4 px-6 text-cyan-300 font-bold text-lg">{nutritionist.clientsCount || 0}</td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleDeactivateNutritionist(nutritionist)}
                          disabled={deactivatingNutritionistId === nutritionist.id}
                          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deactivatingNutritionistId === nutritionist.id ? 'Descontratando...' : 'Descontratar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
            </div>

            <div className="bg-gray-800/50 rounded-xl border border-gray-700 shadow-xl overflow-hidden mt-6">
              <div className="p-6 border-b border-gray-700">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Stethoscope size={22} className="text-yellow-300" />
                  Nutriólogos Inactivos ({inactiveNutritionists.length})
                </h2>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/80">
                    <tr>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Nutriólogo</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Especialidad</th>
                      <th className="text-left py-4 px-6 text-gray-300 font-semibold text-sm">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {inactiveNutritionists.length === 0 ? (
                      <tr>
                        <td colSpan="3" className="text-center py-8 text-gray-400">No hay nutriólogos inactivos.</td>
                      </tr>
                    ) : (
                      inactiveNutritionists.map((nutritionist) => (
                        <tr key={`inactive_${nutritionist.id}`} className="hover:bg-gray-700/20 transition-colors">
                          <td className="py-4 px-6">
                            <p className="text-white font-semibold">{nutritionist.name}</p>
                            <p className="text-gray-400 text-xs">{nutritionist.email}</p>
                          </td>
                          <td className="py-4 px-6 text-blue-300 text-sm">{nutritionist.specialty || 'Nutrición general'}</td>
                          <td className="py-4 px-6">
                            <button
                              onClick={() => handleReactivateNutritionist(nutritionist)}
                              disabled={reactivatingNutritionistId === nutritionist.id}
                              className="px-4 py-2 rounded-lg font-semibold text-sm transition-all bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {reactivatingNutritionistId === nutritionist.id ? 'Recontratando...' : 'Recontratar'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(pendingAction)}
        onClose={() => {
          if (!deactivatingNutritionistId && !reactivatingNutritionistId) {
            setPendingAction(null);
          }
        }}
        onConfirm={handleConfirmPendingAction}
        title={pendingAction?.type === 'deactivate' ? 'Confirmar descontratación' : 'Confirmar recontratación'}
        message={pendingAction?.nutritionist
          ? `${pendingAction.type === 'deactivate' ? 'Se desactivará' : 'Se reactivará'} a ${pendingAction.nutritionist.name}.`
          : ''}
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Sí, Descontratar' : 'Sí, Recontratar'}
      />

      <ConfirmModal
        isOpen={Boolean(pendingUnlinkService)}
        onClose={() => {
          if (!unlinkingClientId) {
            setPendingUnlinkService(null);
          }
        }}
        onConfirm={() => executeUnlinkClient(pendingUnlinkService)}
        title="Confirmar desvinculación"
        message={pendingUnlinkService
          ? `Se desvinculará a ${pendingUnlinkService.clientName || 'este cliente'} de ${pendingUnlinkService.nutritionistName || 'su nutriólogo'}.`
          : ''}
        confirmLabel={unlinkingClientId ? 'Desvinculando...' : 'Sí, Desvincular'}
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
    </div>
  );
}

export default GestionNutriologos;
