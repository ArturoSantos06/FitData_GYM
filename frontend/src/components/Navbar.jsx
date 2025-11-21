import React, { useState } from 'react'; 
import { Link, useLocation } from 'react-router-dom';

function Navbar({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false); 
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path 
      ? "bg-slate-700 text-white shadow-md border-b-2 border-cyan-400"
      : "text-gray-200 hover:bg-gray-700 hover:text-white";
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="bg-gray-900 text-white shadow-lg border-b border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          <Link to="/admin" className="flex items-center space-x-3 text-xl font-bold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-teal-400" onClick={closeMenu}>
            <img src="/fitdata-logo.png" alt="Logo" className="h-10 w-auto" />
            <span className="hidden sm:inline">FitData GYM</span>
          </Link>

          <div className="hidden md:flex space-x-2 md:space-x-4">
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

          <div className="hidden md:flex">
            <button 
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-bold transition-colors shadow-md"
            >
              Salir
            </button>
          </div>

          {/* BOTÓN HAMBURGUESA  */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setIsOpen(!isOpen)} 
              className="text-gray-300 hover:text-white focus:outline-none"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-gray-800 border-t border-gray-700 px-4 pt-2 pb-4 space-y-2 shadow-xl">
          <Link 
            to="/admin" 
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin')}`}
          >
            Inicio
          </Link>
          <Link 
            to="/admin/registrar" 
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/registrar')}`}
          >
            Registrar Clientes
          </Link>
          <Link 
            to="/admin/asignar" 
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/asignar')}`}
          >
            Asignar Membresías
          </Link>
          <Link 
            to="/admin/configuracion" 
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/configuracion')}`}
          >
            Configurar Tipos
          </Link>
          <Link 
            to="/admin/ventas" 
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/ventas')}`}
          >
            Punto de Venta
          </Link>
          
          {/* Botón Salir Móvil */}
          <div className="pt-4 border-t border-gray-700 mt-2">
            <button 
              onClick={() => { closeMenu(); onLogout(); }}
              className="w-full bg-red-600 hover:bg-red-700 px-4 py-3 rounded-lg text-base font-bold transition-colors shadow-md text-center"
            >
              Salir del Sistema
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

export default Navbar;