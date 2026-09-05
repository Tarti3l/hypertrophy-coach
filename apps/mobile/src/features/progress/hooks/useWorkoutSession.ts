import { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { createUuid } from '@/utils/ids';

import { enqueueWorkout } from '../services/offlineWorkoutQueue';
import { classifySaveError, saveCompletedWorkout } from '../services/workoutSessionRepository';
import { CompletedWorkoutDraft, CompletedWorkoutSet, WorkoutSetDraft } from '../types/workoutSession';
import { applySetValue, EFFECTIVE_SETS_PER_EXERCISE, reconcileSets } from './setDrafts';

/** 'saved' = confirmado por Supabase. 'queued' = guardado en el dispositivo, pendiente de sincronizar. */
export type WorkoutSaveState = 'idle' | 'saved' | 'queued';

/**
 * `setsByExerciseId` viene de la rutina cuando la sesión nace de una: cada ejercicio
 * puede tener su propio número de series efectivas. Sin rutina, todos usan el valor por defecto.
 */
export function useWorkoutSession(exerciseIds: string[], setsByExerciseId?: Record<string, number>) {
  const { user } = useAuth();
  const [startedAt] = useState(() => new Date());
  // Una sola clave de idempotencia por sesión: la comparten el intento online y todos
  // los reintentos de la cola, así el servidor nunca crea un duplicado.
  const [clientId] = useState(() => createUuid());
  const [saveState, setSaveState] = useState<WorkoutSaveState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<string, WorkoutSetDraft[]>>({});
  /** Ejercicios en los que el usuario decidió ir directo a las series al fallo. */
  const [skippedWarmups, setSkippedWarmups] = useState<string[]>([]);
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinished, setIsFinished] = useState(false);

  // El catálogo llega de Supabase de forma asíncrona: los ejercicios no existen en el
  // primer render, así que los borradores se sincronizan cuando cambia la lista de ids.
  const exerciseKey = exerciseIds.join('|');
  const setCountKey = JSON.stringify(setsByExerciseId ?? {});
  const skippedKey = skippedWarmups.join('|');

  // Un solo sitio construye las series: este efecto. `toggleWarmup` solo cambia la
  // intención (skippedWarmups) y deja que aquí se reconcilie. Con dos sitios
  // construyendo, saltar el calentamiento y que el catálogo se resolviera después
  // lo volvía a añadir.
  useEffect(() => {
    if (isFinished) return;

    setSetsByExercise((current) => {
      const next: Record<string, WorkoutSetDraft[]> = {};
      const skipped = skippedKey ? skippedKey.split('|') : [];

      for (const exerciseId of exerciseKey ? exerciseKey.split('|') : []) {
        const effectiveCount = setsByExerciseId?.[exerciseId] ?? EFFECTIVE_SETS_PER_EXERCISE;
        next[exerciseId] = reconcileSets(exerciseId, current[exerciseId], effectiveCount, !skipped.includes(exerciseId));
      }
      return next;
    });
    // setCountKey entra como dependencia serializada: el objeto cambia de identidad
    // en cada render aunque su contenido sea el mismo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseKey, setCountKey, skippedKey, isFinished]);

  /**
   * El cronómetro se calcula contra el reloj, no sumando de uno en uno.
   *
   * Sumar 1 por tick pierde tiempo en cuanto la pantalla se bloquea o la pestaña pasa
   * a segundo plano (el navegador limita los intervalos a ~1/min): un entrenamiento de
   * 50 minutos se guardaba como 20. Es el mismo patrón que ya usaba useRestTimer.
   */
  useEffect(() => {
    if (isFinished) return;
    const startedMs = startedAt.getTime();
    const tick = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedMs) / 1000)));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [isFinished, startedAt]);

  /** Ver `applySetValue`: escribe y arrastra el valor a las series de abajo. */
  const updateSet = useCallback((exerciseId: string, setNumber: number, field: 'weightKg' | 'repetitions', value: string) => {
    setSetsByExercise((current) => {
      const sets = current[exerciseId];
      if (!sets) return current;

      return { ...current, [exerciseId]: applySetValue(sets, setNumber, field, value) };
    });
  }, []);

  const toggleSetComplete = useCallback((exerciseId: string, setNumber: number) => {
    setSetsByExercise((current) => {
      const sets = current[exerciseId];
      if (!sets) return current;
      return {
        ...current,
        [exerciseId]: sets.map((set) => {
          if (set.setNumber !== setNumber) return set;
          const completed = !set.completed;
          return { ...set, completed, completedAt: completed ? new Date().toISOString() : null };
        })
      };
    });
  }, []);

  /** Quita o devuelve la serie de calentamiento de un ejercicio. */
  const toggleWarmup = useCallback((exerciseId: string) => {
    setSkippedWarmups((current) =>
      current.includes(exerciseId) ? current.filter((id) => id !== exerciseId) : [...current, exerciseId]
    );
  }, []);

  // Solo cuentan las efectivas: el calentamiento no es trabajo que sume volumen.
  const completedSetCount = useMemo(
    () => Object.values(setsByExercise).flat().filter((set) => set.completed && set.kind === 'effective').length,
    [setsByExercise]
  );

  /** Cualquier serie marcada, calentamiento incluido: decide si hay algo que guardar. */
  const completedAnySetCount = useMemo(
    () => Object.values(setsByExercise).flat().filter((set) => set.completed).length,
    [setsByExercise]
  );

  const completedExerciseCount = useMemo(
    () => Object.values(setsByExercise).filter((sets) => sets.length > 0 && sets.every((set) => set.completed)).length,
    [setsByExercise]
  );

  const finishWorkout = useCallback(async (): Promise<WorkoutSaveState | null> => {
    if (completedAnySetCount === 0 || isFinishing || isFinished) return null;

    const userId = user?.id;
    if (!userId) {
      setFinishError('Tu sesión expiró. Inicia sesión de nuevo para guardar el entrenamiento.');
      return null;
    }

    setIsFinishing(true);
    setFinishError(null);

    const endedAt = new Date();
    const sets: CompletedWorkoutSet[] = Object.values(setsByExercise)
      .flat()
      .filter((set) => {
        const weight = Number(set.weightKg.replace(',', '.'));
        const repetitions = Number(set.repetitions);
        return set.completed && Number.isFinite(weight) && weight >= 0 && Number.isInteger(repetitions) && repetitions > 0;
      })
      .map((set) => ({
        exerciseId: set.exerciseId,
        setNumber: set.setNumber,
        weightKg: Number(set.weightKg.replace(',', '.')),
        completedReps: Number(set.repetitions),
        completedAt: set.completedAt ?? endedAt.toISOString(),
        isWarmup: set.kind === 'warmup'
      }));

    if (sets.length === 0) {
      setFinishError('Completa al menos una serie con un peso y repeticiones válidos.');
      setIsFinishing(false);
      return null;
    }

    const draft: CompletedWorkoutDraft = {
      clientId,
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      // Contra el reloj, no contra el contador de pantalla: si la app estuvo en
      // segundo plano, elapsedSeconds podría ir corto.
      durationMinutes: Math.min(360, Math.max(1, Math.round((Date.now() - startedAt.getTime()) / 60000))),
      notes: null,
      sets
    };

    try {
      await saveCompletedWorkout(draft);
      setIsFinished(true);
      setSaveState('saved');
      return 'saved';
    } catch (error) {
      // Solo los fallos de red van a la cola. Un rechazo de validación se reintentaría
      // para siempre con el mismo resultado, así que se muestra como error.
      if (classifySaveError(error) !== 'network') {
        setFinishError(describeSaveError(error));
        return null;
      }

      try {
        // El hook no sabe que detrás hay AsyncStorage: solo delega en el servicio de cola.
        await enqueueWorkout(draft, userId);
        setIsFinished(true);
        setSaveState('queued');
        return 'queued';
      } catch {
        setFinishError('No pudimos guardar tu entrenamiento ni en el dispositivo. No cierres la app e inténtalo otra vez.');
        return null;
      }
    } finally {
      setIsFinishing(false);
    }
  }, [clientId, completedAnySetCount, isFinished, isFinishing, setsByExercise, startedAt, user?.id]);

  return {
    elapsedSeconds,
    setsByExercise,
    completedSetCount,
    completedExerciseCount,
    isFinishing,
    isFinished,
    saveState,
    finishError,
    updateSet,
    toggleSetComplete,
    toggleWarmup,
    finishWorkout
  };
}

function describeSaveError(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : null;

  // 28000 lo lanza save_workout_with_sets cuando auth.uid() es null.
  if (code === '28000' || code === 'PGRST301') return 'Tu sesión expiró. Inicia sesión de nuevo para guardar el entrenamiento.';
  if (code === '23503') return 'Uno de los ejercicios ya no está disponible. Recarga la rutina e inténtalo otra vez.';

  return 'No pudimos guardar tu entrenamiento. Inténtalo nuevamente.';
}

export function formatElapsedTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
