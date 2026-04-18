import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import ListaMensajes from './ListaMensajes';
import EntradaMensaje from './EntradaMensaje';
import { ChevronLeft, MoreVertical, Phone, Video } from 'lucide-react';

/**
 * VentanaChat
 * Componente principal para el chat en tiempo real.
 * @param {string} chatId - ID del chat (es decir: userId_trainerId)
 * @param {string} currentUserId - ID del usuario actual mandando
 * @param {string} title - Titulo a mostrar en el header
 * @param {string} subtitle - Subtitulo
 * @param {function} onBack - Funcion para regresar o cerrar (mobile)
 */
function VentanaChat({ chatId, currentUserId, title, subtitle = "En línea", onBack }) {
    const [messages, setMessages] = useState([]);
    const [isUploading, setIsUploading] = useState(false);

    // Bloque de efecto que corre cada que el componente se monta o cambia el chatId
    useEffect(() => {
        // En caso de que no haya chat seleccionado (ej. inicio de carga), evita la consulta.
        if (!chatId) return;

        // Construir la "query" a Firestore.
        // Apunta a la subcolección 'messages' dentro del chat específico, 
        // ordena por fecha (descendente) y limita a 50 para evitar consumo excesivo y cargar rápido.
        const q = query(
            collection(db, 'chats', chatId, 'messages'),
            orderBy('timestamp', 'desc'),
            limit(50)
        );

        // Suscripción en tiempo real: onSnapshot se disparará en cada cambio en la DB
        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Transformar el payload de Firestone en un Array de objetos JS limpio y manipularlo
            const msgs = snapshot.docs.map(docSnap => ({
                id: docSnap.id, // ID autogenerado del documento de mensaje
                ...docSnap.data() // data del msj: texto, remitente, read status, urlarchivo
            })).reverse(); // Reverse se necesita aquí porque en chat queremos ver msjs cronológicos, y trajimos DESC.

            setMessages(msgs); // Actualizar el estado para re-renderizar UI

            // Lógica de "Lectura Inteligente": Marca mensajes como leídos
            // si el senderId NO es el mío, y la bandera readonly dice que está en "false".
            msgs.forEach(msg => {
                if (msg.senderId !== currentUserId && !msg.read) {
                    const msgRef = doc(db, 'chats', chatId, 'messages', msg.id);
                    // Update asíncrono para no bloquear la app
                    updateDoc(msgRef, { read: true }).catch(err => console.error("Error setting read status", err));
                }
            });
        }, (err) => {
            // Manejo de errores por ejemplo, si no hay permisos de rules de Firestore
            console.error("Error fetch messages real-time:", err);
        });

        // "Cleanup function": Se asegura de cancelar la suscripción si cerramos el componente (evita leaks de memoria)
        return () => unsubscribe();
    }, [chatId, currentUserId]);

    // Función principal accionada por el botón Enviar (o la tecla Enter en EntradaMensaje).
    // Recibe el texto escrito, un archivo físico Object tipo (File) y un string definitorio.
    const handleSendMessage = async (text, file, fileType) => {
        setIsUploading(true); // Bloquea el botón
        try {
            let fileUrl = null;

            // FASE 1: Subir multimedia (si existe).
            // El proceso solo avanza a FireStore si termina esto con éxito.
            if (file) {
               // Generar nombre de archivo random pero ordenado: 171295X_xyz.png
               const fileExt = file.name.split('.').pop();
               const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
               
               // Asignar Reference route en Firebase Storage de forma organizada (por chatId)
               const storageRef = ref(storage, `chat_attachments/${chatId}/${fileName}`);
               
               // Subir archivo al bucket
               const uploadTask = await uploadBytesResumable(storageRef, file);
               // Rescatar el String de acceso permanente para guardar en la base de datos de los MSJs
               fileUrl = await getDownloadURL(uploadTask.ref);
            }

            // FASE 2: Empaquetar y guardar el registro a Firestore
            // El trigger 'onMessageCreated' de Cloud Functions está escuchando esto para mandar correos
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text: text.trim(),
                senderId: currentUserId,
                timestamp: serverTimestamp(), // Fecha segura generada desde Backend
                read: false, // Default no leido
                ...(fileUrl && { fileUrl, fileType }) // Inyectar las vars del file solo si existen
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
            {/* Header */}
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

            {/* Listado de Mensajes */}
            <ListaMensajes messages={messages} currentUserId={currentUserId} />

            {/* Input para msj */}
            <div className="shrink-0 relative z-20">
                <EntradaMensaje onSendMessage={handleSendMessage} isUploading={isUploading} />
            </div>
        </div>
    );
}

export default VentanaChat;
