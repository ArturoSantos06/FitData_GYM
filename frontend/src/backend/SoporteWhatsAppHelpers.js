export const GOAL_OPTIONS = [
    { value: 'muscle_gain', label: 'Ganar masa muscular' },
    { value: 'fat_loss', label: 'Perder grasa' },
    { value: 'strength', label: 'Mejorar fuerza' },
    { value: 'endurance', label: 'Mejorar resistencia' },
    { value: 'mobility', label: 'Movilidad y prevencion' },
    { value: 'recomposition', label: 'Recomposicion corporal' },
];

export const LEVEL_OPTIONS = [
    { value: 'beginner', label: 'Principiante' },
    { value: 'intermediate', label: 'Intermedio' },
    { value: 'advanced', label: 'Avanzado' },
];

export const TIME_OPTIONS = [
    { value: '', label: 'Opcional' },
    { value: '30', label: '30 minutos' },
    { value: '60', label: '1 hora' },
    { value: '90', label: '1 hora y media' },
    { value: '120', label: '2 horas' },
    { value: '150', label: '2 horas y media' },
    { value: '180', label: '3 horas' },
];

export const DAYS_PER_WEEK_OPTIONS = ['1', '2', '3', '4', '5', '6'];

export function formatBubbleTime(value) {
    try {
        const date = value?.toDate?.() || new Date(value || Date.now());
        if (Number.isNaN(date.getTime())) {
            return '';
        }
        return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export function sanitizeNumericInput(value) {
    return String(value || '').replace(/[^0-9]/g, '');
}

export function sanitizeDaysPerWeekInput(value) {
    const numeric = Number(sanitizeNumericInput(value) || 4);
    return String(Math.max(1, Math.min(6, numeric)));
}

export function normalizeChatText(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function isGreetingOnlyMessage(value) {
    const normalized = normalizeChatText(value);
    if (!normalized) {
        return true;
    }

    const greetingPhrases = [
        'hola',
        'buenas',
        'buenos dias',
        'buenas tardes',
        'buenas noches',
        'hey',
        'saludos',
    ];

    const routineRequestWords = [
        'rutina',
        'entrenamiento',
        'ejercicio',
        'ejercicios',
        'pierna',
        'pecho',
        'espalda',
        'gluteo',
        'abdomen',
        'cardio',
        'fuerza',
        'musculo',
        'grasa',
        'objetivo',
        'quiero',
        'necesito',
    ];

    const hasGreeting = greetingPhrases.some((phrase) => (
        normalized === phrase
        || normalized.startsWith(`${phrase} `)
        || normalized.includes(` ${phrase} `)
        || normalized.endsWith(` ${phrase}`)
    ));

    const hasRoutineIntent = routineRequestWords.some((word) => normalized.includes(word));

    return hasGreeting && !hasRoutineIntent && normalized.split(' ').length <= 4;
}

export function isRoutineRelatedMessage(value) {
    const normalized = normalizeChatText(value);
    if (!normalized) {
        return false;
    }

    const routineKeywords = [
        'rutina',
        'entrenamiento',
        'ejercicio',
        'ejercicios',
        'gym',
        'gimnasio',
        'musculo',
        'musculos',
        'fuerza',
        'cardio',
        'hipertrofia',
        'volumen',
        'definicion',
        'recomposicion',
        'bajar grasa',
        'perder grasa',
        'ganar masa',
        'ganar musculo',
        'objetivo',
        'pierna',
        'pecho',
        'espalda',
        'gluteo',
        'abdomen',
        'hombro',
        'biceps',
        'triceps',
        'core',
        'piernas',
        'gluteos',
        'espalda baja',
        'espalda alta',
        'pecho y espalda',
        'push',
        'pull',
        'legs',
        'plan',
        'entreno',
        'entrenar',
        'hazme',
        'armame',
        'generame',
        'creame',
        'enfocado',
        'enfocada',
    ];

    if (routineKeywords.some((keyword) => normalized.includes(keyword))) {
        return true;
    }

    const hasActionIntent = /(hazme|armame|genera|generame|crea|creame)/.test(normalized);
    const hasTrainingContext = /(rutina|plan|entreno|entrenamiento|ejercicio|ejercicios|musculo|grasa|fuerza|cardio)/.test(normalized);
    return hasActionIntent && hasTrainingContext;
}

export function normalizeDurationToMinutes(value) {
    const raw = String(value || '').trim().toLowerCase().replace(',', '.');
    if (!raw) {
        return '';
    }

    const asNumber = Number(raw);
    if (!Number.isNaN(asNumber) && asNumber > 0) {
        return String(Math.round(asNumber));
    }

    const hoursMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hora|horas)$/);
    if (hoursMatch) {
        const hours = Number(hoursMatch[1]);
        if (!Number.isNaN(hours) && hours > 0) {
            return String(Math.round(hours * 60));
        }
    }

    const minsMatch = raw.match(/^(\d+(?:\.\d+)?)\s*(m|min|mins|minuto|minutos)$/);
    if (minsMatch) {
        const minutes = Number(minsMatch[1]);
        if (!Number.isNaN(minutes) && minutes > 0) {
            return String(Math.round(minutes));
        }
    }

    return '';
}