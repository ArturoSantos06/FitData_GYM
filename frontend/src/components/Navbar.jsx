import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ onLogout }) {
  const location = useLocation();

  // Función para resaltar el link activo con un gradiente
  const isActive = (path) => {
    return location.pathname === path 
      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-md" 
      : "text-gray-200 hover:bg-gray-700 hover:text-white";
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Home */}
          <Link to="/" className="flex items-center space-x-3 text-xl font-bold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-teal-400">
            {/* Asegúrate de que tu logo esté en 'frontend/public' */}
            <img src="/fitdata-logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="hidden sm:inline">FitData GYM</span>
          </Link>

          {/* Enlaces de Navegación */}
          <div className="flex space-x-2 md:space-x-4">
            <Link to="/" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/')}`}>
              Inicio
            </Link>
            <Link to="/registrar" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/registrar')}`}>
              Registrar Clientes
            </Link>
            <Link to="/asignar" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/asignar')}`}>
              Asignar Membresías
            </Link>
            <Link to="/configuracion" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/configuracion')}`}>
              Configurar Tipos
            </Link>
          </div>

          {/* Botón Salir */}
          <button 
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-md"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;