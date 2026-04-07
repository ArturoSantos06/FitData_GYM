export const ASSISTANT_STORAGE_KEY = 'fitdata_assistant_kb_v1';

export const DEFAULT_KNOWLEDGE_BASE = [
  {
    id: 'hours_weekdays',
    question: 'Cual es el horario entre semana?',
    answer: 'Nuestro horario entre semana es de lunes a viernes de 5:00 AM a 10:00 PM.',
    tags: ['horario', 'lunes', 'viernes', 'entre semana', 'apertura', 'cierre']
  },
  {
    id: 'hours_saturday',
    question: 'A que hora abren los sabados?',
    answer: 'Los sabados abrimos de 7:00 AM a 4:00 PM.',
    tags: ['horario', 'sabado', 'fin de semana']
  },
  {
    id: 'hours_sunday',
    question: 'Abren los domingos?',
    answer: 'Si, los domingos abrimos de 8:00 AM a 2:00 PM.',
    tags: ['domingo', 'horario domingo', 'abierto domingo']
  },
  {
    id: 'location_main',
    question: 'Donde se ubica FitData GYM?',
    answer: 'Estamos en Av. Resurgimiento 611, Bosques de Campeche, 24030 San Francisco de Campeche, Camp.',
    tags: ['ubicacion', 'direccion', 'donde estan', 'maps']
  },
  {
    id: 'rules_towels',
    question: 'Cual es el reglamento sobre higiene?',
    answer: 'Por reglamento, usa toalla personal y limpia el equipo despues de cada uso para mantener un area segura e higienica.',
    tags: ['reglamento', 'higiene', 'toalla', 'limpiar equipo']
  },
  {
    id: 'rules_access',
    question: 'Que necesito para ingresar?',
    answer: 'Presenta tu acceso vigente (membresia activa) y respeta las normas del personal de recepcion y seguridad.',
    tags: ['reglamento', 'acceso', 'ingreso', 'membresia']
  },
  {
    id: 'rules_safety',
    question: 'Reglas de seguridad basicas?',
    answer: 'Evita soltar mancuernas, usa calzado deportivo y reporta cualquier riesgo al staff inmediatamente.',
    tags: ['seguridad', 'reglamento', 'staff']
  }
];

export const DEFAULT_QUICK_QUESTIONS = [
  'Donde estan ubicados?',
  'Abren los domingos?',
  'Cual es el horario entre semana?',
  'Cual es el reglamento de higiene?'
];
