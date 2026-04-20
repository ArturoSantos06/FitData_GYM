import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    crearMaquinaCatalogo,
    eliminarMaquinaCatalogo,
    eliminarReporteMantenimiento,
    marcarReporteResuelto,
    actualizarMaquinaCatalogo,
    sembrarCatalogoBaseMaquinas,
    subirFotoMaquina,
} from '../../backend/mantenimiento';
import TarjetaReporteMantenimiento from './TarjetaReporteMantenimiento';

function VistaAdminMantenimiento({ reportes = [], maquinas = [], catalogoCargando = false }) {
    const [nombreMaquina, setNombreMaquina] = useState('');
    const [archivo, setArchivo] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [ok, setOk] = useState('');
    const [resolviendoId, setResolviendoId] = useState('');
    const [eliminandoId, setEliminandoId] = useState('');
    const [eliminandoReporteId, setEliminandoReporteId] = useState('');
    const [maquinaEditandoId, setMaquinaEditandoId] = useState('');
    const [nombreEdicion, setNombreEdicion] = useState('');
    const [archivoEdicion, setArchivoEdicion] = useState(null);
    const [guardandoEdicionId, setGuardandoEdicionId] = useState('');
    const [sembrandoCatalogo, setSembrandoCatalogo] = useState(false);
    const autoSeedIntentadoRef = useRef(false);

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

    const cargarCatalogoBase = async () => {
        setError('');
        setOk('');
        setSembrandoCatalogo(true);
        try {
            const result = await sembrarCatalogoBaseMaquinas();
            setOk(`Catalogo base cargado. Agregadas: ${result.created}.`);
        } catch (seedError) {
            setError(String(seedError?.message || 'No se pudo cargar el catalogo base.'));
        } finally {
            setSembrandoCatalogo(false);
        }
    };

    useEffect(() => {
        if (catalogoCargando) return;
        if (maquinas.length > 0) return;
        if (sembrandoCatalogo) return;
        if (autoSeedIntentadoRef.current) return;

        autoSeedIntentadoRef.current = true;
        cargarCatalogoBase();
    }, [catalogoCargando, maquinas.length, sembrandoCatalogo]);

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

    const eliminarMaquina = async (maquinaId) => {
        setError('');
        setOk('');
        setEliminandoId(maquinaId);
        try {
            await eliminarMaquinaCatalogo(maquinaId);
            setOk('Maquina eliminada del catalogo correctamente.');
        } catch (deleteError) {
            setError(String(deleteError?.message || 'No se pudo eliminar la maquina.'));
        } finally {
            setEliminandoId('');
        }
    };

    const iniciarEdicionMaquina = (maquina) => {
        setError('');
        setOk('');
        setMaquinaEditandoId(maquina.id);
        setNombreEdicion(maquina.nombre || '');
        setArchivoEdicion(null);
    };

    const cancelarEdicionMaquina = () => {
        setMaquinaEditandoId('');
        setNombreEdicion('');
        setArchivoEdicion(null);
    };

    const guardarEdicionMaquina = async (maquina) => {
        setError('');
        setOk('');

        const nombreLimpio = String(nombreEdicion || '').trim();
        if (!nombreLimpio) {
            setError('Escribe el nombre correcto de la maquina.');
            return;
        }

        setGuardandoEdicionId(maquina.id);
        try {
            let fotoUrl = maquina.fotoUrl || '';
            if (archivoEdicion) {
                const upload = await subirFotoMaquina(archivoEdicion);
                if (!upload.success) {
                    throw new Error(upload.error || 'No se pudo subir la nueva foto de la maquina.');
                }
                fotoUrl = upload.url;
            }

            await actualizarMaquinaCatalogo(maquina.id, {
                nombre: nombreLimpio,
                fotoUrl,
            });

            setOk('Maquina actualizada correctamente.');
            cancelarEdicionMaquina();
        } catch (editError) {
            setError(String(editError?.message || 'No se pudo actualizar la maquina.'));
        } finally {
            setGuardandoEdicionId('');
        }
    };

    const eliminarReporte = async (reporteId) => {
        setError('');
        setOk('');
        setEliminandoReporteId(reporteId);
        try {
            await eliminarReporteMantenimiento(reporteId);
            setOk('Reporte eliminado correctamente.');
        } catch (deleteError) {
            setError(String(deleteError?.message || 'No se pudo eliminar el reporte.'));
        } finally {
            setEliminandoReporteId('');
        }
    };

    return (
        <section className="space-y-6">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-sm">
                <h3 className="text-xl font-black text-slate-100">Alta de maquina</h3>

                <form className="mt-4 grid gap-3 md:grid-cols-3" onSubmit={guardarMaquina}>
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

            <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-sm">
                    <h3 className="text-xl font-black text-slate-100">Catalogo de maquinas</h3>

                    <div className="custom-scrollbar mt-4 space-y-3 xl:max-h-[68vh] xl:overflow-y-auto xl:pr-1">
                        {maquinas.map((maquina) => (
                            <article key={maquina.id} className="overflow-hidden rounded-xl border border-slate-700 bg-slate-950/70">
                                <div className="space-y-3 p-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-sm font-semibold text-slate-100">{maquina?.nombre || 'Maquina sin nombre'}</p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => iniciarEdicionMaquina(maquina)}
                                                disabled={guardandoEdicionId === maquina.id}
                                                className="rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => eliminarMaquina(maquina.id)}
                                                disabled={eliminandoId === maquina.id || guardandoEdicionId === maquina.id}
                                                className="rounded-lg border border-rose-400/40 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {eliminandoId === maquina.id ? 'Eliminando...' : 'Eliminar'}
                                            </button>
                                        </div>
                                    </div>

                                    {maquina?.fotoUrl ? (
                                        <div className="flex justify-center">
                                            <img
                                                src={maquina.fotoUrl}
                                                alt={maquina.nombre || 'Maquina'}
                                                className="h-44 w-44 rounded-lg border border-slate-600 object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-slate-700 text-sm text-slate-400">
                                            Sin foto
                                        </div>
                                    )}

                                    {maquinaEditandoId === maquina.id && (
                                        <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/80 p-3">
                                            <div className="space-y-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                                                    Nombre corregido
                                                </label>
                                                <input
                                                    value={nombreEdicion}
                                                    onChange={(event) => setNombreEdicion(event.target.value)}
                                                    className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-400"
                                                    placeholder="Corrige el nombre"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-300">
                                                    Nueva imagen opcional
                                                </label>
                                                <input
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    onChange={(event) => setArchivoEdicion(event.target.files?.[0] || null)}
                                                    className="w-full rounded-lg border border-dashed border-slate-600 bg-slate-950 px-3 py-2 text-xs text-slate-300"
                                                />
                                                {archivoEdicion && (
                                                    <p className="text-xs text-slate-300">Nueva foto seleccionada: {archivoEdicion.name}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    type="button"
                                                    onClick={cancelarEdicionMaquina}
                                                    className="rounded-lg border border-slate-500 px-3 py-1.5 text-xs font-semibold text-slate-200"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => guardarEdicionMaquina(maquina)}
                                                    disabled={guardandoEdicionId === maquina.id}
                                                    className="rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                                >
                                                    {guardandoEdicionId === maquina.id ? 'Guardando...' : 'Guardar cambios'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </article>
                        ))}
                        {maquinas.length === 0 && (
                            <p className="text-sm text-slate-400">No hay maquinas en el catalogo.</p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3">
                        <h3 className="text-xl font-black text-slate-100">Reportes de clientes</h3>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-200">
                            Pendientes: {totalPendientes}
                        </span>
                    </div>

                    <div className="custom-scrollbar grid gap-5 md:grid-cols-2 xl:max-h-[76vh] xl:overflow-y-auto xl:pr-1">
                        {reportes.map((reporte) => (
                            <TarjetaReporteMantenimiento
                                key={reporte.id}
                                reporte={reporte}
                                mostrarAccionResolver
                                mostrarAccionEliminar
                                onResolver={resolverReporte}
                                onEliminar={eliminarReporte}
                                resolviendo={resolviendoId === reporte.id}
                                eliminando={eliminandoReporteId === reporte.id}
                            />
                        ))}
                        {reportes.length === 0 && (
                            <p className="text-sm text-slate-400">No hay reportes de clientes por ahora.</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
}

export default VistaAdminMantenimiento;
