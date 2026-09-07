import { requireSupabase } from '@/lib/supabase';
import { selectWithOptionalColumns } from '@/lib/resilientSelect';

import {
  EquipmentGroup,
  EvidenceLevel,
  ExerciseDifficulty,
  GripOption,
  ExerciseEquipment,
  ExerciseFilter,
  MovementPattern,
  MuscleGroupSlug,
  MuscleRegion,
  TrainingExercise
} from '../types/training';

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  primary_muscles: string[] | null;
  secondary_muscles: string[] | null;
  equipment: ExerciseEquipment;
  instructions: unknown;
  media_gif_url: string | null;
  media_video_url: string | null;
  media_poster_url: string | null;
  media_duration_seconds: number | null;
  media_is_placeholder: boolean;
  muscle_group: MuscleGroupSlug | null;
  movement_pattern: MovementPattern | null;
  is_compound: boolean | null;
  evidence_level: EvidenceLevel | null;
  evidence_note: string | null;
  evidence_source: string | null;
  beginner_friendly: boolean | null;
  group_rank: number | null;
  default_reps_low: number | null;
  default_reps_high: number | null;
  default_rest_seconds: number | null;
  default_transition_seconds: number | null;
  difficulty: ExerciseDifficulty | null;
  grip_options: unknown;
  muscle_region: MuscleRegion | null;
};

const EQUIPMENT_GROUP: Record<ExerciseEquipment, EquipmentGroup> = {
  barbell: 'free_weight',
  dumbbell: 'free_weight',
  other: 'free_weight',
  machine: 'machine',
  cable: 'machine',
  bodyweight: 'bodyweight'
};

export const equipmentLabels: Record<ExerciseEquipment, string> = {
  barbell: 'Barra',
  dumbbell: 'Mancuernas',
  machine: 'Máquina',
  cable: 'Polea',
  bodyweight: 'Sin peso',
  other: 'Otro'
};

/**
 * Máquina agrupa máquina y polea; peso libre agrupa barra y mancuernas.
 *
 * La elección entre una y otra es de comodidad y disponibilidad, no de resultados: el
 * meta-análisis de Haugen et al. (2023) no encontró diferencia de hipertrofia entre
 * máquinas y peso libre (SMD -0.055, p=0.751).
 */
export const exerciseFilters: { value: ExerciseFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'machine', label: 'Máquina' },
  { value: 'free_weight', label: 'Libre' },
  { value: 'bodyweight', label: 'Sin peso' }
];

/**
 * Columnas que existen desde la primera migración. Siempre se pueden pedir.
 */
const BASE_COLUMNS = [
  'id', 'slug', 'name', 'primary_muscles', 'secondary_muscles', 'equipment', 'instructions',
  'media_gif_url', 'media_video_url', 'media_poster_url', 'media_duration_seconds', 'media_is_placeholder', 'difficulty'
];

/**
 * Columnas añadidas por las migraciones 00010, 00012 y 00014.
 *
 * Van aparte por una razón concreta: pedir una columna que todavía no existe hace que
 * PostgREST rechace TODA la consulta, y el catálogo se queda vacío entero. Eso ya pasó
 * una vez: tras añadir `grip_options` al select, un usuario con la migración 00014 sin
 * aplicar veía "Todavía no hay ejercicios de este grupo" en todos los grupos, cuando
 * los ejercicios estaban ahí y lo que fallaba era la consulta.
 */
const EXTENDED_COLUMNS = [
  'muscle_group', 'movement_pattern', 'is_compound', 'evidence_level', 'evidence_note',
  'evidence_source', 'beginner_friendly', 'group_rank',
  'default_reps_low', 'default_reps_high', 'default_rest_seconds', 'default_transition_seconds',
  'grip_options',
  // Añadida por la 00019. Va aquí y no en BASE por la regla: una columna nueva nunca
  // puede tumbar el catálogo entero si la migración todavía no está aplicada.
  'muscle_region'
];

/**
 * El catálogo cambia muy poco y lo consultan varias pantallas: lo cacheamos a nivel de módulo
 * como promesa para que varias llamadas concurrentes compartan un solo request.
 * Si falla, borramos la caché para que el siguiente intento vuelva a pedirlo.
 */
let catalogPromise: Promise<TrainingExercise[]> | null = null;

/**
 * true cuando el catálogo se cargó en modo reducido porque faltan columnas.
 * La UI lo usa para decir la verdad en vez de "no hay ejercicios".
 */
let hasPendingMigration = false;

export function catalogIsDegraded(): boolean {
  return hasPendingMigration;
}

export function invalidateExerciseCatalog(): void {
  catalogPromise = null;
  hasPendingMigration = false;
}

export function fetchExerciseCatalog(): Promise<TrainingExercise[]> {
  if (!catalogPromise) {
    catalogPromise = loadCatalog().catch((error) => {
      catalogPromise = null;
      throw error;
    });
  }
  return catalogPromise;
}

/**
 * Se pide todo; si falta alguna columna nueva, se reintenta con lo mínimo garantizado.
 *
 * Degradar es mucho mejor que fallar: con una migración pendiente el usuario pierde el
 * nivel de evidencia y los agarres, pero sigue viendo y usando sus ejercicios. Antes
 * perdía el catálogo entero y el mensaje le decía que el grupo estaba vacío.
 */
