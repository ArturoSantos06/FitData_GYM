import React, { useState, useEffect, useCallback, useMemo } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const AgendaClientesCoach = () => {
    const [clientes, setClientes] = useState([]);
    const [citas, setCitas] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1);
    });
    const [formCita, setFormCita] = useState({ inicio: '08:00', fin: '09:00', id: null });
    const [showPastDateModal, setShowPastDateModal] = useState(false);
    const [pastDateLabel, setPastDateLabel] = useState('');

    const token = localStorage.getItem('token');

    useEffect(() => {
        fetch(`${API_URL}/api/health-profiles/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setClientes(data))
            .catch(err => console.error("Error cargando clientes:", err));
    }, [token]);

    const fetchCitas = useCallback(() => {
        fetch(`${API_URL}/api/citas/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setCitas(data))
            .catch(err => console.error("Error cargando citas:", err));
    }, [token]);

    useEffect(() => { fetchCitas(); }, [fetchCitas]);

    const toStartOfDay = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    };

    const formatDateKey = (date) => {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    };

    const monthLabel = useMemo(() => {
        return calendarMonth
            .toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
            .toUpperCase();
    }, [calendarMonth]);

    const calendarDays = useMemo(() => {
        const year = calendarMonth.getFullYear();
        const month = calendarMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const mondayBasedOffset = (firstDay.getDay() + 6) % 7;
        const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const cells = [];

        for (let i = mondayBasedOffset - 1; i >= 0; i -= 1) {
            cells.push({
                date: new Date(year, month - 1, daysInPrevMonth - i),
                inCurrentMonth: false,
            });
        }

        for (let day = 1; day <= daysInCurrentMonth; day += 1) {
            cells.push({
                date: new Date(year, month, day),
                inCurrentMonth: true,
            });
        }

        while (cells.length < 42) {
            const nextDay = cells.length - (mondayBasedOffset + daysInCurrentMonth) + 1;
            cells.push({
                date: new Date(year, month + 1, nextDay),
                inCurrentMonth: false,
            });
        }

        return cells;
    }, [calendarMonth]);

    const citasByDate = useMemo(() => {
        const map = new Map();
        citas
            .filter((c) => c.cliente === selectedClient?.id)
            .forEach((cita) => {
                const count = map.get(cita.fecha) || 0;
                map.set(cita.fecha, count + 1);
            });
        return map;
    }, [citas, selectedClient]);

    const isSameDay = (a, b) => {
        return (
            a.getFullYear() === b.getFullYear() &&
            a.getMonth() === b.getMonth() &&
            a.getDate() === b.getDate()
        );
    };

    const handlePickDate = (date) => {
        const today = toStartOfDay(new Date());
        const target = toStartOfDay(date);

        if (target < today) {
            setPastDateLabel(target.toLocaleDateString('es-MX', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }));
            setShowPastDateModal(true);
            return;
        }

        setSelectedDate(target);
        setCalendarMonth(new Date(target.getFullYear(), target.getMonth(), 1));
    };

    const citasDelDia = citas.filter(c =>
        c.cliente === selectedClient?.id &&
        c.fecha === selectedDate.toISOString().split('T')[0]
    );

    const manejarAccion = async (metodo, id = null) => {
        const url = id ? `${API_URL}/api/citas/${id}/` : `${API_URL}/api/citas/`;
        const res = await fetch(url, {
            method: metodo,
            headers: { 'Authorization': `Token ${token}`, 'Content-Type': 'application/json' },
            body: metodo !== 'DELETE' ? JSON.stringify({
                cliente: selectedClient.id,
                fecha: selectedDate.toISOString().split('T')[0],
                hora_inicio: formCita.inicio,
                hora_fin: formCita.fin,
                coach: 1 // Ajustar según ID del coach logueado
            }) : null
        });
        if (res.ok) { fetchCitas(); setFormCita({ inicio: '08:00', fin: '09:00', id: null }); }
    };

    // CAMBIOS DE DISEÑO //
    return (
        <div className="p-6 max-w-[1400px] mx-auto text-white animate-fade-in">
            
           {/* Encabezado estilo Dashboard */}
            <div className="mb-10 border-b border-slate-800 pb-6">
                <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-500 italic uppercase tracking-wider">
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
                        className="relative bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg hover:shadow-cyan-900/20 hover:border-cyan-800/50 transition-all duration-300 transform hover:-translate-y-1 flex flex-col h-full min-h-[240px]"
                    >
                        {/* ID en la esquina superior derecha */}
                        <div className="absolute top-4 right-4 text-[10px] font-black text-cyan-400 tracking-widest uppercase flex flex-col items-end">
                            <span>ID: {c.id}</span>
                            <svg className="w-3 h-3 text-slate-600 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
                        </div>

                        {/* Contenedor de la información (ocupa el espacio disponible) */}
                        <div className="flex-1">
                         <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-4 shadow-inner">                                
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
                            onClick={() => setSelectedClient(c)}
                            className="mt-auto w-full py-2.5 bg-[#007bff] hover:bg-blue-500 text-white rounded-xl transition-colors font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                        >
                            Planificar
                            <span className="text-lg leading-none">›</span>
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de Calendario (Mantenemos el tuyo que ya estaba súper bien) */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl flex h-[550px] overflow-hidden">

                        {/* Izquierda: Calendario sutil */}
                        <div className="w-1/2 p-8 border-r border-slate-800 bg-slate-900/50 flex flex-col">
                            <div className="flex justify-between mb-6 items-center">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        ‹
                                    </button>
                                    <button
                                        onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                                        className="h-8 w-8 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        ›
                                    </button>
                                    <button
                                        onClick={() => {
                                            const now = new Date();
                                            const start = new Date(now.getFullYear(), now.getMonth(), 1);
                                            setCalendarMonth(start);
                                            setSelectedDate(now);
                                        }}
                                        className="h-8 px-3 rounded-lg border border-slate-700 text-[11px] font-bold tracking-wider text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        HOY
                                    </button>
                                </div>
                                <h2 className="font-bold tracking-wide text-cyan-400 text-sm">{monthLabel}</h2>
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2 mb-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((weekDay) => (
                                    <div key={weekDay} className="text-center py-1">{weekDay}</div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-7 gap-2 flex-1">
                                {calendarDays.map(({ date, inCurrentMonth }) => {
                                    const today = toStartOfDay(new Date());
                                    const target = toStartOfDay(date);
                                    const isPast = target < today;
                                    const isSelected = isSameDay(target, toStartOfDay(selectedDate));
                                    const isToday = isSameDay(target, today);
                                    const key = formatDateKey(target);
                                    const hasCitas = (citasByDate.get(key) || 0) > 0;

                                    const baseClass = inCurrentMonth ? 'text-slate-200' : 'text-slate-600';
                                    const selectedClass = isSelected ? 'ring-2 ring-cyan-400 bg-cyan-900/40 text-cyan-300 font-bold' : 'hover:bg-slate-800';
                                    const todayClass = isToday ? 'border border-cyan-500/50' : 'border border-transparent';

                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handlePickDate(target)}
                                            className={`rounded-xl text-sm transition-all relative flex items-center justify-center ${baseClass} ${selectedClass} ${todayClass} ${isPast ? 'opacity-40 hover:opacity-100' : 'opacity-100'}`}
                                            type="button"
                                        >
                                            <span>{target.getDate()}</span>
                                            {hasCitas && (
                                                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Derecha: Detalles y CRUD */}
                        <div className="w-1/2 p-8 flex flex-col bg-slate-900 relative">
                            <button onClick={() => setSelectedClient(null)} className="absolute top-6 right-6 text-slate-500 hover:text-white transition-colors bg-slate-800 p-2 rounded-full">✕</button>
                            
                            <div className="flex-1">
                                <p className="text-cyan-500 text-[10px] font-black tracking-widest uppercase mb-1">Sesiones de {selectedClient.miembro_nombre}</p>
                                <h2 className="text-2xl font-black mb-6 text-white">{selectedDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long'})}</h2>

                                <div className="space-y-3 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
                                    {citasDelDia.length === 0 ? (
                                        <p className="text-slate-500 text-sm italic">No hay sesiones programadas para este día.</p>
                                    ) : (
                                        citasDelDia.map(cita => (
                                            <div key={cita.id} className="bg-slate-800/80 p-4 rounded-xl flex justify-between items-center border border-slate-700/50 hover:border-cyan-500/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-1 bg-cyan-500 rounded-full"></div>
                                                    <span className="font-bold text-slate-200">{cita.hora_inicio} - {cita.hora_fin}</span>
                                                </div>
                                                <div className="flex gap-3">
                                                    <button onClick={() => setFormCita({ inicio: cita.hora_inicio, fin: cita.hora_fin, id: cita.id })} className="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-wider transition-colors">Editar</button>
                                                    <button onClick={() => manejarAccion('DELETE', cita.id)} className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wider transition-colors">Borrar</button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-800 mt-auto">
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
                                    {formCita.id ? 'Modificar Horario' : 'Nueva Sesión'}
                                </p>
                                <div className="flex gap-3 mb-4">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Inicio</label>
                                        <input type="time" value={formCita.inicio} onChange={e => setFormCita({ ...formCita, inicio: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">Fin</label>
                                        <input type="time" value={formCita.fin} onChange={e => setFormCita({ ...formCita, fin: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all" />
                                    </div>
                                </div>
                                <button
                                    onClick={() => manejarAccion(formCita.id ? 'PUT' : 'POST', formCita.id)}
                                    className="w-full py-3.5 bg-linear-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                                >
                                    {formCita.id ? 'Actualizar Sesión' : 'Guardar Sesión'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Modal Error Fechas Pasadas */}
            {showPastDateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-60">
                    <div className="w-full max-w-sm rounded-3xl border border-red-500/30 bg-slate-900 p-8 shadow-2xl text-center transform scale-100 animate-fade-in">
                        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Fecha no válida</h3>
                        <p className="text-slate-400 text-sm leading-relaxed mb-6">
                            Seleccionaste <span className="font-semibold text-red-400">{pastDateLabel}</span>. Solo puedes agendar entrenamientos a partir de la fecha actual.
                        </p>
                        <button
                            onClick={() => setShowPastDateModal(false)}
                            className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors uppercase tracking-wider text-xs"
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

export default AgendaClientesCoach;