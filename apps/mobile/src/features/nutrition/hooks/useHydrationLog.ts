import { useCallback, useEffect, useRef, useState } from 'react';

import { getHydrationLog, saveHydrationLog } from '../services/hydrationLogRepository';

/** Tocar varios vasos seguidos no debe disparar una escritura por toque. */
const SAVE_DEBOUNCE_MS = 600;

type HydrationLogState = {
  glasses: number;
  setGlasses: (glasses: number) => void;
  isLoading: boolean;
  saveFailed: boolean;
};

export function useHydrationLog(glassSizeMl: number, targetMl: number): HydrationLogState {
  const [glasses, setGlassesState] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [saveFailed, setSaveFailed] = useState(false);

  const isMountedRef = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    isMountedRef.current = false;
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  useEffect(() => {
    void getHydrationLog()
      .then((log) => { if (isMountedRef.current && log) setGlassesState(log.glasses); })
      .catch(() => undefined)
      .finally(() => { if (isMountedRef.current) setIsLoading(false); });
  }, []);

  // Optimista: el vaso se pinta al instante y la escritura va detrás. Si falla,
  // avisamos sin revertir: el usuario sí se tomó el agua.
  const setGlasses = useCallback((next: number) => {
    setGlassesState(next);
    setSaveFailed(false);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void saveHydrationLog(next, glassSizeMl, targetMl).catch(() => {
        if (isMountedRef.current) setSaveFailed(true);
      });
    }, SAVE_DEBOUNCE_MS);
  }, [glassSizeMl, targetMl]);

  return { glasses, setGlasses, isLoading, saveFailed };
}
