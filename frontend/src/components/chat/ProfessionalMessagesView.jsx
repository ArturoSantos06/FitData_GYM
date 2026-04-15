import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getCurrentUser } from '../../firebase';
import { ChatProvider, useChatContext } from '../../context/ChatContext';
import ChatWindow from './ChatWindow';
import { Search, Users, ChevronLeft, Loader2, MessageCircle } from 'lucide-react';

const MessagesBody = ({ role }) => {
    const { selectedClient, activeChatId, loading, selectClient } = useChatContext();
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [fetchingList, setFetchingList] = useState(true);
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);
    const currentUser = getCurrentUser();

    // Consultar Firestore según el Rol
    useEffect(() => {
        if (!currentUser?.uid) return;

        const collectionName = role === 'nutritionist'
            ? 'client_nutritionist_assignments'
            : 'client_trainer_assignments';

        const roleFieldId = role === 'nutritionist' ? 'nutritionistId' : 'trainerId';

        const fetchClients = async () => {
            try {
                console.log(`1. Buscando en colección: '${collectionName}' donde '${roleFieldId}' == '${currentUser.uid}'`);

                const q = query(
                    collection(db, collectionName),
                    where(roleFieldId, "==", currentUser.uid)
                );

                const snap = await getDocs(q);
                console.log(`2. ¡Asignaciones encontradas!: ${snap.docs.length}`);

                const clientsData = [];

                for (const d of snap.docs) {
                    const assignData = d.data();
                    console.log("3. Datos crudos de la asignación:", assignData);

                    // --- LA CORRECCIÓN CLAVE ---
                    // Tomamos ESTRICTAMENTE el valor guardado adentro del documento, nunca el d.id
                    const clientId = assignData.clientId;

                    // Si el documento de Firebase está mal hecho y no tiene el campo, lo saltamos.
                    if (!clientId) {
                        console.warn(`Saltando documento ${d.id}: No tiene el campo 'clientId' adentro.`);
                        continue;
                    }

                    console.log(`4. ID del cliente a buscar en 'users': ${clientId}`);

                    if (clientId === currentUser.uid) {
                        console.log("Saltando: El ID del cliente es el mismo que el del profesional.");
                        continue;
                    }

                    try {
                        const userSnap = await getDoc(doc(db, 'users', clientId));
                        if (userSnap.exists()) {
                            const u = userSnap.data();
                            console.log(`5. Perfil de cliente encontrado: ${u.displayName}`);

                            // Ahora estamos 100% seguros de que este 'clientId' es la cadena larga (ej. OsVis...)
                            clientsData.push({
                                clientId: clientId,
                                name: u.displayName || 'Cliente Sin Nombre',
                                color: u.avatarColor || '#0ea5e9'
                            });
                        } else {
                            console.warn(`Alerta: No existe el documento en 'users' para el ID: ${clientId}`);
                        }
                    } catch (e) {
                        console.error("Error al obtener info del perfil de usuario", e);
                    }
                }

                console.log("6. Lista final a renderizar:", clientsData);
                setClients(clientsData);
            } catch (err) {
                console.error("Error obteniendo clientes asignados:", err);
            } finally {
                setFetchingList(false);
            }
        };

        fetchClients();
    }, [currentUser, role]);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectClient = (c) => {
        selectClient(c, currentUser?.uid);
        setShowSidebarMobile(false);
    };

    const handleBack = () => {
        selectClient(null, null);
        setShowSidebarMobile(true);
    };

    return (
        <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden bg-[#0b141a] text-slate-100 font-sans md:h-[calc(100vh-80px)] rounded-3xl border border-slate-700 shadow-2xl relative z-10 mx-auto mt-6" style={{ maxWidth: '1400px' }}>

            {/* SIDEBAR (Lista de contactos) */}
            <aside className={`flex flex-col border-r border-slate-700 bg-[#111b21] md:w-[350px] lg:w-[400px] shrink-0 ${!showSidebarMobile ? 'hidden md:flex' : 'w-full'}`}>
                {/* Header del Sidebar */}
                <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-700 bg-[#202c33] px-4 shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 shadow-lg text-white">
                            <Users size={20} />
                        </div>
                        <h2 className="font-bold text-slate-100 uppercase tracking-wider text-sm flex gap-2 items-center">
                            Mis Clientes
                        </h2>
                    </div>
                </header>

                {/* Buscador */}
                <div className="border-b border-slate-700 bg-[#111b21] p-3">
                    <div className="relative flex items-center h-10 w-full overflow-hidden rounded-lg bg-[#202c33] px-3 focus-within:ring-1 focus-within:ring-cyan-500 transition-all border border-slate-600">
                        <Search size={18} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ml-3 h-full w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Lista */}
                <div className="flex-1 overflow-y-auto scrollbar-hide py-2">
                    {fetchingList ? (
                        <div className="mt-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 size={24} className="animate-spin text-cyan-500" />
                            <span className="text-sm">Buscando clientes...</span>
                        </div>
                    ) : filteredClients.length === 0 ? (
                        <div className="mt-10 px-6 text-center text-sm text-slate-500 italic">
                            No se encontraron clientes activos.
                        </div>
                    ) : (
                        filteredClients.map((client) => {
                            const isSelected = selectedClient?.clientId === client.clientId;
                            const init = client.name ? client.name.charAt(0).toUpperCase() : 'C';

                            return (
                                <button
                                    key={client.clientId}
                                    onClick={() => handleSelectClient(client)}
                                    className={`flex w-full items-center gap-4 px-4 py-3 transition-colors hover:bg-[#202c33] text-left border-b border-slate-800/50 ${isSelected ? 'bg-[#2a3942]' : ''}`}
                                >
                                    <div className="relative shrink-0">
                                        <div
                                            className="flex h-12 w-12 items-center justify-center rounded-full text-white font-bold text-lg shadow-sm"
                                            style={{ backgroundColor: client.color }}
                                        >
                                            {init}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0 border-b-0">
                                        <div className="flex items-center justify-between">
                                            <span className="font-semibold text-slate-100 truncate pr-2 text-base">{client.name}</span>
                                        </div>
                                        <div className="mt-0.5 text-xs text-slate-400 truncate">
                                            Toca para ver el chat
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* CHAT MAIN WINDOW */}
            {!selectedClient ? (
                <div className={`min-h-0 flex-1 flex-col items-center justify-center bg-[#222e35] ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                    <div className="text-center align-middle justify-center flex flex-col items-center animate-fade-in">
                        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center shadow-inner mb-6">
                            <MessageCircle size={40} className="text-slate-400" />
                        </div>
                        <h1 className="mt-2 text-2xl font-light text-slate-200 uppercase tracking-widest px-4">
                            FitData Messages
                        </h1>
                        <p className="mt-4 text-sm text-slate-400 max-w-[300px] leading-relaxed">
                            Selecciona un cliente temporal en tu lista vinculada de la izquierda para comenzar a enviar planes, rutinas o platicar.
                        </p>
                    </div>
                </div>
            ) : (
                <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center bg-[#0b141a]">
                            <Loader2 size={30} className="animate-spin text-cyan-500" />
                        </div>
                    ) : (
                        <ChatWindow
                            chatId={activeChatId}
                            currentUserId={currentUser?.uid}
                            title={selectedClient.name}
                            subtitle="Modo en tiempo real cifrado"
                            onBack={handleBack}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default function ProfessionalMessagesView({ role }) {
    return (
        <ChatProvider>
            <MessagesBody role={role} />
        </ChatProvider>
    );
}
