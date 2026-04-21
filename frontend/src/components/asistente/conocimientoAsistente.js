export const ASSISTANT_STORAGE_KEY = 'fitdata_assistant_kb_v1';

export const DEFAULT_KNOWLEDGE_BASE = [
  {
    id: 'hours_weekdays',
    question: '¿Cuál es el horario entre semana?',
    answer: 'Nuestro horario entre semana es de lunes a viernes de 5:00 a.m. a 10:00 p.m.',
    tags: ['horario', 'lunes', 'viernes', 'entre semana', 'apertura', 'cierre']
  },
  {
    id: 'hours_saturday',
    question: '¿A qué hora abren los sábados?',
    answer: 'Los sábados abrimos de 7:00 a.m. a 4:00 p.m.',
    tags: ['horario', 'sábado', 'fin de semana']
  },
  {
    id: 'hours_sunday',
    question: '¿Abren los domingos?',
    answer: 'Sí, los domingos abrimos de 8:00 a.m. a 2:00 p.m.',
    tags: ['domingo', 'horario domingo', 'abierto domingo']
  },
  {
    id: 'location_main',
    question: '¿Dónde se ubica FitData GYM?',
    answer: 'Estamos en Av. Resurgimiento 611, Bosques de Campeche, 24030 San Francisco de Campeche, Camp.',
    tags: ['ubicación', 'dirección', 'dónde están', 'maps']
  },
  {
    id: 'rules_towels',
    question: '¿Cuál es el reglamento sobre higiene?',
    answer: 'Por reglamento, usa toalla personal y limpia el equipo después de cada uso para mantener un área segura e higiénica.',
    tags: ['reglamento', 'higiene', 'toalla', 'limpiar equipo']
  },
  {
    id: 'rules_access',
    question: '¿Qué necesito para ingresar?',
    answer: 'Presenta tu acceso vigente (membresía activa) y respeta las normas del personal de recepción y seguridad.',
    tags: ['reglamento', 'acceso', 'ingreso', 'membresía']
  },
  {
    id: 'rules_safety',
    question: '¿Reglas de seguridad básicas?',
    answer: 'Evita soltar mancuernas, usa calzado deportivo y reporta cualquier riesgo al staff inmediatamente.',
    tags: ['seguridad', 'reglamento', 'staff']
  }
];

export const DEFAULT_QUICK_QUESTIONS = [
  '¿Dónde están ubicados?',
  '¿Abren los domingos?',
  '¿Cuál es el horario entre semana?',
  '¿Cuál es el reglamento de higiene?'
];
