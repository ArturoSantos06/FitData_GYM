const AI_ROUTINE_HISTORY_COLLECTION = "aiRoutineHistory";

const sanitizeAiRoutineText = (value = "") => String(value || "")
    .replace(/\u0000/g, "")
    .trim();

const buildAiRoutinePrompt = (payload = {}) => {
    const goalLabel = String(payload.goalLabel || payload.goal || "no especificado").trim();
    const levelLabel = String(payload.levelLabel || payload.level || "no especificado").trim();
    const daysPerWeek = String(payload.daysPerWeek || "no especificado").trim();
    const sessionLengthRaw = String(payload.sessionLength || "").trim();
    const sessionLengthLabel = sessionLengthRaw ? `${sessionLengthRaw} minutos` : "no especificada";
    const equipment = String(payload.equipment || "no especificado").trim();
    const limitations = String(payload.limitations || "ninguna especificada").trim();
    const preferences = String(payload.preferences || "no especificadas").trim();
    const extraNotes = String(payload.extraNotes || "sin notas adicionales").trim();
    const customRequest = String(payload.customRequest || payload.requestText || extraNotes || preferences || "sin solicitud adicional").trim();
    const conversationContext = String(payload.conversationContext || "").trim();

    return [
        "Eres un entrenador personal experto en rutinas de gimnasio.",
        "Genera una rutina segura, clara, concreta y personalizada en español.",
        "IMPORTANTE: Debes responder EXCLUSIVAMENTE con un objeto JSON válido, sin texto adicional antes ni después. No uses bloques de código Markdown. Usa esta estructura exacta:",
        "{",
        '  "objetivo": "Resumen del objetivo",',
        '  "frecuencia": "X días a la semana",',
        '  "recomendaciones": "Recomendaciones generales y seguridad",',
        '  "dias": [',
        "    {",
        '      "titulo": "Lunes: Pierna y Glúteo",',
        '      "ejercicios": [',
        "        {",
        '          "nombre": "Sentadilla libre",',
        '          "series": "4",',
        '          "repeticiones": "10-12",',
        '          "descanso": "90 seg"',
        "        }",
        "      ]",
        "    }",
        "  ]",
        "}",
        `Debes entregar EXACTAMENTE ${daysPerWeek} dias de entrenamiento (ni mas ni menos) dentro del arreglo "dias".`,
        "Los parametros elegidos en la interfaz (objetivo, nivel, dias y tiempo) son reglas fijas.",
        "Si la solicitud libre del usuario entra en conflicto con esos parametros, prioriza SIEMPRE los parametros de la interfaz.",
        "Para cada día, lista entre 4 y 6 ejercicios exactos. El campo 'nombre' del ejercicio debe ser claro y específico para poder buscarlo en video.",
        "Si cambia la solicitud libre del usuario, cambia el enfoque, los ejercicios y la estructura de la rutina; no repitas la misma plantilla.",
        "Si faltan datos, asume opciones conservadoras y explica tus supuestos en las recomendaciones.",
        "No recomiendes ejercicios inseguros para las limitaciones indicadas.",
        "",
        `Contexto reciente de conversación: ${conversationContext || 'sin contexto previo'}.`,
        `Solicitud libre del usuario: ${customRequest}.`,
        `Objetivo del cliente: ${goalLabel}.`,
        `Nivel: ${levelLabel}.`,
        `Días por semana: ${daysPerWeek}.`,
        `Duración de sesión: ${sessionLengthLabel}.`,
        `Equipo disponible: ${equipment}.`,
        `Limitaciones o lesiones: ${limitations}.`,
        `Preferencias: ${preferences}.`,
        `Información adicional: ${extraNotes}.`,
    ].join("\n");
};

const summarizeAiRoutineRequest = (payload = {}) => {
    const pieces = [];
    if (payload.goalLabel || payload.goal) pieces.push(`Objetivo: ${payload.goalLabel || payload.goal}`);
    if (payload.levelLabel || payload.level) pieces.push(`Nivel: ${payload.levelLabel || payload.level}`);
    if (payload.daysPerWeek) pieces.push(`Días: ${payload.daysPerWeek}`);
    if (payload.sessionLength) pieces.push(`Sesión: ${payload.sessionLength} min`);
    if (payload.equipment) pieces.push(`Equipo: ${payload.equipment}`);
    if (payload.limitations) pieces.push(`Limitaciones: ${payload.limitations}`);
    if (payload.preferences) pieces.push(`Preferencias: ${payload.preferences}`);
    return pieces.join(" | ");
};

