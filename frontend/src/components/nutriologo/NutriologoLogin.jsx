import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, LogIn, ArrowLeft } from 'lucide-react';
import { getUser, getUserByEmail, loginUser, logoutUser } from '../../firebase';

const NUTRITIONIST_ROLES = [
  'nutritionist',
  'nutriologo',
  'nutriologa',
  'nutriologo/a',
  'nutricionista',
  'nutri'
];

function hasNutritionistRole(role) {
  return NUTRITIONIST_ROLES.includes(String(role || '').toLowerCase());
}

function NutriologoLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    localStorage.removeItem('nutritionist_token');
    localStorage.removeItem('nutritionist_username');
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const loginResponse = await loginUser(email, password);
      if (!loginResponse.success) {
        throw new Error(loginResponse.error || 'Credenciales incorrectas');
      }

      const firebaseUser = loginResponse.user;
      let role = '';

      const byUid = await getUser(firebaseUser.uid);
      if (byUid.success) {
        role = String(byUid.data?.role || '').toLowerCase();
      }

      if (!role) {
        const byEmail = await getUserByEmail(firebaseUser.email || '');
        if (byEmail.success) {
          role = String(byEmail.data?.role || '').toLowerCase();
        }
      }

      if (!hasNutritionistRole(role)) {
        await logoutUser();
        localStorage.removeItem('nutritionist_token');
        localStorage.removeItem('nutritionist_username');
        throw new Error('Tu cuenta no tiene permisos de nutriologo');
      }

      const idToken = await firebaseUser.getIdToken();
      localStorage.setItem('nutritionist_token', idToken);
      localStorage.setItem('nutritionist_username', firebaseUser.email || email);
      navigate('/nutriologo');
    } catch (submitError) {
      const message = String(submitError?.message || '');
      const friendlyError =
        message.includes('auth/invalid-credential') ||
        message.includes('auth/invalid-login-credentials') ||
        message.includes('auth/user-not-found') ||
        message.includes('auth/wrong-password')
          ? 'Correo o contrasena incorrecta'
          : message.includes('auth/invalid-email')
          ? 'Correo electronico invalido'
          : message || 'No se pudo iniciar sesion';

      setError(friendlyError);
      localStorage.removeItem('nutritionist_token');
      localStorage.removeItem('nutritionist_username');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/fitdata-logo.png" alt="FitData Logo" className="h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Nutriologo</h1>
          <p className="text-slate-400">Inicia sesion con tu usuario y contrasena</p>
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
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="nutriologo@fitdata.gym"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Contrasena</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
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

export default NutriologoLogin;

