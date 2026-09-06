import AsyncStorage from '@react-native-async-storage/async-storage';

import { WorkoutSetDraft } from '../types/workoutSession';

const PREFIX = '@hypertrophy-coach/active-workout-draft/v1';

/**
 * Borrador de una sesión en curso: series confirmadas antes de "Finalizar entrenamiento".
 *
 * Es deliberadamente más chico que `CompletedWorkoutDraft`: solo existe para sobrevivir
 * a un cierre/recarga de la app, nunca llega a Supabase. Se borra al finalizar (guardado
 * u ofline) y no participa de la cola de sincronización.
 */
export type WorkoutSessionDraft = {
  startedAt: string;
  setsByExercise: Record<string, WorkoutSetDraft[]>;
  skippedWarmups: string[];
};

function keyFor(userId: string, sessionKey: string): string {
  return `${PREFIX}/${userId}/${sessionKey}`;
}

export async function loadWorkoutSessionDraft(userId: string, sessionKey: string): Promise<WorkoutSessionDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(keyFor(userId, sessionKey));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    return isWorkoutSessionDraft(parsed) ? parsed : null;
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
