import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getDayEntries, getFrequentEntries, sumEntries } from '../services/mealLogRepository';
import { DailyMacroConsumption, MealEntry } from '../types/nutrition';

const EMPTY: DailyMacroConsumption = { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0, hasIncompleteData: false };

type DailyNutritionState = {
  entries: MealEntry[];
  frequent: MealEntry[];
  consumed: DailyMacroConsumption;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  reload: () => void;
};

export function useDailyNutrition(): DailyNutritionState {
  const [entries, setEntries] = useState<MealEntry[]>([]);
  const [frequent, setFrequent] = useState<MealEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const today = await getDayEntries();
      if (!isMountedRef.current) return;

      setEntries(today);
      setHasLoaded(true);

      // Los atajos no deben decidir si podemos mostrar el consumo real de hoy.
      void getFrequentEntries()
        .then((repeats) => { if (isMountedRef.current) setFrequent(repeats); })
        .catch(() => undefined);
    } catch {
      if (!isMountedRef.current) return;
      setError('No pudimos cargar tus comidas de hoy. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isMountedRef.current = true;
    void load();
    return () => { isMountedRef.current = false; };
  }, [load]));

  return {
    entries,
    frequent,
    consumed: entries.length > 0 ? sumEntries(entries) : EMPTY,
    isLoading,
    hasLoaded,
    error,
    reload: () => void load()
  };
}
