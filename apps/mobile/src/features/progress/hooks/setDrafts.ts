import { SetKind, WorkoutSetDraft } from '../types/workoutSession';

/**
 * Series EFECTIVAS por defecto. El calentamiento va aparte, encima de estas.
 *
 * `routine_exercises.target_sets` también cuenta series efectivas, así que `volume.ts`
 * puede seguir sumándolas como volumen sin corregir nada.
 */
export const EFFECTIVE_SETS_PER_EXERCISE = 3;

export function blankSet(exerciseId: string, setNumber: number, kind: SetKind): WorkoutSetDraft {
  return {
    id: `${exerciseId}-set-${setNumber}`,
    exerciseId,
    setNumber,
    kind,
    weightKg: '',
    repetitions: '',
    autoFilled: { weightKg: false, repetitions: false },
    completed: false,
    completedAt: null
  };
}

/** Renumera y regenera los ids después de quitar o devolver el calentamiento. */
function renumber(exerciseId: string, sets: WorkoutSetDraft[]): WorkoutSetDraft[] {
  return sets.map((set, index) =>
    set.setNumber === index + 1 ? set : { ...set, setNumber: index + 1, id: `${exerciseId}-set-${index + 1}` }
  );
}

/**
 * Ajusta la forma de las series sin perder lo registrado.
 *
 * Al recortar nunca se tira una serie que el usuario ya completó: si la rutina pide 3
 * y él ya marcó 4, se quedan las 4. Lo mismo con el calentamiento: si ya lo hizo y
 * luego pulsa "saltar", la serie hecha se queda. Perder trabajo hecho es peor que
 * desobedecer el objetivo.
 */
export function reconcileSets(
  exerciseId: string,
  existing: WorkoutSetDraft[] | undefined,
  effectiveCount: number,
  withWarmup: boolean
): WorkoutSetDraft[] {
  if (!existing) {
    const fresh: WorkoutSetDraft[] = withWarmup ? [blankSet(exerciseId, 1, 'warmup')] : [];
    for (let i = 0; i < effectiveCount; i += 1) fresh.push(blankSet(exerciseId, fresh.length + 1, 'effective'));
    return fresh;
  }

  const currentWarmup = existing.find((set) => set.kind === 'warmup') ?? null;
  const currentEffective = existing.filter((set) => set.kind === 'effective');

  const warmup: WorkoutSetDraft[] = withWarmup
    ? [currentWarmup ?? blankSet(exerciseId, 1, 'warmup')]
    : currentWarmup?.completed
      ? [currentWarmup]
      : [];

  let effective = currentEffective;
  if (currentEffective.length > effectiveCount) {
    const lastCompleted = currentEffective.reduce((max, set, index) => (set.completed ? index + 1 : max), 0);
    effective = currentEffective.slice(0, Math.max(effectiveCount, lastCompleted));
  } else if (currentEffective.length < effectiveCount) {
    effective = [...currentEffective];
    while (effective.length < effectiveCount) effective.push(blankSet(exerciseId, 0, 'effective'));
  }

  const next = renumber(exerciseId, [...warmup, ...effective]);

  // Sin esta comparación se devolvería un array nuevo en cada render y el estado no
  // dejaría de cambiar de identidad.
  const unchanged = next.length === existing.length && next.every((set, index) => set === existing[index]);
  return unchanged ? existing : next;
}

/**
 * Escribe un campo y arrastra el valor a las series de abajo.
 *
 * Reglas del arrastre, pensadas para que nunca pise lo que el usuario escribió:
 *  - solo entre series efectivas (el peso del calentamiento es más bajo a propósito);
 *  - solo hacia abajo;
 *  - nunca sobre una serie ya completada;
 *  - solo si la casilla está vacía o su valor vino de un arrastre anterior.
 *
 * Esa última regla es la que hace que funcione al teclear: al escribir "40", la "4" se
 * copia abajo; cuando llega el "0", las de abajo ya no están vacías, pero como están
 * marcadas como autocompletadas se vuelven a actualizar a "40".
 */
export function applySetValue(
  sets: WorkoutSetDraft[],
  setNumber: number,
  field: 'weightKg' | 'repetitions',
  value: string
): WorkoutSetDraft[] {
  const source = sets.find((set) => set.setNumber === setNumber);
  if (!source) return sets;
  const propagates = source.kind === 'effective';

  return sets.map((set) => {
    if (set.setNumber === setNumber) {
      return { ...set, [field]: value, autoFilled: { ...set.autoFilled, [field]: false } };
    }

    if (!propagates || set.kind !== 'effective' || set.setNumber <= setNumber || set.completed) return set;
    if (set[field].trim().length > 0 && !set.autoFilled[field]) return set;

    return { ...set, [field]: value, autoFilled: { ...set.autoFilled, [field]: true } };
  });
}
