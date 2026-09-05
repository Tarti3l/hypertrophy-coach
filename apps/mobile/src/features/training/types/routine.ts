import { CardioPlacement } from './split';
import { MuscleGroupSlug } from './training';

export type RoutineExercise = {
  id: string;
  exerciseId: string;
  /** Qué día de la semana de la rutina. 1..7. */
  dayIndex: number;
  position: number;
  muscleGroup: MuscleGroupSlug | null;
  targetSets: number;
  targetReps: number | null;
  /** Descanso entre series de este ejercicio. */
  restSeconds: number | null;
  /** Descanso al pasar al siguiente ejercicio. */
  transitionSeconds: number | null;
};

export type RoutineCardio = {
  placement: CardioPlacement;
  exerciseId: string | null;
  minutes: number | null;
};

export type Routine = {
  id: string;
  name: string;
  notes: string | null;
  daysPerWeek: number;
  splitTemplateSlug: string | null;
  cardio: RoutineCardio;
  exercises: RoutineExercise[];
};

export type RoutineSummary = {
  id: string;
  name: string;
  daysPerWeek: number;
  exerciseCount: number;
  totalSets: number;
  cardioPlacement: CardioPlacement;
};

export type RoutineExerciseInput = {
  exerciseId: string;
  dayIndex: number;
  muscleGroup: MuscleGroupSlug | null;
  targetSets: number;
  targetReps: number | null;
  restSeconds: number | null;
  transitionSeconds: number | null;
};

export type RoutineInput = {
  name: string;
  daysPerWeek: number;
  splitTemplateSlug: string | null;
  cardio: RoutineCardio;
  exercises: RoutineExerciseInput[];
};

export const DEFAULT_TARGET_SETS = 3;
export const DEFAULT_TARGET_REPS = 10;
/**
 * Descansos que ofrecemos en el selector, en segundos.
 *
 * El rango sale de docs/rutinas.md §9: para hipertrofia, por encima de 90 s el
 * meta-análisis bayesiano de 2024 no encuentra más crecimiento; los 2-3 min son para
 * no perder fuerza en los compuestos pesados (Schoenfeld 2016; Grgic 2017).
 */
export const MIN_REST_SECONDS = 30;
export const MAX_REST_SECONDS = 300;
export const REST_STEP_SECONDS = 15;

export const MIN_SETS = 1;
export const MAX_SETS = 10;
export const MIN_REPS = 1;
export const MAX_REPS = 100;
/**
 * Solo 3, 4 o 5 días. Por debajo de 3 no se puede separar pierna de torso sin dejar
 * algún grupo suelto, y por encima de 5 el reparto deja de aportar: con volumen
 * semanal igualado, 6 sesiones dieron lo mismo que 3 (Saric et al. 2019).
 */
export const MIN_DAYS_PER_WEEK = 3;
export const MAX_DAYS_PER_WEEK = 5;
/** Cinco días es lo que la app marca como recomendado. El porqué está en docs/rutinas.md §3.3. */
export const RECOMMENDED_DAYS_PER_WEEK = 5;
