import React, { useState, useEffect } from 'react';
import { db } from './firebaseConfig'; // Tu archivo de inicialización de Firebase
import {
    collection,
    addDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp,
    doc,
    setDoc
} from "firebase/firestore";

const FeedbackClie = ({ currentUserUid, targetUserUid }) => {
    const [nuevoMensaje, setNuevoMensaje] = useState("");
    const [mensajes, setMensajes] = useState([]);

    const chatId = [currentUserUid, targetUserUid].sort().join("_");

    useEffect(() => {
        const mensajesRef = collection(db, "chats", chatId, "mensajes");
        const q = query(mensajesRef, orderBy("fecha", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const docs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMensajes(docs);
        });

        return () => unsubscribe();
    }, [chatId]);

    const enviarMensaje = async (e) => {
        e.preventDefault();
        if (nuevoMensaje.trim() === "") return;

        try {
            const chatRef = doc(db, "chats", chatId);
            await setDoc(chatRef, {
                participantes: [currentUserUid, targetUserUid],
                ultimoMensaje: nuevoMensaje,
                actualizadoEn: serverTimestamp()
            }, { merge: true });

            const mensajesRef = collection(db, "chats", chatId, "mensajes");
            await addDoc(mensajesRef, {
                texto: nuevoMensaje,
                remitenteUid: currentUserUid,
                fecha: serverTimestamp(),
                leido: false
            });

            const notificacionId = `${targetUserUid}_${chatId}`;
            const notifRef = doc(db, "notificaciones", notificacionId);

            await setDoc(notifRef, {
                destinatarioUid: targetUserUid,
                remitenteUid: currentUserUid,
                tipo: "mensaje_nuevo",
                mensajePreview: nuevoMensaje,
                fecha: serverTimestamp(),
                leida: false
            }, { merge: true });

            setNuevoMensaje("");
        } catch (error) {
            console.error("Error al enviar el mensaje:", error);
        }
    };

    return (
        <div className="chat-container">
            <div className="mensajes-list">
                {mensajes.map((m) => (
                    <div
                        key={m.id}

                        className={m.remitenteUid === currentUserUid ? "mensaje-mio" : "mensaje-otro"}
                        style={{ textAlign: m.remitenteUid === currentUserUid ? "right" : "left" }}
                    >
                        <p>{m.texto}</p>
                    </div>
                ))}
            </div>
            <form onSubmit={enviarMensaje} style={{ display: "flex", marginTop: "10px" }}>
                <input
                    style={{ flexGrow: 1 }}
                    value={nuevoMensaje}
                    onChange={(e) => setNuevoMensaje(e.target.value)}
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit">Enviar</button>
            </form>
        </div>
    );
};

export default FeedbackClie;