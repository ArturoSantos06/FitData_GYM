import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CLAVE_HIDDEN_CLIENTES, EVENTO_VISIBILIDAD_CLIENTES, filtrarClientesOcultos } from '../../../backend/visibilidadClientes';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const AgendaClientes = () => {
    const [clientes, setClientes] = useState([]);
    const [citas, setCitas] = useState([]);
    const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [mesCalendario, setMesCalendario] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [formularioCita, setFormularioCita] = useState({ inicio: '08:00', fin: '09:00', id: null });
    const [mostrarModalFechaPasada, setMostrarModalFechaPasada] = useState(false);
    const [etiquetaFechaPasada, setEtiquetaFechaPasada] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        const cargarClientes = () => fetch(`${API_URL}/api/health-profiles/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setClientes(filtrarClientesOcultos(Array.isArray(data) ? data.map((item) => ({
                ...item,
                id: item.id || item.miembro || item.miembro_id,
            })) : [])))
            .catch(err => console.error("Error cargando clientes:", err));

        cargarClientes();

        const recargarPorVisibilidad = () => cargarClientes();
        window.addEventListener(EVENTO_VISIBILIDAD_CLIENTES, recargarPorVisibilidad);
        const recargarPorStorage = (event) => {
            if (event.key === CLAVE_HIDDEN_CLIENTES) cargarClientes();
        };
        window.addEventListener('storage', recargarPorStorage);
        return () => {
            window.removeEventListener(EVENTO_VISIBILIDAD_CLIENTES, recargarPorVisibilidad);
            window.removeEventListener('storage', recargarPorStorage);
        };
    }, [token]);

    const obtenerCitas = useCallback(() => {
        fetch(`${API_URL}/api/citas/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setCitas(data))
            .catch(err => console.error("Error cargando citas:", err));
    }, [token]);

    useEffect(() => { obtenerCitas(); }, [obtenerCitas]);

    const irAlInicioDia = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const formatearClaveFeha = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const etiquetaMes = useMemo(() => {
        return mesCalendario
            .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
            .toUpperCase();
    }, [mesCalendario]);

    const diasCalendario = useMemo(() => {
        const year = mesCalendario.getFullYear();
        const month = mesCalendario.getMonth();

        const firstDay = new Date(year, month, 1);
        const offsetBaseLunes = (firstDay.getDay() + 6) % 7;
        const diasMesActual = new Date(year, month + 1, 0).getDate();
        const diasMesPrevio = new Date(year, month, 0).getDate();

        const celdas = [];

        for (let i = offsetBaseLunes - 1; i >= 0; i -= 1) {
            celdas.push({
                date: new Date(year, month - 1, diasMesPrevio - i),
                enMesActual: false,
            });
        }

        for (let day = 1; day <= diasMesActual; day += 1) {
            celdas.push({
                date: new Date(year, month, day),
                enMesActual: true,
            });
        }

        while (celdas.length < 42) {
            const nextDay = celdas.length - (offsetBaseLunes + diasMesActual) + 1;
            celdas.push({
                date: new Date(year, month + 1, nextDay),
                enMesActual: false,
            });
        }

        return celdas;
    }, [mesCalendario]);

    const citasPorFecha = useMemo(() => {
        const map = new Map();
        citas
            .filter((c) => c.cliente === clienteSeleccionado?.id)
            .forEach((cita) => {
                const count = map.get(cita.fecha) || 0;
                map.set(cita.fecha, count + 1);
            });
        return map;
    }, [citas, clienteSeleccionado]);

    const esMismoDia = (a, b) => {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    };

    const manejarSeleccionFecha = (date) => {
        const hoy = irAlInicioDia(new Date());
        const objetivo = irAlInicioDia(date);

        if (objetivo < hoy) {
            setEtiquetaFechaPasada(objetivo.toLocaleDateString('es-MX', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }));
            setMostrarModalFechaPasada(true);
            return;
        }

        setFechaSeleccionada(objetivo);
        setMesCalendario(new Date(objetivo.getFullYear(), objetivo.getMonth(), 1));
    };

    const citasDelDia = citas.filter(c =>
        c.cliente === clienteSeleccionado?.id &&
        c.fecha === fechaSeleccionada.toISOString().split('T')[0]
    );

    const manejarAccion = async (metodo, id = null) => {
        const url = id ? `${API_URL}/api/citas/${id}/` : `${API_URL}/api/citas/`;
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
            body: metodo !== 'DELETE' ? JSON.stringify({
                cliente: clienteSeleccionado.id,
                fecha: fechaSeleccionada.toISOString().split('T')[0],
                hora_inicio: formularioCita.inicio,
                hora_fin: formularioCita.fin,
                coach: 1 // Ajustar según ID del coach logueado
            }) : null
        });
        if (res.ok) { obtenerCitas(); setFormularioCita({ inicio: '08:00', fin: '09:00', id: null }); }
    };

    // CAMBIOS DE DISEÑO //
    return (
        <div className="p-6 max-w-[1400px] mx-auto text-white animate-fade-in">
            
           {/* Encabezado estilo Dashboard */}
            <div className="mb-10 border-b border-slate-800 pb-6">
                <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-linear-to-r from-purple-400 via-pink-400 to-blue-500 italic uppercase tracking-wider">
                    Agenda de Sesiones
                </h1>
                <p className="text-slate-500 text-xs font-bold tracking-[0.2em] uppercase mt-2">
                    Planeación de Entrenamientos
                </p>
            </div>

            {/* Grid de Clientes (Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {clientes.map(c => (
                    <div 
                        key={c.id} 
                        // Agregamos flex, flex-col y h-full para que todas las tarjetas midan lo mismo
                        className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-cyan-900/20 hover:border-cyan-800/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full min-h-60"
                    >
                        {/* ID en la esquina superior derecha */}
                        <div className="absolute top-4 right-4 text-[10px] font-black text-cyan-400 tracking-widest uppercase flex flex-col items-end">
                            <span>ID: {c.id}</span>
                            <svg className="w-3 h-3 text-slate-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        </div>

                        {/* Contenedor de la información (ocupa el espacio disponible) */}
                        <div className="flex-1">
                         <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-inner">                                
                         <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            </div>
                            
                            <h3 className="text-lg font-black text-white uppercase leading-none tracking-wide mb-1">
                                {c.miembro_nombre ? c.miembro_nombre.split(' ')[0] : 'Usuario'}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium uppercase mb-3 truncate">
                                {c.miembro_nombre ? c.miembro_nombre.substring(c.miembro_nombre.indexOf(' ') + 1) : ''}
                            </p>

                            <span className="inline-block px-2 py-1 bg-slate-800 border border-slate-700 rounded text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-4">
                                Sin Edad
                            </span>
                        </div>

                        {/* Botón Planificar (mt-auto lo empuja siempre hasta abajo) */}
                        <button
                            onClick={() => setClienteSeleccionado(c)}
                            className="mt-auto w-full py-2.5 bg-[#007bff] hover:bg-blue-500 text-white rounded-xl transition-colors font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            Planificar
                            <span className="text-lg leading-none">›</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de Calendario (Mantenemos el tuyo que ya estaba súper bien) */}
            {clienteSeleccionado && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl flex h-[550px] overflow-hidden">

                        {/* Izquierda: Calendario sutil */}
                        <div className="w-1/2 p-8 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                            <div className="flex justify-between mb-6 items-center">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1, 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setMesCalendario(new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        ›
                                    </button>
                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const start = new Date(now.getFullYear(), now.getMonth(), 1);
                                            setMesCalendario(start);
                                            setFechaSeleccionada(now);
                                        }}
                                        className="h-8 px-3 rounded-lg border border-slate-700 text-[11px] font-bold tracking-wider text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        HOY
                                    </button>
                                </div>
                                <h2 className="font-bold tracking-wide text-cyan-400 text-sm">{etiquetaMes}</h2>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((weekDay) => (
                                    <div key={weekDay} className="text-center py-1">{weekDay}</div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2 flex-1">
                                {diasCalendario.map(({ date, enMesActual }) => {
                                    const hoy = irAlInicioDia(new Date());
                                    const objetivo = irAlInicioDia(date);
                                    const esPasado = objetivo < hoy;
                                    const esSeleccionado = esMismoDia(objetivo, irAlInicioDia(fechaSeleccionada));
                                    const esHoy = esMismoDia(objetivo, hoy);
                                    const clave = formatearClaveFeha(objetivo);
                                    const tieneCitas = (citasPorFecha.get(clave) || 0) > 0;

                                    const claseBase = enMesActual ? 'text-slate-200' : 'text-slate-600';
                                    const claseSeleccionada = esSeleccionado ? 'ring-2 ring-cyan-400 bg-cyan-900/40 text-cyan-300 font-bold' : 'hover:bg-slate-800';
                                    const claseHoy = esHoy ? 'border border-cyan-500/50' : 'border border-transparent';

                                    return (
                                        <button
                                            key={clave}
                                            onClick={() => manejarSeleccionFecha(objetivo)}
                                            className={`rounded-xl text-sm transition-all relative flex items-center justify-center ${claseBase} ${claseSeleccionada} ${claseHoy} ${esPasado ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                                            type="button"
                                        >
                                            <span>{objetivo.getDate()}</span>
                                            {tieneCitas && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Derecha: Citas del día */}
                        <div className="w-1/2 p-8 flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-white">{clienteSeleccionado.miembro_nombre}</h3>
                                    <p className="text-sm text-slate-400 mt-1">{fechaSeleccionada.toLocaleDateString('es-MX')}</p>
                                </div>
                                <button
                                    onClick={() => setClienteSeleccionado(null)}
                                    className="text-slate-400 hover:text-white text-2xl transition-colors"
                                    type="button"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 mb-6">
                                {citasDelDia.length > 0 ? (
                                    citasDelDia.map((cita, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
                                            <p className="text-sm font-semibold text-white">{cita.hora_inicio} - {cita.hora_fin}</p>
                                            <button
                                                onClick={() => manejarAccion('DELETE', cita.id)}
                                                className="mt-3 text-xs text-red-400 hover:text-red-300"
                                            >
                                                Eliminar
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-8">Sin citas programadas</p>
                                )}
                            </div>

                            {/* Formulario de Nueva Cita */}
                            <div className="border-t border-slate-700 pt-6">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Nueva Cita</p>
                                <div className="space-y-3">
                                    <input
                                        type="time"
                                        value={formularioCita.inicio}
                                        onChange={(e) => setFormularioCita({ ...formularioCita, inicio: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                    />
                                    <input
                                        type="time"
                                        value={formularioCita.fin}
                                        onChange={(e) => setFormularioCita({ ...formularioCita, fin: e.target.value })}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                                    />
                                    <button
                                        onClick={() => manejarAccion('POST')}
                                        className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold transition-colors"
                                    >
                                        Guardar Cita
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Fecha Pasada */}
            {mostrarModalFechaPasada && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm">
                        <p className="text-white font-semibold mb-4">⚠️ No puedes seleccionar fechas pasadas</p>
                        <p className="text-slate-300 text-sm mb-6">{etiquetaFechaPasada}</p>
                        <button
                            onClick={() => setMostrarModalFechaPasada(false)}
                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-semibold transition-colors"
                            type="button"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaClientes;
