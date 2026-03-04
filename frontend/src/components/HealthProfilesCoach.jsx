import React, { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function HealthProfilesCoach({ refreshTrigger }) {
    const [profiles, setProfiles] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('');
    const [lastTrigger, setLastTrigger] = useState(refreshTrigger);

    const loadProfiles = () => {
        const token = localStorage.getItem('token');
        if (!token) { setError('Sesión no válida'); setLoading(false); return; }

        setLoading(true);
        setError('');
        const timestamp = new Date().getTime();

        fetch(`${API_URL}/api/health-profiles/?_t=${timestamp}`, {
            headers: { Authorization: `Token ${token}` }
        })
            .then(r => r.json().then(data => ({ ok: r.ok, data })))
            .then(res => {
                if (!res.ok) throw new Error('Error cargando perfiles');
                setProfiles(res.data);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadProfiles();
    }, []);

    useEffect(() => {
        if (refreshTrigger !== lastTrigger) {
            setLastTrigger(refreshTrigger);
            loadProfiles();
        }
    }, [refreshTrigger, lastTrigger]);

    const filtered = profiles.filter(p => {
        if (!filter) return true;
        return (p.miembro_nombre || '').toLowerCase().includes(filter.toLowerCase());
    });

    return (
        <div className="w-full max-w-5xl mx-auto p-6">
            {/* Título adaptado para la vista del Coach */}
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-purple-400 to-blue-400 mb-4">
                Fichas Médicas de Clientes
            </h1>

            <div className="flex gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none w-full sm:w-auto"
                />
            </div>

            {loading && <p className="text-slate-400">Cargando fichas...</p>}
            {error && <p className="text-red-400 mb-3">{error}</p>}
            {!loading && filtered.length === 0 && <p className="text-slate-500">No se encontraron atletas.</p>}

            <div className="space-y-2">
                {filtered.map(p => (
                    <div key={p.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-slate-800 transition-colors">
                        <div>
                            <p className="text-white font-semibold">{p.miembro_nombre}</p>
                            {/* Pequeña alerta visual en la lista si hay lesiones o problemas cardíacos */}
                            {(p.lesiones_recientes || p.condicion_corazon) && (
                                <span className="inline-block mt-1 px-2 py-0.5 bg-red-900/50 text-red-300 text-[10px] rounded-full font-medium border border-red-800/50">
                                    Requiere atención
                                </span>
                            )}
                        </div>
                        <button
                            onClick={() => setSelected(p)}
                            className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold transition-colors"
                        >
                            Ver Ficha
                        </button>
                    </div>
                ))}
            </div>

            {/* Modal de Detalles Reorganizado */}
            {selected && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-xl p-6 relative">
                        <button
                            onClick={() => setSelected(null)}
                            className="absolute top-3 right-3 text-slate-400 hover:text-white text-lg"
                        >
                            ✕
                        </button>
                        <h2 className="text-xl font-bold text-white mb-6 border-b border-slate-700 pb-2">
                            Atleta: {selected.miembro_nombre}
                        </h2>

                        <div className="space-y-4 text-sm">
                            {/* Sección 1: Alertas Críticas (Arriba para el coach) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className={`rounded-lg p-3 border ${selected.lesiones_recientes ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800 border-transparent'}`}>
                                    <p className="text-slate-400 text-xs">Lesiones Recientes</p>
                                    <p className={`font-semibold text-lg ${selected.lesiones_recientes ? 'text-red-400' : 'text-white'}`}>
                                        {selected.lesiones_recientes ? 'Sí' : 'No'}
                                    </p>
                                </div>

                                <div className={`rounded-lg p-3 border ${selected.condicion_corazon ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800 border-transparent'}`}>
                                    <p className="text-slate-400 text-xs">Condición del Corazón</p>
                                    <p className={`font-semibold text-lg ${selected.condicion_corazon ? 'text-red-400' : 'text-white'}`}>
                                        {selected.condicion_corazon ? 'Sí' : 'No'}
                                    </p>
                                </div>
                            </div>

                            {/* Sección 2: Información General y Médica */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-800 rounded-lg p-3">
                                    <p className="text-slate-400 text-xs">Edad</p>
                                    <p className="text-white font-semibold">{selected.edad ?? '—'} años</p>
                                </div>
                                <div className={`rounded-lg p-3 border ${selected.presion_alta ? 'bg-red-900/20 border-red-800/50' : 'bg-slate-800 border-transparent'}`}>
                                    <p className="text-slate-400 text-xs">Presión Alta</p>
                                    <p className={`font-semibold text-lg ${selected.presion_alta ? 'text-red-400' : 'text-white'}`}>
                                        {selected.presion_alta ? 'Sí' : 'No'}
                                    </p>
                                </div>
                                <div className={`rounded-lg p-3 border ${selected.medicamentos ? 'bg-yellow-900/20 border-yellow-800/50' : 'bg-slate-800 border-transparent'}`}>
                                    <p className="text-slate-400 text-xs">Medicamentos</p>
                                    <p className={`font-semibold text-lg ${selected.medicamentos ? 'text-yellow-400' : 'text-white'}`}>
                                        {selected.medicamentos ? 'Sí' : 'No'}
                                    </p>
                                </div>
                            </div>

                            {/* Sección 3: Notas */}
                            <div>
                                <p className="text-slate-400 text-xs mb-2">Notas / Comentarios adicionales</p>
                                <div className="bg-purple-950/40 border border-purple-700/40 rounded-lg p-3 text-purple-200 whitespace-pre-wrap min-h-[80px]">
                                    {selected.comentarios || 'El atleta no ha registrado información adicional.'}
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setSelected(null)}
                                className="px-5 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm font-semibold transition-colors"
                            >
                                Cerrar ficha
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HealthProfilesCoach;