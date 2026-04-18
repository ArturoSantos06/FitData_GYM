import React, { useState, useEffect } from 'react';
import { AlertTriangle, XCircle, CheckCircle2 } from 'lucide-react';
import { getCurrentUser, waitForAuthReady, getClientNutritionistAssignment, removeNutritionistFromClient } from '../../../firebase';

const VistaNutricion = () => {
    // Estados a utilizar //
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [serviceStatus, setServiceStatus] = useState('active');
    const [loading, setLoading] = useState(true);
    const [clienteId, setClienteId] = useState(null);

    useEffect(() => {
        const initAuth = async () => {
            const user = await waitForAuthReady();
            if (user) {
                setClienteId(user.uid);
            } else {
                setLoading(false);
            }
        };

        initAuth();
    }, []);

    useEffect(() => {
        const fetchMiNutriologo = async () => {
            if (!clienteId) {
                setLoading(false);
                return;
            }

            try {
                const assignment = await getClientNutritionistAssignment(clienteId);
                if (assignment.success && assignment.data) {
                    const estado = assignment.data.status === 'active' ? 'active' : 'cancelled';
                    setServiceStatus(estado);
                } else {
                    setServiceStatus('cancelled');
                }
            } catch (error) {
                console.error("Error al obtener datos del cliente:", error);
                setServiceStatus('cancelled');
            } finally {
                setLoading(false);
            }
        };

        fetchMiNutriologo();
    }, [clienteId]);

    const handleCancelService = async () => {
        try {
            const result = await removeNutritionistFromClient(clienteId);
            if (!result.success) {
                throw new Error(result.error || 'No se pudo cancelar el servicio');
            }

            setServiceStatus('cancelled');
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error al cancelar el servicio en Firebase:", error);
            alert("Hubo un error al intentar cancelar el servicio.");
        }
    };

    if (loading) {
        return <div className="text-slate-400 text-center mt-10 font-medium flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
            Cargando estado del servicio...
        </div>;
    }

    if (!clienteId) {
        return (
            <div className="bg-slate-900 p-8 rounded-xl max-w-md mx-auto text-center border border-red-500/30">
                <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-xl text-white font-bold mb-2">Acceso Denegado</h2>
                <p className="text-slate-400">Por favor, inicia sesión para gestionar tus servicios.</p>
            </div>
        );
    }

    return (
        <div className="w-full flex justify-center animate-fade-in">
            <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl overflow-hidden p-8 border border-slate-700">
                
                {/* LÍNEA SUPERIOR DEGRADADA */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-red-500 to-orange-400"></div>
                
                <div className="text-center md:text-left mb-8">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-r from-red-400 to-orange-400">
                        Gestión de Servicio
                    </h2>
                    <p className="text-slate-400 font-medium mt-1.5">
                        Administra tu suscripción al área de nutrición.
                    </p>
                </div>

                {/* CONTENIDO PRINCIPAL: ESTADO DEL SERVICIO */}
                <div className="bg-slate-900 rounded-xl border border-slate-700 p-8 text-center flex flex-col items-center">
                    
                    {serviceStatus === 'active' ? (
                        <>
                            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-4 border border-green-500/20">
                                <CheckCircle2 size={40} className="text-green-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Servicio de Nutrición Activo</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                                Actualmente estás vinculado a un nutriólogo. Si decides detener el servicio, se notificará a la administración y no se te cobrará el próximo mes.
                            </p>
                            
                            <button 
                                onClick={() => setIsModalOpen(true)}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-red-900/40 hover:bg-red-600 text-red-400 hover:text-white font-bold transition-all border border-red-700/50 hover:border-red-600 flex items-center justify-center gap-2"
                            >
                                <XCircle size={20} />
                                Detener Servicio
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-full bg-slate-800 flex items-center justify-center mb-4 border border-slate-600">
                                <XCircle size={40} className="text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Servicio Detenido</h3>
                            <p className="text-slate-400 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
                                Actualmente no estás recibiendo el servicio de nutrición personalizado.
                            </p>
                            <button 
                                onClick={() => alert("Próximamente: Podrás volver a contratar el servicio desde la Tienda.")}
                                className="w-full sm:w-auto px-8 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-all border border-slate-600"
                            >
                                Reactivar Servicio
                            </button>
                        </>
                    )}

                </div>

                {/* MODAL PARA CONFIRMAR CANCELACIÓN */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl animate-fade-in">
                            <div className="flex items-center gap-3 text-red-400 mb-4">
                                <AlertTriangle size={28} />
                                <h3 className="text-xl font-bold">¿Detener Servicio?</h3>
                            </div>
                            <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                                Al confirmar, perderás el acceso a tus planes de nutrición personalizados y se cortará la comunicación con tu nutriólogo. 
                                <br/><br/>
                                <span className="text-slate-400 italic">Esta acción no puede deshacerse desde esta pantalla.</span>
                            </p>
                            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
                                <button 
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-semibold transition-all w-full sm:w-auto"
                                >
                                    No, regresar
                                </button>
                                <button 
                                    onClick={handleCancelService}
                                    className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold transition-all shadow-lg shadow-red-900/50 w-full sm:w-auto"
                                >
                                    Sí, detener servicio
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VistaNutricion;