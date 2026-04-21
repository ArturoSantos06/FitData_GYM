import React, { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Wrench } from 'lucide-react';
import { suscribirCatalogoMaquinas, suscribirReportesMantenimiento } from '../../backend/mantenimiento';
import TarjetaReporteMantenimiento from './TarjetaReporteMantenimiento';
import VistaAdminMantenimiento from './VistaAdminMantenimiento';
import VistaUsuarioMantenimiento from './VistaUsuarioMantenimiento';

function PortalMantenimiento({ vistaInicial = 'usuario', modoSoloAdmin = false }) {
    const [vista, setVista] = useState(modoSoloAdmin ? 'admin' : vistaInicial);
    const [maquinas, setMaquinas] = useState([]);
    const [catalogoCargando, setCatalogoCargando] = useState(true);
    const [reportes, setReportes] = useState([]);
    const [errorCatalogo, setErrorCatalogo] = useState('');
    const [errorReportes, setErrorReportes] = useState('');

    useEffect(() => {
        const offCatalogo = suscribirCatalogoMaquinas(
            (data) => {
                setMaquinas(data);
                setErrorCatalogo('');
                setCatalogoCargando(false);
            },
            (error) => {
                setErrorCatalogo(String(error?.message || 'No se pudo cargar el catálogo.'));
                setCatalogoCargando(false);
            }
        );

        const offReportes = suscribirReportesMantenimiento(
            (data) => {
                setReportes(data);
                setErrorReportes('');
            },
            (error) => setErrorReportes(String(error?.message || 'No se pudieron cargar los reportes.'))
        );

        return () => {
            offCatalogo?.();
            offReportes?.();
        };
    }, []);

    const reportesPendientes = useMemo(
        () => reportes.filter((item) => String(item.estado || '').toLowerCase() !== 'resuelto'),
        [reportes]
    );

    return (
        <div className="min-h-[80vh] px-4 py-6 text-gray-100 md:px-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <header className="rounded-2xl border border-cyan-500/20 bg-slate-900/90 px-4 py-4 text-white shadow-xl md:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Wrench className="h-6 w-6 text-cyan-300" />
                            <h1 className="text-2xl font-black">Mantenimiento FitData</h1>
                        </div>

                        {!modoSoloAdmin && (
                            <div className="inline-flex rounded-xl bg-slate-800 p-1">
                                <button
                                    type="button"
                                    onClick={() => setVista('usuario')}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${vista === 'usuario' ? 'bg-cyan-600 text-white' : 'text-slate-200'
                                        }`}
                                >
                                    Vista usuario
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setVista('admin')}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition ${vista === 'admin' ? 'bg-cyan-600 text-white' : 'text-slate-200'
                                        }`}
                                >
                                    Vista admin
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {(errorCatalogo || errorReportes) && (
                    <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-200">
                        {errorCatalogo || errorReportes}
                    </div>
                )}

                {(vista === 'usuario' || modoSoloAdmin === false) && vista === 'usuario' && (
                    <>
                        <VistaUsuarioMantenimiento maquinas={maquinas} />

                        <section className="space-y-4 rounded-2xl border border-cyan-500/20 bg-slate-900/70 p-5 shadow-sm">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-cyan-300" />
                                <h2 className="text-xl font-black text-slate-100">Reportes recientes</h2>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                {reportesPendientes.slice(0, 4).map((reporte) => (
                                    <TarjetaReporteMantenimiento key={reporte.id} reporte={reporte} />
                                ))}
                                {reportesPendientes.length === 0 && (
                                    <p className="text-sm text-slate-400">No hay reportes pendientes por ahora.</p>
                                )}
                            </div>
                        </section>
                    </>
                )}

                {(vista === 'admin' || modoSoloAdmin) && (
                    <VistaAdminMantenimiento reportes={reportes} maquinas={maquinas} catalogoCargando={catalogoCargando} />
                )}
            </div>
        </div>
    );
}

export default PortalMantenimiento;
