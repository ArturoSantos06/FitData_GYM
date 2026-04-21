import React, { useMemo, useState } from 'react';
import { crearReporteMantenimiento, subirFotoReporte } from '../../backend/mantenimiento';

function FormularioReporteEnChat({ maquinas = [], onCancel, onSuccess }) {
    const [maquinaId, setMaquinaId] = useState('');
    const [mostrarOpcionesMaquina, setMostrarOpcionesMaquina] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    const maquinaSeleccionada = useMemo(
        () => maquinas.find((item) => item.id === maquinaId) || null,
        [maquinaId, maquinas]
    );

    const tieneSeleccion = Boolean(maquinaSeleccionada) || Boolean(archivo);

    const limpiarSeleccion = () => {
        setMaquinaId('');
        setArchivo(null);
        setMostrarOpcionesMaquina(false);
        setError('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!maquinaSeleccionada) {
            setError('Selecciona una maquina del catalogo.');
            return;
        }

        if (!String(descripcion || '').trim()) {
            setError('Describe el problema para enviar el reporte.');
            return;
        }

        setEnviando(true);
        try {
            let fotoUsuarioUrl = '';
            if (archivo) {
                const subida = await subirFotoReporte(archivo);
                if (!subida.success) {
                    throw new Error(subida.error || 'No se pudo subir la foto del reporte.');
                }
                fotoUsuarioUrl = subida.url;
            }

            await crearReporteMantenimiento({
                maquinaId: maquinaSeleccionada?.id || '',
                maquinaNombre: maquinaSeleccionada?.nombre || '',
                maquinaFotoUrl: maquinaSeleccionada?.fotoUrl || '',
                descripcion,
                fotoUsuarioUrl,
            });

            onSuccess?.({
                maquinaNombre: maquinaSeleccionada?.nombre || 'Sin maquina seleccionada',
                descripcion,
            });

            setMaquinaId('');
            setDescripcion('');
            setArchivo(null);
        } catch (submitError) {
            setError(String(submitError?.message || 'No se pudo crear el reporte.'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="mb-2 space-y-2 rounded-xl border border-slate-600 bg-slate-900/70 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-200">Reportar maquina descompuesta</p>

            <div className="relative">
                <button
                    type="button"
                    onClick={() => setMostrarOpcionesMaquina((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-left text-sm text-slate-100"
                >
                    <span className="truncate">
                        {maquinaSeleccionada ? maquinaSeleccionada.nombre : 'Selecciona una maquina'}
                    </span>
                    <span className="ml-2 text-xs text-slate-400">▼</span>
                </button>

                {mostrarOpcionesMaquina && (
                    <div className="absolute bottom-full z-20 mb-1 max-h-72 w-full overflow-y-auto overscroll-contain rounded-lg border border-slate-600 bg-slate-950 shadow-lg">
                        {maquinas.length === 0 ? (
                            <p className="px-3 py-2 text-xs text-slate-400">No hay maquinas disponibles.</p>
                        ) : (
                            maquinas.map((maquina) => {
                                const opcionActiva = maquina.id === maquinaId;
                                return (
                                    <button
                                        key={maquina.id}
                                        type="button"
                                        onClick={() => {
                                            setMaquinaId(maquina.id);
                                            setMostrarOpcionesMaquina(false);
                                        }}
                                        className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${opcionActiva ? 'bg-cyan-600/25' : 'hover:bg-slate-800/80'}`}
                                    >
                                        {maquina?.fotoUrl ? (
                                            <img
                                                src={maquina.fotoUrl}
                                                alt={maquina.nombre || 'Maquina'}
                                                className="h-10 w-10 rounded-md border border-slate-500 object-cover"
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-600 bg-slate-900 text-[10px] text-slate-400">
                                                Sin foto
                                            </div>
                                        )}
                                        <span className="truncate text-sm text-slate-100">{maquina.nombre}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {maquinaSeleccionada?.fotoUrl && (
                <div className="flex h-72 items-center justify-center overflow-hidden rounded-lg border border-slate-600 bg-slate-950 p-2">
                    <img
                        src={maquinaSeleccionada.fotoUrl}
                        alt={maquinaSeleccionada.nombre || 'Maquina seleccionada'}
                        className="max-h-full max-w-full object-contain"
                        loading="lazy"
                    />
                </div>
            )}

            <textarea
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                rows={3}
                placeholder="Describe la falla..."
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-400"
            />

            <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                onChange={(event) => {
                    const nextFile = event.target.files?.[0] || null;
                    setArchivo(nextFile);
                }}
                className="w-full rounded-lg border border-dashed border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-300"
            />

            {archivo && (
                <p className="text-xs text-slate-300">Foto seleccionada: {archivo.name}</p>
            )}

            {error && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-200">
                    {error}
                </p>
            )}

            <div className="flex items-center justify-end gap-2">
                {tieneSeleccion && (
                    <button
                        type="button"
                        onClick={limpiarSeleccion}
                        className="rounded-lg border border-rose-400/50 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
                    >
                        Eliminar
                    </button>
                )}
                {typeof onCancel === 'function' && (
                    <button
                        type="button"
                        onClick={onCancel}
                        className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-200"
                    >
                        Cancelar
                    </button>
                )}
                <button
                    type="submit"
                    disabled={enviando}
                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {enviando ? 'Enviando...' : 'Enviar reporte'}
                </button>
            </div>
        </form>
    );
}

export default FormularioReporteEnChat;
