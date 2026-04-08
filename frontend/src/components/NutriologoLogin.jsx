import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { loginUser, getUser, getUserByEmail } from '../firebase';

function NutriologoLogin({ onLogin }) {
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
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const result = await loginUser(normalizedEmail, password);

      if (!result.success) {
        const loginError = new Error(result.error || 'Email o contraseña incorrectos');
        loginError.code = result.code || null;
        throw loginError;
      }

      const { user } = result;

      // Verificar rol de nutriólogo
      const userDoc = await getUser(user.uid);
      const roleFromUid = userDoc.success ? userDoc.data?.role : null;

      let finalRole = roleFromUid;

      if (!finalRole) {
        const emailDoc = await getUserByEmail(user.email);
        finalRole = emailDoc.success ? emailDoc.data?.role : null;
      }

      if (finalRole !== 'nutriologo') {
        throw new Error('Acceso denegado: solo nutriólogos pueden acceder aquí');
      }

      // Forzar refresh del token para que las reglas de Storage validen el rol
      let idToken = null;
      try {
        idToken = await user.getIdToken(true);
      } catch (tokenError) {
        console.warn('Token refresh failed:', tokenError);
      }

      if (idToken) {
        localStorage.setItem('nutritionist_token', idToken);
      }
      localStorage.setItem('nutritionist_username', user.email || normalizedEmail);

      // Guardar info del usuario en localStorage
      localStorage.setItem('firebaseUser', JSON.stringify({ uid: user.uid, email: user.email }));

      // Si se renderiza dentro de NutriologoArea, notificar al padre para mostrar portal.
      if (typeof onLogin === 'function') {
        onLogin();
      } else {
        navigate('/nutriologo', { replace: true });
      }
    } catch (err) {
      const msg = err.message || '';
      let errorDisplay = 'Email o contraseña incorrectos';
      
      if (msg.includes('auth/invalid-credential')) {
        errorDisplay = 'Email o contraseña incorrectos';
      } else if (msg.includes('auth/user-not-found')) {
        errorDisplay = 'Email o contraseña incorrectos';
      } else if (msg.includes('auth/wrong-password')) {
        errorDisplay = 'Email o contraseña incorrectos';
      } else if (msg.includes('auth/invalid-email')) {
        errorDisplay = 'Correo electrónico inválido';
      } else if (msg.includes('Acceso denegado')) {
        errorDisplay = msg;
      } else if (msg.includes('auth/')) {
        errorDisplay = 'Email o contraseña incorrectos';
      } else {
        errorDisplay = msg || 'Error al iniciar sesión';
      }

      console.warn('NutriologoLogin error', err.message, err.code || 'no-code');
      setError(`${errorDisplay}${err.code ? ` (${err.code})` : ''}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <img src="/fitdata-logo.png" alt="FitData Logo" className="h-20 mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-bold text-white mb-2">Portal de Nutriólogos</h1>
          <p className="text-slate-400">Ingresa con tu cuenta profesional</p>
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
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-linear-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Ingresando...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Volver */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white flex items-center justify-center gap-2 mx-auto transition-colors"
            >
              <ArrowLeft size={16} />
              Volver al inicio
            </button>
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
    
  

export default NutriologoLogin;