import React from 'react';
import { ChevronRight, ClipboardList, StickyNote, Dumbbell, UserMinus } from 'lucide-react';

function TarjetaAccion({ color, icono: Icono, titulo, descripcion, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200"
    >
      <div className="flex items-center gap-4 text-left">
        <div className={`p-3 rounded-lg group-hover:scale-110 transition-transform ${color.fondo} ${color.texto}`}>
          {React.createElement(Icono, { size: 24 })}
        </div>
        <div className="flex flex-col">
          <span className={`font-bold group-hover:text-white text-lg ${color.titulo}`}>{titulo}</span>
          <span className="text-slate-400 text-sm hidden md:block">{descripcion}</span>
        </div>
      </div>
      <ChevronRight className={`text-slate-500 transition-transform group-hover:translate-x-1 ${color.flecha}`} size={24} />
    </button>
  );
}

function MenuGestionEntrenador({ onCambiarVista }) {
  return (
    <div className="w-full flex justify-center animate-fade-in">
      <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-teal-400 via-blue-400 to-purple-400"></div>

        <div className="mb-8 text-center md:text-left">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-teal-400 via-blue-400 to-purple-400">
            Herramientas de Gestión
          </h2>
          <p className="text-slate-400 font-medium mt-1.5">Selecciona la acción que deseas realizar con tus clientes.</p>
        </div>

        <div className="space-y-3">
          <TarjetaAccion
            color={{ fondo: 'bg-blue-500/10', texto: 'text-blue-400 group-hover:text-blue-300', titulo: 'text-blue-300', flecha: 'group-hover:text-blue-400' }}
            icono={ClipboardList}
            titulo="Historial Clínico"
            descripcion="Consultar fichas médicas y lesiones"
            onClick={() => onCambiarVista('historial')}
          />
          <TarjetaAccion
            color={{ fondo: 'bg-purple-500/10', texto: 'text-purple-400 group-hover:text-purple-300', titulo: 'text-purple-300', flecha: 'group-hover:text-purple-400' }}
            icono={StickyNote}
            titulo="Bitácora Privada"
            descripcion="Anotaciones y seguimiento de clientes"
            onClick={() => onCambiarVista('bitacora')}
          />
          <TarjetaAccion
            color={{ fondo: 'bg-emerald-500/10', texto: 'text-emerald-400 group-hover:text-emerald-300', titulo: 'text-emerald-300', flecha: 'group-hover:text-emerald-400' }}
            icono={Dumbbell}
            titulo="Gestión de Rutinas"
            descripcion="Asignar y modificar planes de entrenamiento"
            onClick={() => onCambiarVista('rutinas')}
          />
          <TarjetaAccion
            color={{ fondo: 'bg-red-500/10', texto: 'text-red-400 group-hover:text-red-300', titulo: 'text-red-300', flecha: 'group-hover:text-red-400' }}
            icono={UserMinus}
            titulo="Pagos"
            descripcion="Semáforo de estado de pagos de clientes"
            onClick={() => onCambiarVista('desvinculacion')}
          />
        </div>
      </div>
    </div>
  );
}

export default MenuGestionEntrenador;
