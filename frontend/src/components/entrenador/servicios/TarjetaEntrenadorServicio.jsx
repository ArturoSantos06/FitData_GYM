import React from 'react';
import { Award, CheckCircle, Dumbbell, Star } from 'lucide-react';
import { formatearMoneda, obtenerConfiguracionServicio, obtenerPrecioPorTipoServicio } from '../../../backend/utilidadesServicioEntrenador';

function TarjetaEntrenadorServicio({
  entrenador,
  entrenadorSeleccionado,
  entrenadorAsignadoId,
  clienteActualId,
  resenas,
  estrellasHover,
  asignando,
  onHoverEstrella,
  onSalirEstrella,
  onCalificar,
  onSeleccionar,
  calcularPromedio,
}) {
  const configuracion = obtenerConfiguracionServicio(entrenador);

  return (
    <div className={`relative w-full bg-slate-900/60 border rounded-xl p-6 transition-all duration-300 hover:bg-slate-800/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 ${
      entrenadorSeleccionado?.id === entrenador.id ? 'border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/20' : 'border-slate-700'
    }`}>
      {entrenadorSeleccionado?.id === entrenador.id && <div className="absolute top-3 right-3"><CheckCircle className="w-6 h-6 text-blue-400" /></div>}

      <div className="flex flex-col items-center text-center space-y-4">
        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center"><Dumbbell className="w-8 h-8 text-blue-400" /></div>

        <div>
          <h3 className="font-bold text-white text-lg">{entrenador.displayName || `${String(entrenador.firstName || '').trim()} ${String(entrenador.lastName || '').trim()}`.trim() || entrenador.nombre || 'Sin nombre'}</h3>
          <p className="text-blue-400 text-sm font-medium">{entrenador.especialidad || 'Entrenador Personal'}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-2 text-[11px] font-semibold">
            {configuracion.offersPersonal && <span className="px-2 py-1 rounded-full bg-cyan-900/40 text-cyan-200 border border-cyan-700">Personal ${formatearMoneda(obtenerPrecioPorTipoServicio(entrenador, 'PERSONAL'))} MXN</span>}
            {configuracion.offersGroup && <span className="px-2 py-1 rounded-full bg-emerald-900/40 text-emerald-200 border border-emerald-700">Grupal ${formatearMoneda(obtenerPrecioPorTipoServicio(entrenador, 'GRUPAL'))} MXN</span>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {entrenadorAsignadoId === entrenador.id ? (
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((estrella) => {
                const resenasEntrenador = resenas[entrenador.id] || [];
                const miResena = resenasEntrenador.find((item) => item.clientId === clienteActualId);
                const miCalificacion = miResena ? miResena.rating : 0;
                const visible = estrellasHover[entrenador.id] || miCalificacion;
                const llena = estrella <= visible;

                return (
                  <button key={estrella} onClick={() => onCalificar(entrenador.id, estrella)} onMouseEnter={() => onHoverEstrella(entrenador.id, estrella)} onMouseLeave={() => onSalirEstrella(entrenador.id)} className="focus:outline-none">
                    <Star className={`w-4 h-4 transition-colors ${llena ? 'text-amber-400 fill-current' : 'text-slate-600'}`} />
                  </button>
                );
              })}
              <span className="text-slate-400 text-xs ml-2">{calcularPromedio(entrenador.id) ? `(${calcularPromedio(entrenador.id)})` : '(Sin calificaciones)'}</span>
            </div>
          ) : (
            <>
              {[1, 2, 3, 4, 5].map((estrella) => {
                const promedio = calcularPromedio(entrenador.id);
                const llena = promedio ? estrella <= Math.round(parseFloat(promedio)) : false;
                return <Star key={estrella} className={`w-4 h-4 ${llena ? 'text-amber-400 fill-current' : 'text-slate-600'}`} />;
              })}
              <span className="text-slate-400 text-xs ml-2">{calcularPromedio(entrenador.id) ? `(${calcularPromedio(entrenador.id)})` : '(Sin reseñas)'}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-slate-400 text-xs"><Award className="w-4 h-4" /><span>Certificado</span></div>

        <button
          onClick={() => onSeleccionar(entrenador)}
          disabled={asignando || entrenadorAsignadoId === entrenador.id}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
            entrenadorAsignadoId === entrenador.id
              ? 'bg-green-600 hover:bg-green-500 text-white cursor-not-allowed'
              : entrenadorSeleccionado?.id === entrenador.id
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-slate-700 hover:bg-slate-600 text-slate-300 disabled:opacity-50'
          }`}
        >
          {asignando && entrenadorSeleccionado?.id === entrenador.id ? 'Asignando...' : entrenadorAsignadoId === entrenador.id ? 'Asignado' : 'Seleccionar'}
        </button>
      </div>
    </div>
  );
}

export default TarjetaEntrenadorServicio;
