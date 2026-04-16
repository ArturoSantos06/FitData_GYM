import React from 'react';
import { Home, Calendar, Users, User, LogOut, MessageCircle } from 'lucide-react';

const pestañasPortal = [
  { id: 'inicio', etiqueta: 'Inicio', icono: Home },
  { id: 'agenda', etiqueta: 'Agenda', icono: Calendar },
  { id: 'gestion', etiqueta: 'Gestión', icono: Users },
  { id: 'mensajes', etiqueta: 'Mensajes', icono: MessageCircle },
  { id: 'perfil', etiqueta: 'Perfil', icono: User },
];

function BarraNavegacionEntrenador({ pestañaActiva, onCambiarPestaña, onCerrarSesion }) {
  return (
    <>
      <header className="hidden md:flex fixed top-0 left-0 right-0 bg-slate-900 border-b border-slate-800 z-50 h-20 items-center px-8 justify-center shadow-2xl">
        <div className="flex items-center gap-5">
          <span className="text-xl font-black text-transparent bg-clip-text bg-linear-to-r from-blue-500 to-cyan-400 mr-4 cursor-pointer">
            FitData <span className="text-white">GYM</span>
          </span>

          <nav className="flex items-center gap-5">
            {pestañasPortal.map((pestaña) => {
              const activa = pestañaActiva === pestaña.id;
              return (
                <button
                  key={pestaña.id}
                  onClick={() => onCambiarPestaña(pestaña.id)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 ${
                    activa
                      ? 'bg-slate-800 text-white border-b-2 border-cyan-400 shadow-[0_4px_12px_-2px_rgba(34,211,238,0.3)] -translate-y-px'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border-b-2 border-transparent'
                  }`}
                >
                  {pestaña.etiqueta}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pl-8 border-l border-slate-800/50">
          <button
            onClick={onCerrarSesion}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 rounded-md shadow-lg transition-transform active:scale-95 text-sm"
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 left-0 w-full bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 pb-safe z-50 h-16">
        <div className="grid grid-cols-6 h-full">
          {pestañasPortal.map((pestaña) => {
            const activa = pestañaActiva === pestaña.id;
            const Icono = pestaña.icono;
            return (
              <button
                key={pestaña.id}
                onClick={() => onCambiarPestaña(pestaña.id)}
                className={`flex flex-col items-center justify-center gap-1 ${activa ? 'text-blue-400' : 'text-slate-500'}`}
              >
                <Icono size={22} />
                <span className="text-[9px] font-medium truncate w-full px-1 text-center">{pestaña.etiqueta}</span>
              </button>
            );
          })}

          <button onClick={onCerrarSesion} className="flex flex-col items-center justify-center gap-1 text-red-400">
            <LogOut size={22} />
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default BarraNavegacionEntrenador;
