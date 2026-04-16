import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/config';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { Loader2, Send } from 'lucide-react';

function formatFeedbackTime(value) {
    try {
        const date = value?.toDate?.() || new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function FeedbackBubble({ isUser, text, time }) {
    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 animate-fade-in`}>
            <div className={`max-w-[88%] md:max-w-[72%] rounded-xl px-3 py-2 shadow-sm ${isUser
                ? 'bg-emerald-800/80 text-emerald-50 rounded-br-sm border border-emerald-600/30'
                : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-300/60'
                }`}
            >
                <p className="whitespace-pre-wrap text-sm leading-5">{text}</p>
                <div className={`mt-1 flex items-center justify-end gap-2 text-[11px] ${isUser ? 'text-emerald-200/80' : 'text-slate-500'}`}>
                    <span>{time}</span>
                </div>
            </div>
        </div>
    );
}

export default function ComentariosComunidad({ currentUserUid, targetUserUid, placeholderText, roleType }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(true);
    const feedbackBodyRef = useRef(null);

    const chatId = [currentUserUid, targetUserUid].sort().join('_');

    useEffect(() => {
        if (!currentUserUid || !targetUserUid) return;

        const messagesRef = collection(db, 'chats', chatId, 'mensajes');
        const q = query(messagesRef, orderBy('createdAt', 'asc'));

        const unsubscribeFeedback = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
            setLoading(false);
        });

        return () => unsubscribeFeedback();
    }, [chatId, currentUserUid, targetUserUid]);

    useEffect(() => {
        if (feedbackBodyRef.current) {
            feedbackBodyRef.current.scrollTop = feedbackBodyRef.current.scrollHeight;
        }
    }, [messages]);

    const sendFeedbackMessage = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text || !currentUserUid || !targetUserUid) return;

        setInput('');

        try {
            await addDoc(collection(db, 'chats', chatId, 'mensajes'), {
                text,
                senderId: currentUserUid,
                createdAt: serverTimestamp(),
                read: false
            });

            await setDoc(doc(db, 'notificaciones', chatId), {
                lastMessage: text,
                recipientId: targetUserUid,
                senderId: currentUserUid,
                type: 'nuevo_mensaje',
                roleSource: roleType,
                updatedAt: serverTimestamp(),
                status: 'pending'
            }, { merge: true });

        } catch (error) {
            console.error("Error en ComentariosComunidad:", error);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div ref={feedbackBodyRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 md:px-6">
                {loading ? (
                    <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-cyan-500" /></div>
                ) : messages.length === 0 ? (
                    <div className="mx-auto mt-10 max-w-md rounded-xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-8 text-center text-sm text-slate-400">
                        Inicia la conversación con tu profesional asignado.
                    </div>
                ) : (
                    messages.map((msg) => (
                        <FeedbackBubble
                            key={msg.id}
                            isUser={msg.senderId === currentUserUid}
                            text={msg.text}
                            time={formatFeedbackTime(msg.createdAt)}
                        />
                    ))
                )}
            </div>

            <footer className="border-t border-slate-800 bg-[#202c33] px-3 py-3 md:px-4">
                <form onSubmit={sendFeedbackMessage} className="flex items-center gap-2">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={placeholderText}
                        className="h-11 w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 text-sm text-slate-100 outline-none focus:border-cyan-400"
                    />
                    <button type="submit" className="h-11 min-w-11 flex items-center justify-center rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 transition-colors">
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
}