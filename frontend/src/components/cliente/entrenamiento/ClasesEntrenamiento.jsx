import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, XCircle, RefreshCw, AlertCircle, CheckCircle2, ListFilter, Dumbbell } from 'lucide-react';
import { CitasEntrenador } from '../../../backend/CitasEntrenador'; 
import ModalReprogramar from '../../modales/ModalReprogramar';

const ClasesEntrenamiento = () => {
    const [clienteId, setClienteId] = useState(null);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, idToCancel: null });
    const [reprogramarModal, setReprogramarModal] = useState({ isOpen: false, citaSeleccionada: null });
    
    const [filtroActivo, setFiltroActivo] = useState('activas');

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('firebaseUser');
        if (usuarioGuardado) {
            const usuarioReal = JSON.parse(usuarioGuardado);
            setClienteId(usuarioReal.uid || usuarioReal.id);
        }
    }, []);

    const { appointments, loading, cancelarCita } = CitasEntrenador(clienteId);

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
            <div className="flex flex-col items-center justify-center p-10 text-cyan-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500 mb-4"></div>
                <p className="font-bold">Cargando tus citas de entrenamiento...</p>
            </div>
        );
    }

    if (!clienteId) {
        return (
            <div className="bg-slate-900 p-8 rounded-xl text-center border border-red-500/30 max-w-md mx-auto mt-6">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl text-white font-bold mb-2">Acceso Denegado</h2>
                <p className="text-slate-400">Inicia sesión para ver tus citas de entrenamiento.</p>
            </div>
        );
    }

    // FILTRADO DE CITAS
    const citasProcesadas = (appointments || []).map((cita) => {
        const ahora = new Date();
        const fechaCita = new Date(`${cita.fecha}T${cita.horaFin || '23:59'}:00`);
        const yaPaso = fechaCita < ahora;

        let estadoVisual = cita.estado;
        if (estadoVisual !== 'cancelada' && yaPaso) {
            estadoVisual = 'completada';
        }

        return { ...cita, estadoVisual, fechaObj: fechaCita };
    });

    const citasActivas = citasProcesadas.filter(c => c.estadoVisual === 'activa');
    const citasCompletadas = citasProcesadas.filter(c => c.estadoVisual === 'completada').sort((a, b) => b.fechaObj - a.fechaObj);
    const citasCanceladas = citasProcesadas.filter(c => c.estadoVisual === 'cancelada').sort((a, b) => b.fechaObj - a.fechaObj);

    let citasMostrar = [];
    if (filtroActivo === 'activas') citasMostrar = citasActivas;
    if (filtroActivo === 'completadas') citasMostrar = citasCompletadas;
    if (filtroActivo === 'canceladas') citasMostrar = citasCanceladas;

    return (
        <div className="w-full max-w-3xl mx-auto animate-fade-in space-y-6">
            
            <div className="relative bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden p-6 md:p-8">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-cyan-400 via-blue-400 to-indigo-500"></div>
                
                <div className="mb-6">
                    <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-400 mb-2">
                        <Dumbbell size={14} />
                        Área de Entrenamiento
                    </div>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-linear-to-r from-cyan-400 to-blue-400">
                        Mis Citas de Entrenamiento
                    </h2>
                    <p className="text-slate-400 mt-2">
                        Gestiona tus próximas sesiones y revisa tu historial de asistencia.
                    </p>
                </div>

                <div className="flex flex-wrap gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                    <button 
                        onClick={() => setFiltroActivo('activas')}
                        className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${filtroActivo === 'activas' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'}`}
                    >
                        Próximas ({citasActivas.length})
                    </button>
                    <button 
                        onClick={() => setFiltroActivo('completadas')}
                        className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${filtroActivo === 'completadas' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'}`}
                    >
                        Historial ({citasCompletadas.length})
                    </button>
                    <button 
                        onClick={() => setFiltroActivo('canceladas')}
                        className={`flex-1 min-w-[100px] py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-300 ${filtroActivo === 'canceladas' ? 'bg-red-500/20 text-red-400 border border-red-500/50 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700/50 border border-transparent'}`}
                    >
                        Canceladas ({citasCanceladas.length})
                    </button>
                </div>
            </div>

            {/* LISTA DE CITAS FILTRADAS */}
            {citasMostrar.length === 0 ? (
                <div className="bg-slate-800/80 rounded-2xl p-10 text-center border border-slate-700 animate-fade-in shadow-lg">
                    <ListFilter size={48} className="text-slate-500 mx-auto mb-4 opacity-50" />
                    <h3 className="text-xl text-white font-bold">
                        {filtroActivo === 'activas' && 'No tienes citas próximas'}
                        {filtroActivo === 'completadas' && 'Aún no tienes sesiones completadas'}
                        {filtroActivo === 'canceladas' && 'No tienes citas canceladas'}
                    </h3>
                    <p className="text-slate-400 mt-2">
                        {filtroActivo === 'activas' ? 'Solicita un nuevo espacio a tu entrenador.' : 'Aquí aparecerá tu historial según asistas al gimnasio.'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {citasMostrar.map((cita) => {
                        const { estadoVisual } = cita;
                        
                        let borderClass = 'border-slate-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-900/20';
                        if (estadoVisual === 'cancelada') borderClass = 'border-red-500/20 opacity-75 bg-slate-900/50';
                        if (estadoVisual === 'completada') borderClass = 'border-indigo-500/20 opacity-75 bg-slate-800/40';

                        return (
                            <div key={cita.id} className={`bg-slate-900 rounded-2xl p-6 border transition-all animate-fade-in shadow-md ${borderClass}`}>
                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex items-center justify-between md:justify-start gap-4">
                                            <h3 className={`text-xl font-bold capitalize ${estadoVisual === 'activa' ? 'text-white' : 'text-slate-300'}`}>
                                                {cita.title || 'Cita de Entrenamiento'}
                                            </h3>
                                            
                                            {estadoVisual === 'cancelada' && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-900/30 text-red-400 border border-red-500/50 flex items-center gap-1">
                                                    <XCircle size={12} /> Cancelada
                                                </span>
                                            )}
                                            {estadoVisual === 'completada' && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-900/30 text-indigo-400 border border-indigo-500/50 flex items-center gap-1">
                                                    <CheckCircle2 size={12} /> Completada
                                                </span>
                                            )}
                                            {estadoVisual === 'activa' && (
                                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-cyan-900/30 text-cyan-400 border border-cyan-500/50 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>Próxima
                                                </span>
                                            )}
                                        </div>
                                        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm ${estadoVisual === 'activa' ? 'text-slate-300' : 'text-slate-500'}`}>
                                            <div className="flex items-center gap-2">
                                                <Calendar size={16} className={estadoVisual === 'activa' ? 'text-cyan-500' : 'text-slate-500'} />
                                                <span>{cita.fecha}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Clock size={16} className={estadoVisual === 'activa' ? 'text-cyan-500' : 'text-slate-500'} />
                                                <span>{cita.horaInicio} - {cita.horaFin}</span>
                                            </div>
                                            <div className="flex items-center gap-2 sm:col-span-2">
                                                <User size={16} className={estadoVisual === 'activa' ? 'text-cyan-500' : 'text-slate-500'} />
                                                <span>Entrenador asignado (Contactar vía mensaje)</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {estadoVisual === 'activa' && (
                                        <div className="flex md:flex-col gap-2 md:min-w-[140px] pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700 md:pl-4 mt-2 md:mt-0">
                                            <button onClick={() => handleReschedule(cita)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-semibold text-sm transition-colors border border-slate-600 shadow-sm">
                                                <RefreshCw size={16} />Cambiar
                                            </button>
                                            <button onClick={() => setCancelModal({ isOpen: true, idToCancel: cita.id })} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-red-900/20 hover:bg-red-600 text-red-400 font-semibold text-sm transition-all border border-red-900/50 shadow-sm">
                                                <XCircle size={16} />Cancelar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Cancelar */}
            {cancelModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full border border-slate-700 shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4"><AlertCircle size={32} className="text-red-500" /></div>
                        <h3 className="text-xl font-bold text-white text-center mb-2">¿Cancelar esta cita?</h3>
                        <p className="text-slate-400 text-center text-sm mb-6">Si cancelas, tendrás que solicitar un nuevo espacio a tu entrenador.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelModal({ isOpen: false, idToCancel: null })} className="flex-1 px-4 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-colors">Volver</button>
                            <button onClick={handleCancelConfirm} className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors shadow-lg shadow-red-900/20">Sí, Cancelar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Reprogramar */}
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

export default ClasesEntrenamiento;