import React, {useState, useEffect} from 'react';
import { Search } from 'lucide-react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

function TrainerClientUnlink() {
    //Estados a utilizar//
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [mostrarArchivados, setMostrarArchivados] = useState(false);

    useEffect(() => {
        const fetchClientes = async () => {
            try {
                const querySnapshot = await getDocs(collection(db, "miembros"));
                
                const clientesFirebase = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    
                    return {
                        id: doc.id, 
                        name: data.nombre ? `${data.nombre} ${data.apellido || ''}`.trim() : "Sin nombre",
                        pagoAlCorriente: data.active === true, 
                        estadoServicio: data.active ? 'activo' : 'cancelado',
                        archivado: data.archivado || false,
                        // Leemos si el cliente fue eliminado previamente
                        eliminado: data.eliminado || false 
                    };
                });
                
                const clientesVivos = clientesFirebase.filter(cliente => cliente.eliminado === false);
                
                setClients(clientesVivos);
            } catch (error) {
                console.error("Error al conectar con Firebase:", error);
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
                    {filteredClients.map((client) => (
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
                    {filteredClients.length === 0 && (
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