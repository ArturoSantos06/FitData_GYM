import React, { useEffect, useState } from 'react';
import SuccessModal from '../SuccessModal';
import { ArrowLeft, ChevronRight, Hash, Lock, Mail, Phone, User } from 'lucide-react';
import {
  getCurrentUser,
  getUsers,
  getUser,
  getUserByAuthUid,
  getUserByEmail,
  updateSelfProfile,
  updateUser,
} from '../../firebase';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const getDateValue = (value) => {
  if (!value) return 0;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const splitName = (user = {}) => {
  const firstName = String(user?.firstName || '').trim();
  const lastName = String(user?.lastName || '').trim();

  if (firstName || lastName) {
    return { firstName, lastName };
  }

  const fullName = String(user?.displayName || user?.nombre || '').trim();
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

const resolveNutritionistFromAuth = async (firebaseUser) => {
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
    return { success: true, data: { ...candidates[0] } };
  }

  return { success: false, error: 'No se pudo cargar el perfil del nutriólogo' };
};

const ProfileMenu = ({ user, onNavigate }) => {
  const initials = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    || user.username
    || user.email
    || 'N';

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
              : user.username || 'Nutriólogo'}
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

const PersonalData = ({ user, nutritionistCode, onSave, onBack }) => {
  const [editForm, setEditForm] = useState({ ...user });
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
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSaving(true);
    try {
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
        <h2 className="text-2xl font-bold text-white">Datos del Nutriólogo</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className={labelClass}>Codigo de Nutriologo</label>
            <div className="relative">
              <Hash className="absolute left-3 top-3.5 text-slate-500" size={18} />
              <input type="text" value={`#${nutritionistCode || '---'}`} disabled className={inputClass} />
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
      const firebaseUser = auth.currentUser;

      if (!firebaseUser?.email) {
        throw new Error('No se pudo identificar la sesión actual');
      }

      const credential = EmailAuthProvider.credential(firebaseUser.email, currentPassword);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, newPassword);

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

function PerfilNutriologo() {
  const [currentView, setCurrentView] = useState('menu');
  const [user, setUser] = useState(null);
  const [nutritionistCode, setNutritionistCode] = useState('---');
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

        const userResult = await resolveNutritionistFromAuth(currentUser);
        if (!userResult.success || !userResult.data) {
          throw new Error(userResult.error || 'No se pudieron cargar tus datos');
        }

        const userData = userResult.data;
        const nameParts = splitName(userData);

        const usersResult = await getUsers();
        const nutritionistUsers = usersResult.success ? (usersResult.data || []).filter((item) => {
          const role = String(item.role || item.user_type || '').toLowerCase();
          return ['nutritionist', 'nutriologo', 'nutriologa', 'nutriologo/a', 'nutricionista', 'nutri'].includes(role);
        }) : [];

        const normalizedCurrentKey = normalizeEmail(userData.email) || String(userData.authUid || userData.id || currentUser.uid || '').trim().toLowerCase();
        const uniqueNutritionists = [];
        const seenKeys = new Set();

        nutritionistUsers
          .slice()
          .sort((a, b) => {
            const aDate = getDateValue(a.createdAt || a.updatedAt);
            const bDate = getDateValue(b.createdAt || b.updatedAt);
            if (aDate !== bDate) return aDate - bDate;
            const aLabel = String(a.displayName || a.username || a.email || '').toLowerCase();
            const bLabel = String(b.displayName || b.username || b.email || '').toLowerCase();
            return aLabel.localeCompare(bLabel);
          })
          .forEach((item) => {
            const key = normalizeEmail(item.email) || String(item.authUid || item.id || '').trim().toLowerCase();
            if (!key || seenKeys.has(key)) return;
            seenKeys.add(key);
            uniqueNutritionists.push(item);
          });

        const nutritionistIndex = uniqueNutritionists.findIndex((item) => {
          const itemKey = normalizeEmail(item.email) || String(item.authUid || item.id || '').trim().toLowerCase();
          return itemKey === normalizedCurrentKey;
        });

        setUser({
          ...userData,
          id: userData.id || currentUser.uid,
          firstName: userData.firstName || nameParts.firstName,
          lastName: userData.lastName || nameParts.lastName,
          username: userData.username || '',
          email: userData.email || currentUser.email || '',
          telefono: userData.telefono || userData.phone || '',
        });

        setNutritionistCode(nutritionistIndex >= 0 ? String(nutritionistIndex + 1).padStart(3, '0') : '---');
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
    const normalizedDisplayName = [normalizedFirstName, normalizedLastName].filter(Boolean).join(' ').trim() || normalizedUsername;

    if (!normalizedUsername) {
      throw new Error('El nombre de usuario no puede estar vacío');
    }

    const payload = {
      email: normalizedEmail,
      username: normalizedUsername,
      displayName: normalizedDisplayName,
      nombre: normalizedDisplayName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      phone: normalizedPhone,
      telefono: normalizedPhone,
    };

    const result = await updateUser(userDocId, payload);
    if (!result.success) {
      const fallback = await updateSelfProfile({ userId: userDocId, ...payload });
      if (!fallback.success) {
        throw new Error(fallback.error || result.error || 'No se pudo actualizar el perfil');
      }
    }

    localStorage.setItem('nutritionist_username', normalizedUsername || normalizedDisplayName);
    setUser((prev) => ({ ...prev, ...payload }));
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
          <a href="/nutriologo/login" className="inline-block bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-medium transition-all">
            Iniciar sesión como nutriólogo
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
          nutritionistCode={nutritionistCode}
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

export default PerfilNutriologo;