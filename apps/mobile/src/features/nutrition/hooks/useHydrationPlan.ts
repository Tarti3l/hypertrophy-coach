import { useCallback, useEffect, useRef, useState } from 'react';

import { getUserProfile } from '@/features/onboarding/services/onboardingProfileRepository';

import { calculateHydrationPlan, HydrationPlan } from '../services/hydrationCalculator';

type HydrationPlanState = {
  plan: HydrationPlan | null;
  isLoading: boolean;
  error: string | null;
  reload: () => void;
};

export function useHydrationPlan(): HydrationPlanState {
  const [plan, setPlan] = useState<HydrationPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await getUserProfile();
      if (!isMountedRef.current) return;

      // Sin perfil no inventamos un objetivo: la pantalla invita a completar el onboarding.
      setPlan(profile ? calculateHydrationPlan(profile) : null);
    } catch {
      if (!isMountedRef.current) return;
      setError('No pudimos calcular tu objetivo de agua. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return { plan, isLoading, error, reload: () => void load() };
}
