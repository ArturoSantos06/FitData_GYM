import React, { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    }
  };

  return (
    <div className="px-8 py-8 mt-4 text-left bg-gray-800 shadow-2xl rounded-xl max-w-md w-full border border-gray-700">
      <div className="text-center mb-6">
        {/* Logo */}
        {/* Asegúrate de que tu logo esté en 'frontend/public' */}
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
            className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mt-4">
          <label className="block text-gray-300">Contraseña</label>
          <input 
            type="password" 
            placeholder="••••••"
            className="w-full px-4 py-2 mt-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p className="text-red-400 text-sm mt-3 text-center">{error}</p>}

        <div className="flex items-baseline justify-between mt-6">
          <button className="px-6 py-2 text-lg text-white font-bold bg-linear-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all w-full shadow-lg">
            Entrar
          </button>
        </div>
      </form>
    </div>
  );
}

export default Login;