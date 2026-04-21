import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { loginUser, getUser, getUserByEmail, logoutUser } from '../../../firebase';

const CLIENT_FORBIDDEN_ROLES = new Set([
  'trainer',
  'entrenador',
  'coach',
  'inactive_trainer',
  'nutritionist',
  'nutriologo',
  'nutriologa',
  'nutriologo/a',
  'nutricionista',
  'nutri',
]);

function Sesion() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        const user = result.user;

        let role = '';
        const byUid = await getUser(user.uid);
        if (byUid.success) {
          role = String(byUid.data?.role || byUid.data?.user_type || '').trim().toLowerCase();
        }

        if (!role) {
          const byEmail = await getUserByEmail(user.email || email || '');
          if (byEmail.success) {
            role = String(byEmail.data?.role || byEmail.data?.user_type || '').trim().toLowerCase();
          }
        }

        if (CLIENT_FORBIDDEN_ROLES.has(role)) {
          await logoutUser();
          localStorage.removeItem('firebaseUser');
          localStorage.removeItem('token');
          localStorage.removeItem('trainer_token');
          localStorage.removeItem('trainer_username');
          localStorage.removeItem('nutritionist_token');
          localStorage.removeItem('nutritionist_username');
          throw new Error('Acceso denegado: esta cuenta no es de cliente');
        }

        // Forzar refresh del token para asegurar que la sesión Firestore esté lista
        try {
          await user.getIdToken(true);
        } catch (tokenError) {
          console.warn('No se pudo refrescar el token después del login:', tokenError);
        }

        // Guardar info del usuario en localStorage (compatible con el resto del código)
        localStorage.setItem('firebaseUser', JSON.stringify(user));
        
        // Redirigir al portal de cliente
        navigate('/cliente');
      } else {
        throw new Error(result.error || 'Email o contraseña incorrectos');
      }
    } catch (err) {
      const msg = err.message || '';
      const errorMessage =
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/wrong-password')
          ? 'Correo o contraseña incorrectos'
          : msg.includes('auth/invalid-email')
          ? 'Correo electrónico inválido'
          : msg.includes('auth/too-many-requests')
          ? 'Demasiados intentos fallidos. Intenta más tarde'
        : msg.includes('Acceso denegado')
          ? msg
          : 'Correo o contraseña incorrectos';
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/fitdata-logo.png" alt="FitData Logo" className="h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Clientes</h1>
          <p className="text-slate-400">Ingresa con tu cuenta de miembro</p>
        </div>

        {/* Formulario */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Correo Electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 text-slate-500" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 pr-12 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-2.5 p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded-lg p-3">
                <p className="text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {/* Botón */}
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

          {/* Enlace de regreso */}
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

        {/* Nota informativa */}
        <div className="mt-6 text-center">
          <p className="text-slate-500 text-sm">
            ¿No tienes cuenta? Regístrate en recepción del gimnasio
          </p>
        </div>
      </div>
    </div>
  );
}

export default Sesion;
