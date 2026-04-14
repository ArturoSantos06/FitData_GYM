import React, {useState, useEffect} from 'react';
import { Search } from 'lucide-react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { getCurrentUser, getUser, getUserByAuthUid, getUserByEmail, getTrainerServiceSales, onAuthChanged } from '../firebase';

const normalizeLookupKey = (value) => String(value || '').trim().toLowerCase();

const toDate = (value) => {
    if (!value) return null;
    if (typeof value?.toDate === 'function') return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

const waitForFirebaseUser = () => {
    const currentUser = getCurrentUser();
    if (currentUser?.uid && currentUser?.email) {
        return Promise.resolve(currentUser);
    }

    return new Promise((resolve) => {
        let settled = false;

        const finish = (user) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutId);
            unsubscribe();
            resolve(user || null);
        };

        const unsubscribe = onAuthChanged((user) => {
            if (user?.uid && user?.email) {
                finish(user);
            }
        });

        const timeoutId = setTimeout(() => {
            finish(getCurrentUser());
        }, 4000);
    });
};

function TrainerClientUnlink() {
    //Estados a utilizar//
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [mostrarArchivados, setMostrarArchivados] = useState(false);

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                setIsLoading(true);
                const authUser = await waitForFirebaseUser();
                if (!authUser) {
                    setClients([]);
                    setIsLoading(false);
                    return;
                }

                const [querySnapshot, assignmentsSnapshot, byAuthUid, byDocId, byEmail, trainerSalesResult] = await Promise.all([
                    getDocs(collection(db, "miembros")),
                    getDocs(collection(db, 'client_trainer_assignments')),
                    getUserByAuthUid(authUser.uid),
                    getUser(authUser.uid),
                    authUser.email ? getUserByEmail(authUser.email, authUser.uid) : Promise.resolve({ success: false }),
                    getTrainerServiceSales(),
                ]);

                const trainerServiceSales = trainerSalesResult?.success ? trainerSalesResult.data : [];

                const trainerKeys = new Set([
                    authUser.uid,
                    authUser.email,
                ].map(normalizeLookupKey).filter(Boolean));

                [byAuthUid, byDocId, byEmail]
                    .filter((entry) => entry?.success && entry?.data)
                    .forEach((entry) => {
                        const data = entry.data;
                        [data.id, data.authUid, data.legacyId, data.email].forEach((key) => {
                            const normalized = normalizeLookupKey(key);
                            if (normalized) {
                                trainerKeys.add(normalized);
                            }
                        });
                    });

                const assignedClientKeys = new Set();
                assignmentsSnapshot.docs.forEach((docSnap) => {
                    const assignment = docSnap.data() || {};
                    const status = String(assignment.status || assignment.trainerStatus || 'active').toLowerCase();
                    const trainerId = normalizeLookupKey(assignment.trainerId || assignment.trainer_id);
                    const trainerEmail = normalizeLookupKey(assignment.trainerEmail || assignment.trainer_email);
                    const matchesTrainer = trainerKeys.has(trainerId) || trainerKeys.has(trainerEmail);

                    if (!matchesTrainer || status !== 'active') {
                        return;
                    }

                    [assignment.clientId, assignment.memberId, docSnap.id].forEach((key) => {
                        const normalized = normalizeLookupKey(key);
                        if (normalized) {
                            assignedClientKeys.add(normalized);
                        }
                    });
                });

                const now = new Date();
                const month = now.getMonth() + 1;
                const year = now.getFullYear();

                // Get all SERVICIO_ENTRENAMIENTO sales for this month (as fallback for records without trainerId)
                let allClientSales = [...trainerServiceSales];
                try {
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

                    const ventasQ = query(
                        collection(db, 'ventas'),
                        where('tipo_venta', '==', 'SERVICIO_ENTRENAMIENTO')
                    );
                    const ventasSnapshot = await getDocs(ventasQ);

                    ventasSnapshot.docs.forEach((docSnap) => {
                        const sale = docSnap.data();
                        const saleDate = toDate(sale.completedAt) || toDate(sale.updatedAt) || toDate(sale.createdAt) || toDate(sale.fecha);

                        // Filter by month
                        if (!saleDate || saleDate.getMonth() + 1 !== month || saleDate.getFullYear() !== year) return;

                        // Check if client is assigned
                        const clientId = String(sale.cliente_id || sale.cliente || '').trim();
                        if (!clientId) return;

                        const clientNormalized = normalizeLookupKey(clientId);
                        if (!assignedClientKeys.has(clientNormalized)) return;

                        // Add if not already in list
                        if (!allClientSales.find(s => s.id === docSnap.id)) {
                            allClientSales.push({ id: docSnap.id, ...sale });
                        }
                    });
                } catch (error) {
                    console.warn('Could not fetch additional sales:', error.message);
                }

                const paidClientKeys = new Set();
                allClientSales.forEach((sale) => {
                    const status = String(sale.payment_status || '').trim().toLowerCase();
                    if (status !== 'completed') return;

                    const saleClientKeys = [
                        sale.cliente_id,
                        sale.cliente,
                        sale.cliente_auth_uid,
                        sale.clienteEmail,
                        sale.cliente_email,
                        sale.cliente_email_override,
                    ].map(normalizeLookupKey).filter(Boolean);

                    const belongsToAssignedClient = saleClientKeys.some((key) => assignedClientKeys.has(key));
                    if (!belongsToAssignedClient) return;

                    const saleDate = toDate(sale.completedAt) || toDate(sale.updatedAt) || toDate(sale.createdAt) || toDate(sale.fecha);
                    if (!saleDate) return;
                    if (saleDate.getMonth() + 1 !== month || saleDate.getFullYear() !== year) return;

                    saleClientKeys.forEach((key) => paidClientKeys.add(key));
                });
                const clientesFirebase = querySnapshot.docs.map((docSnap) => {
                    const data = docSnap.data();

                    const memberKeys = [
                        docSnap.id,
                        data.userId,
                        data.authUid,
                        data.email,
                    ].map(normalizeLookupKey).filter(Boolean);

                    const isAssigned = memberKeys.some((key) => assignedClientKeys.has(key));
                    if (!isAssigned) {
                        return null;
                    }

                    const pagoAlCorriente = memberKeys.some((key) => paidClientKeys.has(key));
                    
                    return {
                        id: docSnap.id,
                        name: data.nombre ? `${data.nombre} ${data.apellido || ''}`.trim() : "Sin nombre",
                        pagoAlCorriente,
                        estadoServicio: 'activo',
                        archivado: data.archivado || false,
                        // Leemos si el cliente fue eliminado previamente
                        eliminado: data.eliminado || false 
                    };
                });
                
                const clientesVivos = clientesFirebase.filter((cliente) => cliente && cliente.eliminado === false);
                
                setClients(clientesVivos);
            } catch (error) {
                console.error("Error al conectar con Firebase:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientes();
    }, []);
   
   // Archivar / Desarchivar cliente
    const handleArchive = async (id) => {
        //se busca al cliente
        const clienteActual = clients.find(c => c.id === id);
        const nuevoEstado = !clienteActual.archivado; 

        try {
            const clienteRef = doc(db, "miembros", id);
            
            //le decimos a la BD que hay que archivarlo
            await updateDoc(clienteRef, {
                archivado: nuevoEstado
            });

            const updated = clients.map(client =>
                client.id === id ? {...client, archivado: nuevoEstado } : client
            );
            setClients(updated);

        } catch (error) {
            console.error("Error al actualizar en Firebase:", error);
            alert("Hubo un error al archivar al cliente.");
        }
    };
    
    // Eliminar cliente lógicamente //
    const handleDelete = async (id) => {
        if (window.confirm("¿Estás seguro de eliminar este cliente? Desaparecerá de tu lista")) {
            try {
                // seleccionamos al cliente
                const clienteRef = doc(db, "miembros", id);
                
                // En lugar de borrarlo, le agregamos la etiqueta "eliminado"
                await updateDoc(clienteRef, {
                    eliminado: true
                });
                
                // Lo quitamos de la pantalla inmediatamente
                setClients(clients.filter(client => client.id !== id));
                
                console.log("Cliente eliminado lógicamente con éxito.");
            } catch (error) {
                console.error("Error al intentar eliminar:", error);
                alert("Hubo un problema al eliminar el cliente.");
            }
        }
    };

    // solo se muestran los que no están archivados y coincidencias //
    const filteredClients = clients.filter(client => {
        const coincideBusqueda = client.name.toLowerCase().includes(searchTerm.toLowerCase());
        const coincideEstado = mostrarArchivados ? client.archivado : !client.archivado;
        return coincideBusqueda && coincideEstado;
    });

    return (
        <div className="bg-gray-800 p-6 rounded-xl shadow-xl mt-6 border-t-4 border-teal-500 text-gray-100 font-sans">
         
         {/* Header*/}
         <div>
            <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-linear-to-br from-teal-400 to-green-400">
                Desvinculación y Pagos
            </h2>
         </div>

         <div className="flex flex-col md:flex-row gap-4 mb-6 mt-4">
             {/* Buscador */}
             <div className="relative w-full md:w-64">
                <input
                  type="text"
                  placeholder="Buscar por nombre..."
                  className="w-full bg-slate-900 border border-slate-600 text-white rounded-lg py-2 px-4 pl-10 focus:outline-none focus:border-teal-500 text-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 text-slate-500" size={18} />
             </div>   

             {/* Botón de filtro */}
             <button
                onClick={() => setMostrarArchivados(!mostrarArchivados)}
                className={`px-4 py-2 rounded-lg text-xs uppercase tracking-wider font-bold transition-all ${
                    mostrarArchivados
                    ? 'bg-teal-900/40 text-teal-400 border border-teal-500/50'
                    : 'bg-slate-700 text-gray-300 hover:bg-slate-600 border border-transparent'
                }`}
             >
                {mostrarArchivados ? 'Mostrar Activos' : 'Mostrar Archivados'}
             </button>
         </div>            

         {/* Tabla */} 
         <div className="overflow-x-auto">
            <table className="w-full border-collapse mt-2">
                <thead>
                    <tr className="bg-gray-700 text-left text-gray-300 uppercase text-xs tracking-wider">
                        <th className="py-3 px-6">ID</th>
                        <th className="py-3 px-6">Cliente</th>
                        <th className="py-3 px-6 text-center">Estado de Pago</th>
                        <th className="py-3 px-6 text-center">Acciones</th>
                    </tr>
                </thead>
                <tbody className="text-gray-200 text-sm">
                    {isLoading && (
                        <tr>
                            <td colSpan="4" className="py-10 text-center text-gray-400 italic">
                                Cargando clientes asignados...
                            </td>
                        </tr>
                    )}

                    {!isLoading && filteredClients.map((client) => (
                      <tr key={client.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                        {/* ID */}
                        <td className="py-4 px-6">
                          <span className="font-mono text-teal-400 font-bold">#{client.id}</span>
                        </td>
                            
                        {/* Nombre */}
                        <td className="py-4 px-6 font-semibold">{client.name}</td>
                        
                        {/* Estado de Pago y Servicio con semáforo */}
                        <td className=" py-4 px-6 text-center">
                            {client.estadoServicio === 'cancelado' ? (
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border bg-gray-900/50 text-gray-400 border-gray-600">
                                    <span className="w-2 h-2 rounded-full mr-2 bg-gray-500"></span>
                                    Servicio Cancelado
                                </div>
                            ) : (
                                <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${
                                    client.pagoAlCorriente
                                    ? 'bg-green-900/20 text-green-400 border-green-500/50'
                                    : 'bg-red-900/20 text-red-400 border-red-500/50'
                                }`}>
                                    <span className={`w-2 h-2 rounded-full mr-2 ${
                                        client.pagoAlCorriente
                                        ? 'bg-green-500 animate-pulse'
                                        : 'bg-red-500'
                                    }`}></span>
                                    {client.pagoAlCorriente ? 'PAGO AL DÍA' : 'PAGO PENDIENTE'}
                                </div>
                            )}
                        </td>

                        {/* Botones de Acciones */}
                        <td className="py-4 px-6 text-center">
                            <div className="flex justify-center gap-2">
                                <button
                                   onClick={() => handleArchive(client.id)}
                                   className="bg-slate-700 hover:bg-slate-600 text-white text-[10px] uppercase font-bold py-1.5 px-3 rounded transition-all"
                                >
                                   {client.archivado ? 'Desarchivar' : 'Archivar'}
                                </button>
                                <button
                                     onClick={() => handleDelete(client.id)}
                                     className="bg-red-600 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/50 text-[10px] uppercase font-bold py-1.5 px-3 transition-all"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                    ))}
                    
                    {/* Mensaje si no hay resultado*/}
                    {!isLoading && filteredClients.length === 0 && (
                        <tr>
                            <td colSpan="4" className="py-10 text-center text-gray-500 italic">
                                No hay clientes que mostrar.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div> 
    </div>
    );
}

export default TrainerClientUnlink;