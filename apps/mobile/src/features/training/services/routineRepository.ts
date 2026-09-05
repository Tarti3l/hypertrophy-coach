import { requireSupabase, requireUserId } from '@/lib/supabase';

import { CardioPlacement } from '../types/split';
import { MuscleGroupSlug } from '../types/training';
import { Routine, RoutineExercise, RoutineExerciseInput, RoutineInput, RoutineSummary } from '../types/routine';

type ExerciseRow = {
  id: string;
  exercise_id: string;
  day_index: number | null;
  position: number;
  muscle_group: MuscleGroupSlug | null;
  target_sets: number;
  target_reps: number | null;
  rest_seconds: number | null;
  transition_seconds: number | null;
};

type RoutineRow = {
  id: string;
  name: string;
  notes: string | null;
  days_per_week: number | null;
  split_template_slug: string | null;
  cardio_placement: CardioPlacement | null;
  cardio_exercise_id: string | null;
  cardio_minutes: number | null;
  routine_exercises: ExerciseRow[] | null;
};

const SELECT =
  'id, name, notes, days_per_week, split_template_slug, cardio_placement, cardio_exercise_id, cardio_minutes, ' +
  'routine_exercises(id, exercise_id, day_index, position, muscle_group, target_sets, target_reps, rest_seconds, transition_seconds)';

export async function listRoutines(): Promise<RoutineSummary[]> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('routines')
    .select(SELECT)
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RoutineRow[]).map((row) => {
    const exercises = row.routine_exercises ?? [];
    return {
      id: row.id,
      name: row.name,
      daysPerWeek: row.days_per_week ?? countDays(exercises),
      exerciseCount: exercises.length,
      totalSets: exercises.reduce((sum, item) => sum + Number(item.target_sets), 0),
      cardioPlacement: row.cardio_placement ?? 'none'
    };
  });
}

export async function getRoutine(id: string): Promise<Routine | null> {
  const client = requireSupabase();

  const { data, error } = await client.from('routines').select(SELECT).eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as RoutineRow;
  const rawExercises = row.routine_exercises ?? [];

  const exercises: RoutineExercise[] = rawExercises
    .slice()
    // PostgREST no garantiza el orden de los recursos embebidos.
    .sort((a, b) => (a.day_index ?? 1) - (b.day_index ?? 1) || a.position - b.position)
    .map((item) => ({
      id: item.id,
      exerciseId: item.exercise_id,
      dayIndex: Number(item.day_index ?? 1),
      position: Number(item.position),
      muscleGroup: item.muscle_group,
      targetSets: Number(item.target_sets),
      targetReps: item.target_reps === null ? null : Number(item.target_reps),
      restSeconds: item.rest_seconds === null ? null : Number(item.rest_seconds),
      transitionSeconds: item.transition_seconds === null ? null : Number(item.transition_seconds)
    }));

  return {
    id: row.id,
    name: row.name,
    notes: row.notes,
    daysPerWeek: row.days_per_week ?? countDays(rawExercises),
    splitTemplateSlug: row.split_template_slug,
    cardio: {
      placement: row.cardio_placement ?? 'none',
      exerciseId: row.cardio_exercise_id,
      minutes: row.cardio_minutes === null ? null : Number(row.cardio_minutes)
    },
    exercises
  };
}

export async function createRoutine(input: RoutineInput): Promise<string> {
  assertHasExercises(input.exercises);

  const client = requireSupabase();
  const userId = await requireUserId();

  const { data, error } = await client
    .from('routines')
    .insert({
      user_id: userId,
      name: input.name.trim(),
      days_per_week: input.daysPerWeek,
      split_template_slug: input.splitTemplateSlug,
      cardio_placement: input.cardio.placement,
      cardio_exercise_id: input.cardio.placement === 'none' ? null : input.cardio.exerciseId,
      cardio_minutes: input.cardio.placement === 'none' ? null : input.cardio.minutes
    })
    .select('id')
    .single();

  if (error) throw error;
  const routineId = data.id as string;

  const { error: exercisesError } = await client.from('routine_exercises').insert(toRows(routineId, input.exercises));

  if (exercisesError) {
    // Sin transacción entre dos requests: una rutina sin ejercicios no sirve de nada,
    // así que la borramos en vez de dejarla a medias en la lista.
    await client.from('routines').delete().eq('id', routineId);
    throw exercisesError;
  }

  return routineId;
}

