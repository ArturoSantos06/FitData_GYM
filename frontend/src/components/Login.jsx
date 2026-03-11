import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getUser, getUserByEmail, createUser, logoutUser } from '../firebase';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false); 
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    setIsLoading(true); 

    try {
      const result = await loginUser(email, password);

      if (!result.success) {
        throw new Error(result.error);
      }

      const { user } = result;
      
      const userDoc = await getUser(user.uid);
      const roleFromUid = userDoc.success ? userDoc.data?.role : null;

      if (roleFromUid !== 'admin') {
        if (user.email === 'admin@fitdata.gym') {
          await createUser(user.uid, {
            email: user.email,
            displayName: user.displayName || email.split('@')[0],
            role: 'admin'
          });
        } else {
          const emailDoc = await getUserByEmail(user.email);
          const roleFromEmail = emailDoc.success ? emailDoc.data?.role : null;

          if (roleFromEmail === 'admin') {
            if (!userDoc.success) {
              await createUser(user.uid, {
                email: user.email,
                displayName: user.displayName || email.split('@')[0],
                role: 'admin'
              });
            }
          } else {
            await logoutUser();
            throw new Error('Acceso denegado: solo administradores');
          }
        }
      }

      localStorage.setItem('firebaseUser', JSON.stringify({
        uid: user.uid,
        email: user.email
      }));

      onLogin();

    } catch (err) {
      const msg = err.message || '';
      const errorMessage =
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/wrong-password')
          ? 'Correo o contraseña incorrecta'
          : msg.includes('auth/invalid-email')
          ? 'Correo electrónico inválido'
          : msg.includes('auth/too-many-requests')
          ? 'Demasiados intentos fallidos. Intenta más tarde'
          : msg.includes('Acceso denegado')
          ? msg
          : 'Correo o contraseña incorrectos';
      setError(errorMessage);
      console.error(err);
      setIsLoading(false);
    }
  };

  return (
    <div className="px-8 py-8 mt-4 text-left bg-gray-800 shadow-2xl rounded-xl max-w-md w-full border border-gray-700 relative">
      
      <button 
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 text-gray-400 hover:text-white flex items-center gap-1 text-sm font-medium transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Volver
      </button>

      <div className="text-center mb-6 mt-6">
        <img src="/fitdata-logo.png" alt="FitData GYM Logo" className="mx-auto h-24 w-auto mb-4 drop-shadow-lg" />
        <h3 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-purple-400 to-blue-400">Iniciar Sesión</h3>
        <p className="text-gray-400 mt-2">Acceso al Panel de Administración</p>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mt-4">
          <label className="block text-gray-300">Email</label>
          <input 
            type="email" 
            placeholder="tu@email.com"
            className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading} 
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-gray-300">Contraseña</label>
          <div className="relative">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••"
              className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 pr-10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading} 
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3 top-[calc(50%+4px)] -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
        </div>
        
        {error && <p className="text-red-400 text-sm mt-3 text-center animate-pulse">{error}</p>}

        <div className="flex items-baseline justify-between mt-6">
          <button 
            className={`px-6 py-3 text-lg text-white font-bold rounded-lg w-full shadow-lg flex justify-center items-center gap-3 transition-all
              ${isLoading 
                ? 'bg-gray-600 cursor-not-allowed opacity-70' 
                : 'bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700'
              }`}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Entrando...</span>
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;