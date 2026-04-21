const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'de', 'del', 'a', 'y', 'o', 'en', 'un', 'una', 'que', 'es', 'para', 'por', 'con'
]);

export const normalizeText = (value) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const tokenize = (text) =>
  normalizeText(text)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token && !STOPWORDS.has(token));

const scoreEntry = (tokens, entry) => {
  const source = [entry.question, ...(entry.tags || [])].join(' ');
  const sourceTokens = new Set(tokenize(source));
  let score = 0;

  tokens.forEach((token) => {
    if (sourceTokens.has(token)) score += 2;
    if (normalizeText(entry.answer).includes(token)) score += 1;
  });

  return score;
};

export const getBestAssistantAnswer = (question, knowledgeBase = []) => {
  const normalized = normalizeText(question);
  if (!normalized) {
    return 'Escribe tu duda y te ayudo con horarios, ubicación o reglamento del gimnasio.';
  }

  if (/hola|buenas|hey/.test(normalized)) {
    return 'Hola, soy el asistente de FitData GYM. Te puedo ayudar con horarios, ubicación y reglamento.';
  }

  const tokens = tokenize(question);
  if (!tokens.length) {
    return 'No logré entender tu pregunta. Intenta con: horarios, ubicación o reglamento.';
  }

  let best = null;
  let bestScore = 0;

  knowledgeBase.forEach((entry) => {
    const score = scoreEntry(tokens, entry);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  });

  if (best && bestScore >= 2) {
    return best.answer;
  }

  return 'Por ahora solo puedo responder dudas frecuentes de horarios, ubicación y reglamento. Si quieres, intenta reformular tu pregunta.';
};
