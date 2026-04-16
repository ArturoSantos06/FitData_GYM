import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useAppointments } from "../../../backend/useAppointments.js";
import ModalReprogramar from '../../ModalReprogramar'; 

const CitasNutricion = () => {
    const [clienteId, setClienteId] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, idToCancel: null });
    const [reprogramarModal, setReprogramarModal] = useState({ isOpen: false, citaSeleccionada: null });

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('firebaseUser');
        if (usuarioGuardado) {
            const usuarioReal = JSON.parse(usuarioGuardado);
            setClienteId(usuarioReal.uid || usuarioReal.id);
        }
    }, []);

    const { appointments, loading, cancelarCita } = useAppointments(clienteId);

    const handleCancelConfirm = async () => {
        const exito = await cancelarCita(cancelModal.idToCancel);
        
        if (exito) {
            setCancelModal({ isOpen: false, idToCancel: null });
        } else {
            alert("Hubo un error al intentar cancelar. Intenta de nuevo.");
        }
    };

    const handleReschedule = (cita) => {
        setReprogramarModal({ isOpen: true, citaSeleccionada: cita });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-emerald-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="font-bold">Cargando tus citas...</p>
            </div>
        );
    }

    if (!clienteId) {
        return (
            <div className="bg-slate-900 p-8 rounded-xl text-center border border-red-500/30 max-w-md mx-auto mt-6">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl text-white font-bold mb-2">Acceso Denegado</h2>
                <p className="text-slate-400">Inicia sesión para ver tus citas médicas.</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                    Mis Citas de Nutrición
                </h2>
                <p className="text-slate-400 mt-2">
                    Gestiona tus próximas valoraciones y seguimientos.
                </p>
            </div>

            {appointments.length === 0 ? (
                <div className="bg-slate-800 rounded-xl p-10 text-center border border-slate-700">
                    <Calendar size={48} className="text-slate-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl text-white font-bold">No tienes citas programadas</h3>
                    <p className="text-slate-400 mt-2">Cuando tu nutriólogo te asigne una cita, aparecerá aquí.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((cita) => (
                        <div key={cita.id} className={`bg-slate-900 rounded-xl p-6 border transition-all ${cita.estado === 'cancelada' ? 'border-red-500/20 opacity-75' : 'border-slate-700 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-900/20'}`}>
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                <div className="space-y-3 flex-1">
                                    <div className="flex items-center justify-between md:justify-start gap-4">
                                        <h3 className="text-xl font-bold text-white capitalize">{cita.title || 'Cita Nutricional'}</h3>
                                        {cita.estado === 'cancelada' ? (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-500/50">Cancelada</span>
                                        ) : (
                                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-900/30 text-emerald-400 border border-emerald-500/50 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>Activa
                                            </span>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-300">
                                        <div className="flex items-center gap-2"><Calendar size={16} className="text-emerald-500" /><span>{cita.fecha}</span></div>
                                        <div className="flex items-center gap-2"><Clock size={16} className="text-emerald-500" /><span>{cita.horaInicio} - {cita.horaFin}</span></div>
                                        <div className="flex items-center gap-2 sm:col-span-2"><User size={16} className="text-emerald-500" /><span>Nutriólogo asignado (Contactar vía mensaje)</span></div>
                                    </div>
                                </div>
                                {cita.estado !== 'cancelada' && (
                                    <div className="flex md:flex-col gap-2 md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700 md:pl-4 mt-2 md:mt-0">
                                        <button onClick={() => handleReschedule(cita)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold text-sm transition-colors border border-slate-600">
                                            <RefreshCw size={16} />Cambiar
                                        </button>
                                        <button onClick={() => setCancelModal({ isOpen: true, idToCancel: cita.id })} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900/20 hover:bg-red-600 text-red-400 font-semibold text-sm transition-all border border-red-900/50">
                                            <XCircle size={16} />Cancelar
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal de Cancelar */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} className="text-red-500" /></div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">¿Cancelar esta cita?</h3>
                        <p className="text-slate-400 text-center text-sm mb-6">Tu nutriólogo será notificado. Si cancelas, tendrás que solicitar un nuevo espacio sujeto a disponibilidad.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, idToCancel: null })} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">Volver</button>
                            <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shadow-lg shadow-red-900/20">Sí, Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/*  Modal de Reprogramar */}
            {reprogramarModal.isOpen && (
                <ModalReprogramar 
                    citaSeleccionada={reprogramarModal.citaSeleccionada}
                    onClose={() => setReprogramarModal({ isOpen: false, citaSeleccionada: null })}
                    onSuccess={() => {
                        setReprogramarModal({ isOpen: false, citaSeleccionada: null });
                    }}
                />
            )}
        </div>
    );
};

export default CitasNutricion;