const extractGeminiText = (responseData = {}) => {
    const candidates = responseData.candidates || [];
    let candidateText = "";

    if (Array.isArray(candidates) && candidates.length > 0) {
        candidateText = candidates
            .flatMap((candidate) => 
                Array.isArray(candidate?.content?.parts) 
                ? candidate.content.parts.map((part) => String(part?.text || "")) 
                : []
            )
            .join("\n")
            .trim();
    }

    const cleanText = candidateText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

    return sanitizeAiRoutineText(
        cleanText ||
        responseData?.text ||
        responseData?.output ||
        responseData?.routineText ||
        ""
    );
};

const buildFallbackRoutineText = (payload = {}) => {
    const goal = String(payload.goalLabel || payload.goal || "Objetivo general");
    const level = String(payload.levelLabel || payload.level || "principiante");
    const daysPerWeek = Math.max(1, Math.min(6, Number(payload.daysPerWeek || 4) || 4));
    const sessionLength = Math.max(30, Math.min(180, Number(payload.sessionLength || 60) || 60));
    const limitations = String(payload.limitations || "sin limitaciones especificadas");

    const templates = {
        1: [
            {
                day: "Lunes",
                focus: "Cuerpo completo",
                exercises: [
                    ["Sentadilla goblet", "4 series x 10 repeticiones"],
                    ["Press de banca con mancuernas", "4 series x 10 repeticiones"],
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Peso muerto rumano", "3 series x 10 repeticiones"],
                    ["Plancha frontal", "3 series x 30-45 segundos"],
                ],
            },
        ],
        2: [
            {
                day: "Lunes",
                focus: "Pierna y core",
                exercises: [
                    ["Sentadilla goblet", "4 series x 8-10 repeticiones"],
                    ["Prensa de piernas", "4 series x 10-12 repeticiones"],
                    ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
                    ["Peso muerto rumano", "3 series x 10 repeticiones"],
                    ["Plancha frontal", "3 series x 30-45 segundos"],
                ],
            },
            {
                day: "Jueves",
                focus: "Torso completo",
                exercises: [
                    ["Press de banca", "4 series x 8-10 repeticiones"],
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
                    ["Press militar", "3 series x 8-10 repeticiones"],
                    ["Face pull", "3 series x 12-15 repeticiones"],
                ],
            },
        ],
        3: [
            {
                day: "Lunes",
                focus: "Pierna y core",
                exercises: [
                    ["Sentadilla libre o goblet", "4 series x 8-10 repeticiones"],
                    ["Prensa de piernas", "4 series x 10-12 repeticiones"],
                    ["Peso muerto rumano", "3 series x 10 repeticiones"],
                    ["Curl femoral", "3 series x 12 repeticiones"],
                    ["Plancha frontal", "3 series x 30-45 segundos"],
                ],
            },
            {
                day: "Miercoles",
                focus: "Pecho y espalda",
                exercises: [
                    ["Press de banca", "4 series x 8-10 repeticiones"],
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Remo sentado", "3 series x 10-12 repeticiones"],
                    ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
                    ["Curl de biceps", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Viernes",
                focus: "Gluteo, hombro y core",
                exercises: [
                    ["Hip thrust", "4 series x 10 repeticiones"],
                    ["Press militar", "4 series x 8-10 repeticiones"],
                    ["Elevaciones laterales", "3 series x 12-15 repeticiones"],
                    ["Face pull", "3 series x 12-15 repeticiones"],
                    ["Plancha lateral", "3 series x 30 segundos por lado"],
                ],
            },
        ],
        4: [
            {
                day: "Lunes",
                focus: "Pierna y gluteo",
                exercises: [
                    ["Sentadilla libre", "4 series x 8 repeticiones"],
                    ["Prensa de piernas", "4 series x 10 repeticiones"],
                    ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
                    ["Hip thrust", "4 series x 10 repeticiones"],
                    ["Plancha frontal", "3 series x 30-45 segundos"],
                ],
            },
            {
                day: "Martes",
                focus: "Pecho y triceps",
                exercises: [
                    ["Press de banca", "4 series x 8 repeticiones"],
                    ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
                    ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
                    ["Fondos asistidos", "3 series x 10 repeticiones"],
                    ["Extension de triceps en polea", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Jueves",
                focus: "Espalda y biceps",
                exercises: [
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Remo sentado", "4 series x 10 repeticiones"],
                    ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
                    ["Face pull", "3 series x 12 repeticiones"],
                    ["Curl de biceps", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Viernes",
                focus: "Hombro y core",
                exercises: [
                    ["Press militar", "4 series x 8 repeticiones"],
                    ["Elevaciones laterales", "4 series x 12 repeticiones"],
                    ["Pajaro en banco inclinado", "3 series x 12 repeticiones"],
                    ["Plancha lateral", "3 series x 30 segundos por lado"],
                    ["Crunch en polea o suelo", "3 series x 15 repeticiones"],
                ],
            },
        ],
        5: [
            {
                day: "Lunes",
                focus: "Pierna anterior",
                exercises: [
                    ["Sentadilla libre", "4 series x 8 repeticiones"],
                    ["Prensa de piernas", "4 series x 10 repeticiones"],
                    ["Extensiones de cuádriceps", "3 series x 12 repeticiones"],
                    ["Zancadas", "3 series x 10 repeticiones por pierna"],
                    ["Plancha frontal", "3 series x 30 segundos"],
                ],
            },
            {
                day: "Martes",
                focus: "Pecho y hombro",
                exercises: [
                    ["Press de banca", "4 series x 8 repeticiones"],
                    ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
                    ["Press militar", "3 series x 8 repeticiones"],
                    ["Elevaciones laterales", "3 series x 12 repeticiones"],
                    ["Aperturas", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Miercoles",
                focus: "Espalda y biceps",
                exercises: [
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Remo sentado", "4 series x 10 repeticiones"],
                    ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
                    ["Curl de biceps", "3 series x 12 repeticiones"],
                    ["Face pull", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Jueves",
                focus: "Pierna posterior y gluteo",
                exercises: [
                    ["Peso muerto rumano", "4 series x 8-10 repeticiones"],
                    ["Hip thrust", "4 series x 10 repeticiones"],
                    ["Curl femoral", "3 series x 12 repeticiones"],
                    ["Puente de gluteo", "3 series x 12 repeticiones"],
                    ["Pantorrillas de pie", "3 series x 15 repeticiones"],
                ],
            },
            {
                day: "Viernes",
                focus: "Core y cardio",
                exercises: [
                    ["Plancha frontal", "3 series x 40 segundos"],
                    ["Plancha lateral", "3 series x 30 segundos por lado"],
                    ["Crunch abdominal", "3 series x 15 repeticiones"],
                    ["Bicicleta abdominal", "3 series x 20 repeticiones"],
                    ["Cardio suave en caminadora", "20 minutos"],
                ],
            },
        ],
        6: [
            {
                day: "Lunes",
                focus: "Pierna anterior",
                exercises: [
                    ["Sentadilla libre", "4 series x 8 repeticiones"],
                    ["Prensa de piernas", "4 series x 10 repeticiones"],
                    ["Extensiones de cuádriceps", "3 series x 12 repeticiones"],
                    ["Zancadas caminando", "3 series x 10 repeticiones por pierna"],
                    ["Plancha frontal", "3 series x 30 segundos"],
                ],
            },
            {
                day: "Martes",
                focus: "Pecho y triceps",
                exercises: [
                    ["Press de banca", "4 series x 8 repeticiones"],
                    ["Press inclinado con mancuernas", "3 series x 10 repeticiones"],
                    ["Aperturas con mancuernas", "3 series x 12 repeticiones"],
                    ["Fondos asistidos", "3 series x 10 repeticiones"],
                    ["Extension de triceps en polea", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Miercoles",
                focus: "Espalda y biceps",
                exercises: [
                    ["Jalón al pecho", "4 series x 10 repeticiones"],
                    ["Remo sentado", "4 series x 10 repeticiones"],
                    ["Remo con mancuerna", "3 series x 10 repeticiones por lado"],
                    ["Face pull", "3 series x 12 repeticiones"],
                    ["Curl de biceps", "3 series x 12 repeticiones"],
                ],
            },
            {
                day: "Jueves",
                focus: "Pierna posterior y gluteo",
                exercises: [
                    ["Peso muerto rumano", "4 series x 8-10 repeticiones"],
                    ["Hip thrust", "4 series x 10 repeticiones"],
                    ["Curl femoral", "3 series x 12 repeticiones"],
                    ["Puente de gluteo", "3 series x 12 repeticiones"],
                    ["Pantorrillas de pie", "3 series x 15 repeticiones"],
                ],
            },
            {
                day: "Viernes",
                focus: "Hombro y core",
                exercises: [
                    ["Press militar", "4 series x 8 repeticiones"],
                    ["Elevaciones laterales", "4 series x 12 repeticiones"],
                    ["Pajaro en banco inclinado", "3 series x 12 repeticiones"],
                    ["Plancha lateral", "3 series x 30 segundos por lado"],
                    ["Crunch abdominal", "3 series x 15 repeticiones"],
                ],
            },
            {
                day: "Sabado",
                focus: "Cardio y movilidad",
                exercises: [
                    ["Caminadora inclinada", "20-25 minutos"],
                    ["Bicicleta estatica", "15-20 minutos"],
                    ["Movilidad de cadera", "3 series x 10 repeticiones"],
                    ["Movilidad de hombro", "3 series x 10 repeticiones"],
                    ["Estiramientos globales", "10 minutos"],
                ],
            },
        ],
    };

    const routineDays = templates[daysPerWeek] || templates[4];
    const extraDaysText = daysPerWeek >= 5 ? "Cardio moderado y movilidad" : "Cardio suave opcional";

    return [
        "Rutina temporal (modo respaldo)",
        `Objetivo: ${goal}.`,
        `Nivel: ${level}.`,
        `Frecuencia: ${daysPerWeek} dias por semana.`,
        `Duracion por sesion: ${sessionLength} minutos.`,
        "",
        "Calentamiento (8-10 min):",
        "- Caminata inclinada o bicicleta suave 5 min",
        "- Movilidad dinamica de cadera, hombro y tobillo 3-5 min",
        "",
        ...routineDays.flatMap((item) => ([
            `${item.day}: ${item.focus}`,
            ...item.exercises.map(([exerciseName, prescription], index) => `${index + 1}. ${exerciseName} - ${prescription}`),
            "",
        ])),
        `Dia extra: ${extraDaysText}`,
        "- 20-30 min de cardio moderado",
        "- Movilidad de cadera, hombro y tobillo",
        "",
        "Parametros base:",
        "- 4-6 ejercicios por sesion",
        "- 3-4 series por ejercicio",
        "- 8-12 repeticiones (fuerza/hipertrofia general)",
        "- Descanso 60-90 segundos",
        "",
        "Recomendaciones de seguridad:",
        `- Considerar limitaciones: ${limitations}`,
        "- Priorizar tecnica antes de subir carga",
        "- Detener si aparece dolor agudo",
        "",
        "Nota: esta rutina se genero en modo respaldo porque GEMINI_API_KEY no esta configurada en Cloud Functions.",
    ].join("\n");
};

// --- NUEVO CÓDIGO CON BÚSQUEDA DE YOUTUBE INCLUIDA ---

// 1. Creamos el buscador de YouTube
async function inyectarVideosYouTube(textoRutina) {
    if (!textoRutina) return textoRutina;
    
    const apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YOUTUBE_API_KEY; 
    if (!apiKey) return textoRutina; // Si no hay llave, devolvemos el texto normal

    const lineas = textoRutina.split('\n');
    const lineasConVideo = [];
    const regexEjercicio = /^(\d+\.\s*.*?)\s*-\s*(.*)$/; 

    for (let linea of lineas) {
        const match = linea.match(regexEjercicio);
        if (match) {
            const nombreEjercicio = match[1].replace(/^\d+\.\s*/, '').trim();
            try {
                // Buscamos en YouTube
                const query = encodeURIComponent(`${nombreEjercicio} tutorial gym corto`);
                const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=${query}&type=video&key=${apiKey}`;
                
                // Node 18+ soporta fetch nativo
                const response = await fetch(url);
                const data = await response.json();

                if (data.items && data.items.length > 0) {
                    const videoId = data.items[0].id.videoId;
                    // Le pegamos el ID oculto al final de la línea: [YT:id_del_video]
                    linea = `${linea} [YT:${videoId}]`;
                }
            } catch (error) {
                console.error(`Error YT para ${nombreEjercicio}:`, error);
            }
        }
        lineasConVideo.push(linea);
    }
    
    return lineasConVideo.join('\n');
}

const saveAiRoutineHistory = async ({ admin, uid, payload, prompt, routineText, model, provider }) => {
    const db = admin.firestore();
    const historyRef = db.collection("users").doc(uid).collection(AI_ROUTINE_HISTORY_COLLECTION).doc();
    const requestSummary = summarizeAiRoutineRequest(payload);
    const createdAt = admin.firestore.FieldValue.serverTimestamp();
    const nowIso = new Date().toISOString();

    // --- MAGIA: Inyectamos los videos en el texto antes de guardarlo ---
    const textoConVideos = await inyectarVideosYouTube(routineText);

    const historyEntry = {
        ownerUid: uid,
        ownerEmail: payload.ownerEmail || null,
        ownerDisplayName: payload.ownerDisplayName || null,
        provider,
        model,
        prompt,
        routineText: textoConVideos, // <--- GUARDAMOS EL TEXTO CON LOS VIDEOS
        requestSummary,
        goal: payload.goal || null,
        goalLabel: payload.goalLabel || null,
        level: payload.level || null,
        levelLabel: payload.levelLabel || null,
        daysPerWeek: payload.daysPerWeek || null,
        sessionLength: payload.sessionLength || null,
        equipment: payload.equipment || null,
        limitations: payload.limitations || null,
        preferences: payload.preferences || null,
        extraNotes: payload.extraNotes || null,
        createdAt,
        updatedAt: createdAt,
    };

    await historyRef.set(historyEntry);

    return {
        id: historyRef.id,
        ...historyEntry,
        createdAt: nowIso,
        updatedAt: nowIso,
    };
};

module.exports = {
    buildAiRoutinePrompt,
    buildFallbackRoutineText,
    extractGeminiText,
    saveAiRoutineHistory,
};