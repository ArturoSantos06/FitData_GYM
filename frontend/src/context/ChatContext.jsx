import React, { createContext, useContext, useState, useCallback } from 'react';

// ==========================================
// ARQUITECTO DE SOFTWARE: FLUJO DEL CONTEXT API (V2 - ID UNIFICADO)
// ==========================================
// 1. ChatContext.Provider gestiona el estado de la comunicación profesional-cliente.
// 2. Lógica de Sincronización: Se implementa ordenamiento alfabético de UIDs para 
//    generar un activeChatId único, evitando duplicidad de canales en Firestore.
// 3. Este ID es el que deben usar tanto ListaMensajes (para escuchar) como EntradaMensaje (para enviar).

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [selectedClient, setSelectedClient] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [loading, setLoading] = useState(false);

    /**
     * Genera un ID de chat consistente y determinista.
     * Ordena los UIDs alfabéticamente para que el resultado sea el mismo 
     * sin importar el orden de los factores (Cliente-Pro vs Pro-Cliente).
     */
    const getUnifiedChatId = (uid1, uid2) => {
        if (!uid1 || !uid2) return null;
        return [uid1, uid2].sort().join('_');
    };

    /**
     * Selecciona al cliente actual y computa el canal de comunicación.
     * @param {Object} client - Objeto con la información del cliente (debe incluir clientId).
     * @param {string} professionalUid - UID del profesional (Nutriólogo/Entrenador) logueado.
     */
    const selectClient = useCallback((client, professionalUid) => {
        setLoading(true);

        if (!client || !professionalUid) {
            setSelectedClient(null);
            setActiveChatId(null);
            setLoading(false);
            return;
        }

        setSelectedClient(client);

        // --- LÓGICA DE SINCRONIZACIÓN ALFABÉTICA ---
        // Esto garantiza que el canal sea idéntico en el dashboard del cliente.
        const unifiedId = getUnifiedChatId(client.clientId, professionalUid);
        setActiveChatId(unifiedId);

        // Delay visual para transiciones de UI
        setTimeout(() => setLoading(false), 200);
    }, []);

    return (
        <ChatContext.Provider
            value={{
                selectedClient,
                activeChatId,
                loading,
                selectClient
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export const useChatContext = () => useContext(ChatContext);