async function loadCatalog(): Promise<TrainingExercise[]> {
  const client = requireSupabase();

  const { rows, degraded } = await selectWithOptionalColumns<ExerciseRow>(
    (columns) => client
      .from('exercises')
      .select(columns)
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .order('name', { ascending: true }),
    BASE_COLUMNS,
    EXTENDED_COLUMNS
  );

  hasPendingMigration = degraded;
  return rows.map(toTrainingExercise);
}

export async function findExerciseBySlug(slug: string): Promise<TrainingExercise | null> {
  const catalog = await fetchExerciseCatalog();
  return catalog.find((exercise) => exercise.slug === slug) ?? null;
}

/**
 * Los ejercicios de un grupo muscular, en el orden en que los proponemos.
 * `group_rank` viene de docs/rutinas.md: el 1 de cada grupo es el que la app sugiere
 * por defecto, y en los grupos con evidencia fuerte ese orden no es arbitrario.
 */
/**
 * Compara ejercicios por nombre sin que un espacio o una mayúscula cuenten como
 * distintos. El catálogo puede tener dos filas para el mismo ejercicio con ids
 * distintos ("gemelos"); bloquear duplicados solo por id los deja pasar.
 */
export function normalizeExerciseName(name: string): string {
  return name.trim().toLowerCase();
}

export function exercisesForGroup(catalog: TrainingExercise[], group: MuscleGroupSlug): TrainingExercise[] {
  return catalog
    .filter((exercise) => exercise.group === group)
    .sort((a, b) => a.groupRank - b.groupRank || a.name.localeCompare(b.name));
}

const DIFFICULTY_ORDER: Record<ExerciseDifficulty, number> = { beginner: 0, intermediate: 1, advanced: 2 };

/**
 * Los ejercicios del grupo, con los apropiados para el nivel del usuario primero.
 *
 * No se esconde nada: alguien que empieza puede querer ver la sentadilla con barra y
 * decidir por su cuenta. Solo cambia el orden, y la UI marca cuáles son exigentes.
 */
export function exercisesForGroupByLevel(
  catalog: TrainingExercise[],
  group: MuscleGroupSlug,
  suits: (exercise: TrainingExercise) => boolean
): TrainingExercise[] {
  return exercisesForGroup(catalog, group).sort((a, b) => {
    const fitDelta = Number(suits(b)) - Number(suits(a));
    if (fitDelta !== 0) return fitDelta;
    const levelDelta = DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty];
    if (levelDelta !== 0) return levelDelta;
    return a.groupRank - b.groupRank;
  });
}

function toTrainingExercise(row: ExerciseRow): TrainingExercise {
  const instructions = Array.isArray(row.instructions) ? (row.instructions as unknown[]).filter(isNonEmptyString) : [];
  const primary = row.primary_muscles ?? [];
  const secondary = row.secondary_muscles ?? [];
  const isGif = Boolean(row.media_gif_url) && !row.media_video_url;
  const repsLow = row.default_reps_low;
  const repsHigh = row.default_reps_high;

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    muscleGroup: [...primary, ...secondary].join(' · '),
    group: row.muscle_group,
    movementPattern: row.movement_pattern,
    region: row.muscle_region ?? null,
    isCompound: row.is_compound ?? false,
    equipment: row.equipment,
    equipmentGroup: EQUIPMENT_GROUP[row.equipment] ?? 'free_weight',
    difficulty: row.difficulty ?? 'beginner',
    gripOptions: parseGripOptions(row.grip_options),
    evidenceLevel: row.evidence_level ?? 'consenso',
    evidenceNote: row.evidence_note,
    evidenceSource: row.evidence_source,
    beginnerFriendly: row.beginner_friendly ?? true,
    groupRank: row.group_rank ?? 50,
    defaultReps: repsLow !== null && repsHigh !== null ? { low: repsLow, high: repsHigh } : null,
    defaultRestSeconds: row.default_rest_seconds,
    defaultTransitionSeconds: row.default_transition_seconds,
    media: {
      type: isGif ? 'gif' : 'video',
      durationSeconds: row.media_duration_seconds ?? 4,
      url: row.media_video_url ?? row.media_gif_url ?? '',
      posterUrl: row.media_poster_url,
      isMock: row.media_is_placeholder || !(row.media_video_url ?? row.media_gif_url)
    },
    instructions: instructions.length > 0 ? instructions : ['Muévete con control en todo el recorrido.'],
    cue: instructions[0] ?? 'Muévete con control en todo el recorrido.'
  };
}

/** jsonb llega como unknown: validamos forma antes de confiar en ella. */
function parseGripOptions(value: unknown): GripOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) return [];
    const candidate = item as Record<string, unknown>;
    if (!isNonEmptyString(candidate.name) || !isNonEmptyString(candidate.note)) return [];
    return [{
      name: candidate.name,
      note: candidate.note,
      evidence: candidate.evidence === 'emg' ? 'emg' as const : 'consenso' as const
    }];
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
