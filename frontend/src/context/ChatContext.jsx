import React, { createContext, useContext, useState, useCallback } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
    const [selectedClient, setSelectedClient] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [loading, setLoading] = useState(false);

    const getUnifiedChatId = (uid1, uid2) => {
        if (!uid1 || !uid2) return null;
        return [uid1, uid2].sort().join('_');
    };

    const selectClient = useCallback((client, professionalUid) => {
        setLoading(true);

        if (!client || !professionalUid) {
            setSelectedClient(null);
            setActiveChatId(null);
            setLoading(false);
            return;
        }

        setSelectedClient(client);

        const unifiedId = getUnifiedChatId(client.clientId, professionalUid);
        setActiveChatId(unifiedId);

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