import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db } from './config';

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
    const customRequest = String(payload.customRequest || payload.requestText || payload.extraNotes || payload.preferences || '').trim();

    return [
        'Eres un entrenador personal experto en rutinas de gimnasio.',
        'Genera una rutina segura y personalizada en español.',
        'IMPORTANTE: Debes responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional antes ni después. Usa esta estructura exacta:',
        '{',
        '  "objetivo": "Resumen del objetivo",',
        '  "frecuencia": "X días a la semana",',
        '  "recomendaciones": "Recomendaciones generales y seguridad",',
        '  "dias": [',
        '    {',
        '      "titulo": "Día 1: Pierna y Glúteo",',
        '      "ejercicios": [',
        '        {',
        '          "nombre": "Sentadilla Libre",',
        '          "series": "4",',
        '          "repeticiones": "10-12",',
        '          "descanso": "90 seg"',
        '        }',
        '      ]',
        '    }',
        '  ]',
        '}',
        'Para cada día, lista entre 4 y 6 ejercicios exactos. El campo "nombre" del ejercicio debe ser claro y específico (ej. "Press de banca con mancuernas") para poder buscarlo en video.',
        '',
        `Solicitud libre del usuario: ${customRequest || 'sin solicitud adicional'}.`,
        `Objetivo del cliente: ${payload.goalLabel || payload.goal || 'no especificado'}.`,
        `Nivel: ${payload.levelLabel || payload.level || 'no especificado'}.`,
        `Equipo disponible: ${payload.equipment || 'no especificado'}.`,
        `Limitaciones o lesiones: ${payload.limitations || 'ninguna especificada'}.`,
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
            if (httpError instanceof Error && httpError.message) {
                throw httpError;
            }
            throw new Error('No se pudo conectar con el servidor de rutinas.');
        }
    }

    throw new Error('No hay sesión activa para generar la rutina.');
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