/**
 * Reemplaza el contenido completo de la rutina.
 *
 * Borra y reinserta en vez de actualizar fila por fila: con unique
 * (routine_id, day_index, position), reordenar con updates parciales obliga a un
 * baile de posiciones temporales para no chocar a mitad de camino. Si la reinserción
 * falla, restauramos las filas anteriores para no dejar la rutina vacía.
 *
 * Sigue sin ser atómico. Un RPC como save_workout_with_sets sería mejor y está
 * pendiente; mientras tanto, el rollback manual cubre el caso realista (fallo de red
 * en el segundo request).
 */
export async function updateRoutine(id: string, input: RoutineInput): Promise<void> {
  assertHasExercises(input.exercises);

  const client = requireSupabase();
  const previous = await getRoutine(id);

  const { error: deleteError } = await client.from('routine_exercises').delete().eq('routine_id', id);
  if (deleteError) throw deleteError;

  const { error: insertError } = await client.from('routine_exercises').insert(toRows(id, input.exercises));
  if (insertError) {
    if (previous && previous.exercises.length > 0) {
      await client.from('routine_exercises').insert(
        previous.exercises.map((exercise) => ({
          routine_id: id,
          exercise_id: exercise.exerciseId,
          day_index: exercise.dayIndex,
          position: exercise.position,
          muscle_group: exercise.muscleGroup,
          target_sets: exercise.targetSets,
          target_reps: exercise.targetReps,
          rest_seconds: exercise.restSeconds,
          transition_seconds: exercise.transitionSeconds
        }))
      );
    }
    throw insertError;
  }

  const { error: headerError } = await client
    .from('routines')
    .update({
      name: input.name.trim(),
      days_per_week: input.daysPerWeek,
      split_template_slug: input.splitTemplateSlug,
      cardio_placement: input.cardio.placement,
      cardio_exercise_id: input.cardio.placement === 'none' ? null : input.cardio.exerciseId,
      cardio_minutes: input.cardio.placement === 'none' ? null : input.cardio.minutes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (headerError) throw headerError;
}

/** Archivar, no borrar: los entrenamientos ya guardados apuntan a esta rutina. */
export async function archiveRoutine(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('routines')
    .update({ archived_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Renumera las posiciones dentro de cada día antes de insertar.
 * El array de entrada puede venir con huecos si el usuario quitó ejercicios, y la
 * restricción unique no tolera duplicados dentro del mismo día.
 */
function toRows(routineId: string, exercises: RoutineExerciseInput[]) {
  const positionByDay = new Map<number, number>();

  return exercises.map((exercise) => {
    const next = (positionByDay.get(exercise.dayIndex) ?? 0) + 1;
    positionByDay.set(exercise.dayIndex, next);

    return {
      routine_id: routineId,
      exercise_id: exercise.exerciseId,
      day_index: exercise.dayIndex,
      position: next,
      muscle_group: exercise.muscleGroup,
      target_sets: exercise.targetSets,
      target_reps: exercise.targetReps,
      rest_seconds: exercise.restSeconds,
      transition_seconds: exercise.transitionSeconds
    };
  });
}

function assertHasExercises(exercises: RoutineExerciseInput[]): void {
  if (exercises.length === 0) throw new Error('La rutina necesita al menos un ejercicio.');

  const emptyDays = new Set(exercises.map((exercise) => exercise.dayIndex));
  if (emptyDays.size === 0) throw new Error('La rutina necesita al menos un día con ejercicios.');
}

function countDays(exercises: ExerciseRow[]): number {
  const days = new Set(exercises.map((exercise) => exercise.day_index ?? 1));
  return Math.max(1, days.size);
}
