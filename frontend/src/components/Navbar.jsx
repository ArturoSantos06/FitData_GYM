import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar({ onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path 
      ? "bg-slate-700 text-white shadow-md border-b-2 border-cyan-400"
      : "text-gray-200 hover:bg-gray-700 hover:text-white";
  };

  return (
    <nav className="bg-gray-900 text-white shadow-lg border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <Link to="/admin" className="flex items-center space-x-3 text-xl font-bold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-teal-400">
            <img src="/fitdata-logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="hidden sm:inline">FitData GYM</span>
          </Link>

          <div className="flex space-x-2 md:space-x-4">
            <Link to="/admin" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/admin')}`}>
              Inicio
            </Link>
            <Link to="/admin/registrar" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/admin/registrar')}`}>
              Registrar Clientes
            </Link>
            <Link to="/admin/asignar" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/admin/asignar')}`}>
              Asignar Membresías
            </Link>
            <Link to="/admin/configuracion" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/admin/configuracion')}`}>
              Configurar Tipos
            </Link>
            <Link to="/admin/ventas" className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${isActive('/admin/ventas')}`}>
   Punto de Venta
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