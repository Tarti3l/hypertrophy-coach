import AsyncStorage from '@react-native-async-storage/async-storage';

import { WorkoutSetDraft } from '../types/workoutSession';

const PREFIX = '@hypertrophy-coach/active-workout-draft/v1';

/**
 * Ninguna sesión de gimnasio real dura esto. Es el mismo tope que `useWorkoutSession` ya le
 * aplica a `durationMinutes` de un entrenamiento finalizado (360 min): ese número ya es la
 * definición del producto de "cuánto puede durar como mucho una sesión", así que un borrador
 * más viejo no puede ser "la sesión de hoy, todavía abierta" — es una que quedó abandonada un
 * día anterior. Sin este tope, volver a la misma rutina y día días después restauraba series
 * viejas con su `startedAt` viejo, como si fueran de ahora mismo.
 */
export const MAX_WORKOUT_SESSION_HOURS = 6;

/**
 * Borrador de una sesión en curso: series confirmadas antes de "Finalizar entrenamiento".
 *
 * Es deliberadamente más chico que `CompletedWorkoutDraft`: solo existe para sobrevivir
 * a un cierre/recarga de la app, nunca llega a Supabase. Se borra al finalizar (guardado
 * u ofline), al vencer, o no participa de la cola de sincronización.
 */
export type WorkoutSessionDraft = {
  startedAt: string;
  setsByExercise: Record<string, WorkoutSetDraft[]>;
  skippedWarmups: string[];
};

function keyFor(userId: string, sessionKey: string): string {
  return `${PREFIX}/${userId}/${sessionKey}`;
}

/**
 * `null` cuando no hay borrador, está corrupto, o venció: en los tres casos la sesión debe
 * arrancar en blanco, así que el llamador no necesita distinguirlos. Un borrador vencido se
 * borra acá mismo — no tiene sentido dejarlo para que lo pise el próximo guardado.
 */
export async function loadWorkoutSessionDraft(userId: string, sessionKey: string): Promise<WorkoutSessionDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, sessionKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!isWorkoutSessionDraft(parsed)) return null;

    const ageMs = Date.now() - new Date(parsed.startedAt).getTime();
    if (!Number.isFinite(ageMs) || ageMs > MAX_WORKOUT_SESSION_HOURS * 60 * 60 * 1000) {
      await clearWorkoutSessionDraft(userId, sessionKey);
      return null;
    }

    return parsed;
  } catch {
    // Borrador corrupto o storage no disponible: arrancar en blanco es mejor que romper la sesión.
    return null;
  }
}

export async function saveWorkoutSessionDraft(userId: string, sessionKey: string, draft: WorkoutSessionDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(keyFor(userId, sessionKey), JSON.stringify(draft));
  } catch {
    // Persistir el borrador es una mejora sobre el comportamiento anterior, no una garantía
    // nueva: si falla, la sesión sigue funcionando en memoria como ya funcionaba.
  }
}

export async function clearWorkoutSessionDraft(userId: string, sessionKey: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(keyFor(userId, sessionKey));
  } catch {
    // Si no se pudo borrar, la próxima sesión con la misma clave lo sobrescribe igual.
  }
}

function isWorkoutSessionDraft(value: unknown): value is WorkoutSessionDraft {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<WorkoutSessionDraft>;
  return (
    typeof candidate.startedAt === 'string' &&
    typeof candidate.setsByExercise === 'object' &&
    candidate.setsByExercise !== null &&
    Array.isArray(candidate.skippedWarmups)
  );
}
