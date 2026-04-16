import React, { useState } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';

function FormularioCambioContrasenaEntrenador({ onBack }) {
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!passwordActual || !passwordNueva) return setError('Completa los campos requeridos');
    if (passwordNueva.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres');
    if (passwordNueva !== confirmacion) return setError('La confirmación no coincide');

    try {
      setCargando(true);
      const { updatePassword, reauthenticateWithCredential, EmailAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../../../firebase/config');
      const user = auth.currentUser;
      if (!user?.email) throw new Error('No se pudo identificar la sesión actual');

      const credential = EmailAuthProvider.credential(user.email, passwordActual);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, passwordNueva);

      setSuccess('Contraseña actualizada correctamente');
      setPasswordActual('');
      setPasswordNueva('');
      setConfirmacion('');
    } catch (err) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setCargando(false);
    }
  };

  const inputCls = 'w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none';

  return (
    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors" type="button"><ArrowLeft size={22} /></button>
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Lock size={18} className="text-emerald-400" /> Cambiar contraseña</h2>
      </div>

      {error && <div className="mb-4 text-sm text-red-400 bg-red-900/20 border border-red-700 rounded-lg p-3">{error}</div>}
      {success && <div className="mb-4 text-sm text-emerald-400 bg-emerald-900/20 border border-emerald-700 rounded-lg p-3">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="text-sm text-slate-400 mb-1 block">Contraseña actual</label><input type="password" value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm text-slate-400 mb-1 block">Nueva contraseña</label><input type="password" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} className={inputCls} /></div>
        <div><label className="text-sm text-slate-400 mb-1 block">Confirmar nueva contraseña</label><input type="password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={inputCls} /></div>
        <button disabled={cargando} type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl transition-all">{cargando ? 'Actualizando...' : 'Guardar contraseña'}</button>
      </form>
    </div>
  );
}

export default FormularioCambioContrasenaEntrenador;
