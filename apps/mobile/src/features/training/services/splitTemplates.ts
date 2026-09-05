import { requireSupabase } from '@/lib/supabase';
import { selectWithOptionalColumns } from '@/lib/resilientSelect';

import { DayKind, MuscleGroupInfo, SplitTemplate, SplitTemplateDay, SplitTemplateSlot } from '../types/split';
import { EvidenceLevel, MuscleGroupSlug } from '../types/training';

type SlotRow = {
  id: string;
  position: number;
  muscle_group: MuscleGroupSlug;
  default_exercise_slug: string;
  target_sets: number;
  is_optional: boolean;
};

type DayRow = {
  id: string;
  day_index: number;
  name: string;
  day_kind: DayKind;
  focus_groups: MuscleGroupSlug[];
  pairing_rationale: string;
  split_template_slots: SlotRow[] | null;
};

type TemplateRow = {
  slug: string;
  name: string;
  days_per_week: number;
  summary: string;
  rationale: string;
  evidence_level: EvidenceLevel;
  evidence_source: string | null;
  is_recommended: boolean;
  split_template_days: DayRow[] | null;
};

type MuscleGroupRow = {
  slug: MuscleGroupSlug;
  name: string;
  display_order: number;
  beginner_sets_min: number;
  beginner_sets_max: number;
  trained_sets_min: number;
  trained_sets_max: number;
  selection_evidence: EvidenceLevel;
  evidence_note: string;
  is_small: boolean | null;
  aesthetic_priority: number | null;
  min_exercises: number | null;
};

const TEMPLATE_BASE = ['slug', 'name', 'days_per_week', 'summary', 'rationale', 'evidence_level', 'evidence_source', 'is_recommended'];

/**
 * day_kind lo añadió la 00011. Va dentro del recurso embebido, así que no puede
 * separarse en columnas opcionales: se pide siempre y, si la migración no está, el
 * catch de fetchSplitTemplates deja el error visible con su mensaje real.
 */
const dayColumns = (withKind: boolean) =>
  `split_template_days(id, day_index, name, ${withKind ? 'day_kind, ' : ''}focus_groups, pairing_rationale, ` +
  'split_template_slots(id, position, muscle_group, default_exercise_slug, target_sets, is_optional))';

const GROUP_BASE = [
  'slug', 'name', 'display_order', 'beginner_sets_min', 'beginner_sets_max',
  'trained_sets_min', 'trained_sets_max', 'selection_evidence', 'evidence_note'
];

/** Añadidas por la 00016 (is_small, aesthetic_priority) y la 00019 (min_exercises). */
const GROUP_OPTIONAL = ['is_small', 'aesthetic_priority', 'min_exercises'];

// Las plantillas son catálogo: no cambian por usuario ni entre sesiones.
let templatesPromise: Promise<SplitTemplate[]> | null = null;
let groupsPromise: Promise<MuscleGroupInfo[]> | null = null;

/** true si faltan las columnas de la 00016 y se cargó sin prioridad estética. */
let groupsAreDegraded = false;

export function muscleGroupsAreDegraded(): boolean {
  return groupsAreDegraded;
}

export function invalidateSplitTemplates(): void {
  templatesPromise = null;
  groupsPromise = null;
  groupsAreDegraded = false;
}

export function fetchSplitTemplates(): Promise<SplitTemplate[]> {
  if (!templatesPromise) {
    templatesPromise = loadTemplates().catch((error) => {
      templatesPromise = null;
      throw error;
    });
  }
  return templatesPromise;
}

export function fetchMuscleGroups(): Promise<MuscleGroupInfo[]> {
  if (!groupsPromise) {
    groupsPromise = loadMuscleGroups().catch((error) => {
      groupsPromise = null;
      throw error;
    });
  }
  return groupsPromise;
}

async function loadTemplates(): Promise<SplitTemplate[]> {
  const client = requireSupabase();

  // Se pide primero con day_kind; si esa columna aún no existe, se reintenta sin ella
  // y los días se tratan como torso hasta que la migración esté aplicada.
  const { rows } = await selectWithOptionalColumns<TemplateRow>(
    (columns) => client.from('split_templates').select(columns).order('display_order', { ascending: true }),
    [...TEMPLATE_BASE, dayColumns(true)],
    []
  );

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    daysPerWeek: Number(row.days_per_week),
    summary: row.summary,
    rationale: row.rationale,
    evidenceLevel: row.evidence_level,
    evidenceSource: row.evidence_source,
    isRecommended: row.is_recommended,
    // PostgREST no garantiza el orden de los recursos embebidos: ordenamos aquí.
    days: (row.split_template_days ?? [])
      .slice()
      .sort((a, b) => a.day_index - b.day_index)
      .map(toDay)
  }));
}

function toDay(row: DayRow): SplitTemplateDay {
  const slots: SplitTemplateSlot[] = (row.split_template_slots ?? [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((slot) => ({
      id: slot.id,
      position: Number(slot.position),
      muscleGroup: slot.muscle_group,
      defaultExerciseSlug: slot.default_exercise_slug,
      targetSets: Number(slot.target_sets),
      isOptional: slot.is_optional
    }));

  return {
    id: row.id,
    dayIndex: Number(row.day_index),
    name: row.name,
    dayKind: row.day_kind ?? 'torso',
    focusGroups: row.focus_groups ?? [],
    pairingRationale: row.pairing_rationale,
    slots
  };
}

async function loadMuscleGroups(): Promise<MuscleGroupInfo[]> {
  const client = requireSupabase();

  const { rows, degraded } = await selectWithOptionalColumns<MuscleGroupRow>(
    (columns) => client.from('muscle_groups').select(columns).order('display_order', { ascending: true }),
    GROUP_BASE,
    GROUP_OPTIONAL
  );

  groupsAreDegraded = degraded;

  return rows.map((row) => ({
    slug: row.slug,
    name: row.name,
    displayOrder: Number(row.display_order),
    beginnerSets: { min: Number(row.beginner_sets_min), max: Number(row.beginner_sets_max) },
    trainedSets: { min: Number(row.trained_sets_min), max: Number(row.trained_sets_max) },
    isSmall: row.is_small ?? false,
    aestheticPriority: row.aesthetic_priority ?? 2,
    // 2 es el default de la columna en la 00019: cubrir un músculo con dos ejercicios
    // es lo normal; hombro y espalda piden 3 y los pequeños se conforman con 1.
    minExercises: Number(row.min_exercises ?? 2),
    selectionEvidence: row.selection_evidence,
    evidenceNote: row.evidence_note
  }));
}

/**
 * La plantilla que la app propone para un número de días.
 * Si nadie está marcado como recomendado para ese número, devolvemos la primera que
 * exista en lugar de null: es mejor proponer algo editable que dejar la pantalla vacía.
 */
export function templateForDays(templates: SplitTemplate[], daysPerWeek: number): SplitTemplate | null {
  const matching = templates.filter((template) => template.daysPerWeek === daysPerWeek);
  if (matching.length === 0) return null;
  return matching.find((template) => template.isRecommended) ?? matching[0];
}
