import React, { useMemo, useState } from 'react';
import { crearReporteMantenimiento, subirFotoReporte } from '../../firebase/mantenimiento';

function FormularioReporteEnChat({ maquinas = [], onCancel, onSuccess }) {
    const [maquinaId, setMaquinaId] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');

    const maquinaSeleccionada = useMemo(
        () => maquinas.find((item) => item.id === maquinaId) || null,
        [maquinaId, maquinas]
    );

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
                maquinaId: maquinaSeleccionada.id,
                maquinaNombre: maquinaSeleccionada.nombre,
                maquinaFotoUrl: maquinaSeleccionada.fotoUrl,
                descripcion,
                fotoUsuarioUrl,
            });

            onSuccess?.({
                maquinaNombre: maquinaSeleccionada.nombre,
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

            <select
                value={maquinaId}
                onChange={(event) => setMaquinaId(event.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none"
            >
                <option value="">Selecciona una maquina</option>
                {maquinas.map((maquina) => (
                    <option key={maquina.id} value={maquina.id}>
                        {maquina.nombre}
                    </option>
                ))}
            </select>

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
                onChange={(event) => setArchivo(event.target.files?.[0] || null)}
                className="w-full rounded-lg border border-dashed border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-300"
            />

            {error && (
                <p className="rounded-lg border border-rose-400/30 bg-rose-500/15 px-2 py-1 text-xs text-rose-200">
                    {error}
                </p>
            )}

            <div className="flex items-center justify-end gap-2">
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
