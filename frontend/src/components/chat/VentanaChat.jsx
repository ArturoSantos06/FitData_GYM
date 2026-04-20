import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import ListaMensajes from './ListaMensajes';
import EntradaMensaje from './EntradaMensaje';
import { ChevronLeft, MoreVertical, Phone, Video } from 'lucide-react';

function VentanaChat({ chatId, currentUserId, title, subtitle = "En línea", onBack }) {
    const [messages, setMessages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!chatId) return;

        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            })).reverse();

            setMessages(msgs);

            msgs.forEach(msg => {
                if (msg.senderId !== currentUserId && !msg.read) {
                    const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                    updateDoc(msgRef, { read: true }).catch(err => console.error("Error setting read status", err));
                }
            });
        }, (err) => {
            console.error("Error fetch messages real-time:", err);
        });

        return () => unsubscribe();
    }, [chatId, currentUserId]);

    const handleSendMessage = async (text, file, fileType) => {
        setIsUploading(true);
        try {
            let fileUrl = null;

            if (file) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const storageRef = ref(storage, `chat_attachments/${chatId}/${fileName}`);

                const uploadTask = await uploadBytesResumable(storageRef, file);
                fileUrl = await getDownloadURL(uploadTask.ref);
            }

            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: text.trim(),
                senderId: currentUserId,
                timestamp: serverTimestamp(),
                read: false,
                ...(fileUrl && { fileUrl, fileType })
            });

        } catch (error) {
            console.error("Error al mandar mensaje:", error);
            alert("No se pudo enviar el mensaje.");
        } finally {
            setIsUploading(false);
        }
    };

    const init = title ? title.charAt(0).toUpperCase() : 'U';

    return (
        <div className="flex flex-col h-full bg-[#0b141a] animate-fade-in w-full">
            <header className="border-b border-slate-700/80 bg-[#202c33] px-3 md:px-5 py-3 shrink-0 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-3 md:gap-4">
                    {onBack && (
                        <button onClick={onBack} className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-full transition-colors">
                            <ChevronLeft size={24} />
                        </button>
                    )}
                    <div className="relative">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-linear-to-tr from-cyan-600 to-cyan-400 text-white font-bold text-lg shadow-md">
                            {init}
                        </div>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#202c33]"></div>
                    </div>
                    <div>
                        <p className="text-[15px] font-semibold text-slate-100">{title || 'Cargando...'}</p>
                        <p className="text-xs text-cyan-400 font-medium">{subtitle}</p>
                    </div>
                </div>
            </header>

            {/* Lista de Mensajes */}
            <ListaMensajes messages={messages} currentUserId={currentUserId} />

            <div className="shrink-0 relative z-20">
                <EntradaMensaje onSendMessage={handleSendMessage} isUploading={isUploading} />
            </div>
        </div>
    );
}

export default VentanaChat;
