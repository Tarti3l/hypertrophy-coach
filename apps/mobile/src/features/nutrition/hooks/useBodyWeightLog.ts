import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import { getCompletedOnboarding } from '@/features/onboarding/services/onboardingStorage';

import { listBodyWeights } from '../services/bodyWeightRepository';
import { BodyWeightEntry, StartingWeight } from '../types/bodyWeight';

type BodyWeightLogState = {
  entries: BodyWeightEntry[];
  startingWeight: StartingWeight | null;
  isLoading: boolean;
  hasLoaded: boolean;
  error: string | null;
  reload: () => void;
};

export function useBodyWeightLog(): BodyWeightLogState {
  const [entries, setEntries] = useState<BodyWeightEntry[]>([]);
  const [startingWeight, setStartingWeight] = useState<StartingWeight | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const history = await listBodyWeights();
      if (!isMountedRef.current) return;

      setEntries(history);
      setHasLoaded(true);

      // El peso declarado en el onboarding es contexto, no un registro: que falte no
      // puede impedir ver el historial real.
      void getCompletedOnboarding()
        .then((onboarding) => {
          if (!isMountedRef.current) return;
          const declared = Number(onboarding?.profile.weightKg);
          setStartingWeight(
            onboarding && Number.isFinite(declared) && declared > 0
              ? { weightKg: declared, declaredOn: onboarding.completedAt ?? null }
              : null
          );
        })
        .catch(() => undefined);
    } catch {
      if (!isMountedRef.current) return;
      setError('No pudimos cargar tu historial de peso. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    isMountedRef.current = true;
    void load();
    return () => { isMountedRef.current = false; };
  }, [load]));

  return { entries, startingWeight, isLoading, hasLoaded, error, reload: () => void load() };
}
