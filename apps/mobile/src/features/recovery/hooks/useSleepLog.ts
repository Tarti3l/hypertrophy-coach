import { useCallback, useEffect, useRef, useState } from 'react';

import { getSleepLogForDate, getWeeklySleepAverage, logSleep } from '../services/sleepLogRepository';
import { WeeklySleepSummary } from '../types/sleep';

const DEFAULT_HOURS = 7.5;

/**
 * Red de seguridad: @react-native-community/slider no garantiza onSlidingComplete en web
 * (react-native-web lo mapea a un input range). Sin esto, en la PWA el sueño no se guardaría nunca.
 */
const SAVE_DEBOUNCE_MS = 700;

export type SleepSaveState = 'idle' | 'saving' | 'saved' | 'error';

type SleepLogState = {
  hours: number;
  setHours: (hours: number) => void;
  save: (hours: number) => void;
  saveState: SleepSaveState;
  isLoading: boolean;
  loadError: string | null;
  weekly: WeeklySleepSummary;
  reload: () => void;
};

const EMPTY_WEEK: WeeklySleepSummary = { averageHours: null, nights: 0, entries: [] };

export function useSleepLog(): SleepLogState {
  const [hours, setHours] = useState(DEFAULT_HOURS);
  const [weekly, setWeekly] = useState<WeeklySleepSummary>(EMPTY_WEEK);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SleepSaveState>('idle');

  const isMountedRef = useRef(true);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Descarta respuestas de guardados viejos: el slider dispara varios seguidos. */
  const saveTokenRef = useRef(0);

  useEffect(() => () => {
    isMountedRef.current = false;
    if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [today, summary] = await Promise.all([getSleepLogForDate(), getWeeklySleepAverage()]);
      if (!isMountedRef.current) return;

      if (today) setHours(today.hours);
      setWeekly(summary);
    } catch {
      if (!isMountedRef.current) return;
      setLoadError('No pudimos cargar tu registro de sueño. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback((nextHours: number) => {
    const token = ++saveTokenRef.current;
    setSaveState('saving');

    void logSleep(nextHours)
      .then(() => getWeeklySleepAverage())
      .then((summary) => {
        // Otro guardado más reciente ya está en vuelo: su respuesta manda.
        if (!isMountedRef.current || token !== saveTokenRef.current) return;

        setWeekly(summary);
        setSaveState('saved');

        if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current);
        savedTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) setSaveState('idle');
        }, 2500);
      })
      .catch(() => {
        if (!isMountedRef.current || token !== saveTokenRef.current) return;
        setSaveState('error');
      });
  }, []);

  /** Arrastre del slider: actualiza el valor y programa el guardado. */
  const changeHours = useCallback((nextHours: number) => {
    setHours(nextHours);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(nextHours), SAVE_DEBOUNCE_MS);
  }, [save]);

  /** Soltar el slider (o reintentar): guarda ya y cancela el debounce pendiente. */
  const commitHours = useCallback((nextHours: number) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setHours(nextHours);
    save(nextHours);
  }, [save]);

  return { hours, setHours: changeHours, save: commitHours, saveState, isLoading, loadError, weekly, reload: () => void load() };
}
