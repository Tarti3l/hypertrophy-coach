import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Últimos recursos, solo si ni la rutina ni el catálogo traen valor.
 * Los buenos vienen de exercises.default_rest_seconds (migración 00013):
 * 90 s entre series y 2-3 min al cambiar de ejercicio.
 */
export const DEFAULT_REST_SECONDS = 90;
export const DEFAULT_TRANSITION_SECONDS = 150;

type RestTimerState = {
  remaining: number;
  isRunning: boolean;
  /** true durante unos segundos después de llegar a cero, para poder avisar. */
  isFinished: boolean;
  start: (seconds?: number) => void;
  add: (seconds: number) => void;
  stop: () => void;
};

/** Cuánto se queda en pantalla el aviso de "descanso terminado". */
const FINISHED_LINGER_MS = 12000;

/**
 * Cuenta atrás entre series.
 *
 * Guarda el instante de fin, no el segundo restante: si la pantalla se apaga o la
 * app pasa a segundo plano, los setInterval se ralentizan o se detienen, y un
 * contador que resta de uno en uno terminaría atrasado. Calcularlo contra el reloj
 * hace que al volver el tiempo sea el correcto.
 */
export function useRestTimer(): RestTimerState {
  const [remaining, setRemaining] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const endsAtRef = useRef<number | null>(null);
  const finishedAtRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    if (endsAtRef.current !== null) {
      const left = Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        endsAtRef.current = null;
        finishedAtRef.current = Date.now();
        setIsFinished(true);
      }
      return;
    }

    // Al llegar a cero el contador se desmontaba en el acto. Quien no estuviera
    // mirando la pantalla en ese instante no se enteraba de que el descanso había
    // terminado, que es justo cuando hace falta el aviso.
    if (finishedAtRef.current !== null && Date.now() - finishedAtRef.current > FINISHED_LINGER_MS) {
      finishedAtRef.current = null;
      setIsFinished(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [tick]);

  const start = useCallback((seconds = DEFAULT_REST_SECONDS) => {
    endsAtRef.current = Date.now() + seconds * 1000;
    finishedAtRef.current = null;
    setIsFinished(false);
    setRemaining(seconds);
  }, []);

  const add = useCallback((seconds: number) => {
    const base = endsAtRef.current ?? Date.now();
    endsAtRef.current = base + seconds * 1000;
    finishedAtRef.current = null;
    setIsFinished(false);
    setRemaining(Math.max(0, Math.ceil((endsAtRef.current - Date.now()) / 1000)));
  }, []);

  const stop = useCallback(() => {
    endsAtRef.current = null;
    finishedAtRef.current = null;
    setIsFinished(false);
    setRemaining(0);
  }, []);

  return { remaining, isRunning: remaining > 0 || isFinished, isFinished, start, add, stop };
}

export function formatRest(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
