import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { listRoutines } from '../services/routineRepository';
import { RoutineSummary } from '../types/routine';

type RoutinesState = {
  routines: RoutineSummary[];
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useRoutines(): RoutinesState {
  const [routines, setRoutines] = useState<RoutineSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await listRoutines();
      if (isMountedRef.current) setRoutines(items);
    } catch {
      if (isMountedRef.current) setError('No pudimos cargar tus rutinas. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isMountedRef.current = true;
    void load();
    return () => { isMountedRef.current = false; };
  }, [load]));

  return { routines, isLoading, error, reload: () => void load() };
}
