import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs
} from 'firebase/firestore';

import { useAssistant } from '../asistente/ContextoAsistente';
import { auth, db } from '../../firebase/config';
import { generarRutinaIA, suscribirHistorialRutinaIA } from '../../backend/servicioRutinasIA';
import { suscribirCatalogoMaquinas } from '../../backend/mantenimiento';
import SoporteWhatsAppPanel from './SoporteWhatsAppPanel';
import {
    GOAL_OPTIONS,
    LEVEL_OPTIONS,
    isGreetingOnlyMessage,
    isRoutineRelatedMessage,
    normalizeChatText,
    normalizeDurationToMinutes,
    sanitizeDaysPerWeekInput,
} from '../../backend/SoporteWhatsAppHelpers';

function SoporteWhatsApp() {
    const { ask, quickQuestions } = useAssistant();

    const [activeChat, setActiveChat] = useState('ia');
    const [EntradaMensaje, setEntradaMensaje] = useState('');

    const [supportMessages, setSupportMessages] = useState([
        {
            id: 'support_welcome',
            role: 'assistant',
            text: 'Hola, soy Ayuda FitData. Te puedo responder dudas sobre horarios, ubicacion y reglamento. Tambien puedo ayudarte a reportar una maquina descompuesta.',
            createdAt: Date.now(),
        },
    ]);
    const [maintenanceMessages, setMaintenanceMessages] = useState([
        {
            id: 'maintenance_welcome',
            role: 'assistant',
            text: 'Hola. Este es el apartado de Mensajes para reportar maquinas echadas a perder. Puedes abrir el formulario y enviar foto de evidencia.',
            createdAt: Date.now(),
        },
    ]);
    const [catalogoMaquinas, setCatalogoMaquinas] = useState([]);
    const [catalogoError, setCatalogoError] = useState('');

    const [aiSettings, setAiSettings] = useState({
        goal: 'recomposition',
        level: 'beginner',
        daysPerWeek: '4',
        sessionLength: '',
        equipment: 'gimnasio completo',
    });
    const [aiHistory, setAiHistory] = useState([]);
    const [localAiMessages, setLocalAiMessages] = useState([]);
    const [aiHistoryLoading, setAiHistoryLoading] = useState(true);
    const [aiHistoryError, setAiHistoryError] = useState('');
    const [aiSendError, setAiSendError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [pendingAiPrompt, setPendingAiPrompt] = useState('');

    const chatBodyRef = useRef(null);

    const [currentUser, setCurrentUser] = useState(null);
    const [trainerId, setTrainerId] = useState(null);
    const [trainerName, setTrainerName] = useState('Entrenador Asignado');
    const [nutritionistId, setNutritionistId] = useState(null);
    const [nutritionistName, setNutritionistName] = useState('Nutriólogo Asignado');
    const [showSidebarMobile, setShowSidebarMobile] = useState(true);

    const getUnifiedChatId = (uid1, uid2) => {
        if (!uid1 || !uid2) return null;
        return [uid1, uid2].sort().join('_');
    };

    useEffect(() => {
        let unsubscribeHistory = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);
            if (unsubscribeHistory) {
                unsubscribeHistory();
                unsubscribeHistory = null;
            }

            if (!user) {
                setAiHistory([]);
                setAiHistoryError('');
                setAiHistoryLoading(false);
                return;
            }

            setAiHistoryLoading(true);
            unsubscribeHistory = suscribirHistorialRutinaIA(
                user.uid,
                (entries) => {
                    setAiHistory(entries);
                    setAiHistoryError('');
                    setAiHistoryLoading(false);
                },
                (error) => {
                    setAiHistoryError(error?.message || 'No se pudo cargar el historial de IA.');
                    setAiHistoryLoading(false);
                }
            );
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeHistory) {
                unsubscribeHistory();
            }
        };
    }, []);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchAssignments = async () => {
            try {
                const nutriQuery = query(
                    collection(db, 'client_nutritionist_assignments'),
                    where('clientId', '==', currentUser.uid)
                );
                const nutriSnap = await getDocs(nutriQuery);

                if (!nutriSnap.empty) {
                    const nutriData = nutriSnap.docs[0].data();

                    const nId = nutriData.nutritionistId;

                    const userDoc = await getDoc(doc(db, 'users', nId));
                    if (userDoc.exists()) {
                        setNutritionistName(userDoc.data().displayName);
                        setNutritionistId(nId);
                    } else {
                        console.error("ALERTA: El ID del nutriólogo no existe en la colección 'users'");
                    }
                }
            } catch (error) {
                console.error('Error en auditoría:', error);
            }
        };

        fetchAssignments();
    }, [currentUser]);

    useEffect(() => {
        if (!currentUser?.uid) return;

        const fetchAssignments = async () => {
            try {
                const trainerQuery = query(
                    collection(db, 'client_trainer_assignments'),
                    where('clientId', '==', currentUser.uid)
                );
                const trainerSnap = await getDocs(trainerQuery);

                if (!trainerSnap.empty) {
                    const trainerData = trainerSnap.docs[0].data();

                    const tId = trainerData.trainerId;

                    const userDoc = await getDoc(doc(db, 'users', tId));
                    if (userDoc.exists()) {
                        setTrainerName(userDoc.data().displayName);
                        setTrainerId(tId);
                    } else {
                        console.error("ALERTA: El ID del entrenador no existe en la colección 'users'");
                    }
                }
            } catch (error) {
                console.error('Error en auditoría:', error);
            }
        };

        fetchAssignments();
    }, [currentUser]);

    useEffect(() => {
        const unsubscribeCatalogo = suscribirCatalogoMaquinas(
            (maquinas) => {
                setCatalogoMaquinas(maquinas);
                setCatalogoError('');
            },
            (error) => {
                const message = String(error?.message || 'No se pudo cargar el catalogo de maquinas.');
                if (/permisos suficientes|permission|insufficient/i.test(message)) {
                    setCatalogoError('No tienes acceso al catalogo de mantenimiento con esta cuenta.');
                    return;
                }
                setCatalogoError(message);
            }
        );

        return () => unsubscribeCatalogo?.();
    }, []);

    useEffect(() => {
        setEntradaMensaje('');
    }, [activeChat]);

    const supportPreview = supportMessages[supportMessages.length - 1]?.text || 'Sin mensajes';
    const maintenancePreview = maintenanceMessages[maintenanceMessages.length - 1]?.text || 'Reporta una maquina con foto.';
    const aiPreview = aiHistory[0]?.requestSummary || 'Describe tu objetivo para generar una rutina.';

    const aiMessages = useMemo(() => {
        const historyById = new Map(
            aiHistory
                .filter((entry) => entry?.id)
                .map((entry) => [entry.id, entry])
        );
        const formatted = [];

        aiHistory
            .slice()
            .reverse()
            .forEach((entry) => {
                if (entry?.requestSummary) {
                    formatted.push({
                        id: `req_${entry.id}`,
                        role: 'user',
                        text: entry.requestSummary,
                        createdAt: entry.createdAt,
                    });
                }

                if (entry?.routineText) {
                    formatted.push({
                        id: `res_${entry.id}`,
                        role: 'assistant',
                        text: entry.routineText,
                        createdAt: entry.createdAt,
                    });
                }
            });

        const pendingLocal = localAiMessages.filter((message) => {
            if (!message?.historyId) return true;

            const historyEntry = historyById.get(message.historyId);
            if (!historyEntry) return true;

            const hasSummary = Boolean(String(historyEntry?.requestSummary || '').trim());
            const hasRoutine = Boolean(String(historyEntry?.routineText || '').trim());

            if (message.role === 'user') {
                return !hasSummary;
            }

            if (message.role === 'assistant') {
                return !hasRoutine;
            }

            return !(hasSummary || hasRoutine);
        });
        formatted.push(...pendingLocal);

        if (pendingAiPrompt) {
            formatted.push({
                id: 'pending_user_prompt',
                role: 'user',
                text: pendingAiPrompt,
                createdAt: Date.now(),
            });
            formatted.push({
                id: 'pending_assistant_response',
                role: 'assistant',
                text: 'Estoy armando tu rutina personalizada...',
                createdAt: Date.now(),
                pending: true,
            });
        }

        return formatted;
    }, [aiHistory, localAiMessages, pendingAiPrompt]);

    const displayedMessages = activeChat === 'ia'
        ? aiMessages
        : activeChat === 'mantenimiento'
            ? maintenanceMessages
            : supportMessages;

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [displayedMessages, activeChat]);

    const handleSupportQuickQuestion = (question) => {
        const answer = ask(question);
        setSupportMessages((prev) => [
            ...prev,
            { id: `su_${Date.now()}`, role: 'user', text: question, createdAt: Date.now() },
            { id: `sa_${Date.now()}_${Math.random()}`, role: 'assistant', text: answer, createdAt: Date.now() },
        ]);
    };

    const handleOpenMaintenanceReport = () => {
        setActiveChat('mantenimiento');
        setMaintenanceMessages((prev) => [
            ...prev,
            {
                id: `sa_report_open_${Date.now()}_${Math.random()}`,
                role: 'assistant',
                text: 'Claro. Llena el formulario de abajo para reportar la maquina descompuesta y enviar evidencia.',
                createdAt: Date.now(),
            },
        ]);
    };

    const handleReportCreated = ({ maquinaNombre, descripcion }) => {
        const createdAt = Date.now();
        const nombreVisible = String(maquinaNombre || '').trim() || 'Sin maquina seleccionada';
        setMaintenanceMessages((prev) => [
            ...prev,
            {
                id: `su_report_${createdAt}_${Math.random()}`,
                role: 'user',
                text: `Reporte de maquina: ${nombreVisible}\nDetalle: ${descripcion}`,
                createdAt,
            },
            {
                id: `sa_report_ok_${createdAt}_${Math.random()}`,
                role: 'assistant',
                text: 'Listo, tu reporte fue enviado al panel de mantenimiento. Gracias por avisar.',
                createdAt,
            },
        ]);
    };

    const handleSend = async (event) => {
        event.preventDefault();
        const text = EntradaMensaje.trim();
        if (!text) {
            return;
        }

        setEntradaMensaje('');

        if (activeChat === 'ia' && isGreetingOnlyMessage(text)) {
            const createdAt = Date.now();
            setAiSendError('');
            setPendingAiPrompt('');
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: 'Hola. Para generarte una rutina necesito tu objetivo, nivel y cuántos días entrenas. Por ejemplo: "quiero perder grasa, soy principiante y entreno 4 días".',
                    createdAt,
                },
            ]);
            return;
        }

        if (activeChat === 'ia' && !isRoutineRelatedMessage(text)) {
            const createdAt = Date.now();
            setAiSendError('');
            setPendingAiPrompt('');
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: 'No tengo una función para eso. Solo puedo generar rutinas de entrenamiento. Escribe tu objetivo, nivel o grupo muscular, por ejemplo: "quiero perder grasa, soy principiante y entreno 4 días".',
                    createdAt,
                },
            ]);
            return;
        }

        if (activeChat === 'soporte') {
            const normalized = normalizeChatText(text);
            if ((normalized.includes('report') || normalized.includes('descomp')) && normalized.includes('maquina')) {
                handleOpenMaintenanceReport();
                return;
            }
            handleSupportQuickQuestion(text);
            return;
        }

        if (activeChat === 'mantenimiento') {
            handleOpenMaintenanceReport();
            return;
        }

        setIsGenerating(true);
        setAiSendError('');
        setPendingAiPrompt(text);

        try {
            const goalLabel = GOAL_OPTIONS.find((item) => item.value === aiSettings.goal)?.label || aiSettings.goal;
            const levelLabel = LEVEL_OPTIONS.find((item) => item.value === aiSettings.level)?.label || aiSettings.level;
            const safeDaysPerWeek = sanitizeDaysPerWeekInput(aiSettings.daysPerWeek);
            const safeSessionLength = normalizeDurationToMinutes(aiSettings.sessionLength);
            const conversationContext = aiMessages
                .slice(-4)
                .map((message) => `${message.role === 'user' ? 'Usuario' : 'Asistente'}: ${String(message.text || '').trim()}`)
                .join('\n')
                .trim();

            const response = await generarRutinaIA({
                ...aiSettings,
                daysPerWeek: safeDaysPerWeek,
                sessionLength: safeSessionLength,
                limitations: '',
                preferences: text,
                extraNotes: text,
                customRequest: text,
                conversationContext,
                goalLabel,
                levelLabel,
                messageIntent: 'routine_request',
            });

            const createdAt = Date.now();
            const historyId = response?.historyEntry?.id || null;
            const routineText = String(response?.routineText || '').trim();
            const linkedHistoryId = routineText ? historyId : null;

            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                    historyId: linkedHistoryId,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: routineText || 'No se pudo leer la respuesta de la IA.',
                    createdAt,
                    historyId: linkedHistoryId,
                },
            ]);

            setPendingAiPrompt('');
        } catch (error) {
            const createdAt = Date.now();
            const safeErrorMessage = error?.message || 'No se pudo generar la rutina con IA.';
            setAiSendError(safeErrorMessage);
            setLocalAiMessages((prev) => [
                ...prev,
                {
                    id: `local_u_${createdAt}_${Math.random()}`,
                    role: 'user',
                    text,
                    createdAt,
                },
                {
                    id: `local_a_${createdAt}_${Math.random()}`,
                    role: 'assistant',
                    text: `No pude generar tu rutina en este intento. ${safeErrorMessage}`,
                    createdAt,
                },
            ]);
            setPendingAiPrompt('');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <SoporteWhatsAppPanel
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            showSidebarMobile={showSidebarMobile}
            setShowSidebarMobile={setShowSidebarMobile}
            currentUser={currentUser}
            trainerId={trainerId}
            trainerName={trainerName}
            nutritionistId={nutritionistId}
            nutritionistName={nutritionistName}
            aiPreview={aiPreview}
            supportPreview={supportPreview}
            maintenancePreview={maintenancePreview}
            getUnifiedChatId={getUnifiedChatId}
            aiSettings={aiSettings}
            setAiSettings={setAiSettings}
            chatBodyRef={chatBodyRef}
            aiHistoryLoading={aiHistoryLoading}
            aiMessages={aiMessages}
            displayedMessages={displayedMessages}
            quickQuestions={quickQuestions}
            handleSupportQuickQuestion={handleSupportQuickQuestion}
            catalogoError={catalogoError}
            aiHistoryError={aiHistoryError}
            aiSendError={aiSendError}
            catalogoMaquinas={catalogoMaquinas}
            handleReportCreated={handleReportCreated}
            handleSend={handleSend}
            EntradaMensaje={EntradaMensaje}
            setEntradaMensaje={setEntradaMensaje}
            isGenerating={isGenerating}
        />
    );
}

export default SoporteWhatsApp;
