import React from 'react';
import { QrCode, ShoppingBag, Dumbbell, User, LogOut, MessageSquare } from 'lucide-react';

const ClientNavbar = ({ activeTab, setActiveTab, onLogout }) => {
  // Solo las 5 pestañas principales para un UX perfecto en móvil
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: QrCode },
    { id: 'plan', label: 'Mi Plan', icon: Dumbbell }, // <-- Agrupa Rutina, Entrenador y Nutriólogo
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare }, 
    { id: 'tienda', label: 'Tienda', icon: ShoppingBag }, // <-- Agrupa Catálogo y Servicios
    { id: 'perfil', label: 'Perfil', icon: User },
  ];

  return (
    <>
      {/* --- MENÚ DE ESCRITORIO --- */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 z-50 h-20 items-center px-8 justify-between shadow-2xl">
        <div className="flex items-center gap-8">
          {/* Logo */}
          <span className="text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-cyan-400 cursor-pointer">
            FitData <span className="text-white">GYM</span>
          </span>

          {/* Navegación Centrada */}
          <nav className="flex items-center gap-2">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-slate-800 text-white border-b-2 border-cyan-400 shadow-[0_4px_12px_-2px_rgba(34,211,238,0.3)] -translate-y-px'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-b-2 border-transparent'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Botón Salir (Escritorio) */}
        <div className="pl-8 border-l border-slate-800/50">
          <button
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-2 rounded-md shadow-lg shadow-red-900/50 transition-transform active:scale-95 text-sm"
          >
            Salir
          </button>
        </div>
      </header>

      {/* --- HEADER MÓVIL (Logo y Salir) --- */}
      {/* Esto permite que la barra inferior tenga solo 5 botones sin amontonarse */}
      <header className="md:hidden fixed top-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-b border-slate-800 z-50 h-16 flex items-center justify-between px-4">
        <span className="text-lg font-black text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-cyan-400">
          FitData <span className="text-white">GYM</span>
        </span>
        <button
          onClick={onLogout}
          className="text-red-400 hover:text-red-300 p-2 flex items-center gap-2"
        >
          <LogOut size={20} />
        </button>
      </header>

      {/* --- MENÚ MÓVIL INFERIOR (Las 5 Pestañas) --- */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-50 h-16">
        <div className="grid grid-cols-5 h-full"> 
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-1 ${
                  isActive ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <div className={`w-6 h-6 transition-all ${
                  isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]' : ''
                }`}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default ClientNavbar;