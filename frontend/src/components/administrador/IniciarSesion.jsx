import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, getUser, getUserByEmail, createUser, logoutUser } from '../../firebase';

function IniciarSesion({ onLogin }) {
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
            throw new Error('Acceso denegado: solo administradores pueden acceder aquí');
          }
        }
      }

      localStorage.setItem('firebaseUser', JSON.stringify({
        uid: user.uid,
        email: user.email
      }));

      onLogin();

    } catch (err) {
      const msg = String(err?.message || '');
      const errorMessage =
        msg.includes('auth/invalid-credential') ||
        msg.includes('auth/user-not-found') ||
        msg.includes('auth/wrong-password') ||
        msg.includes('auth/invalid-login-credentials')
          ? 'Correo o contraseña incorrecta'
          : msg.includes('auth/invalid-email')
          ? 'Correo electrónico inválido'
          : msg;
      
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
          <div className="relative mt-2">
            <input 
              type={showPassword ? 'text' : 'password'} 
              placeholder="••••••"
              className="w-full px-4 py-2 pr-11 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading} 
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isLoading}
              className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-white disabled:opacity-50"
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4.03 3.97a.75.75 0 10-1.06 1.06l1.35 1.35A9.77 9.77 0 001.72 10a.75.75 0 000 .3 9.75 9.75 0 004.11 5.72.75.75 0 10.84-1.24A8.25 8.25 0 013.25 10c.58-1.37 1.6-2.56 2.93-3.43l1.42 1.42A3.5 3.5 0 0012 12.5l1.43 1.43A8.19 8.19 0 0110 14.75c-.95 0-1.88-.16-2.73-.47a.75.75 0 10-.5 1.41c1 .36 2.1.56 3.23.56 1.9 0 3.68-.55 5.18-1.5l1.79 1.78a.75.75 0 101.06-1.06l-14-14z" />
                  <path d="M10 5.25c3.2 0 5.95 1.87 7.25 4.75a8.22 8.22 0 01-2.76 3.24.75.75 0 10.86 1.23 9.73 9.73 0 003.36-4.17.75.75 0 000-.6A9.75 9.75 0 0010 3.75c-.96 0-1.9.14-2.79.4a.75.75 0 10.42 1.44c.76-.22 1.55-.34 2.37-.34z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 3.75c-4.27 0-7.86 2.7-9.25 6.25a.75.75 0 000 .5C2.14 14.05 5.73 16.75 10 16.75s7.86-2.7 9.25-6.25a.75.75 0 000-.5C17.86 6.45 14.27 3.75 10 3.75zm0 11.5c-3.6 0-6.65-2.22-7.95-5.25C3.35 6.97 6.4 4.75 10 4.75s6.65 2.22 7.95 5.25c-1.3 3.03-4.35 5.25-7.95 5.25z" />
                  <path d="M10 7a3 3 0 100 6 3 3 0 000-6zm0 1.5a1.5 1.5 0 110 3 1.5 1.5 0 010-3z" />
                </svg>
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
                {/* Spinner SVG */}
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

export default IniciarSesion;