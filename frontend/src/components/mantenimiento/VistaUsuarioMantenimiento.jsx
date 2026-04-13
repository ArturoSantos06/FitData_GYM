import React, { useMemo, useState } from 'react';
import {
    crearReporteMantenimiento,
    subirFotoReporte,
} from '../../firebase/mantenimiento';

function VistaUsuarioMantenimiento({ maquinas = [] }) {
    const [maquinaId, setMaquinaId] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [enviando, setEnviando] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');

    const maquinaSeleccionada = useMemo(
        () => maquinas.find((item) => item.id === maquinaId) || null,
        [maquinaId, maquinas]
    );

    const onSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setOk('');

        if (!maquinaSeleccionada) {
            setError('Selecciona la maquina descompuesta.');
            return;
        }

        if (!String(descripcion || '').trim()) {
            setError('Describe el problema para continuar.');
            return;
        }

        setEnviando(true);
        try {
            let fotoUsuarioUrl = '';
            if (archivo) {
                const uploaded = await subirFotoReporte(archivo);
                if (!uploaded.success) {
                    throw new Error(uploaded.error || 'No se pudo subir la foto del reporte.');
                }
                fotoUsuarioUrl = uploaded.url;
            }

            await crearReporteMantenimiento({
                maquinaId: maquinaSeleccionada.id,
                maquinaNombre: maquinaSeleccionada.nombre,
                maquinaFotoUrl: maquinaSeleccionada.fotoUrl,
                descripcion,
                fotoUsuarioUrl,
            });

            setOk('Reporte enviado correctamente. Gracias por avisar.');
            setDescripcion('');
            setArchivo(null);
            setMaquinaId('');
        } catch (submitError) {
            setError(String(submitError?.message || 'No se pudo enviar el reporte.'));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <section className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl md:p-8">
            <header className="mb-6 rounded-2xl bg-blue-600 p-6 text-white">
                <h2 className="text-3xl font-black">Reportar maquina</h2>
                <p className="mt-1 text-blue-100">Ayudanos a mantener el gym al 100%</p>
            </header>

            <form className="space-y-5" onSubmit={onSubmit}>
                <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Maquina descompuesta *</span>
                    <select
                        value={maquinaId}
                        onChange={(event) => setMaquinaId(event.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                    >
                        <option value="">Selecciona una maquina del catalogo</option>
                        {maquinas.map((maquina) => (
                            <option key={maquina.id} value={maquina.id}>
                                {maquina.nombre}
                            </option>
                        ))}
                    </select>
                </label>

                {maquinaSeleccionada?.fotoUrl && (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                        <img src={maquinaSeleccionada.fotoUrl} alt={maquinaSeleccionada.nombre} className="h-48 w-full object-cover" />
                    </div>
                )}

                <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Describe el problema *</span>
                    <textarea
                        value={descripcion}
                        onChange={(event) => setDescripcion(event.target.value)}
                        className="min-h-28 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-800 outline-none focus:border-blue-500"
                        placeholder="Ej. Hace ruido, esta floja una pieza, no enciende..."
                    />
                </label>

                <label className="block space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Foto del problema (opcional)</span>
                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => setArchivo(event.target.files?.[0] || null)}
                        className="w-full rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600"
                    />
                </label>

                {error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}
                {ok && <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{ok}</p>}

                <button
                    type="submit"
                    disabled={enviando}
                    className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {enviando ? 'Enviando reporte...' : 'Enviar reporte'}
                </button>
            </form>
        </section>
    );
}

export default VistaUsuarioMantenimiento;
