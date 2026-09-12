import { requireSupabase } from '@/lib/supabase';
import { selectWithOptionalColumns } from '@/lib/resilientSelect';

import { CompletedWorkoutDraft, CompletedWorkoutSummary, SaveFailureKind, SavedWorkout, StrengthPoint } from '../types/workoutSession';

/** Ventana suficiente para calcular racha y calendario sin traer todo el historial. */
const HISTORY_WINDOW_DAYS = 120;

export async function saveCompletedWorkout(draft: CompletedWorkoutDraft): Promise<SavedWorkout> {
  const client = requireSupabase();

  // Una sola llamada, una sola transacción. Ver 00003_save_workout_rpc.sql.
  const { data, error } = await client.rpc('save_workout_with_sets', {
    p_client_id: draft.clientId,
    p_started_at: draft.startedAt,
    p_ended_at: draft.endedAt,
    p_duration_minutes: draft.durationMinutes,
    p_notes: draft.notes,
    p_sets: draft.sets.map((set) => ({
      exercise_id: set.exerciseId,
      set_number: set.setNumber,
      completed_reps: set.completedReps,
      weight_kg: set.weightKg,
      completed_at: set.completedAt,
      is_warmup: set.isWarmup
    }))
  });

  if (error) throw error;
  if (typeof data !== 'string') throw new Error('Supabase no devolvió el identificador del entrenamiento.');

  return { ...draft, id: data };
}

/**
 * Clasifica un fallo de guardado. Es lo que decide si el entrenamiento va a la cola offline
 * o si mostramos un error: reintentar un payload inválido sería un bucle infinito.
 */
export function classifySaveError(error: unknown): SaveFailureKind {
  if (typeof error !== 'object' || error === null) return 'network';

  const code = 'code' in error ? String((error as { code: unknown }).code ?? '') : '';

  // 28000 = auth.uid() null en el RPC. PGRST301 = JWT vencido o ausente.
  if (code === '28000' || code === 'PGRST301') return 'auth';

  // PostgrestError siempre trae code: si llegó una respuesta del servidor, no es un problema de red.
  if (code) return 'validation';

  // TypeError('Network request failed'), AbortError por timeout, DNS caído: nunca llegó al servidor.
  return 'network';
}

/** Fechas locales (YYYY-MM-DD) con al menos un entrenamiento completado. RLS ya filtra por usuario. */
export async function getCompletedWorkoutDates(): Promise<string[]> {
  const client = requireSupabase();
  const since = new Date();
  since.setDate(since.getDate() - HISTORY_WINDOW_DAYS);

  const { data, error } = await client
    .from('workouts')
    .select('ended_at')
    .eq('status', 'completed')
    .not('ended_at', 'is', null)
    .gte('ended_at', since.toISOString())
    .order('ended_at', { ascending: false })
    .limit(400);

  if (error) throw error;

  const rows = (data ?? []) as { ended_at: string }[];
  return [...new Set(rows.map((row) => localDateKey(new Date(row.ended_at))))];
}

type CompletedWorkoutRow = {
  id: string;
  ended_at: string | null;
  duration_minutes: number | null;
  workout_sets: { exercise_id: string }[] | null;
};

/** Las sesiones terminadas más recientes, para poder revisarlas y borrar la que no va. */
export async function getCompletedWorkouts(limit = 20): Promise<CompletedWorkoutSummary[]> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('workouts')
    .select('id, ended_at, duration_minutes, workout_sets(exercise_id)')
    .eq('status', 'completed')
    .not('ended_at', 'is', null)
    .order('ended_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as CompletedWorkoutRow[])
    .filter((row): row is CompletedWorkoutRow & { ended_at: string } => row.ended_at !== null)
    .map((row) => {
      const sets = row.workout_sets ?? [];
      return {
        id: row.id,
        endedAt: row.ended_at,
        durationMinutes: row.duration_minutes,
        setCount: sets.length,
        exerciseCount: new Set(sets.map((set) => set.exercise_id)).size
      };
    });
}

/**
 * Borra una sesión terminada. Las series se van con ella: workout_sets.workout_id tiene
 * `on delete cascade`, así que no hace falta borrarlas aparte ni quedan huérfanas. Y como
 * todo lo que calcula progreso y sugerencias lee de esas mismas filas, dejan de contarse
 * solas — no hay ningún total guardado aparte que haya que corregir.
 *
 * RLS (`users manage their workouts`, política `for all`) limita el borrado a las
 * sesiones propias: pasar el id de otra persona no borra nada.
 */
export async function deleteCompletedWorkout(workoutId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('workouts').delete().eq('id', workoutId);
  if (error) throw error;
}

type StrengthRow = {
  weight_kg: number | null;
  /**
   * undefined mientras la migracion 00020 no haya corrido. En ese caso no se filtra
   * nada, que es como se comportaba la app antes: mejor una referencia imprecisa que
   * una pantalla vacia. Ver lib/resilientSelect.ts.
   */
  is_warmup?: boolean;
  workouts: { id: string; ended_at: string | null } | null;
};

/** Peso máximo levantado por sesión para un ejercicio, en orden cronológico. */
export async function getStrengthProgress(exerciseId: string, maxPoints = 8): Promise<StrengthPoint[]> {
  const client = requireSupabase();

  const { rows } = await selectWithOptionalColumns<StrengthRow>(
    (columns) => client
      .from('workout_sets')
      .select(`${columns}, workouts!inner(id, ended_at, status)`)
      .eq('exercise_id', exerciseId)
      .eq('workouts.status', 'completed')
      .not('weight_kg', 'is', null)
      .limit(400),
    ['weight_kg'],
    ['is_warmup']
  );

  const bestBySession = new Map<string, { weight: number; endedAt: string }>();

  for (const row of rows) {
    const workout = row.workouts;
    if (row.is_warmup) continue;
    if (!workout?.ended_at || row.weight_kg === null) continue;

    const current = bestBySession.get(workout.id);
    if (!current || row.weight_kg > current.weight) {
      bestBySession.set(workout.id, { weight: Number(row.weight_kg), endedAt: workout.ended_at });
    }
  }

  return [...bestBySession.values()]
    .sort((a, b) => a.endedAt.localeCompare(b.endedAt))
    .slice(-maxPoints)
    .map((entry) => ({
      value: entry.weight,
      label: shortDateLabel(new Date(entry.endedAt)),
      date: entry.endedAt
    }));
}

type HistoryRow = {
  set_number: number;
  weight_kg: number | null;
  completed_reps: number | null;
  is_warmup?: boolean;
  workouts: { id: string; ended_at: string | null } | null;
};

/**
 * Las últimas sesiones de un ejercicio, de más reciente a más antigua.
 * Es la materia prima de la sugerencia de sobrecarga progresiva.
 */
export async function getExerciseHistory(exerciseId: string, sessions = 2): Promise<{ endedAt: string; sets: { setNumber: number; weightKg: number; completedReps: number }[] }[]> {
  const client = requireSupabase();

  const { rows } = await selectWithOptionalColumns<HistoryRow>(
    (columns) => client
      .from('workout_sets')
      .select(`${columns}, workouts!inner(id, ended_at, status)`)
      .eq('exercise_id', exerciseId)
      .eq('workouts.status', 'completed')
      .not('weight_kg', 'is', null)
      // Sin este order, PostgREST devolvía 200 filas en orden arbitrario y el corte se
      // hacía después en cliente: alguien con muchas sesiones de un ejercicio podía
      // recibir un lote sin sus dos últimas, y la sugerencia de progresión se calculaba
      // sobre pesos viejos.
      .order('ended_at', { ascending: false, referencedTable: 'workouts' })
      .limit(200),
    ['set_number', 'weight_kg', 'completed_reps'],
    ['is_warmup']
  );

  const bySession = new Map<string, { endedAt: string; sets: { setNumber: number; weightKg: number; completedReps: number }[] }>();

  for (const row of rows) {
    const workout = row.workouts;
    // Una serie de aproximacion con la mitad del peso hundiria la media de la sesion y
    // la progresion sugeriria bajar el peso justo despues de una buena sesion.
    if (row.is_warmup) continue;
    if (!workout?.ended_at || row.weight_kg === null || row.completed_reps === null) continue;

    const entry = bySession.get(workout.id) ?? { endedAt: workout.ended_at, sets: [] };
    entry.sets.push({
      setNumber: Number(row.set_number),
      weightKg: Number(row.weight_kg),
      completedReps: Number(row.completed_reps)
    });
    bySession.set(workout.id, entry);
  }

  return [...bySession.values()]
    .sort((a, b) => b.endedAt.localeCompare(a.endedAt))
    .slice(0, sessions)
    .map((session) => ({ ...session, sets: session.sets.sort((a, b) => a.setNumber - b.setNumber) }));
}

type LastPerformanceRow = {
  exercise_id: string;
  weight_kg: number | null;
  completed_reps: number | null;
  completed_at: string | null;
  is_warmup?: boolean;
};

