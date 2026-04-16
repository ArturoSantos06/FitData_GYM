import React from 'react';

function ListaClientesBitacora({
  miembros,
  miembroSeleccionado,
  terminoBusqueda,
  conteoNotas,
  onBuscar,
  onSeleccionar,
}) {
  return (
    <div className="lg:col-span-1">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl h-full">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">👥</span> Clientes
        </h2>

        <input
          type="text"
          placeholder="Buscar cliente..."
          value={terminoBusqueda}
          onChange={(e) => onBuscar(e.target.value)}
          className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:border-purple-500 outline-none mb-4 transition-colors"
        />

        <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto custom-scrollbar pr-2">
          {miembros.map((miembro) => (
            <button
              key={miembro.id}
              onClick={() => onSeleccionar(miembro)}
              className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${
                miembroSeleccionado?.id === miembro.id
                  ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-[1.02] border-transparent'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-purple-500/50 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold">{miembro.nombre}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  miembroSeleccionado?.id === miembro.id ? 'bg-white/15 text-white' : 'bg-purple-500/15 text-purple-300'
                }`}>
                  {conteoNotas[miembro.id] || 0}
                </span>
              </div>
              <p className={`text-xs ${miembroSeleccionado?.id === miembro.id ? 'text-purple-200' : 'text-slate-500'}`}>
                {miembro.email}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListaClientesBitacora;
