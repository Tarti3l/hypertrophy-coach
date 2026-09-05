import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompletedWorkoutDraft, PendingWorkoutPayload } from '../types/workoutSession';

const STORAGE_KEY = '@hypertrophy-coach/pending-workouts/v2';

/** Un entrenamiento pesa ~2 KB. El tope existe para que un bug no llene el storage del dispositivo. */
const MAX_QUEUE_SIZE = 50;

/** Tras 5 rechazos del servidor dejamos de reintentar, pero NUNCA borramos el entrenamiento. */
export const MAX_ATTEMPTS = 5;

type QueueListener = (pending: PendingWorkoutPayload[]) => void;

const listeners = new Set<QueueListener>();

/**
 * Todas las escrituras pasan por esta cadena. AsyncStorage no tiene transacciones: sin esto,
 * un enqueue y un removeWorkout simultáneos harían read-modify-write sobre el mismo estado
 * y uno de los dos se perdería (justo el escenario del flush corriendo mientras el usuario termina otra sesión).
 */
let writeChain: Promise<unknown> = Promise.resolve();

function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  writeChain = result.catch(() => undefined);
  return result;
}

async function readQueue(): Promise<PendingWorkoutPayload[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isPendingWorkoutPayload) : [];
  } catch {
    // Storage corrupto: preferimos una cola vacía a que la app no arranque.
    return [];
  }
}

async function writeQueue(queue: PendingWorkoutPayload[]): Promise<PendingWorkoutPayload[]> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  notify(queue);
  return queue;
}

function notify(queue: PendingWorkoutPayload[]): void {
  listeners.forEach((listener) => listener(queue));
}

export function subscribeToPendingWorkouts(listener: QueueListener): () => void {
  listeners.add(listener);
  void getPendingWorkouts().then(listener);
  return () => { listeners.delete(listener); };
}

export function enqueueWorkout(workout: CompletedWorkoutDraft, userId: string): Promise<PendingWorkoutPayload[]> {
  return withLock(async () => {
    const queue = await readQueue();

    // clientId es la clave de idempotencia: si ya está encolado, no lo duplicamos.
    if (queue.some((item) => item.workout.clientId === workout.clientId)) return queue;

    const payload: PendingWorkoutPayload = {
      userId,
      queuedAt: new Date().toISOString(),
      attempts: 0,
      lastError: null,
      blocked: false,
      workout
    };

    return writeQueue([...queue, payload].slice(-MAX_QUEUE_SIZE));
  });
}

export function getPendingWorkouts(): Promise<PendingWorkoutPayload[]> {
  return withLock(readQueue);
}

export function removeWorkout(clientId: string): Promise<PendingWorkoutPayload[]> {
  return withLock(async () => {
    const queue = await readQueue();
    const next = queue.filter((item) => item.workout.clientId !== clientId);
    return next.length === queue.length ? queue : writeQueue(next);
  });
}

export function clearQueue(): Promise<PendingWorkoutPayload[]> {
  return withLock(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    notify([]);
    return [];
  });
}

/**
 * Devuelve un item bloqueado al estado pendiente para que el próximo flush lo tome.
 * Reinicia attempts: el usuario está afirmando que el problema de fondo ya se resolvió.
 */
export function retryWorkout(clientId: string): Promise<PendingWorkoutPayload[]> {
  return withLock(async () => {
    const queue = await readQueue();
    let changed = false;

    const next = queue.map((item) => {
      if (item.workout.clientId !== clientId || !item.blocked) return item;
      changed = true;
      return { ...item, attempts: 0, lastError: null, blocked: false };
    });

    return changed ? writeQueue(next) : queue;
  });
}

/** Registra un intento fallido. Si el servidor lo rechazó por validación, lo marca como bloqueado. */
export function markAttemptFailed(clientId: string, reason: string, blocked: boolean): Promise<PendingWorkoutPayload[]> {
  return withLock(async () => {
    const queue = await readQueue();
    let changed = false;

    const next = queue.map((item) => {
      if (item.workout.clientId !== clientId) return item;
      changed = true;
      const attempts = item.attempts + 1;
      return { ...item, attempts, lastError: reason, blocked: blocked || attempts >= MAX_ATTEMPTS };
    });

    return changed ? writeQueue(next) : queue;
  });
}

function isPendingWorkoutPayload(value: unknown): value is PendingWorkoutPayload {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PendingWorkoutPayload>;
  return typeof candidate.userId === 'string'
    && typeof candidate.workout === 'object'
    && candidate.workout !== null
    && typeof candidate.workout.clientId === 'string'
    && Array.isArray(candidate.workout.sets);
}
