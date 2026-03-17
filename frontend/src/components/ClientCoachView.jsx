import React, { useState, useEffect } from 'react';
import { User, Calendar, AlertTriangle, RefreshCw, XCircle } from 'lucide-react';

// Herramientas exactas de Firebase //
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config'; 

const ClientCoachView = () => {
    // Estados a utilizar //
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceStatus, setServiceStatus] = useState('active');
    const [loading, setLoading] = useState(true);
    const [clienteId, setClienteId] = useState(null); 

    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('firebaseUser');
        
        if (usuarioGuardado) {
            const usuarioReal = JSON.parse(usuarioGuardado);
            const idReal = usuarioReal.uid || usuarioReal.id; 
            setClienteId(idReal);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const fetchMiEntrenador = async () => {
            if (!clienteId) return; 

            try {
                const docRef = doc(db, "miembros", clienteId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const estado = data.entrenadorActivo === false ? 'cancelled' : 'active';
                    setServiceStatus(estado);
                }
            } catch (error) {
                console.error("Error al obtener datos del cliente:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMiEntrenador();
    }, [clienteId]); 

    const handleCancelService = async () => {
        try {
            const docRef = doc(db, "miembros", clienteId);
            
            await updateDoc(docRef, {
                entrenadorActivo: false
            });

            setServiceStatus('cancelled');
            setIsModalOpen(false);
            
        } catch (error) {
            console.error("Error al cancelar el servicio en Firebase:", error);
            alert("Hubo un error al intentar cancelar el servicio.");
        }
    };

    if (loading) {
        return <div className="text-gray-300 text-center mt-10 font-bold">Cargando información de tu entrenador...</div>;
    }

    if (!clienteId) {
        return (
            <div className="bg-gray-800 p-8 rounded-xl max-w-md mx-auto mt-10 text-center border border-red-500">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl text-white font-bold mb-2">Acceso Denegado</h2>
                <p className="text-gray-400">Por favor, inicia sesión para ver la información de tu entrenador.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-purple-400 text-gray-100 font-sans max-w-3xl mx-auto">
            {/* Header */}
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-br from-purple-400 to-blue-400 mb-4">
                Mi entrenador
            </h2>
            
            {/* Card de información del entrenador */}
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-slate-500 border-2 border-slate-600 shadow-inner shrink-0">
                    <User size={48} />
                </div>
                <div className="text-center sm:text-left flex-1">
                    <h3 className="text-2xl font-bold text-white"> Entrenador </h3> 
                    <p className="text-sm text-gray-400 mt-1.5"> Especialidad</p>              
                    
                    <div className="mt-4">
                        {serviceStatus === 'active' ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-green-900/20 text-green-400 border-green-500/50">
                                <span className="w-2 h-2 rounded-full mr-2 bg-green-500 animate-pulse"></span>
                                Entrenador activo
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-900/50 text-gray-400 border-gray-600">
                               <span className="w-2 h-2 rounded-full mr-2 bg-gray-500"></span>
                                Servicio Detenido                  
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Resumen de plan */}
            <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 mb-8">
                <h4 className="text-lg font-semibold text-gray-200 mb-4 flex items-center justify-center sm:justify-start gap-2">
                    <Calendar size={20} className="text-blue-400"/> Resumen de tu Plan
                </h4>
                <ul className="text-sm text-gray-400 space-y-3">
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <strong className="text-gray-300">Próximo corte:</strong> 15 de Abril, 2026
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <strong className="text-gray-300">Rutinas asignadas:</strong> 3 rutinas activas esta semana
                    </li>
                    <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        <strong className="text-gray-300">Mensualidad:</strong> Pagada al corriente
                    </li>
                </ul>
            </div>

            {/* Botones de acción */}
            {serviceStatus === 'active' && (
                <div className="flex flex-col sm:flex-row gap-4">
                    <button className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white py-3 px-4 rounded-lg font-bold transition-all border border-slate-600">
                        <RefreshCw size={18} />
                        Cambiar de Entrenador
                    </button>
                    <button 
                        onClick={() => setIsModalOpen(true)}
                        className="flex-1 flex items-center justify-center gap-2 bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white py-3 px-4 rounded-lg font-bold transition-all border border-red-700/50 hover:border-red-600"
                    >
                        <XCircle size={18} />
                        Detener Servicio
                    </button>
                </div>
            )}

            {/* Modal para confirmar */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
                        <div className="flex items-center gap-3 text-red-400 mb-4">
                            <AlertTriangle size={28} />
                            <h3 className="text-xl font-bold">¿Desvincular Entrenador?</h3>
                        </div>
                        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                            Al detener el servicio, perderás el acceso inmediato a tus rutinas personalizadas y tu historial con el Coach Roberto. 
                            <br/><br/>
                            <span className="text-gray-400 italic">Esta acción se notificará al entrenador automáticamente.</span>
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all text-sm"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCancelService}
                                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-lg shadow-red-900/50 text-sm"
                            >
                                Sí, detener servicio
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClientCoachView;