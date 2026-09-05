import { requireSupabase, requireUserId } from '@/lib/supabase';

import { CardioPlacement, DayKind } from '../types/split';
import { MUSCLE_GROUP_LABELS, MuscleGroupSlug } from '../types/training';
import { Routine, RoutineExerciseInput, RoutineInput } from '../types/routine';

export type SharedRoutineExercise = {
  dayIndex: number;
  position: number;
  muscleGroup: MuscleGroupSlug;
  exerciseId: string;
  targetSets: number;
  targetReps: number | null;
  restSeconds: number | null;
  transitionSeconds: number | null;
};

export type SharedRoutineDay = {
  dayIndex: number;
  name: string;
  dayKind: DayKind;
};

export type SharedRoutineSummary = {
  id: string;
  name: string;
  summary: string | null;
  /** A quién se atribuye. NUNCA se muestra sin `sourceNote`. */
  attributedTo: string | null;
  sourceNote: string | null;
  sourceUrl: string | null;
  daysPerWeek: number;
  isCurated: boolean;
  isMine: boolean;
  adoptCount: number;
};

export type SharedRoutineDetail = SharedRoutineSummary & {
  days: SharedRoutineDay[];
  exercises: SharedRoutineExercise[];
};

type SharedRow = {
  id: string;
  author_user_id: string | null;
  name: string;
  summary: string | null;
  attributed_to: string | null;
  source_note: string | null;
  source_url: string | null;
  days_per_week: number;
  is_curated: boolean;
  adopt_count: number;
  shared_routine_days?: { day_index: number; name: string; day_kind: DayKind }[] | null;
  shared_routine_exercises?: {
    day_index: number;
    position: number;
    muscle_group: MuscleGroupSlug;
    exercise_id: string;
    target_sets: number;
    target_reps: number | null;
    rest_seconds: number | null;
    transition_seconds: number | null;
  }[] | null;
};

const LIST_COLUMNS =
  'id, author_user_id, name, summary, attributed_to, source_note, source_url, days_per_week, is_curated, adopt_count';

const DETAIL_COLUMNS =
  `${LIST_COLUMNS}, shared_routine_days(day_index, name, day_kind), ` +
  'shared_routine_exercises(day_index, position, muscle_group, exercise_id, target_sets, target_reps, rest_seconds, transition_seconds)';

function toSummary(row: SharedRow, userId: string | null): SharedRoutineSummary {
  return {
    id: row.id,
    name: row.name,
    summary: row.summary,
    // Si falta la fuente, la atribución no se propaga: mejor sin nombre que con un
    // nombre que no podemos respaldar. La base también lo impide con un check.
    attributedTo: row.source_note ? row.attributed_to : null,
    sourceNote: row.source_note,
    sourceUrl: row.source_url,
    daysPerWeek: Number(row.days_per_week),
    isCurated: row.is_curated,
    isMine: Boolean(userId) && row.author_user_id === userId,
    adoptCount: Number(row.adopt_count)
  };
}

export async function listSharedRoutines(): Promise<SharedRoutineSummary[]> {
  const client = requireSupabase();
  const userId = await requireUserId().catch(() => null);

  const { data, error } = await client
    .from('shared_routines')
    .select(LIST_COLUMNS)
    .eq('is_published', true)
    .order('is_curated', { ascending: false })
    .order('adopt_count', { ascending: false })
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as SharedRow[]).map((row) => toSummary(row, userId));
}

export async function getSharedRoutine(id: string): Promise<SharedRoutineDetail | null> {
  const client = requireSupabase();
  const userId = await requireUserId().catch(() => null);

  const { data, error } = await client.from('shared_routines').select(DETAIL_COLUMNS).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as SharedRow;

  return {
    ...toSummary(row, userId),
    // PostgREST no garantiza el orden de los recursos embebidos.
    days: (row.shared_routine_days ?? [])
      .slice()
      .sort((a, b) => a.day_index - b.day_index)
      .map((day) => ({ dayIndex: Number(day.day_index), name: day.name, dayKind: day.day_kind ?? 'torso' })),
    exercises: (row.shared_routine_exercises ?? [])
      .slice()
      .sort((a, b) => a.day_index - b.day_index || a.position - b.position)
      .map((item) => ({
        dayIndex: Number(item.day_index),
        position: Number(item.position),
        muscleGroup: item.muscle_group,
        exerciseId: item.exercise_id,
        targetSets: Number(item.target_sets),
        targetReps: item.target_reps === null ? null : Number(item.target_reps),
        restSeconds: item.rest_seconds === null ? null : Number(item.rest_seconds),
        transitionSeconds: item.transition_seconds === null ? null : Number(item.transition_seconds)
      }))
  };
}

/**
 * Convierte una rutina compartida en una rutina propia.
 *
 * `onlyGroup` copia solo los ejercicios de ese músculo. Es el caso que pidió el usuario:
 * te gusta cómo esa persona entrena la espalda, pero no quieres tirar tu rutina entera.
 */
export function buildRoutineInputFromShared(
  shared: SharedRoutineDetail,
  options: { name: string; onlyGroup?: MuscleGroupSlug | null; cardio?: RoutineInput['cardio'] }
): RoutineInput {
  const source = options.onlyGroup
    ? shared.exercises.filter((item) => item.muscleGroup === options.onlyGroup)
    : shared.exercises;

  // Al copiar un solo grupo, sus días se compactan: si la espalda estaba en el día 4 de
  // una rutina de 5, aquí pasa a ser el día 1 de una rutina de un día.
  const usedDays = [...new Set(source.map((item) => item.dayIndex))].sort((a, b) => a - b);
  const dayMap = new Map(usedDays.map((day, index) => [day, index + 1]));

  const exercises: RoutineExerciseInput[] = source.map((item) => ({
    exerciseId: item.exerciseId,
    dayIndex: dayMap.get(item.dayIndex) ?? 1,
    muscleGroup: item.muscleGroup,
    targetSets: item.targetSets,
    targetReps: item.targetReps,
    restSeconds: item.restSeconds,
    transitionSeconds: item.transitionSeconds
  }));

  return {
    name: options.name,
    daysPerWeek: Math.max(1, usedDays.length),
    // No se hereda la plantilla: esta rutina ya no sigue nuestras reglas de split.
    splitTemplateSlug: null,
    cardio: options.cardio ?? { placement: 'end' as CardioPlacement, exerciseId: null, minutes: 20 },
    exercises
  };
}

/** El contador es informativo: si falla, la copia ya se hizo y no vale la pena molestar. */
export async function registerAdoption(sharedRoutineId: string): Promise<void> {
  const client = requireSupabase();
  await client.rpc('increment_shared_routine_adoptions', { p_shared_routine_id: sharedRoutineId }).throwOnError();
}

/** Publica una rutina propia para que otros la vean. */
export async function publishRoutine(
  routine: Routine,
  options: { summary: string | null }
): Promise<string> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('shared_routines')
    .insert({
      author_user_id: userId,
      name: routine.name,
      summary: options.summary,
      days_per_week: routine.daysPerWeek,
      is_curated: false,
      is_published: true
    })
    .select('id')
    .single();

  if (error) throw error;
  const sharedId = data.id as string;

  const rows = routine.exercises.map((exercise) => ({
    shared_routine_id: sharedId,
    day_index: exercise.dayIndex,
    position: exercise.position,
    muscle_group: exercise.muscleGroup,
    exercise_id: exercise.exerciseId,
    target_sets: exercise.targetSets,
    target_reps: exercise.targetReps,
    rest_seconds: exercise.restSeconds,
    transition_seconds: exercise.transitionSeconds
  }));

  const { error: exercisesError } = await client.from('shared_routine_exercises').insert(rows);
  if (exercisesError) {
    // Sin transacción entre dos requests: una rutina compartida vacía no sirve a nadie.
    await client.from('shared_routines').delete().eq('id', sharedId);
    throw exercisesError;
  }

  /**
   * Los días, con un nombre derivado de los músculos que tocan.
   *
   * Una rutina propia no guarda el nombre de sus días —eso vive en la plantilla de
   * split, y una rutina editada puede haberse alejado de ella—, así que se reconstruye
   * a partir del contenido real. Sin esto, el detalle de la rutina compartida salía sin
   * ningún día.
   */
  const dayRows = buildDayRows(sharedId, routine);
  if (dayRows.length > 0) {
    const { error: daysError } = await client.from('shared_routine_days').insert(dayRows);
    if (daysError) {
      await client.from('shared_routines').delete().eq('id', sharedId);
      throw daysError;
    }
  }

  return sharedId;
}

/** Los grupos que se consideran pierna, para etiquetar el día. */
const LEG_GROUPS: MuscleGroupSlug[] = ['cuadriceps', 'femorales', 'gluteos', 'pantorrilla'];

function buildDayRows(sharedId: string, routine: Routine) {
  const byDay = new Map<number, MuscleGroupSlug[]>();

  for (const exercise of routine.exercises) {
    if (!exercise.muscleGroup) continue;
    const groups = byDay.get(exercise.dayIndex) ?? [];
    if (!groups.includes(exercise.muscleGroup)) groups.push(exercise.muscleGroup);
    byDay.set(exercise.dayIndex, groups);
  }

  return [...byDay.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, groups]) => {
      const legCount = groups.filter((group) => LEG_GROUPS.includes(group)).length;
      const label = groups.map((group) => MUSCLE_GROUP_LABELS[group]).join(' · ');

      return {
        shared_routine_id: sharedId,
        day_index: dayIndex,
        // El nombre de la columna admite 60 caracteres; con muchos grupos hay que cortar.
        name: label.length <= 60 ? label : `${label.slice(0, 57)}…`,
        day_kind: legCount > groups.length / 2 ? 'pierna' : 'torso'
      };
    });
}

export async function unpublishRoutine(sharedRoutineId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('shared_routines').delete().eq('id', sharedRoutineId);
  if (error) throw error;
}
