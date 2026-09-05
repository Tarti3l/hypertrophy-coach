import { EvidenceLevel, MuscleGroupSlug } from './training';

/** Espejo de public.cardio_placement. */
export type CardioPlacement = 'none' | 'start' | 'end';

export type SplitTemplateSlot = {
  id: string;
  position: number;
  muscleGroup: MuscleGroupSlug;
  /** slug del ejercicio que proponemos; el usuario puede cambiarlo por cualquiera del grupo. */
  defaultExerciseSlug: string;
  targetSets: number;
  isOptional: boolean;
};

/** Espejo de public.day_kind. No hay días mixtos a propósito. */
export type DayKind = 'torso' | 'pierna';

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  torso: 'Torso',
  pierna: 'Pierna'
};

export type SplitTemplateDay = {
  id: string;
  dayIndex: number;
  name: string;
  dayKind: DayKind;
  focusGroups: MuscleGroupSlug[];
  /** Por qué van juntos estos grupos, incluyendo lo que la evidencia no dice. */
  pairingRationale: string;
  slots: SplitTemplateSlot[];
};

export type SplitTemplate = {
  slug: string;
  name: string;
  daysPerWeek: number;
  summary: string;
  rationale: string;
  evidenceLevel: EvidenceLevel;
  evidenceSource: string | null;
  isRecommended: boolean;
  days: SplitTemplateDay[];
};

export type MuscleGroupInfo = {
  slug: MuscleGroupSlug;
  name: string;
  displayOrder: number;
  beginnerSets: { min: number; max: number };
  trainedSets: { min: number; max: number };
  /** Grupos que necesitan poco volumen y suman poca fatiga: antebrazo, pantorrilla, abdomen. */
  isSmall: boolean;
  /**
   * 1 alta, 2 media, 3 baja. Es criterio de APARIENCIA, no un hallazgo científico:
   * ningún estudio dice qué músculos priorizar. Solo los de prioridad 1 se repiten
   * en la semana.
   */
  aestheticPriority: number;
  /**
   * Cuántos ejercicios hacen falta para cubrir las porciones del músculo. 3 en hombro
   * (anterior, medial, posterior), 1 en los pequeños. Es lo que la app añade cuando el
   * usuario mete un grupo nuevo en un día.
   */
  minExercises: number;
  /** Cuánta evidencia hay para ELEGIR entre ejercicios de este grupo. */
  selectionEvidence: EvidenceLevel;
  evidenceNote: string;
};

/**
 * Cuánto volumen aporta un multiarticular a sus sinergistas.
 *
 * No es un número inventado: en el meta-análisis de Pelland et al. (2026), de tres
 * formas de contar las series indirectas (0, 0.5 y 1), la ponderación de 0.5 fue la
 * que mejor ajustó los datos. Lo usamos para el contador de volumen semanal, porque
 * si no, el tríceps y el bíceps salen siempre subestimados.
 */
export const INDIRECT_SET_WEIGHT = 0.5;

/**
 * Qué sinergistas recibe cada patrón, y por tanto a quién le sumamos media serie.
 * Deliberadamente conservador: solo los solapamientos que nadie discute.
 */
export const SYNERGISTS_BY_PATTERN: Partial<Record<string, MuscleGroupSlug[]>> = {
  'empuje-horizontal': ['triceps', 'hombros'],
  'empuje-vertical': ['triceps'],
  'traccion-vertical': ['biceps'],
  'traccion-horizontal': ['biceps'],
  rodilla: ['gluteos'],
  cadera: ['gluteos']
};

export const CARDIO_PLACEMENT_LABELS: Record<CardioPlacement, string> = {
  none: 'Sin cardio',
  start: 'Al inicio',
  end: 'Al final'
};

/**
 * Lo que la app le dice al usuario sobre dónde poner el cardio. Cada frase sale de
 * docs/rutinas.md §7; ninguna afirma nada que la evidencia no sostenga.
 */
export const CARDIO_PLACEMENT_NOTES: Record<CardioPlacement, string> = {
  none:
    'Puedes dejarlo fuera, pero considéralo: tener buena capacidad cardiorrespiratoria se asocia a menos mortalidad con una fuerza parecida a la de no fumar. Nada que ver con tu peso.',
  start:
    'Como calentamiento, corto y muy suave. En el análisis de efectos agudos, la baja intensidad fue la única que no bajó la fuerza de forma significativa, y pasar de 30 minutos sí la baja bastante.',
  end:
    'Recomendado. Hacer las pesas primero dio casi un 7% más de fuerza en el tren inferior, sin coste ninguno para el crecimiento muscular.'
};

export const DEFAULT_CARDIO_MINUTES: Record<CardioPlacement, number> = {
  none: 0,
  start: 8,
  end: 20
};
