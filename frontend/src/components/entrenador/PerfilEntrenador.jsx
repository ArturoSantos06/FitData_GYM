import React, { useEffect, useState } from 'react';
import SuccessModal from '../SuccessModal';
import {
  ArrowLeft,
  Building2,
  ChevronRight,
  CreditCard,
  Hash,
  Lock,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import {
  getCurrentUser,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  updateSelfProfile,
  updateUser,
} from '../../firebase';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const splitName = (user) => {
  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const fullName = String(user?.nombre || user?.displayName || '').trim();
  if (!fullName) {
    return { firstName: '', lastName: '' };
  }

  const parts = fullName.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
};

const DEFAULT_CONTRACT_TYPE = 'Asignación por cliente';

const CONTRACT_OPTIONS = [
  'Asignación por cliente',
  'Asimilados a Salarios',
  'Honorarios (Persona Fisica)',
  'Comisiones',
];

const normalizeContractType = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_CONTRACT_TYPE;

  const cleaned = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (cleaned.includes('asignacion') && cleaned.includes('cliente')) {
    return 'Asignación por cliente';
  }

  if (cleaned.includes('asimilados') && cleaned.includes('salarios')) {
    return 'Asimilados a Salarios';
  }

  if (cleaned.includes('honorarios')) {
    return 'Honorarios (Persona Fisica)';
  }

  if (cleaned.includes('comision')) {
    return 'Comisiones';
  }

  const exact = CONTRACT_OPTIONS.find((opt) => opt.toLowerCase() === raw.toLowerCase());
  return exact || DEFAULT_CONTRACT_TYPE;
};

const resolveTrainerFromAuth = async (firebaseUser) => {
  if (!firebaseUser) {
    return { success: false, error: 'No hay sesión activa' };
  }

  const byAuthUid = await getUserByAuthUid(firebaseUser.uid);
  const byDocId = await getUser(firebaseUser.uid);
  const email = normalizeEmail(firebaseUser.email);
  let byEmail = null;
  if (email) {
    byEmail = await getUserByEmail(email, firebaseUser.uid);
  }

  const candidates = [
    byAuthUid?.success ? byAuthUid.data : null,
    byDocId?.success ? byDocId.data : null,
    byEmail?.success ? byEmail.data : null,
  ].filter(Boolean);

  if (candidates.length > 0) {
    const primary = candidates[0];
    const merged = candidates.reduce((acc, item) => {
      const next = { ...acc };

      if (!next.contractType && (item.contractType || item.tipoContrato || item.contract_type || item.tipo_contrato)) {
        next.contractType = item.contractType || item.tipoContrato || item.contract_type || item.tipo_contrato;
      }

      if (!next.tipoContrato && (item.tipoContrato || item.contractType)) {
        next.tipoContrato = item.tipoContrato || item.contractType;
      }

      if (!next.contract_type && (item.contract_type || item.contractType || item.tipoContrato)) {
        next.contract_type = item.contract_type || item.contractType || item.tipoContrato;
      }

      if (!next.rfc && (item.rfc || item.RFC)) {
        next.rfc = item.rfc || item.RFC;
      }

      if (!next.clabe && (item.clabe || item.CLABE || item.cuentaBancaria || item.numeroCuenta || item.accountNumber)) {
        next.clabe = item.clabe || item.CLABE || item.cuentaBancaria || item.numeroCuenta || item.accountNumber;
      }

      return next;
    }, { ...primary });

    return { success: true, data: merged };
  }

  return { success: false, error: 'No se pudieron cargar los datos del entrenador' };
};

