import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { loginUser, getUser, getUserByEmail } from '../firebase';

function EntrenadorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      if (!result.success) {
        throw new Error(result.error || 'Correo o contrasena incorrectos');
      }

      const firebaseUser = result.user;

      let role = null;
      let roleLookupFailed = false;
      const byUid = await getUser(firebaseUser.uid);
      if (byUid.success) {
        role = String(byUid.data?.role || '').toLowerCase();
      } else if (byUid.error) {
        roleLookupFailed = true;
      }

      if (!role) {
        const byEmail = await getUserByEmail(firebaseUser.email || '');
        if (byEmail.success) {
          role = String(byEmail.data?.role || '').toLowerCase();
        } else if (byEmail.error) {
          roleLookupFailed = true;
        }
      }

      if (!roleLookupFailed && role !== 'trainer' && role !== 'entrenador') {
        throw new Error('Tu cuenta no tiene permisos de entrenador');
      }

      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('trainer_token', idToken);
      localStorage.setItem('trainer_username', firebaseUser.email || email);
      navigate('/entrenador');
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/fitdata-logo.png" alt="FitData Logo" className="h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Entrenador</h1>
          <p className="text-slate-400">Inicia sesión con tu usuario y contraseña</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Correo</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="entrenador@fitdata.gym"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Ingresar al Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/"
              className="text-slate-400 hover:text-white transition-colors text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EntrenadorLogin;