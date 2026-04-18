export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const PARTES_CUERPO = [
  { key: 'chest', label: 'Pecho' },
  { key: 'back', label: 'Espalda' },
  { key: 'upper arms', label: 'Brazos' },
  { key: 'lower arms', label: 'Antebrazos' },
  { key: 'upper legs', label: 'Piernas' },
  { key: 'lower legs', label: 'Pantorrillas' },
  { key: 'shoulders', label: 'Hombros' },
  { key: 'waist', label: 'Abdomen' },
  { key: 'cardio', label: 'Cardio' },
];

export const TRADUCCIONES_ETIQUETAS = {
  pectorals: 'Pectorales', delts: 'Deltoides', biceps: 'Biceps', triceps: 'Triceps', lats: 'Dorsales',
  glutes: 'Gluteos', quads: 'Cuadriceps', hamstrings: 'Isquiotibiales', calves: 'Pantorrillas', abs: 'Abdominales',
  forearms: 'Antebrazos', traps: 'Trapecios', chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
  waist: 'Abdomen', cardio: 'Cardio', 'upper arms': 'Brazos', 'lower arms': 'Antebrazos', 'upper legs': 'Piernas',
  'lower legs': 'Pantorrillas', cable: 'Cable', barbell: 'Barra', dumbbell: 'Mancuerna', kettlebell: 'Pesa rusa',
  bands: 'Bandas', 'body weight': 'Peso corporal', 'assisted body weight': 'Peso corporal asistido',
  'leverage machine': 'Maquina de palanca', 'smith machine': 'Maquina Smith',
};

export const REEMPLAZOS_TEXTO_EJERCICIO = [
  [/\bone arm\b/gi, 'un brazo'], [/\bshoulders\b/gi, 'deltoides'], [/\bshoulder\b/gi, 'deltoides'],
  [/\bshoulder-width\b/gi, 'ancho de hombros'], [/\bstanding\b/gi, 'de pie'], [/\bcable\b/gi, 'cable'],
  [/\bexternal rotation\b/gi, 'rotacion externa'], [/\bhold\b/gi, 'sostener'], [/\braise\b/gi, 'elevacion'],
  [/\bbench\b/gi, 'banco'], [/\bdumbbell\b/gi, 'mancuerna'], [/\bbarbell\b/gi, 'barra'],
  [/\breps?\b/gi, 'repeticiones'], [/\bsets?\b/gi, 'series'], [/\brest\b/gi, 'descanso'],
  [/\bStep\s*:??\s*(\d+)\b/gi, 'Paso $1'],
];

export const DIAS_ACTIVOS_POR_DEFECTO = ['Lunes', 'Miércoles', 'Viernes'];
export const EJERCICIOS_POR_DIA_POR_DEFECTO = { Lunes: [], Miércoles: [], Viernes: [] };

export const traducirEtiqueta = (value) => {
  if (!value) return '';
  const key = String(value).trim().toLowerCase();
  return TRADUCCIONES_ETIQUETAS[key] || value;
};

export const traducirTextoEjercicio = (value) => {
  if (!value || typeof value !== 'string') return value || '';
  let salida = value;
  REEMPLAZOS_TEXTO_EJERCICIO.forEach(([regex, reemplazo]) => {
    salida = salida.replace(regex, reemplazo);
  });
  return salida;
};

export const crearEntradaEjercicio = (ex = {}) => ({
  id: Date.now() + Math.random(),
  titulo: traducirTextoEjercicio(ex.name || ''),
  exerciseId: ex.id || '', movementPattern: ex.movementPattern || '', primaryMuscle: ex.primaryMuscle || '',
  secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  tags: Array.isArray(ex.tags) ? ex.tags : [], gifUrl: ex.gifUrl || null,
  instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
  descripcion: Array.isArray(ex.instructions) && ex.instructions.length
    ? ex.instructions.map((linea, i) => `${i + 1}. ${traducirTextoEjercicio(linea)}`).join('\n')
    : '',
  series: '', repeticiones: '', descanso: '',
});

export const normalizarEjercicioGuardado = (ex = {}) => ({
  ...crearEntradaEjercicio(),
  ...ex,
  id: ex.id || Date.now() + Math.random(),
  titulo: traducirTextoEjercicio(ex.titulo || ex.name || ''),
  exerciseId: ex.exerciseId || ex.id || '',
  movementPattern: ex.movementPattern || '',
  primaryMuscle: ex.primaryMuscle || '',
  secondaryMuscles: Array.isArray(ex.secondaryMuscles) ? ex.secondaryMuscles : [],
  tags: Array.isArray(ex.tags) ? ex.tags : [], gifUrl: ex.gifUrl || null,
  instructions: Array.isArray(ex.instructions) ? ex.instructions : [],
  descripcion: ex.descripcion || '', series: ex.series || '', repeticiones: ex.repeticiones || '', descanso: ex.descanso || '',
});