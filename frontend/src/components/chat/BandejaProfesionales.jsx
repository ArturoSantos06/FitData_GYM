import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getCurrentUser } from '../../firebase';
import { ChatProvider, useChatContext } from '../../context/ChatContext';
import VentanaChat from './VentanaChat';
import { Search, Users, ChevronLeft, Loader2, MessageCircle } from 'lucide-react';

const MessagesBody = ({ role }) => {
    const { selectedClient, activeChatId, loading, selectClient } = useChatContext();
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [fetchingList, setFetchingList] = useState(true);
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);
    const currentUser = getCurrentUser();

    useEffect(() => {
        if (!currentUser?.uid) return;

        const collectionName = role === 'nutritionist'
            ? 'client_nutritionist_assignments'
            : 'client_trainer_assignments';

        const roleFieldId = role === 'nutritionist' ? 'nutritionistId' : 'trainerId';

        const fetchClients = async () => {
            try {
                const q = query(
                    collection(db, collectionName),
                    where(roleFieldId, "==", currentUser.uid)
                );

                const snap = await getDocs(q);
                const clientsData = [];

                for (const d of snap.docs) {
                    const raw = d.data().clientId;
                    const clientId = raw != null ? String(raw) : null;

                    if (!clientId || clientId === currentUser.uid) continue;

                    try {
                        let clientName = 'Cliente Sin Nombre';
                        let clientColor = '#0ea5e9';
                        let found = false;

                        const extractName = (data) => {
                            if (data.firstName || data.lastName)
                                return `${data.firstName || ''} ${data.lastName || ''}`.trim();
                            return data.displayName
                                || data.name
                                || data.fullName
                                || data.full_name
                                || (data.nombre ? `${data.nombre} ${data.apellido || ''}`.trim() : null)
                                || data.email
                                || null;
                        };

                        const userSnap = await getDoc(doc(db, 'users', clientId));
                        if (userSnap.exists()) {
                            clientName = extractName(userSnap.data()) || clientName;
                            clientColor = userSnap.data().avatarColor || clientColor;
                            found = true;
                        }

                        if (!found) {
                            const uSnap = await getDocs(query(collection(db, 'users'), where('authUid', '==', clientId)));
                            if (!uSnap.empty) {
                                clientName = extractName(uSnap.docs[0].data()) || clientName;
                                clientColor = uSnap.docs[0].data().avatarColor || clientColor;
                                found = true;
                            }
                        }

                        if (!found) {
                            const mDocSnap = await getDoc(doc(db, 'miembros', clientId));
                            if (mDocSnap.exists()) {
                                clientName = extractName(mDocSnap.data()) || clientName;
                                clientColor = mDocSnap.data().avatarColor || mDocSnap.data().avatar_color || clientColor;
                                found = true;
                            }
                        }

                        if (!found) {
                            const mSnap = await getDocs(query(collection(db, 'miembros'), where('userId', '==', clientId)));
                            if (!mSnap.empty) {
                                clientName = extractName(mSnap.docs[0].data()) || clientName;
                                clientColor = mSnap.docs[0].data().avatarColor || mSnap.docs[0].data().avatar_color || clientColor;
                                found = true;
                            }
                        }

                        if (!found && !isNaN(Number(clientId))) {
                            const mSnapNum = await getDocs(query(collection(db, 'miembros'), where('userId', '==', Number(clientId))));
                            if (!mSnapNum.empty) {
                                clientName = extractName(mSnapNum.docs[0].data()) || clientName;
                                clientColor = mSnapNum.docs[0].data().avatarColor || mSnapNum.docs[0].data().avatar_color || clientColor;
                                found = true;
                            }
                        }

                        if (found) {
                            clientsData.push({
                                clientId: clientId,
                                name: clientName,
                                color: clientColor
                            });
                        } else {
                        }
                    } catch (e) {
                        console.error("Error al obtener info del perfil de usuario", e);
                    }
                }
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
        <div className="flex w-full overflow-hidden text-slate-100 font-sans rounded-2xl border border-slate-700 shadow-2xl relative z-10 mx-auto mt-4 bg-gray-800" style={{ maxWidth: '1400px', height: 'calc(100vh - 120px)', minHeight: '500px' }}>

            {/* Barra de color superior al estilo VistaPlan */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-blue-500 via-cyan-400 to-teal-400 z-20" />

            <aside className={`flex flex-col border-r border-slate-700 bg-gray-800 md:w-[320px] lg:w-[360px] shrink-0 mt-1.5 ${!showSidebarMobile ? 'hidden md:flex' : 'w-full'}`}>
                <header className="flex h-[60px] shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900/40 px-4 shadow-sm">
                    <div>
                        <h2 className="font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300 uppercase tracking-wider text-sm">
                            Mis Clientes
                        </h2>
                        <p className="text-xs text-slate-400">Selecciona para chatear</p>
                    </div>
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <Users size={18} />
                    </div>
                </header>

                <div className="border-b border-slate-700 bg-slate-900/20 p-3">
                    <div className="relative flex items-center h-10 w-full overflow-hidden rounded-xl bg-slate-900 px-3 focus-within:ring-1 focus-within:ring-cyan-500 transition-all border border-slate-700">
                        <Search size={16} className="text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="ml-3 h-full w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-2">
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
                                    className={`w-full bg-slate-900 border rounded-xl p-4 flex items-center justify-between group transition-all duration-300 shadow-md text-left
                                        ${isSelected
                                            ? 'border-cyan-500/60 bg-cyan-500/5'
                                            : 'border-slate-700 hover:border-cyan-500/40 hover:bg-slate-800'}`}
                                >
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold text-base shadow-sm"
                                            style={{ backgroundColor: client.color }}
                                        >
                                            {init}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-slate-100 truncate text-sm">{client.name}</p>
                                            <p className="mt-0.5 text-xs text-slate-400">Toca para ver el chat</p>
                                        </div>
                                    </div>
                                    <ChevronLeft size={18} className="text-slate-500 group-hover:text-cyan-400 transition-colors rotate-180 shrink-0 ml-2" />
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {!selectedClient ? (
                <div className={`min-h-0 flex-1 flex-col items-center justify-center bg-slate-900/30 mt-1.5 ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                    <div className="text-center flex flex-col items-center animate-fade-in">
                        <div className="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center shadow-inner mb-6 border border-slate-700">
                            <MessageCircle size={36} className="text-slate-400" />
                        </div>
                        <h1 className="mt-2 text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-cyan-300 uppercase tracking-widest px-4">
                            FitData Messages
                        </h1>
                        <p className="mt-3 text-sm text-slate-400 max-w-[280px] leading-relaxed">
                            Selecciona un cliente de la lista para comenzar a enviar planes, rutinas o platicar.
                        </p>
                    </div>
                </div>
            ) : (
                <div className={`flex min-h-0 flex-1 flex-col ${showSidebarMobile ? 'hidden md:flex' : 'flex'}`}>
                    {loading ? (
                        <div className="flex-1 flex items-center justify-center bg-slate-900/30">
                            <Loader2 size={30} className="animate-spin text-cyan-500" />
                        </div>
                    ) : (
                        <VentanaChat
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

export default function BandejaProfesionales({ role }) {
    return (
        <ChatProvider>
            <MessagesBody role={role} />
        </ChatProvider>
    );
}
