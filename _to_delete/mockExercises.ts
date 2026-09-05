import { ExerciseEquipment, ExerciseFilter, TrainingExercise } from '../types/training';

/**
 * Datos temporales para el diccionario visual. Las URL simulan el CDN de producción;
 * cuando el catálogo esté conectado se sustituirán por clips validados de 3–5 segundos.
 */
export const mockExercises: TrainingExercise[] = [
  {
    id: 'dumbbell-bench-press',
    name: 'Press de banca con mancuernas',
    muscleGroup: 'Pecho · tríceps · hombro anterior',
    equipment: 'free_weight',
    media: {
      type: 'video',
      durationSeconds: 4,
      url: 'https://cdn.hypertrophy-coach.app/mocks/dumbbell-bench-press.mp4',
      isMock: true
    },
    cue: 'Baja con control y empuja sin perder el apoyo de los pies.'
  },
  {
    id: 'chest-press-machine',
    name: 'Máquina de pecho',
    muscleGroup: 'Pecho · tríceps',
    equipment: 'machine',
    media: {
      type: 'video',
      durationSeconds: 3,
      url: 'https://cdn.hypertrophy-coach.app/mocks/chest-press-machine.mp4',
      isMock: true
    },
    cue: 'Ajusta el asiento para que las manijas queden a la altura del pecho.'
  },
  {
    id: 'push-up',
    name: 'Flexiones',
    muscleGroup: 'Pecho · tríceps · core',
    equipment: 'bodyweight',
    media: {
      type: 'gif',
      durationSeconds: 4,
      url: 'https://cdn.hypertrophy-coach.app/mocks/push-up.gif',
      isMock: true
    },
    cue: 'Mantén el cuerpo alineado y acerca el pecho al suelo con control.'
  }
];

export const equipmentLabels: Record<ExerciseEquipment, string> = {
  machine: 'Máquina',
  free_weight: 'Peso libre',
  bodyweight: 'Sin peso'
};

export const exerciseFilters: { value: ExerciseFilter; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'machine', label: 'Máquina' },
  { value: 'free_weight', label: 'Peso libre' },
  { value: 'bodyweight', label: 'Sin peso' }
];
