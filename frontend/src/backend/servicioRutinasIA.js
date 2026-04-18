import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';

import { auth, db } from '../firebase/config';

export function construirPromptRutina(payload) {
    const solicitudPersonalizada = String(payload.customRequest || payload.requestText || payload.extraNotes || payload.preferences || '').trim();

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
        `Solicitud libre del usuario: ${solicitudPersonalizada || 'sin solicitud adicional'}.`,
        `Objetivo del cliente: ${payload.goalLabel || payload.goal || 'no especificado'}.`,
        `Nivel: ${payload.levelLabel || payload.level || 'no especificado'}.`,
        `Equipo disponible: ${payload.equipment || 'no especificado'}.`,
        `Limitaciones o lesiones: ${payload.limitations || 'ninguna especificada'}.`,
    ].join('\n');
}

export async function generarRutinaIA(payload) {
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

export function suscribirHistorialRutinaIA(uid, onNext, onError) {
    const safeUid = String(uid || '').trim();
    if (!safeUid || typeof onNext !== 'function') {
        return () => { };
    }

    const consultaHistorial = query(
        collection(db, 'users', safeUid, 'aiRoutineHistory'),
        orderBy('createdAt', 'desc'),
        limit(20)
    );

    return onSnapshot(
        consultaHistorial,
        (snapshot) => {
            const historial = snapshot.docs.map((docSnap) => ({
                id: docSnap.id,
                ...docSnap.data(),
            }));
            onNext(historial);
        },
        (error) => {
            if (typeof onError === 'function') {
                onError(error);
            }
        }
    );
}

export function obtenerUidAuthActual() {
    return String(auth.currentUser?.uid || '').trim();
}