/** Último "peso × reps" registrado por ejercicio, para mostrarlo como referencia en el SetTracker. */
export async function getLastPerformanceByExercise(exerciseIds: string[]): Promise<Record<string, string>> {
  if (exerciseIds.length === 0) return {};

  const client = requireSupabase();
  const { rows } = await selectWithOptionalColumns<LastPerformanceRow>(
    (columns) => client
      .from('workout_sets')
      .select(`${columns}, workouts!inner(status)`)
      .in('exercise_id', exerciseIds)
      .eq('workouts.status', 'completed')
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(200),
    ['exercise_id', 'weight_kg', 'completed_reps', 'completed_at'],
    ['is_warmup']
  );

  const latest: Record<string, string> = {};
  for (const row of rows) {
    if (latest[row.exercise_id]) continue;
    // El calentamiento nunca es la referencia: "Anterior: 20 kg x 12" sacado de una
    // serie de aproximacion haria que el usuario cargara la mitad de lo que puede.
    if (row.is_warmup) continue;
    if (row.completed_reps === null) continue;

    latest[row.exercise_id] = row.weight_kg && row.weight_kg > 0
      ? `${formatWeight(Number(row.weight_kg))} kg × ${row.completed_reps}`
      : `${row.completed_reps} reps`;
  }

  return latest;
}

export type TodaysCompletedSet = {
  exerciseId: string;
  setNumber: number;
  completedReps: number | null;
  weightKg: number | null;
};

export type TodaysCompletedWorkout = {
  workoutId: string;
  endedAt: string;
  sets: TodaysCompletedSet[];
};

type TodaysWorkoutRow = {
  id: string;
  ended_at: string;
  workout_sets: {
    exercise_id: string;
    set_number: number;
    completed_reps: number | null;
    weight_kg: number | null;
    is_warmup: boolean;
  }[];
};

/**
 * Umbral de la heurística de abajo: qué fracción de los ejercicios de hoy alcanza para
 * decir "este es el mismo entrenamiento". Ver el comentario de la función.
 */
const SAME_SESSION_OVERLAP = 0.5;

/**
 * El entrenamiento ya completado hoy que mejor coincide con estos ejercicios, si existe.
 *
 * `workouts` no guarda a qué rutina o día perteneció — no hay columna para eso (ver
 * 00001_initial_schema.sql). Para distinguir "ya hice ESTE día hoy" de "entrené otro día
 * de la rutina más temprano hoy" se compara qué ejercicios quedaron registrados: si al
 * menos la mitad de los de hoy aparecen en un entrenamiento de hoy, se asume que es el
 * mismo. Agregar una columna que ligue el entrenamiento a rutina+día resolvería esto sin
 * heurística, pero es un cambio a cómo se guarda un entrenamiento — de un alcance mayor
 * al de esta lectura de item [19].
 */
export async function getTodaysCompletedWorkoutForExercises(exerciseIds: string[]): Promise<TodaysCompletedWorkout | null> {
  if (exerciseIds.length === 0) return null;

  const client = requireSupabase();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await client
    .from('workouts')
    .select('id, ended_at, workout_sets(exercise_id, set_number, completed_reps, weight_kg, is_warmup)')
    .eq('status', 'completed')
    .gte('ended_at', startOfDay.toISOString())
    .order('ended_at', { ascending: false })
    .limit(5);

  if (error) throw error;

  const idSet = new Set(exerciseIds);
  let best: { row: TodaysWorkoutRow; overlap: number } | null = null;

  for (const row of (data ?? []) as TodaysWorkoutRow[]) {
    const logged = new Set(row.workout_sets.map((set) => set.exercise_id));
    const overlap = [...logged].filter((id) => idSet.has(id)).length / idSet.size;
    if (overlap >= SAME_SESSION_OVERLAP && (!best || overlap > best.overlap)) {
      best = { row, overlap };
    }
  }

  if (!best) return null;

  return {
    workoutId: best.row.id,
    endedAt: best.row.ended_at,
    sets: best.row.workout_sets
      .filter((set) => !set.is_warmup)
      .map((set) => ({
        exerciseId: set.exercise_id,
        setNumber: set.set_number,
        completedReps: set.completed_reps,
        weightKg: set.weight_kg
      }))
      .sort((a, b) => a.setNumber - b.setNumber)
  };
}

function formatWeight(weight: number): string {
  return Number.isInteger(weight) ? String(weight) : weight.toFixed(1).replace('.', ',');
}

function shortDateLabel(date: Date): string {
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
