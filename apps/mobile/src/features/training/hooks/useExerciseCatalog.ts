import { useCallback, useEffect, useRef, useState } from 'react';

import { describeSupabaseError } from '@/lib/supabaseErrors';

import { catalogIsDegraded, fetchExerciseCatalog, invalidateExerciseCatalog } from '../services/exerciseCatalog';
import { TrainingExercise } from '../types/training';

type ExerciseCatalogState = {
  exercises: TrainingExercise[];
  isLoading: boolean;
  error: string | null;
  /** true si faltan columnas nuevas y el catálogo se cargó sin evidencia ni agarres. */
  isDegraded: boolean;
  reload: () => void;
};

export function useExerciseCatalog(): ExerciseCatalogState {
  const [exercises, setExercises] = useState<TrainingExercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDegraded, setIsDegraded] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const catalog = await fetchExerciseCatalog();
      if (!isMountedRef.current) return;
      setExercises(catalog);
      setIsDegraded(catalogIsDegraded());
    } catch (caught) {
      if (!isMountedRef.current) return;
      setError(describeSupabaseError(caught, 'No pudimos cargar los ejercicios.'));
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reload = useCallback(() => {
    invalidateExerciseCatalog();
    void load();
  }, [load]);

  return { exercises, isLoading, error, isDegraded, reload };
}
