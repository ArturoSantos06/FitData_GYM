import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

function Navbar({ onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVentasOpen, setIsVentasOpen] = useState(false);
  const [isServiciosOpen, setIsServiciosOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path
      ? "bg-linear-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20 border border-cyan-300/30"
      : "bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white";
  };

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className="sticky top-3 z-50 px-3 md:px-4">
      <div className="w-full max-w-screen-2xl mx-auto rounded-2xl border border-white/10 bg-slate-900/85 text-white shadow-[0_18px_50px_-22px_rgba(0,0,0,0.75)] backdrop-blur-xl overflow-visible">
        <div className="flex items-center justify-between gap-3 h-16 px-4 lg:px-5">
          <Link
            to="/admin"
            className="flex items-center gap-2 text-lg font-bold tracking-wider text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-blue-400 to-teal-400 shrink-0"
            onClick={closeMenu}
          >
            <img src="/fitdata-logo.png" alt="Logo" className="h-7 w-auto" />
            <span className="whitespace-nowrap leading-none text-sm lg:text-base">FitData GYM</span>
          </Link>

          <div className="hidden lg:flex flex-1 items-center justify-center gap-1.5 xl:gap-2 min-w-0 py-1">
            <Link to="/admin" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin')}`}>
              Inicio
            </Link>
            <Link to="/admin/registrar" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/registrar')}`}>
              Registro
            </Link>
            <Link to="/admin/asignar" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/asignar')}`}>
              Renovar Membresías
            </Link>
            <Link to="/admin/configuracion" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/configuracion')}`}>
              Creación de Membresía
            </Link>

            {/* Dropdown Ventas e Inventario */}
            <div className="relative group">
              <button className="inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 gap-1 bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white">
                Ventas
                <ChevronDown size={15} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute left-0 top-[calc(100%-2px)] hidden group-hover:block bg-slate-950/95 border border-white/10 rounded-xl shadow-2xl py-2 min-w-max z-50 backdrop-blur-xl">
                <Link to="/admin/ventas" onClick={closeMenu} className="block w-full px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white">
                  Punto de Venta
                </Link>
                <Link to="/admin/inventario" onClick={closeMenu} className="block w-full px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white">
                  Inventario
                </Link>
                <Link to="/admin/reportes-facturas" onClick={closeMenu} className="block w-full px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white">
                  Reportes de Facturación
                </Link>
              </div>
            </div>

            <Link to="/admin/fichas-medicas" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/fichas-medicas')}`}>
              Fichas Médicas
            </Link>
            <Link to="/admin/check-in-out" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/check-in-out')}`}>
              Check In/Out
            </Link>
            <div className="relative group">
              <button className="inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 gap-1 bg-white/5 text-gray-200 border border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white">
                Gestión Servicios
                <ChevronDown size={15} className="group-hover:rotate-180 transition-transform" />
              </button>
              <div className="absolute left-0 top-[calc(100%-2px)] hidden group-hover:block bg-slate-950/95 border border-white/10 rounded-xl shadow-2xl py-2 min-w-max z-50 backdrop-blur-xl">
                <Link to="/admin/gestion-entrenadores" onClick={closeMenu} className="block w-full px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white">
                  Gestión Entrenadores
                </Link>
                <Link to="/admin/gestion-nutriologos" onClick={closeMenu} className="block w-full px-4 py-2 text-sm font-semibold text-gray-200 hover:bg-white/10 hover:text-white">
                  Gestión Nutriólogos
                </Link>
              </div>
            </div>
            <Link to="/admin/mantenimiento" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/mantenimiento')}`}>
              Mantenimiento
            </Link>
            <Link to="/admin/chatbot" className={`inline-flex h-8 items-center px-2 rounded-full text-[11px] xl:text-[12px] 2xl:text-sm font-semibold whitespace-nowrap box-border transition-all duration-200 ${isActive('/admin/chatbot')}`}>
              Chat Bot
            </Link>
          </div>

          <div className="hidden lg:flex shrink-0 pl-2">
            <button
              onClick={onLogout}
              className="inline-flex h-9 items-center bg-red-500 hover:bg-red-600 px-3.5 rounded-full text-[12px] lg:text-sm font-bold transition-colors shadow-md whitespace-nowrap box-border"
            >
              Salir
            </button>
          </div>

          {/* BOTÓN HAMBURGUESA  */}
          <div className="lg:hidden flex items-center shrink-0">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white focus:outline-none"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
        <div className="lg:hidden mt-2 bg-slate-900/95 border border-white/10 rounded-2xl px-4 pt-2 pb-4 space-y-2 shadow-xl backdrop-blur-xl">
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
            Registro
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
            Creación de Membresía
          </Link>

          {/* Dropdown Ventas Móvil */}
          <div>
            <button
              onClick={() => setIsVentasOpen(!isVentasOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-semibold text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              <span>💰 Ventas</span>
              <ChevronDown size={18} className={`transition-transform ${isVentasOpen ? 'rotate-180' : ''}`} />
            </button>
            {isVentasOpen && (
              <div className="pl-4 space-y-2 mt-2 border-l-2 border-gray-700">
                <Link
                  to="/admin/ventas"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/ventas')}`}
                >
                  Punto de Venta
                </Link>
                <Link
                  to="/admin/inventario"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/inventario')}`}
                >
                  Inventario
                </Link>
                <Link
                  to="/admin/reportes-facturas"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/reportes-facturas')}`}
                >
                  Reportes de Facturación
                </Link>
              </div>
            )}
          </div>

          <Link
            to="/admin/check-in-out"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/check-in-out')}`}
          >
            📱 Check In/Out
          </Link>
          <Link
            to="/admin/fichas-medicas"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/fichas-medicas')}`}
          >
            🩺 Fichas Médicas
          </Link>
          <div>
            <button
              onClick={() => setIsServiciosOpen(!isServiciosOpen)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-semibold text-gray-200 hover:bg-gray-700 hover:text-white"
            >
              <span>👥 Gestión Servicios</span>
              <ChevronDown size={18} className={`transition-transform ${isServiciosOpen ? 'rotate-180' : ''}`} />
            </button>
            {isServiciosOpen && (
              <div className="pl-4 space-y-2 mt-2 border-l-2 border-gray-700">
                <Link
                  to="/admin/gestion-entrenadores"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/gestion-entrenadores')}`}
                >
                  Gestión Entrenadores
                </Link>
                <Link
                  to="/admin/gestion-nutriologos"
                  onClick={closeMenu}
                  className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/gestion-nutriologos')}`}
                >
                  Gestión Nutriólogos
                </Link>
              </div>
            )}
          </div>
          <Link
            to="/admin/mantenimiento"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/mantenimiento')}`}
          >
            🛠️ Mantenimiento
          </Link>
          <Link
            to="/admin/chatbot"
            onClick={closeMenu}
            className={`block px-3 py-2 rounded-lg text-base font-semibold ${isActive('/admin/chatbot')}`}
          >
            🤖 Chat Bot
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