/** Espejo exacto del enum public.exercise_equipment en Supabase. */
export type ExerciseEquipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';

/** Agrupación de UX: seis opciones de equipamiento serían demasiado ruido en el filtro. */
export type EquipmentGroup = 'machine' | 'free_weight' | 'bodyweight';

export type ExerciseFilter = 'all' | EquipmentGroup;

/** Espejo exacto del enum public.muscle_group. */
export type MuscleGroupSlug =
  | 'pecho' | 'hombros' | 'biceps' | 'triceps' | 'antebrazo' | 'espalda'
  | 'abs' | 'cuadriceps' | 'gluteos' | 'femorales' | 'pantorrilla' | 'cardio';

/**
 * Espejo de public.evidence_level. Esta distinción no es decorativa: la amplitud de
 * EMG medida de forma aguda no predice bien la hipertrofia (Vigotsky et al. 2022),
 * así que la app nunca muestra un ejercicio respaldado solo por EMG como si tuviera
 * el mismo aval que uno medido con resonancia. Ver docs/rutinas.md.
 */
export type EvidenceLevel = 'hipertrofia' | 'emg' | 'consenso';

/** Espejo de public.exercise_difficulty. */
export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

/**
 * Un agarre o accesorio, con su nota.
 *
 * `evidence` nunca vale 'hipertrofia' a propósito: no existe ningún estudio de
 * crecimiento muscular que compare accesorios de polea ni tipos de barra.
 */
export type GripOption = {
  name: string;
  note: string;
  evidence: 'emg' | 'consenso';
};

/** Espejo de public.muscle_region. La porción del músculo que trabaja un ejercicio. */
export type MuscleRegion =
  | 'clavicular' | 'esternocostal'
  | 'deltoide-anterior' | 'deltoide-lateral' | 'deltoide-posterior'
  | 'dorsal' | 'espalda-alta'
  | 'triceps-cabeza-larga' | 'triceps-lateral-medial'
  | 'biceps-proximal' | 'biceps-distal' | 'braquiorradial'
  | 'recto-femoral' | 'vastos'
  | 'isquios-cadera' | 'isquios-rodilla'
  | 'gluteo-mayor' | 'gluteo-medio'
  | 'gastrocnemio' | 'soleo'
  | 'recto-abdominal' | 'oblicuos'
  | 'antebrazo-flexores' | 'antebrazo-extensores';

export const REGION_LABELS: Record<MuscleRegion, string> = {
  clavicular: 'Pecho superior',
  esternocostal: 'Pecho medio',
  'deltoide-anterior': 'Hombro anterior',
  'deltoide-lateral': 'Hombro lateral',
  'deltoide-posterior': 'Hombro posterior',
  dorsal: 'Dorsal',
  'espalda-alta': 'Espalda alta',
  'triceps-cabeza-larga': 'Cabeza larga',
  'triceps-lateral-medial': 'Cabezas lateral y medial',
  'biceps-proximal': 'Bíceps, zona alta',
  'biceps-distal': 'Bíceps, zona baja',
  braquiorradial: 'Braquiorradial',
  'recto-femoral': 'Recto femoral',
  vastos: 'Vastos',
  'isquios-cadera': 'Isquios por cadera',
  'isquios-rodilla': 'Isquios por rodilla',
  'gluteo-mayor': 'Glúteo mayor',
  'gluteo-medio': 'Glúteo medio',
  gastrocnemio: 'Gemelo',
  soleo: 'Sóleo',
  'recto-abdominal': 'Recto abdominal',
  oblicuos: 'Oblicuos',
  'antebrazo-flexores': 'Flexores',
  'antebrazo-extensores': 'Extensores'
};

export type MovementPattern =
  | 'empuje-horizontal' | 'empuje-vertical' | 'traccion-vertical' | 'traccion-horizontal'
  | 'rodilla' | 'cadera' | 'aislamiento' | 'core' | 'cardio';

export type ExerciseMedia = {
  type: 'video' | 'gif';
  durationSeconds: number;
  url: string;
  /** Imagen del primer fotograma útil; se muestra mientras el vídeo empieza a cargar. */
  posterUrl: string | null;
  isMock: boolean;
};

