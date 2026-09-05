import { useEffect, useRef, useState } from 'react';

import { getExerciseHistory } from '@/features/progress/services/workoutSessionRepository';

import { DEFAULT_TARGET_REPS, isLowerBody, ProgressionSuggestion, suggestProgression } from '../services/progression';

/**
 * Sugerencia para el ejercicio en pantalla. Si falla, no muestra nada: es un extra,
 * no un requisito para poder entrenar.
 */
export function useProgression(
  exerciseId: string | null,
  muscleGroup: string,
  targetReps = DEFAULT_TARGET_REPS
): ProgressionSuggestion | null {
  const [suggestion, setSuggestion] = useState<ProgressionSuggestion | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  useEffect(() => {
    if (!exerciseId) { setSuggestion(null); return; }

    let active = true;
    void getExerciseHistory(exerciseId)
      .then((history) => {
        if (!active || !isMountedRef.current) return;
        setSuggestion(suggestProgression(history, targetReps, isLowerBody(muscleGroup)));
      })
      .catch(() => { if (active && isMountedRef.current) setSuggestion(null); });

    return () => { active = false; };
  }, [exerciseId, muscleGroup, targetReps]);

  return suggestion;
}
