import { INDIRECT_SET_WEIGHT, MuscleGroupInfo, SYNERGISTS_BY_PATTERN } from '../types/split';
import { MuscleGroupSlug, TrainingExercise } from '../types/training';

export type VolumeEntry = {
  group: MuscleGroupSlug;
  label: string;
  /** Series que apuntan directamente al músculo. */
  direct: number;
  /** Series que le llegan como sinergista, ya ponderadas a 0.5. */
  indirect: number;
  total: number;
  target: { min: number; max: number };
  status: 'bajo' | 'en-rango' | 'alto';
  /** 1 alta, 2 media, 3 baja. Criterio estético, no científico. */
  priority: number;
};

type Item = {
  exerciseId: string;
  targetSets: number;
};

/**
 * Series semanales por grupo muscular.
 *
 * Cuenta las series directas enteras y las indirectas a 0.5. Ese 0.5 no es una
 * corazonada: en Pelland et al. (2026), de tres formas de contar las series
 * indirectas (0, 0.5 y 1), la ponderación fraccional fue la que mejor ajustó los
 * datos. Sin ella, el tríceps y el bíceps salen siempre subestimados y el usuario
 * acaba añadiendo volumen que ya tenía.
 *
 * Ver docs/rutinas.md §1 y §4.1.
 */
export function computeWeeklyVolume(
  items: Item[],
  catalog: TrainingExercise[],
  groups: MuscleGroupInfo[],
  level: 'beginner' | 'trained'
): VolumeEntry[] {
  const byId = new Map(catalog.map((exercise) => [exercise.id, exercise]));
  const direct = new Map<MuscleGroupSlug, number>();
  const indirect = new Map<MuscleGroupSlug, number>();

  for (const item of items) {
    const exercise = byId.get(item.exerciseId);
    if (!exercise?.group || exercise.group === 'cardio') continue;

    direct.set(exercise.group, (direct.get(exercise.group) ?? 0) + item.targetSets);

    const synergists = exercise.movementPattern ? SYNERGISTS_BY_PATTERN[exercise.movementPattern] : undefined;
    for (const synergist of synergists ?? []) {
      // Un ejercicio no se suma a sí mismo como sinergista: el press de agarre
      // cerrado es de tríceps, no le añadimos media serie extra de tríceps.
      if (synergist === exercise.group) continue;
      indirect.set(synergist, (indirect.get(synergist) ?? 0) + item.targetSets * INDIRECT_SET_WEIGHT);
    }
  }

  return groups
    .filter((group) => group.slug !== 'cardio')
    .map((group) => {
      const directSets = direct.get(group.slug) ?? 0;
      const indirectSets = indirect.get(group.slug) ?? 0;
      const total = round(directSets + indirectSets);
      const target = level === 'beginner' ? group.beginnerSets : group.trainedSets;

      return {
        group: group.slug,
        label: group.name,
        direct: round(directSets),
        indirect: round(indirectSets),
        total,
        target,
        status: statusFor(total, target),
        priority: group.aestheticPriority
      };
    })
    // Los grupos con cero series se muestran igual: que falte algo es información.
    .sort((a, b) => a.label.localeCompare(b.label));
}

function statusFor(total: number, target: { min: number; max: number }): VolumeEntry['status'] {
  if (total < target.min) return 'bajo';
  if (total > target.max) return 'alto';
  return 'en-rango';
}

/** 12.5 en vez de 12.500000000000002, y "12" en vez de "12.0". */
function round(value: number): number {
  return Math.round(value * 2) / 2;
}

export function formatSets(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.0', '');
}
