import React, { useState } from 'react';

function formatearFecha(valor) {
    try {
        const date = valor?.toDate?.() || new Date(valor || Date.now());
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString('es-MX');
    } catch {
        return '';
    }
}

function TarjetaReporteMantenimiento({
    reporte,
    mostrarAccionResolver = false,
    onResolver,
    resolviendo = false,
    mostrarAccionEliminar = false,
    onEliminar,
    eliminando = false,
}) {
    const pendiente = String(reporte?.estado || '').toLowerCase() !== 'resuelto';
    const [imagenActiva, setImagenActiva] = useState('');

    return (
        <article className="overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-900/80 shadow-sm">
            <div className="relative h-44 w-full bg-slate-800">
                {reporte?.maquinaFotoUrl ? (
                    <button
                        type="button"
                        onClick={() => setImagenActiva(reporte.maquinaFotoUrl)}
                        className="h-full w-full cursor-zoom-in"
                    >
                        <img src={reporte.maquinaFotoUrl} alt={reporte.maquinaNombre || 'Maquina'} className="h-full w-full object-cover" />
                    </button>
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">Sin foto de maquina</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-white">
                    <h3 className="text-2xl font-bold leading-tight">{reporte?.maquinaNombre || 'Maquina'}</h3>
                    <p className="text-sm text-slate-200">{formatearFecha(reporte?.creadoEn)}</p>
                </div>
            </div>

            <div className="space-y-4 p-4">
                <p className="text-base text-slate-100">{reporte?.descripcion || 'Sin descripcion'}</p>

                {reporte?.fotoUsuarioUrl && (
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">Foto del usuario</p>
                        <button
                            type="button"
                            onClick={() => setImagenActiva(reporte.fotoUsuarioUrl)}
                            className="h-28 w-full cursor-zoom-in overflow-hidden rounded-xl"
                        >
                            <img src={reporte.fotoUsuarioUrl} alt="Evidencia de usuario" className="h-28 w-full rounded-xl object-cover" />
                        </button>
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${pendiente ? 'bg-amber-500/20 text-amber-200' : 'bg-emerald-500/20 text-emerald-200'
                            }`}
                    >
                        {pendiente ? 'Pendiente' : 'Resuelto'}
                    </span>

                    <div className="flex items-center gap-2">
                        {mostrarAccionResolver && pendiente && (
                            <button
                                type="button"
                                onClick={() => onResolver?.(reporte.id)}
                                disabled={resolviendo || eliminando}
                                className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {resolviendo ? 'Guardando...' : 'Marcar como resuelto'}
                            </button>
                        )}

                        {mostrarAccionEliminar && (
                            <button
                                type="button"
                                onClick={() => onEliminar?.(reporte.id)}
                                disabled={eliminando || resolviendo}
                                className="rounded-xl border border-rose-400/50 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {eliminando ? 'Eliminando...' : 'Eliminar'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {imagenActiva && (
                <div
                    className="fixed inset-0 z-70 flex items-center justify-center bg-black/85 p-4"
                    onClick={() => setImagenActiva('')}
                >
                    <div className="relative max-h-[90vh] max-w-5xl" onClick={(event) => event.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setImagenActiva('')}
                            className="absolute right-2 top-2 rounded-lg bg-black/60 px-3 py-1 text-sm font-semibold text-white"
                        >
                            Cerrar
                        </button>
                        <img src={imagenActiva} alt="Vista ampliada" className="max-h-[90vh] max-w-full rounded-xl object-contain" />
                    </div>
                </div>
            )}
        </article>
    );
}

export default TarjetaReporteMantenimiento;
