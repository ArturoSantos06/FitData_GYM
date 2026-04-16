import React, { useState, useEffect } from 'react';
import { X, Calendar as CalendarIcon, Clock, AlertCircle } from 'lucide-react';
import { useAppointments } from "../backend/useAppointments.js";

const ModalReprogramar = ({ citaSeleccionada, onClose, onSuccess }) => {
    const { verificarHorariosDisponibles, reprogramarCita } = useAppointments();
    
    const [fecha, setFecha] = useState('');
    const [horariosLibres, setHorariosLibres] = useState([]);
    const [horaSeleccionada, setHoraSeleccionada] = useState('');
    const [cargandoHorarios, setCargandoHorarios] = useState(false);
    const [guardando, setGuardando] = useState(false);

    // Buscamos disponibilidad cuando el cliente cambia la fecha
    useEffect(() => {
        const buscarDisponibilidad = async () => {
            if (!fecha) return;
            
            setCargandoHorarios(true);
            setHoraSeleccionada(''); // Reseteamos la hora si cambia de día
            
            const libres = await verificarHorariosDisponibles(citaSeleccionada.nutriologoId, fecha);
            
            setHorariosLibres(libres || []);
            setCargandoHorarios(false);
        };

        buscarDisponibilidad();
    }, [fecha, citaSeleccionada.nutriologoId]); 

    // Guardar cambios
    const handleGuardar = async () => {
        if (!fecha || !horaSeleccionada) return;
        
        setGuardando(true);
        const exito = await reprogramarCita(citaSeleccionada.id, fecha, horaSeleccionada);
        setGuardando(false);

        if (exito) {
            onSuccess(); // Cerramos el modal si todo salió bien
        } else {
            alert("Hubo un error al guardar. Intenta de nuevo.");
        }
    };

    const hoy = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-slate-900 rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl relative">
                
                {/* Botón cerrar */}
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
                    <X size={24} />
                </button>

                <h3 className="text-2xl font-bold text-emerald-400 mb-6">Reprogramar Cita</h3>
                
                <div className="mb-6 p-4 bg-slate-800 rounded-xl border border-slate-700 text-sm text-slate-300">
                    Estás moviendo la cita del <strong className="text-white">{citaSeleccionada.fecha}</strong> a las <strong className="text-white">{citaSeleccionada.horaInicio}</strong>.
                </div>

                {/* 1. Selección de Fecha */}
                <div className="space-y-2 mb-6">
                    <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <CalendarIcon size={16} /> Nueva Fecha
                    </label>
                    <input 
                        type="date" 
                        min={hoy}
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                    />
                </div>

                {/* 2. Selección de Horarios */}
                <div className="space-y-3 mb-8">
                    <label className="text-sm font-bold text-slate-400 flex items-center gap-2">
                        <Clock size={16} /> Horarios Disponibles
                    </label>

                    {!fecha && (
                        <p className="text-sm text-slate-500 italic">Selecciona una fecha primero.</p>
                    )}

                    {cargandoHorarios && (
                        <p className="text-sm text-emerald-400 animate-pulse">Buscando disponibilidad...</p>
                    )}

                    {fecha && !cargandoHorarios && horariosLibres.length === 0 && (
                        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                            <AlertCircle size={16} /> 
                            {new Date(fecha + "T00:00:00").getDay() === 0 ? "El gimnasio está cerrado los domingos." : "No hay horarios libres este día."}
                        </div>
                    )}

                    {fecha && !cargandoHorarios && horariosLibres.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-2">
                            {horariosLibres.map((hora) => (
                                <button
                                    key={hora}
                                    onClick={() => setHoraSeleccionada(hora)}
                                    className={`py-2 rounded-lg text-sm font-bold transition-all border ${
                                        horaSeleccionada === hora 
                                        ? 'bg-emerald-500 text-slate-900 border-emerald-500' 
                                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-emerald-500/50'
                                    }`}
                                >
                                    {hora}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                    <button 
                        onClick={onClose} 
                        className="flex-1 px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleGuardar}
                        disabled={!fecha || !horaSeleccionada || guardando}
                        className={`flex-1 px-4 py-3 rounded-xl font-bold transition-all ${
                            !fecha || !horaSeleccionada || guardando 
                            ? 'bg-emerald-900/30 text-emerald-700 cursor-not-allowed' 
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-lg shadow-emerald-900/20'
                        }`}
                    >
                        {guardando ? 'Guardando...' : 'Confirmar Cambio'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ModalReprogramar;