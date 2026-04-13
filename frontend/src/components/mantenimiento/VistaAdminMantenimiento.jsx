import React, { useMemo, useState } from 'react';
import {
    crearMaquinaCatalogo,
    marcarReporteResuelto,
    subirFotoMaquina,
} from '../../firebase/mantenimiento';
import TarjetaReporteMantenimiento from './TarjetaReporteMantenimiento';

function VistaAdminMantenimiento({ reportes = [] }) {
    const [nombreMaquina, setNombreMaquina] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [resolviendoId, setResolviendoId] = useState('');

    const totalPendientes = useMemo(
        () => reportes.filter((item) => String(item.estado || '').toLowerCase() !== 'resuelto').length,
        [reportes]
    );

    const guardarMaquina = async (event) => {
        event.preventDefault();
        setError('');
        setOk('');

        if (!String(nombreMaquina || '').trim()) {
            setError('Escribe el nombre de la maquina.');
            return;
        }

        if (!archivo) {
            setError('Sube una foto para agregarla al catalogo.');
            return;
        }

        setGuardando(true);
        try {
            const upload = await subirFotoMaquina(archivo);
            if (!upload.success) {
                throw new Error(upload.error || 'No se pudo subir la foto de la maquina.');
            }

            await crearMaquinaCatalogo({
                nombre: nombreMaquina,
                fotoUrl: upload.url,
            });

            setNombreMaquina('');
            setArchivo(null);
            setOk('Maquina agregada al catalogo correctamente.');
        } catch (saveError) {
            setError(String(saveError?.message || 'No se pudo guardar la maquina.'));
        } finally {
            setGuardando(false);
        }
    };

    const resolverReporte = async (reporteId) => {
        setResolviendoId(reporteId);
        try {
            await marcarReporteResuelto(reporteId);
        } catch (resolveError) {
            setError(String(resolveError?.message || 'No se pudo actualizar el reporte.'));
        } finally {
            setResolviendoId('');
        }
    };

    return (
        <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-xl font-black text-slate-100">Catalogo de maquinas</h3>
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200">
                        Pendientes: {totalPendientes}
                    </span>
                </div>

                <form className="grid gap-3 md:grid-cols-3" onSubmit={guardarMaquina}>
                    <input
                        value={nombreMaquina}
                        onChange={(event) => setNombreMaquina(event.target.value)}
                        placeholder="Ej. Caminadora #3"
                        className="rounded-xl border border-slate-600 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-cyan-400"
                    />

                    <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp"
                        onChange={(event) => setArchivo(event.target.files?.[0] || null)}
                        className="rounded-xl border border-dashed border-slate-600 bg-slate-950 px-4 py-3 text-sm text-slate-300"
                    />

                    <button
                        type="submit"
                        disabled={guardando}
                        className="rounded-xl bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {guardando ? 'Subiendo...' : 'Agregar maquina'}
                    </button>
                </form>

                {error && <p className="mt-3 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-200">{error}</p>}
                {ok && <p className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200">{ok}</p>}
            </div>

            <div className="grid gap-5 md:grid-cols-2">
                {reportes.map((reporte) => (
                    <TarjetaReporteMantenimiento
                        key={reporte.id}
                        reporte={reporte}
                        mostrarAccionResolver
                        onResolver={resolverReporte}
                        resolviendo={resolviendoId === reporte.id}
                    />
                ))}
            </div>
        </section>
    );
}

export default VistaAdminMantenimiento;
