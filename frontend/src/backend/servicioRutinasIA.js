import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

export function construirPromptRutina(payload) {
    // Combinamos las preferencias y notas extra si existen
    const notasExtra = String(payload.extraNotes || '').trim();
    const preferencias = String(payload.preferences || '').trim();
    const solicitudPersonalizada = [preferencias, notasExtra].filter(Boolean).join(' | ');

    return [
        'Eres un entrenador personal experto en rutinas de gimnasio.',
        'Genera una rutina segura y estrictamente adaptada a los parámetros del usuario.',
        'REGLA ABSOLUTA: Tu respuesta debe ser ÚNICAMENTE un objeto JSON válido. Nada de texto antes ni después (sin bloques de código markdown si es posible). Usa esta estructura exacta:',
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
        '          "descripcion": "4 series x 10-12 repeticiones. Descanso: 90 seg"',
        '        }',
        '      ]',
        '    }',
        '  ]',
        '}',
        '',
        'INSTRUCCIONES CLAVE:',
        '- Genera EXACTAMENTE la cantidad de días solicitados en "Frecuencia". Si pide 4 días, el arreglo "dias" debe tener 4 elementos.',
        '- Ajusta la cantidad de ejercicios para que la rutina dure exactamente el tiempo indicado en "Duración por sesión".',
        '- Respeta estrictamente las "Limitaciones o lesiones" (ej. si le duele la rodilla, cero impacto).',
        '- Usa solo el "Equipo disponible".',
        '',
        'PARÁMETROS DEL USUARIO:',
        `Objetivo del cliente: ${payload.goalLabel || payload.goal || 'no especificado'}.`,
        `Nivel: ${payload.levelLabel || payload.level || 'no especificado'}.`,
        `Frecuencia solicitada: ${payload.daysPerWeek || 'no especificado'} días por semana.`,
        `Duración por sesión: ${payload.sessionLength || 'no especificado'} minutos.`,
        `Equipo disponible: ${payload.equipment || 'no especificado'}.`,
        `Limitaciones o lesiones: ${payload.limitations || 'ninguna especificada'}.`,
        `Preferencias y notas: ${solicitudPersonalizada || 'sin solicitud adicional'}.`
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