const ProfileMenu = ({ user, onNavigate }) => {
  const initials = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    || user.username
    || user.email
    || 'T';

  return (
    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="h-28 bg-linear-to-r from-cyan-950 via-blue-950 to-slate-900" />
      <div className="px-6 md:px-8 pb-8 -mt-12 relative">
        <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {initials.charAt(0).toUpperCase()}
        </div>

        <div className="mt-4">
          <h2 className="text-3xl font-bold text-white">
            {user.firstName || user.lastName
              ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
              : user.username || 'Entrenador'}
          </h2>
          <p className="text-slate-400">{user.email}</p>
        </div>

        <div className="mt-8 space-y-3">
          <button
            type="button"
            onClick={() => onNavigate('edit-personal')}
            className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:text-cyan-300">
                <User size={20} />
              </div>
              <span className="text-slate-200 font-medium group-hover:text-white">Editar datos personales</span>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" size={20} />
          </button>

          <button
            type="button"
            onClick={() => onNavigate('change-password')}
            className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:text-emerald-300">
                <Lock size={20} />
              </div>
              <span className="text-slate-200 font-medium group-hover:text-white">Cambiar contraseña</span>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const PersonalData = ({ user, onSave, onBack }) => {
  const nameParts = splitName(user);
  const [editForm, setEditForm] = useState({
    ...user,
    firstName: user.firstName || nameParts.firstName,
    lastName: user.lastName || nameParts.lastName,
    telefono: user.telefono || user.phone || '',
    contractType: normalizeContractType(
      user.contractType || user.tipoContrato || user.contract_type || user.tipo_contrato || ''
    ),
    rfc: user.rfc || user.RFC || '',
    clabe: user.clabe || user.CLABE || user.cuentaBancaria || user.numeroCuenta || user.accountNumber || '',
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'telefono') {
      const numericValue = value.replace(/\D/g, '').slice(0, 10);
      setEditForm((prev) => ({ ...prev, [name]: numericValue }));
      return;
    }

    if (name === 'clabe') {
      const clabeValue = value.replace(/\D/g, '').slice(0, 18);
      setEditForm((prev) => ({ ...prev, [name]: clabeValue }));
      return;
    }

    if (name === 'rfc') {
      const rfcValue = value.toUpperCase().replace(/[^A-Z0-9&Ñ]/g, '').slice(0, 13);
      setEditForm((prev) => ({ ...prev, [name]: rfcValue }));
      return;
    }

    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const normalizedRfc = String(editForm.rfc || '').trim().toUpperCase();
      const normalizedClabe = String(editForm.clabe || '').replace(/\D/g, '').slice(0, 18);

      if (normalizedRfc && normalizedRfc.length !== 12 && normalizedRfc.length !== 13) {
        throw new Error('El RFC debe tener 12 o 13 caracteres');
      }

      if (normalizedClabe && normalizedClabe.length !== 18) {
        throw new Error('La CLABE debe tener 18 dígitos');
      }

      await onSave(editForm);
      setSuccessMsg('Datos actualizados');
    } catch (err) {
      setErrorMsg(err.message || 'No se pudo actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-slate-300 focus:ring-2 focus:ring-cyan-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const labelClass = 'block text-sm font-medium text-slate-400 mb-1 ml-1';

  return (
    <div className="w-full max-w-2xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" type="button">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-white">Datos del Entrenador</h2>
          <p className="text-slate-400 text-sm">Actualiza tu perfil y tu información de acceso</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>ID de Usuario</label>
            <div className="relative">
              <Hash className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input type="text" value={editForm.id} disabled className={inputClass} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-cyan-400 font-semibold`}>Correo Electrónico</label>
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 text-cyan-400" size={18} />
              <input type="email" name="email" value={editForm.email || ''} onChange={handleChange} className={`${inputClass} border-cyan-500/30 focus:border-cyan-500 text-white bg-cyan-900/10`} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-indigo-400 font-semibold`}>Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-indigo-400" size={18} />
              <input type="text" name="username" value={editForm.username || ''} onChange={handleChange} className={`${inputClass} border-indigo-500/30 focus:border-indigo-500 text-white bg-indigo-900/10`} />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-blue-400 font-semibold`}>Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 text-blue-400" size={18} />
              <input type="tel" name="telefono" value={editForm.telefono || ''} onChange={handleChange} className={`${inputClass} border-blue-500/30 focus:border-blue-500 text-white bg-blue-900/10`} placeholder="10 dígitos" />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-slate-300 font-semibold`}>Nombre(s)</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input type="text" name="firstName" value={editForm.firstName || ''} onChange={handleChange} className={inputClass} placeholder="Nombre(s)" />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-slate-300 font-semibold`}>Apellidos</label>
            <div className="relative">
              <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input type="text" name="lastName" value={editForm.lastName || ''} onChange={handleChange} className={inputClass} placeholder="Apellidos" />
            </div>
          </div>

          <div>
            <label className={`${labelClass} text-amber-300 font-semibold`}>Tipo de Contrato</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-3.5 text-amber-400" size={18} />
              <select
                name="contractType"
                value={editForm.contractType || ''}
                onChange={handleChange}
                className={`${inputClass} border-amber-500/30 focus:border-amber-500 text-white bg-amber-900/10`}
              >
                {CONTRACT_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="border border-slate-800 rounded-xl p-4 bg-slate-950/30">
          <h3 className="text-sm md:text-base font-semibold text-cyan-300 mb-4">Datos fiscales y bancarios</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className={`${labelClass} text-emerald-300 font-semibold`}>RFC</label>
              <div className="relative">
                <Hash className="absolute left-3 top-3.5 text-emerald-400" size={18} />
                <input
                  type="text"
                  name="rfc"
                  value={editForm.rfc || ''}
                  onChange={handleChange}
                  className={`${inputClass} border-emerald-500/30 focus:border-emerald-500 text-white bg-emerald-900/10 uppercase`}
                  placeholder="Ej: XAXX010101000"
                  maxLength={13}
                />
              </div>
            </div>

            <div>
              <label className={`${labelClass} text-fuchsia-300 font-semibold`}>CLABE</label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-3.5 text-fuchsia-400" size={18} />
                <input
                  type="text"
                  name="clabe"
                  value={editForm.clabe || ''}
                  onChange={handleChange}
                  className={`${inputClass} border-fuchsia-500/30 focus:border-fuchsia-500 text-white bg-fuchsia-900/10`}
                  placeholder="18 dígitos"
                  inputMode="numeric"
                  maxLength={18}
                />
              </div>
            </div>
          </div>
        </div>

        {errorMsg && <div className="text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{errorMsg}</div>}
        {successMsg && <div className="text-sm text-green-400 bg-green-900/20 border border-green-700 rounded-lg p-3">{successMsg}</div>}

        <div className="pt-2 flex gap-3">
          <button type="button" onClick={onBack} className="w-1/3 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
            Cancelar
          </button>
          <button disabled={saving} type="submit" className="w-2/3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-cyan-600/20 transition-all active:scale-95">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

const ChangePassword = ({ onBack }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword) {
      setError('Completa los campos requeridos');
      return;
    }

    if (newPassword.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirm) {
      setError('La confirmación no coincide');
      return;
    }

    try {
      setLoading(true);
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../../firebase/config');
      const user = auth.currentUser;

      if (!user?.email) {
        throw new Error('No se pudo identificar la sesión actual');
      }

      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);

      setSuccess('Contraseña actualizada correctamente');
      setCurrentPassword('');
      setNewPassword('');
      setConfirm('');
    } catch (err) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none';

  return (
    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" type="button">
          <ArrowLeft size={22} />
        </button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lock size={18} className="text-emerald-400" /> Cambiar contraseña</h2>
      </div>

      {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{error}</div>}
      {success && <div className="mb-4 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-700 rounded-lg p-3">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Contraseña actual</label>
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Nueva contraseña</label>
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Confirmar nueva contraseña</label>
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={inputCls} />
        </div>
        <button disabled={loading} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">
          {loading ? 'Actualizando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
};

function PerfilEntrenador() {
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError('');

        const currentUser = getCurrentUser();
        if (!currentUser) {
          throw new Error('No hay sesión activa');
        }

        const userResult = await resolveTrainerFromAuth(currentUser);
        if (!userResult.success || !userResult.data) {
          throw new Error(userResult.error || 'No se pudieron cargar tus datos');
        }

        const trainerData = userResult.data;
        const nameParts = splitName(trainerData);
        const rawContractType =
          trainerData.contractType || trainerData.tipoContrato || trainerData.contract_type || trainerData.tipo_contrato || '';
        const resolvedContractType = normalizeContractType(rawContractType);

        setUser({
          ...trainerData,
          firstName: trainerData.firstName || nameParts.firstName,
          lastName: trainerData.lastName || nameParts.lastName,
          telefono: trainerData.telefono || trainerData.phone || '',
          contractType: resolvedContractType,
          rfc: trainerData.rfc || trainerData.RFC || '',
          clabe: trainerData.clabe || trainerData.CLABE || trainerData.cuentaBancaria || trainerData.numeroCuenta || trainerData.accountNumber || '',
        });

        if (!String(rawContractType || '').trim()) {
          const userDocId = String(trainerData.id || currentUser.uid || '').trim();
          if (userDocId) {
            await updateUser(userDocId, {
              contractType: resolvedContractType,
              tipoContrato: resolvedContractType,
              contract_type: resolvedContractType,
            });
          }
        }
      } catch (err) {
        setError(err.message || 'No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleUpdateUser = async (updatedData) => {
    const currentUser = getCurrentUser();
    const userDocId = String(updatedData.id || user?.id || currentUser?.uid || '').trim();
    if (!userDocId) {
      throw new Error('No se pudo identificar el usuario a actualizar');
    }

    const normalizedPhone = String(updatedData.telefono || '').replace(/\D/g, '').slice(0, 10);
    const normalizedEmail = String(updatedData.email || '').trim().toLowerCase();
    const normalizedUsername = String(updatedData.username || '').trim();
    const normalizedFirstName = String(updatedData.firstName || '').trim();
    const normalizedLastName = String(updatedData.lastName || '').trim();
    const normalizedContractType = normalizeContractType(
      updatedData.contractType || updatedData.tipoContrato || updatedData.contract_type || updatedData.tipo_contrato || ''
    );
    const normalizedRfc = String(updatedData.rfc || updatedData.RFC || '').trim().toUpperCase();
    const normalizedClabe = String(updatedData.clabe || updatedData.CLABE || '').replace(/\D/g, '').slice(0, 18);
    const normalizedDisplayName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim() || normalizedUsername;

    if (!normalizedUsername) {
      throw new Error('El nombre de usuario no puede estar vacío');
    }

    const result = await updateUser(userDocId, {
      email: normalizedEmail,
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
      telefono: normalizedPhone,
      contractType: normalizedContractType,
      tipoContrato: normalizedContractType,
      contract_type: normalizedContractType,
      rfc: normalizedRfc,
      RFC: normalizedRfc,
      clabe: normalizedClabe,
      CLABE: normalizedClabe,
      cuentaBancaria: normalizedClabe,
      numeroCuenta: normalizedClabe,
      accountNumber: normalizedClabe,
    });

    if (!result.success) {
      const fallback = await updateSelfProfile({
        userId: userDocId,
        email: normalizedEmail,
        username: normalizedUsername,
        displayName: normalizedDisplayName,
        firstName: normalizedFirstName,
        lastName: normalizedLastName,
        telefono: normalizedPhone,
        contractType: normalizedContractType,
        tipoContrato: normalizedContractType,
        contract_type: normalizedContractType,
        rfc: normalizedRfc,
        RFC: normalizedRfc,
        clabe: normalizedClabe,
        CLABE: normalizedClabe,
        cuentaBancaria: normalizedClabe,
        numeroCuenta: normalizedClabe,
        accountNumber: normalizedClabe,
      });

      if (!fallback.success) {
        throw new Error(fallback.error || result.error || 'No se pudo actualizar el perfil');
      }
    }

    setUser((prev) => ({
      ...prev,
      ...updatedData,
      email: normalizedEmail,
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      telefono: normalizedPhone,
      phone: normalizedPhone,
      contractType: normalizedContractType,
      tipoContrato: normalizedContractType,
      contract_type: normalizedContractType,
      rfc: normalizedRfc,
      RFC: normalizedRfc,
      clabe: normalizedClabe,
      CLABE: normalizedClabe,
      cuentaBancaria: normalizedClabe,
      numeroCuenta: normalizedClabe,
      accountNumber: normalizedClabe,
    }));

    setSuccessMessage('¡Datos actualizados correctamente!');
    setShowSuccessModal(true);
    setCurrentView('menu');
  };

  if (loading) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4" />
          <p className="text-slate-400">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full flex justify-center items-center min-h-[400px]">
        <div className="bg-red-900/20 border border-red-500 rounded-lg p-6 text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <a href="/entrenador/login" className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition-all">
            Iniciar sesión como entrenador
          </a>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="w-full flex justify-center">
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Éxito"
        message={successMessage}
      />

      {currentView === 'menu' && (
        <ProfileMenu user={user} onNavigate={setCurrentView} />
      )}

      {currentView === 'edit-personal' && (
        <PersonalData
          user={user}
          onSave={handleUpdateUser}
          onBack={() => setCurrentView('menu')}
        />
      )}

      {currentView === 'change-password' && (
        <ChangePassword onBack={() => setCurrentView('menu')} />
      )}
    </div>
  );
}

export default PerfilEntrenador;