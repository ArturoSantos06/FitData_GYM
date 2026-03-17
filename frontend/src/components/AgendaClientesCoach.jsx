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

    // Cargar clientes desde la misma tabla de perfiles de salud
    useEffect(() => {
        fetch(`${API_URL}/api/health-profiles/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setClientes(data))
            .catch(err => console.error("Error cargando clientes:", err));
    }, [token]);

    // Cargar las citas de la base de datos
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

    return (
        <div className="p-6 max-w-7xl mx-auto text-white">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-400 mb-8">
                Agenda de Entrenamiento
            </h1>

            {/* Grid de Clientes (Cards) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {clientes.map(c => (
                    <div key={c.id} className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl backdrop-blur-sm">
                        <h3 className="text-lg font-semibold mb-4">{c.miembro_nombre}</h3>
                        <button
                            onClick={() => setSelectedClient(c)}
                            className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded-xl transition-colors font-medium text-sm"
                        >Citas</button>
                    </div>
                ))}
            </div>

            {/* Modal de Calendario */}
            {selectedClient && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl flex h-[550px] overflow-hidden">

                        {/* Izquierda: Calendario sutil */}
                        <div className="w-1/2 p-8 border-r border-slate-800 bg-slate-900/50">
                            <div className="flex justify-between mb-6">
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
                                        className="h-8 px-3 rounded-lg border border-slate-700 text-[11px] text-slate-300 hover:bg-slate-800 transition-colors"
                                        type="button"
                                    >
                                        HOY
                                    </button>
                                </div>
                                <h2 className="font-bold tracking-wide">{monthLabel}</h2>
                                <button onClick={() => setSelectedClient(null)} className="text-slate-500 hover:text-white">✕</button>
                            </div>
                            <div className="grid grid-cols-7 gap-2 mb-2 text-[10px] text-slate-500 font-semibold uppercase">
                                {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map((weekDay) => (
                                    <div key={weekDay} className="text-center py-1">{weekDay}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {calendarDays.map(({ date, inCurrentMonth }) => {
                                    const today = toStartOfDay(new Date());
                                    const target = toStartOfDay(date);
                                    const isPast = target < today;
                                    const isSelected = isSameDay(target, toStartOfDay(selectedDate));
                                    const isToday = isSameDay(target, today);
                                    const key = formatDateKey(target);
                                    const hasCitas = (citasByDate.get(key) || 0) > 0;

                                    const baseClass = inCurrentMonth ? 'text-slate-100' : 'text-slate-600';
                                    const selectedClass = isSelected ? 'ring-2 ring-cyan-400 bg-cyan-700/30' : 'hover:bg-slate-800/80';
                                    const todayClass = isToday ? 'border-cyan-500/70' : 'border-slate-800';

                                    return (
                                    <button
                                        key={key}
                                        onClick={() => handlePickDate(target)}
                                        className={`h-14 rounded-xl text-sm border transition-all relative ${baseClass} ${selectedClass} ${todayClass} ${isPast ? 'opacity-60' : 'opacity-100'}`}
                                        type="button"
                                    >
                                        <span className="absolute top-2 left-2 text-xs font-semibold">{target.getDate()}</span>
                                        {hasCitas && (
                                            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                        )}
                                    </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Derecha: Detalles y CRUD */}
                        <div className="w-1/2 p-8 flex flex-col justify-between">
                            <div>
                                <p className="text-blue-400 text-xs font-bold uppercase mb-2">Entrenamientos para:</p>
                                <h2 className="text-xl font-bold mb-6">{selectedDate.toLocaleDateString()}</h2>

                                <div className="space-y-3 mb-6">
                                    {citasDelDia.map(cita => (
                                        <div key={cita.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700">
                                            <span className="text-sm">{cita.hora_inicio} - {cita.hora_fin}</span>
                                            <div className="flex gap-2">
                                                <button onClick={() => setFormCita({ inicio: cita.hora_inicio, fin: cita.hora_fin, id: cita.id })} className="text-yellow-500 text-xs">Modificar</button>
                                                <button onClick={() => manejarAccion('DELETE', cita.id)} className="text-red-500 text-xs">Eliminar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-800">
                                <div className="flex gap-2">
                                    <input type="time" value={formCita.inicio} onChange={e => setFormCita({ ...formCita, inicio: e.target.value })} className="bg-slate-800 border border-slate-700 rounded p-2 text-xs flex-1" />
                                    <input type="time" value={formCita.fin} onChange={e => setFormCita({ ...formCita, fin: e.target.value })} className="bg-slate-800 border border-slate-700 rounded p-2 text-xs flex-1" />
                                </div>
                                <button
                                    onClick={() => manejarAccion(formCita.id ? 'PUT' : 'POST', formCita.id)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold text-sm transition-all"
                                >
                                    {formCita.id ? 'Actualizar Horario' : 'Agregar Entrenamiento'}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {showPastDateModal && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="w-full max-w-md rounded-2xl border border-amber-400/30 bg-slate-900 p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-amber-300 mb-2">No puedes agendar en días pasados</h3>
                        <p className="text-slate-300 text-sm leading-relaxed">
                            Seleccionaste <span className="font-semibold text-white">{pastDateLabel}</span>. Para evitar inconsistencias, solo se permiten fechas de hoy en adelante.
                        </p>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowPastDateModal(false)}
                                className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold hover:bg-amber-400 transition-colors"
                                type="button"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AgendaClientesCoach;