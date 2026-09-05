import { useEffect, useState } from 'react';

import { subscribeToPendingWorkouts } from '../services/offlineWorkoutQueue';
import { PendingWorkoutPayload } from '../types/workoutSession';

/** Estado de la cola offline para la UI. Se actualiza solo, sin polling. */
export function usePendingWorkouts(): { pending: PendingWorkoutPayload[]; count: number; blockedCount: number } {
  const [pending, setPending] = useState<PendingWorkoutPayload[]>([]);

  useEffect(() => subscribeToPendingWorkouts(setPending), []);

  return {
    pending,
    count: pending.length,
    blockedCount: pending.filter((item) => item.blocked).length
  };
}
