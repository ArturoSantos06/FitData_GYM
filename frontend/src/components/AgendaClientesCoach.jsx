import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const AgendaClientesCoach = () => {
    const [clientes, setClientes] = useState([]);
    const [citas, setCitas] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [formCita, setFormCita] = useState({ inicio: '08:00', fin: '09:00', id: null });

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
    const fetchCitas = () => {
        fetch(`${API_URL}/api/citas/`, {
            headers: { 'Authorization': `Token ${token}` }
        })
            .then(res => res.json())
            .then(data => setCitas(data))
            .catch(err => console.error("Error cargando citas:", err));
    };

    useEffect(() => { fetchCitas(); }, [token]);

    const getDaysInMonth = (date) => {
        return new Array(new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())
            .fill(null).map((_, i) => i + 1);
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
                                <h2 className="font-bold">Marzo 2026</h2>
                                <button onClick={() => setSelectedClient(null)} className="text-slate-500 hover:text-white">✕</button>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {getDaysInMonth(selectedDate).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSelectedDate(new Date(2026, 2, d))}
                                        className={`h-10 rounded-lg text-sm ${selectedDate.getDate() === d ? 'bg-blue-600' : 'hover:bg-slate-800'}`}
                                    >
                                        {d}
                                    </button>
                                ))}
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
        </div>
    );
};

export default AgendaClientesCoach;