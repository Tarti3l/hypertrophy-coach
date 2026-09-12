/**
 * Serie de aproximación vs. serie efectiva.
 *
 * `warmup` no cuenta como volumen ni como referencia de progresión: se guarda marcada
 * (workout_sets.is_warmup) para que "Anterior: 20 kg × 12" no acabe mostrando el
 * calentamiento en vez de la serie real.
 */
export type SetKind = 'warmup' | 'effective';

export type WorkoutSetDraft = {
  id: string;
  exerciseId: string;
  setNumber: number;
  kind: SetKind;
  weightKg: string;
  repetitions: string;
  /**
   * Qué campos llegaron por autocompletado y no por el dedo del usuario.
   *
   * Sin esta marca el autocompletado se rompe a mitad de un número: al escribir "40",
   * la "4" se copia a las series de abajo, y cuando llega el "0" esas ya no están
   * vacías, así que se quedarían en "4". Con la marca se siguen actualizando hasta que
   * el usuario toque esa fila.
   */
  autoFilled: { weightKg: boolean; repetitions: boolean };
  completed: boolean;
  completedAt: string | null;
};

export type CompletedWorkoutSet = {
  /** uuid de public.exercises */
  exerciseId: string;
  setNumber: number;
  weightKg: number;
  completedReps: number;
  completedAt: string;
  isWarmup: boolean;
};

export type CompletedWorkoutDraft = {
  /** Clave de idempotencia generada en el dispositivo. Se reusa en cada reintento. */
  clientId: string;
  startedAt: string;
  endedAt: string;
  durationMinutes: number;
  notes: string | null;
  sets: CompletedWorkoutSet[];
};

export type SavedWorkout = CompletedWorkoutDraft & {
  /** uuid devuelto por Supabase */
  id: string;
};

export type StrengthPoint = {
  value: number;
  label: string;
  date: string;
};

export type PendingWorkoutPayload = {
  /** Solo se sincroniza con la sesión del mismo usuario que lo encoló. */
  userId: string;
  queuedAt: string;
  attempts: number;
  lastError: string | null;
  /** true cuando el servidor lo rechazó por validación: no se reintenta más, pero no se borra. */
  blocked: boolean;
  workout: CompletedWorkoutDraft;
};

export type SaveFailureKind = 'network' | 'auth' | 'validation';

/** Una sesión terminada, con lo justo para reconocerla en una lista y poder borrarla. */
export type CompletedWorkoutSummary = {
  id: string;
  endedAt: string;
  durationMinutes: number | null;
  setCount: number;
  exerciseCount: number;
};
