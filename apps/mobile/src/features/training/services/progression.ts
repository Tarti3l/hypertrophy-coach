/**
 * Sugerencia de sobrecarga progresiva. Fuentes en docs/progression.md.
 *
 * Regla 2-por-2 (NSCA): si en la ÚLTIMA SERIE de las DOS últimas sesiones de un
 * ejercicio se hicieron 2 repeticiones o más por encima del objetivo, toca subir peso.
 *
 * Incrementos (NSCA, personas poco entrenadas): tren superior 2-5 lb (~1-2.3 kg),
 * tren inferior 5-10 lb (~2.3-4.5 kg). En términos relativos se manejan subidas
 * del 2.5 al 10 %. Usamos el salto de disco más pequeño realista y lo topamos al
 * 10 % del peso actual, para que con cargas ligeras la subida no sea desproporcionada:
 * en una mancuerna de 10 kg, +2.5 kg sería un 25 %.
 */

export const DEFAULT_TARGET_REPS = 10;

/** Salto de disco más pequeño que suele haber en un gimnasio (2 discos de 1.25 / 2.5 kg). */
const UPPER_BODY_STEP_KG = 2.5;
const LOWER_BODY_STEP_KG = 5;
/** Techo relativo, extremo superior del rango 2.5-10 % de la NSCA. */
const MAX_RELATIVE_STEP = 0.1;

const LOWER_BODY_HINTS = ['pierna', 'cuádriceps', 'cuadriceps', 'glúteo', 'gluteo', 'isquio', 'femoral', 'pantorrilla', 'gemelo'];

export type SessionSummary = {
  endedAt: string;
  /** Series de esa sesión, en orden. */
  sets: { setNumber: number; weightKg: number; completedReps: number }[];
};

export type ProgressionKind = 'first-time' | 'repeat' | 'add-reps' | 'add-weight';

export type ProgressionSuggestion = {
  kind: ProgressionKind;
  suggestedWeightKg: number | null;
  suggestedReps: number | null;
  /** Texto corto para la pantalla. */
  message: string;
};

/** Recibe el grupo muscular ya formateado ("Pecho · Tríceps") para no depender de arrays. */
export function isLowerBody(muscleGroup: string): boolean {
  const normalized = muscleGroup.toLowerCase();
  return LOWER_BODY_HINTS.some((hint) => normalized.includes(hint));
}

export function suggestProgression(
  history: SessionSummary[],
  targetReps: number = DEFAULT_TARGET_REPS,
  lowerBody = false
): ProgressionSuggestion {
  if (history.length === 0) {
    return {
      kind: 'first-time',
      suggestedWeightKg: null,
      suggestedReps: targetReps,
      message: `Primera vez con este ejercicio. Empieza con un peso que puedas mover ${targetReps} veces con buena técnica.`
    };
  }

  // history llega de más reciente a más antigua.
  const [last, previous] = history;
  const lastTopSet = topSet(last);
  if (!lastTopSet) {
    return {
      kind: 'repeat',
      suggestedWeightKg: null,
      suggestedReps: targetReps,
      message: 'Repite el peso de la última vez y apunta a completar todas las series.'
    };
  }

  const previousTopSet = previous ? topSet(previous) : null;
  const metTwoForTwo = previousTopSet !== null
    && lastTopSet.completedReps >= targetReps + 2
    && previousTopSet.completedReps >= targetReps + 2;

  if (metTwoForTwo) {
    const nextWeight = addStep(lastTopSet.weightKg, lowerBody);
    return {
      kind: 'add-weight',
      suggestedWeightKg: nextWeight,
      suggestedReps: targetReps,
      message: `Dos sesiones seguidas pasaste de ${targetReps + 1} repeticiones. Sube a ${formatKg(nextWeight)} y vuelve a ${targetReps}.`
    };
  }

  if (lastTopSet.completedReps >= targetReps) {
    return {
      kind: 'add-reps',
      suggestedWeightKg: lastTopSet.weightKg,
      suggestedReps: lastTopSet.completedReps + 1,
      message: `La última vez hiciste ${lastTopSet.completedReps} con ${formatKg(lastTopSet.weightKg)}. Prueba una repetición más antes de subir peso.`
    };
  }

  return {
    kind: 'repeat',
    suggestedWeightKg: lastTopSet.weightKg,
    suggestedReps: targetReps,
    message: `La última vez hiciste ${lastTopSet.completedReps} con ${formatKg(lastTopSet.weightKg)}. Repite el peso hasta llegar a ${targetReps}.`
  };
}

/** La regla 2-por-2 mira la última serie de la sesión, que es la más exigente. */
function topSet(session: SessionSummary): SessionSummary['sets'][number] | null {
  if (session.sets.length === 0) return null;
  return session.sets.reduce((latest, set) => set.setNumber > latest.setNumber ? set : latest, session.sets[0]);
}

function addStep(currentKg: number, lowerBody: boolean): number {
  const fixed = lowerBody ? LOWER_BODY_STEP_KG : UPPER_BODY_STEP_KG;
  const step = Math.max(0.5, Math.min(fixed, currentKg * MAX_RELATIVE_STEP));
  return roundToHalf(currentKg + step);
}

function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

function formatKg(value: number): string {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} kg`;
}