export type TrainingExercise = {
  /** uuid de public.exercises. Es el valor que va a workout_sets.exercise_id. */
  id: string;
  slug: string;
  name: string;
  /** Texto libre con los músculos implicados; sirve como subtítulo. */
  muscleGroup: string;
  /** El grupo canónico al que pertenece. null solo en filas viejas sin migrar. */
  group: MuscleGroupSlug | null;
  movementPattern: MovementPattern | null;
  /** La porción del músculo que trabaja. Null en cardio. */
  region: MuscleRegion | null;
  isCompound: boolean;
  equipment: ExerciseEquipment;
  equipmentGroup: EquipmentGroup;
  /** Dificultad de EJECUCIÓN, no de esfuerzo. Criterio editorial: no existe una escala publicada. */
  difficulty: ExerciseDifficulty;
  /** Agarres y accesorios con su nota. Vacío en la mayoría. */
  gripOptions: GripOption[];
  evidenceLevel: EvidenceLevel;
  /** Por qué lo recomendamos, en castellano llano. Se muestra tal cual. */
  evidenceNote: string | null;
  /** La cita. Vacía cuando evidenceLevel es 'consenso'. */
  evidenceSource: string | null;
  beginnerFriendly: boolean;
  /** Orden dentro del grupo: 1 es el que la app propone primero. */
  groupRank: number;
  defaultReps: { low: number; high: number } | null;
  /** Descanso sugerido entre series. */
  defaultRestSeconds: number | null;
  /** Descanso sugerido al pasar al siguiente ejercicio. */
  defaultTransitionSeconds: number | null;
  media: ExerciseMedia;
  /** Los pasos de técnica, completos. El catálogo trae 3 por ejercicio. */
  instructions: string[];
  /** El primer paso. Se usa donde solo cabe una línea. */
  cue: string;
};

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: 'Fácil de ejecutar',
  intermediate: 'Técnica intermedia',
  advanced: 'Técnica exigente'
};

/**
 * Lo que la app dice al mostrar la dificultad. Incluye el aviso de que no es una
 * escala validada, porque no lo es.
 */
export const DIFFICULTY_NOTES: Record<ExerciseDifficulty, string> = {
  beginner:
    'La máquina o la polea te marcan el recorrido, así que puedes concentrarte en el músculo y no en el equilibrio. Y no pierdes nada: las máquinas producen la misma hipertrofia que el peso libre.',
  intermediate:
    'Peso libre sin carga sobre la columna. Necesitas algo de control, pero se aprende en unas pocas sesiones.',
  advanced:
    'Exige técnica, equilibrio o que alguien te asegure. Mejor cuando ya lleves unos meses o tengas quien te corrija.'
};

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupSlug, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  hombros: 'Hombros',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  antebrazo: 'Antebrazo',
  abs: 'Abdominales',
  cuadriceps: 'Cuádriceps',
  femorales: 'Femorales',
  gluteos: 'Glúteos',
  pantorrilla: 'Pantorrilla',
  cardio: 'Cardio'
};

/** Etiqueta corta que la UI pone junto al ejercicio. Honesta, sin adornos. */
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  hipertrofia: 'Medido en estudios de crecimiento',
  emg: 'Solo activación muscular',
  consenso: 'Práctica establecida'
};

/** Explicación larga, para el detalle. Dice lo que el nivel significa y lo que no. */
export const EVIDENCE_EXPLANATIONS: Record<EvidenceLevel, string> = {
  hipertrofia:
    'Hay al menos un ensayo que midió el músculo con ecografía o resonancia antes y después. Es la evidencia más fuerte que existe en este terreno.',
  emg:
    'Lo respalda un estudio de activación muscular, que mide la señal eléctrica del músculo en el momento. Ojo: esa señal predice mal el crecimiento a largo plazo, así que tómalo como una pista, no como una prueba.',
  consenso:
    'Nadie lo ha comparado con otros ejercicios midiendo crecimiento. Está aquí por anatomía y por práctica establecida, no por datos.'
};
