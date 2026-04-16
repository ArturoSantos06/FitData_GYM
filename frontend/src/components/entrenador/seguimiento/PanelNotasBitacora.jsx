import React from 'react';

const formatearFecha = (timestamp) => {
  if (!timestamp) return 'Sin fecha';
  const fecha = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return fecha.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function EstadoVacioBitacora() {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-12 shadow-xl text-center h-full flex flex-col items-center justify-center min-h-[400px]">
      <div className="text-6xl mb-6 opacity-80">👈</div>
      <h3 className="text-2xl font-bold text-white mb-2">Selecciona un Cliente</h3>
      <p className="text-slate-400 max-w-sm mx-auto">
        Selecciona un cliente de la lista lateral para ver y gestionar sus notas privadas.
      </p>
    </div>
  );
}

function PanelNotasBitacora({
  miembroSeleccionado,
  notas,
  cargando,
  textoNota,
  notaEditando,
  onCambiarTexto,
  onGuardar,
  onCancelarEdicion,
  onEditar,
  onEliminar,
}) {
  if (!miembroSeleccionado) return <EstadoVacioBitacora />;

  return (
    <div className="lg:col-span-2">
      <div className="space-y-6">
        <div className="bg-linear-to-r from-purple-900/40 to-blue-900/40 border border-purple-500/30 rounded-xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{miembroSeleccionado.nombre}</h2>
            <p className="text-slate-300 text-sm">{miembroSeleccionado.email}</p>
            {miembroSeleccionado.telefono && <p className="text-slate-400 text-sm mt-1">📞 {miembroSeleccionado.telefono}</p>}
          </div>
          <div className="bg-black/20 rounded-lg px-6 py-3 border border-white/10 shadow-inner">
            <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-1">Total Notas</p>
            <p className="text-3xl font-black text-white text-center">{notas.length}</p>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
          <form onSubmit={onGuardar}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">{notaEditando ? '✏️ Editar Nota' : '➕ Nueva Observación'}</h3>
              {notaEditando && (
                <button type="button" onClick={onCancelarEdicion} className="text-sm font-bold text-red-400 hover:text-red-300 transition-colors">
                  ❌ Cancelar Edición
                </button>
              )}
            </div>

            <textarea
              value={textoNota}
              onChange={(e) => onCambiarTexto(e.target.value)}
              placeholder="Escribe tus observaciones técnicas aquí..."
              className="w-full bg-slate-950 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:border-purple-500 outline-none min-h-[120px] resize-y transition-colors"
              required
            />

            <div className="flex justify-end mt-4">
              <button type="submit" className="bg-linear-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold px-6 py-2.5 rounded-lg transition-all shadow-lg shadow-purple-900/50 flex items-center gap-2 transform hover:scale-105">
                {notaEditando ? '💾 Actualizar Nota' : '💾 Guardar Nota'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-3"><span>📋</span> Historial de Notas</h3>

          {cargando ? (
            <div className="text-center py-8 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500 mx-auto"></div>
              <p className="mt-4 font-medium">Cargando notas...</p>
            </div>
          ) : notas.length === 0 ? (
            <div className="text-center py-10 bg-slate-950 rounded-lg border border-dashed border-purple-900/50">
              <p className="text-4xl mb-3 opacity-50">📝</p>
              <p className="text-slate-300 font-bold">Sin registros previos</p>
              <p className="text-sm text-slate-500 mt-1">Agrega la primera observación usando el formulario de arriba.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
              {notas.map((nota) => (
                <div key={nota.id} className="bg-slate-800 border border-slate-700 rounded-lg p-5 hover:border-purple-500/50 transition-colors shadow-md">
                  <div className="flex justify-between items-start mb-4 border-b border-slate-700/50 pb-3">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-purple-400 mb-1 tracking-wider uppercase">
                        📅 {formatearFecha(nota.createdAt)}
                        {nota.updatedAt && nota.updatedAt !== nota.createdAt && (
                          <span className="ml-2 text-slate-500 normal-case font-normal">(Editado: {formatearFecha(nota.updatedAt)})</span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400 font-medium">👤 Por: <span className="text-slate-300">{nota.trainerEmail || 'Entrenador'}</span></p>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => onEditar(nota)} className="text-slate-400 hover:text-blue-400 transition-colors" title="Editar nota">✏️</button>
                      <button onClick={() => onEliminar(nota.id)} className="text-slate-400 hover:text-pink-400 transition-colors" title="Eliminar nota">🗑️</button>
                    </div>
                  </div>
                  <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <p className="text-gray-300 whitespace-pre-wrap leading-relaxed text-sm">{nota.note}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PanelNotasBitacora;
