import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCompletedWorkoutDates } from '../services/workoutSessionRepository';
import { calculateWorkoutStreak } from '../services/streaks';
import { usePendingWorkouts } from './usePendingWorkouts';

type ProgressSummary = {
  completedDates: string[];
  streakDays: number;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

/**
 * Fuente única para racha y calendario. StreakBadge y WeeklyCalendar siguen siendo
 * componentes de presentación: reciben datos por props y no saben que existe Supabase.
 */
export function useProgressSummary(): ProgressSummary {
  const [serverDates, setServerDates] = useState<string[]>([]);
  const { pending } = usePendingWorkouts();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const dates = await getCompletedWorkoutDates();
      if (!isMountedRef.current) return;
      setServerDates(dates);
    } catch {
      if (!isMountedRef.current) return;
      setError('No pudimos cargar tu historial. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  // Cuando la cola se vacía, esas fechas dejan de venir de `pending` y tienen que venir
  // del servidor: sin este refetch el día entrenado desaparecería del calendario al sincronizar.
  const previousPendingCountRef = useRef(pending.length);
  useEffect(() => {
    if (pending.length < previousPendingCountRef.current) void load();
    previousPendingCountRef.current = pending.length;
  }, [load, pending.length]);

  // Al volver del entrenamiento la racha debe estar actualizada, por eso useFocusEffect.
  useFocusEffect(useCallback(() => {
    isMountedRef.current = true;
    void load();
    return () => { isMountedRef.current = false; };
  }, [load]));

  // Un entrenamiento en cola ya es un entrenamiento hecho: si no lo contáramos, el usuario
  // vería su racha caer justo después de entrenar sin señal.
  const completedDates = useMemo(
    () => [...new Set([...serverDates, ...pending.map((item) => localDateKey(new Date(item.workout.endedAt)))])],
    [pending, serverDates]
  );

  return {
    completedDates,
    streakDays: calculateWorkoutStreak(completedDates),
    isLoading,
    error,
    reload: () => void load(),
  };
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
