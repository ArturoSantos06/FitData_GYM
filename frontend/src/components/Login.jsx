import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false); 
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    setIsLoading(true); 

    try {
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api-token-auth/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        throw new Error('Credenciales incorrectas');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      onLogin();

    } catch (err) {
      setError('Usuario o contraseña incorrectos');
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
          <label className="block text-gray-300">Usuario</label>
          <input 
            type="text" 
            placeholder="Tu usuario"
            className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isLoading} 
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-gray-300">Contraseña</label>
          <input 
            type="password" 
            placeholder="••••••"
            className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading} 
            required
          />
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
            {/* 3. Lógica visual del botón */}
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

export default Login;