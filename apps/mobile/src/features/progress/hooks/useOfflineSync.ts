import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import { isProbablyOffline, subscribeToRetryTriggers } from '@/lib/networkStatus';

import {
  getPendingWorkouts,
  markAttemptFailed,
  removeWorkout,
  subscribeToPendingWorkouts
} from '../services/offlineWorkoutQueue';
import { classifySaveError, saveCompletedWorkout } from '../services/workoutSessionRepository';

const INITIAL_RETRY_MS = 30_000;
const MAX_RETRY_MS = 300_000;

/**
 * Un solo flush a la vez en toda la app: los disparadores (foreground, evento online,
 * timer) se solapan con facilidad y dos flushes en paralelo reintentarían el mismo payload.
 * El RPC es idempotente, así que no se duplicaría nada, pero es tráfico y batería regalados.
 */
let flushInFlight: Promise<boolean> | null = null;

/**
 * Vacía la cola contra Supabase. Devuelve true si quedó vacía para este usuario.
 * Silencioso por diseño: el usuario ya recibió el feedback al finalizar el entrenamiento.
 */
export function flushQueue(userId: string): Promise<boolean> {
  if (flushInFlight) return flushInFlight;
  if (isProbablyOffline()) return Promise.resolve(false);

  flushInFlight = (async () => {
    const pending = await getPendingWorkouts();
    let remaining = 0;

    for (const item of pending) {
      // Nunca subimos el entrenamiento de otra cuenta con la sesión actual:
      // el RPC usa auth.uid(), así que quedaría registrado bajo el usuario equivocado.
      if (item.userId !== userId) { remaining += 1; continue; }
      if (item.blocked) { remaining += 1; continue; }

      try {
        await saveCompletedWorkout(item.workout);
        await removeWorkout(item.workout.clientId);
      } catch (error) {
        const kind = classifySaveError(error);

        // Sigue sin red o sin sesión válida: cortamos, el resto de la cola espera intacta.
        if (kind === 'network') return false;
        if (kind === 'auth') return false;

        // El servidor lo rechazó: no se reintenta más, pero el entrenamiento no se borra.
        await markAttemptFailed(item.workout.clientId, describeError(error), true);
        remaining += 1;
      }
    }

    return remaining === 0;
  })().finally(() => { flushInFlight = null; });

  return flushInFlight;
}

/**
 * Se monta una sola vez en el layout raíz. No renderiza nada ni expone estado:
 * el indicador visual lo alimenta usePendingWorkouts, que escucha la cola directamente.
 */
export function useOfflineSync(): void {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const retryDelayRef = useRef(INITIAL_RETRY_MS);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPendingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const run = useCallback(async () => {
    if (!userId) return;

    const drained = await flushQueue(userId);

    if (drained) {
      retryDelayRef.current = INITIAL_RETRY_MS;
      clearTimer();
      return;
    }

    // Backoff: en un gimnasio sin señal no tiene sentido insistir cada 30 s indefinidamente.
    if (hasPendingRef.current) {
      clearTimer();
      timeoutRef.current = setTimeout(() => void run(), retryDelayRef.current);
      retryDelayRef.current = Math.min(retryDelayRef.current * 2, MAX_RETRY_MS);
    }
  }, [clearTimer, userId]);

  // La cola manda: si se encola algo nuevo, reiniciamos el backoff e intentamos de inmediato.
  useEffect(() => {
    return subscribeToPendingWorkouts((pending) => {
      const hasPending = pending.length > 0;
      const appeared = hasPending && !hasPendingRef.current;
      hasPendingRef.current = hasPending;

      if (!hasPending) {
        retryDelayRef.current = INITIAL_RETRY_MS;
        clearTimer();
        return;
      }

      if (appeared) void run();
    });
  }, [clearTimer, run]);

  // Al iniciar sesión y al recuperar foreground / evento online del navegador.
  useEffect(() => {
    if (!userId) return;

    void run();
    const unsubscribe = subscribeToRetryTriggers(() => void run());

    return () => {
      unsubscribe();
      clearTimer();
    };
  }, [clearTimer, run, userId]);
}

function describeError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message).slice(0, 200);
  }
  return 'Error desconocido';
}
