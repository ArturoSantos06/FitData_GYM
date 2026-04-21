import React from 'react';
import { ChevronRight, DollarSign, Lock, User } from 'lucide-react';

function MenuPerfilEntrenador({ usuario, onNavigate }) {
  const iniciales = `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() || usuario.username || usuario.email || 'T';

  return (
    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      <div className="h-28 bg-linear-to-r from-cyan-950 via-blue-950 to-slate-900" />
      <div className="px-6 md:px-8 pb-8 -mt-12 relative">
        <div className="w-24 h-24 rounded-full border-4 border-slate-900 bg-blue-700 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
          {iniciales.charAt(0).toUpperCase()}
        </div>

        <div className="mt-4">
          <h2 className="text-3xl font-bold text-white">
            {usuario.firstName || usuario.lastName ? `${usuario.firstName || ''} ${usuario.lastName || ''}`.trim() : usuario.username || 'Entrenador'}
          </h2>
          <p className="text-slate-400">{usuario.email}</p>
        </div>

        <div className="mt-8 space-y-3">
          <button type="button" onClick={() => onNavigate('edit-personal')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400 group-hover:text-cyan-300"><User size={20} /></div>
              <span className="text-slate-200 font-medium group-hover:text-white">Editar datos personales</span>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-cyan-400 transition-transform group-hover:translate-x-1" size={20} />
          </button>

          <button type="button" onClick={() => onNavigate('edit-contrato')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 group-hover:text-amber-300"><DollarSign size={20} /></div>
              <span className="text-slate-200 font-medium group-hover:text-white">Datos de contrato y facturación</span>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-amber-400 transition-transform group-hover:translate-x-1" size={20} />
          </button>

          <button type="button" onClick={() => onNavigate('change-password')} className="w-full bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between group transition-all duration-200">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:text-emerald-300"><Lock size={20} /></div>
              <span className="text-slate-200 font-medium group-hover:text-white">Cambiar contraseña</span>
            </div>
            <ChevronRight className="text-slate-500 group-hover:text-emerald-400 transition-transform group-hover:translate-x-1" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MenuPerfilEntrenador;
