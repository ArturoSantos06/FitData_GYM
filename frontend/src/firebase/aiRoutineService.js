import { httpsCallable } from 'firebase/functions';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db, functions } from './config';

function mapCallableError(error) {
    const code = String(error?.code || '').toLowerCase();
    const message = String(error?.message || '').trim();

    if (code.includes('unauthenticated')) {
        return new Error('Tu sesión expiró. Cierra sesión e inicia sesión nuevamente.');
    }

    if (code.includes('permission-denied')) {
        return new Error('No tienes permisos para generar la rutina.');
    }

    if (code.includes('not-found')) {
        return new Error('La función de IA no está disponible todavía en Firebase.');
    }

    if (code.includes('internal') || message.toLowerCase() === 'internal') {
        return new Error('El servidor de rutinas respondió con error interno. Normalmente se corrige al desplegar Functions y verificar GEMINI_API_KEY.');
    }

    if (message) {
        return new Error(message);
    }

    return new Error('No se pudo generar la rutina con IA.');
}

export function buildRoutinePrompt(payload) {
    return [
        'Eres un entrenador personal experto en rutinas de gimnasio.',
        'Genera una rutina segura, clara y personalizada en español.',
        'Responde con un formato estructurado que incluya objetivo, frecuencia semanal, calentamiento, rutina por día, ejercicios concretos, series, repeticiones, descanso, recomendaciones de técnica y advertencias de seguridad.',
        'Para cada día, lista entre 4 y 6 ejercicios exactos con nombres claros; no uses placeholders como "ejercicio principal" o "trabajo de piernas".',
        'Incluye el orden recomendado de los ejercicios y marca sustitutos cuando aplique.',
        'Si faltan datos, asume opciones conservadoras y explícitalo.',
        '',
        `Objetivo del cliente: ${payload.goalLabel || payload.goal || 'no especificado'}.`,
        `Nivel: ${payload.levelLabel || payload.level || 'no especificado'}.`,
        `Días por semana: ${payload.daysPerWeek || 'no especificado'}.`,
        `Duración de sesión: ${payload.sessionLength || 'no especificado'} minutos.`,
        `Equipo disponible: ${payload.equipment || 'no especificado'}.`,
        `Limitaciones o lesiones: ${payload.limitations || 'ninguna especificada'}.`,
        `Preferencias: ${payload.preferences || 'no especificadas'}.`,
        `Información adicional: ${payload.extraNotes || 'sin notas adicionales'}.`,
    ].join('\n');
}

export async function generateAiRoutine(payload) {
    const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
    const user = auth.currentUser;

    if (projectId && user) {
        const idToken = await user.getIdToken(true);
        const httpUrl = `https://us-east1-${projectId}.cloudfunctions.net/generateClientAiRoutineHttp`;

        try {
            const httpResponse = await fetch(httpUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify(payload || {}),
            });

            const data = await httpResponse.json().catch(() => ({}));
            if (httpResponse.ok) {
                return data;
            }

            if (String(data?.error || '').toLowerCase().includes('unauthenticated')) {
                throw new Error('Tu sesión expiró. Cierra sesión e inicia sesión nuevamente.');
            }

            throw new Error(data?.message || data?.error || 'No se pudo generar la rutina con IA.');
        } catch (httpError) {
            // Si el HTTP falla por red o despliegue, intentamos la callable como respaldo.
        }
    }

    const callableInstances = [
        httpsCallable(functions, 'generateClientAiRoutine'),
    ];

    let lastError = null;

    for (const callable of callableInstances) {
        try {
            const response = await callable(payload);
            return response.data;
        } catch (firstError) {
            lastError = firstError;

            if (user) {
                try {
                    await user.getIdToken(true);
                    const retryResponse = await callable(payload);
                    return retryResponse.data;
                } catch (retryError) {
                    lastError = retryError;
                }
            }
        }
    }

    throw mapCallableError(lastError);
}

export function subscribeAiRoutineHistory(uid, onNext, onError) {
    const safeUid = String(uid || '').trim();
    if (!safeUid || typeof onNext !== 'function') {
        return () => { };
    }

    const historyQuery = query(
        collection(db, 'users', safeUid, 'aiRoutineHistory'),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    return onSnapshot(
        historyQuery,
        (snapshot) => {
            const history = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            onNext(history);
        },
        (error) => {
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );
}

export function getCurrentAuthUid() {
    return String(auth.currentUser?.uid || '').trim();
}
