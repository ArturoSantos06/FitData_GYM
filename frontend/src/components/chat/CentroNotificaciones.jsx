import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Bell, CheckCheck } from 'lucide-react';
import { db } from '../../firebase/config';

function CentroNotificaciones({ userId }) {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!userId) return;

        const q = query(
            collection(db, `users/${userId}/notifications`),
            orderBy('createdAt', 'desc')
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setNotifications(snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })));
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const markAsRead = async (notifId) => {
        const ref = doc(db, `users/${userId}/notifications`, notifId);
        await updateDoc(ref, { read: true }).catch(console.error);
        setIsOpen(false);
    };

    const markAllAsRead = async () => {
        const unreads = notifications.filter(n => !n.read);
        for (const n of unreads) {
            markAsRead(n.id);
        }
    };

    return (
        <div className="relative z-50 flex items-center justify-center h-full" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2.5 text-slate-300 hover:text-white rounded-full transition-all duration-200 ${isOpen ? 'bg-slate-700/80 shadow-inner text-cyan-400' : 'hover:bg-slate-700/50 hover:scale-105'}`}
                aria-label="Notificaciones"
            >
                <Bell size={20} className={unreadCount > 0 ? 'animate-wiggle' : ''} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-bold shadow-sm shadow-red-500/50">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 top-14 w-80 sm:w-96 bg-[#1f2c33]/95 backdrop-blur-xl border border-slate-700/80 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.8)] rounded-2xl overflow-hidden animate-fade-in origin-top-right z-50">
                    <div className="p-3.5 border-b border-slate-700/60 bg-linear-to-r from-[#202c33] to-[#1f2c33] flex items-center justify-between">
                        <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                            Notificaciones
                            {unreadCount > 0 && <span className="bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full text-xs">{unreadCount} nuevas</span>}
                        </h3>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors bg-cyan-500/10 hover:bg-cyan-500/20 px-2 py-1 rounded-lg">
                                <CheckCheck size={14} /> Leer todas
                            </button>
                        )}
                    </div>

                    <div className="max-h-[350px] overflow-y-auto scrollbar-hide py-1">
                        {notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                                <div className="bg-slate-800/50 p-4 rounded-full mb-3 text-slate-500">
                                    <Bell size={32} />
                                </div>
                                <p className="text-slate-300 font-medium">Todo está tranquilo</p>
                                <p className="text-slate-500 text-xs mt-1">No tienes notificaciones pendientes.</p>
                            </div>
                        ) : (
                            notifications.map(n => (
                                <div
                                    key={n.id}
                                    onClick={() => markAsRead(n.id)}
                                    className={`p-3.5 border-b border-slate-700/30 cursor-pointer transition-all hover:bg-slate-800 flex items-start gap-4 ${n.read ? 'bg-transparent opacity-60' : 'bg-slate-800/40 relative'}`}
                                >
                                    {!n.read && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-cyan-500 rounded-r-md"></div>}

                                    <div className={`mt-0.5 flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${n.read ? 'bg-slate-800 text-slate-400' : 'bg-linear-to-tr from-cyan-600 to-cyan-400 text-white shadow-lg shadow-cyan-500/20'}`}>
                                        <Bell size={18} />
                                    </div>
                                    <div className="flex-1 min-w-0 pr-2">
                                        <p className={`text-[14px] ${n.read ? 'text-slate-400 font-medium' : 'text-slate-100 font-semibold'} truncate`}>{n.title}</p>
                                        <p className={`text-xs ${n.read ? 'text-slate-500' : 'text-slate-300'} truncate mt-0.5`}>{n.body}</p>
                                        <p className="text-[10px] text-slate-500 mt-1.5 font-medium tracking-wide">
                                            {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Justo ahora'}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CentroNotificaciones;
