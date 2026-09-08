import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Card } from '@/components/ui/Card';
import { describeSupabaseError } from '@/lib/supabaseErrors';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoNote } from '@/components/ui/InfoNote';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { ExerciseSwapSheet } from '../components/ExerciseSwapSheet';
import { Stepper } from '../components/Stepper';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useSplitTemplates } from '../hooks/useSplitTemplates';
import { equipmentLabels, exercisesForGroup, normalizeExerciseName, pickExerciseForSlot } from '../services/exerciseCatalog';
import { suitsLevel, useKnowledgeLevel } from '../hooks/useKnowledgeLevel';
import { templateForDays } from '../services/splitTemplates';
import { computeWeeklyVolume, formatSets, VolumeEntry } from '../services/volume';
import { matchesTemplate, validateWeekPlan } from '../services/weekPlan';
import {
  CARDIO_PLACEMENT_LABELS,
  CARDIO_PLACEMENT_NOTES,
  CardioPlacement,
  DAY_KIND_LABELS,
  DayKind,
  DEFAULT_CARDIO_MINUTES,
  SplitTemplate
} from '../types/split';
import {
  MAX_DAYS_PER_WEEK,
  MAX_REST_SECONDS,
  MAX_SETS,
  MIN_DAYS_PER_WEEK,
  MIN_REST_SECONDS,
  MIN_SETS,
  RECOMMENDED_DAYS_PER_WEEK,
  REST_STEP_SECONDS,
  RoutineExerciseInput
} from '../types/routine';
import { DIFFICULTY_LABELS, MUSCLE_GROUP_LABELS, MuscleGroupSlug, MuscleRegion, REGION_LABELS, TrainingExercise } from '../types/training';
import { createRoutine, getRoutine, updateRoutine } from '../services/routineRepository';

type BuilderSlot = {
  key: string;
  exerciseId: string;
  muscleGroup: MuscleGroupSlug;
  targetSets: number;
  targetReps: number | null;
  /** Descanso entre series. */
  restSeconds: number | null;
  /** Descanso al pasar al siguiente ejercicio. */
  transitionSeconds: number | null;
  /** Los opcionales se marcan en la UI para que quitarlos no dé miedo. */
  isOptional: boolean;
};

type BuilderDay = {
  dayIndex: number;
  name: string;
  dayKind: DayKind;
  focusGroups: MuscleGroupSlug[];
  pairingRationale: string;
  slots: BuilderSlot[];
};

type SwapTarget =
  | { kind: 'slot'; dayIndex: number; slotKey: string; group: MuscleGroupSlug }
  | { kind: 'add'; dayIndex: number; group: MuscleGroupSlug }
  | { kind: 'cardio'; group: 'cardio' };

/**
 * Agrupa los ejercicios de un día por músculo, en orden de primera aparición.
 *
 * Lo que se ve es lo que se guarda: `save` recorre esta misma estructura para armar el
 * array final, así que el orden de entrenamiento coincide con el de la pantalla.
 */
function groupSlotsByMuscle(slots: BuilderSlot[]): { group: MuscleGroupSlug; slots: BuilderSlot[] }[] {
  const order: MuscleGroupSlug[] = [];
  const byGroup = new Map<MuscleGroupSlug, BuilderSlot[]>();

  for (const slot of slots) {
    const existing = byGroup.get(slot.muscleGroup);
    if (existing) existing.push(slot);
    else { byGroup.set(slot.muscleGroup, [slot]); order.push(slot.muscleGroup); }
  }

  return order.map((group) => ({ group, slots: byGroup.get(group) ?? [] }));
}

let slotCounter = 0;
const nextKey = () => `slot-${(slotCounter += 1)}`;

const DAY_OPTIONS = Array.from(
  { length: MAX_DAYS_PER_WEEK - MIN_DAYS_PER_WEEK + 1 },
  (_, index) => MIN_DAYS_PER_WEEK + index
);

const CARDIO_OPTIONS: CardioPlacement[] = ['end', 'start', 'none'];

/**
 * El constructor va por pasos, no en una sola página.
 *
 * Todo junto eran cinco bloques largos en una pantalla y el usuario se perdía: no sabía
 * qué tenía que decidir ahora ni cuánto quedaba. Cada paso pide UNA cosa.
 */
const STEPS = [
  { key: 'days', title: '¿Cuántos días entrenas?' },
  { key: 'week', title: 'Así te queda la semana' },
  { key: 'exercises', title: 'Tus días y ejercicios' },
  { key: 'cardio', title: 'Cardio suave' },
  { key: 'review', title: 'Revisa y guarda' }
] as const;

/**
 * Solo se usan si el catálogo viene sin valor (migración 00013 sin aplicar).
 * Los buenos vienen de la base de datos, por ejercicio.
 */
const DEFAULT_REST_SECONDS = 90;
const DEFAULT_TRANSITION_SECONDS = 150;

/** "2:30" en vez de "150 s": el usuario piensa en minutos. */
function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} s`;
  return seconds === 0 ? `${minutes} min` : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * El constructor de rutinas.
 *
 * Todo lo que se propone aquí sale de docs/rutinas.md, y todo es editable. La regla
 * que seguimos en cada texto: no vender consenso como si fuera evidencia. Cuando la
 * app dice "agrupamos pecho y hombros", también dice que no hay ningún estudio que
 * demuestre que agruparlos dé más músculo que repartirlos.
 */
export function RoutineBuilderScreen() {
  const router = useRouter();
  const goBack = useGoBack('/routines');
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const catalog = useExerciseCatalog();
  const { level: knowledgeLevel } = useKnowledgeLevel();
  const { templates, groups, isLoading: isLoadingTemplates, error: templatesError, isDegraded: groupsDegraded } = useSplitTemplates();

  const [name, setName] = useState('');
  const [daysPerWeek, setDaysPerWeek] = useState(RECOMMENDED_DAYS_PER_WEEK);
  const [days, setDays] = useState<BuilderDay[]>([]);
  const [openDay, setOpenDay] = useState<number | null>(1);
  const [cardioPlacement, setCardioPlacement] = useState<CardioPlacement>('end');
  const [cardioMinutes, setCardioMinutes] = useState(DEFAULT_CARDIO_MINUTES.end);
  const [cardioExerciseId, setCardioExerciseId] = useState<string | null>(null);
  const [swapTarget, setSwapTarget] = useState<SwapTarget | null>(null);
  /** El paso 2 empieza en solo lectura: la propuesta es lo primero que hay que entender. */
  const [isEditingWeek, setIsEditingWeek] = useState(false);
  /** Día cuyo selector de "añadir músculo" está abierto. */
  const [addingGroupTo, setAddingGroupTo] = useState<number | null>(null);
  const [addingToDay, setAddingToDay] = useState<number | null>(null);
  const [openRestSlot, setOpenRestSlot] = useState<string | null>(null);
  /** Secciones de músculo abiertas, por "día-grupo". Todas empiezan cerradas. */
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [step, setStep] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Al cambiar de paso se vuelve arriba: si no, aterrizas a media pantalla.
  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }); }, [step]);
  const [showVolume, setShowVolume] = useState(false);
  const [pendingDays, setPendingDays] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(Boolean(routineId));
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const catalogById = useMemo(
    () => new Map(catalog.exercises.map((exercise) => [exercise.id, exercise])),
    [catalog.exercises]
  );
  const catalogBySlug = useMemo(
    () => new Map(catalog.exercises.map((exercise) => [exercise.slug, exercise])),
    [catalog.exercises]
  );

  const template = useMemo(() => templateForDays(templates, daysPerWeek), [templates, daysPerWeek]);
  const isReady = !catalog.isLoading && !isLoadingTemplates && !isLoadingRoutine;

  const stepKey = STEPS[step].key;
  const isLastStep = step === STEPS.length - 1;

  /**
   * Qué falta para poder avanzar. Devolver el motivo y no un booleano permite decírselo
   * al usuario en vez de dejarle un botón gris sin explicación.
   */
  const blockingReason = useMemo(() => {
    if (stepKey === 'week' && days.length === 0) return 'No hay ninguna plantilla para ese número de días.';
    if (stepKey === 'exercises') {
      const vacio = days.find((day) => day.slots.length === 0);
      if (vacio) return `"${vacio.name}" se quedó sin ejercicios.`;
    }
    if (stepKey === 'review' && !name.trim()) return 'Ponle un nombre a tu rutina.';
    return null;
  }, [stepKey, days, name]);

  const buildFromTemplate = useCallback(
    (source: SplitTemplate | null): BuilderDay[] => {
      if (!source) return [];
      return source.days.map((day) => {
        // Por día, no global: `pickExerciseForSlot` decide un slot a la vez, así que
        // lo elegido para uno tiene que quedar anotado antes de resolver el
        // siguiente. `usedRegionsByGroup` es por músculo — cubrir regiones de pecho
        // no dice nada sobre las de espalda.
        const usedInDay = new Set<string>();
        const usedRegionsByGroup = new Map<MuscleGroupSlug, Set<MuscleRegion>>();

        const slots = day.slots.flatMap((slot) => {
          const proposed = catalogBySlug.get(slot.defaultExerciseSlug);
          const usedRegions = usedRegionsByGroup.get(slot.muscleGroup) ?? new Set<MuscleRegion>();

          const exercise = pickExerciseForSlot(
            proposed,
            slot.muscleGroup,
            catalog.exercises,
            (item) => suitsLevel(item.difficulty, knowledgeLevel),
            usedInDay,
            usedRegions
          );

          // Si el catálogo no trae el ejercicio (migración a medias), saltamos el slot
          // en lugar de insertar un id vacío que reventaría al guardar.
          if (!exercise) return [];
          usedInDay.add(exercise.id);
          if (exercise.region) usedRegions.add(exercise.region);
          usedRegionsByGroup.set(slot.muscleGroup, usedRegions);
          return [{
            key: nextKey(),
            exerciseId: exercise.id,
            muscleGroup: slot.muscleGroup,
            targetSets: slot.targetSets,
            targetReps: exercise.defaultReps?.high ?? null,
            restSeconds: exercise.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
            transitionSeconds: exercise.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
            isOptional: slot.isOptional
          }];
        });

        return {
          dayIndex: day.dayIndex,
          name: day.name,
          dayKind: day.dayKind,
          focusGroups: day.focusGroups,
          pairingRationale: day.pairingRationale,
          slots
        };
      });
    },
    [catalogBySlug, catalog.exercises, knowledgeLevel]
  );

  // Rutina nueva: en cuanto hay catálogo y plantilla, proponemos el split completo.
  // El nombre queda vacío a propósito: un default que nadie mira termina siendo el
  // nombre real de la rutina, y el nombre de la plantilla ("Torso · Pierna · ...")
  // no es un nombre. Si algún día se sugiere uno, va como ayuda debajo del campo.
  useEffect(() => {
    if (routineId || !isReady || days.length > 0 || !template) return;
    setDays(buildFromTemplate(template));
  }, [routineId, isReady, days.length, template, buildFromTemplate]);

  // Cardio por defecto: la primera opción del grupo, que es la bici suave.
  useEffect(() => {
    if (cardioExerciseId || catalog.exercises.length === 0) return;
    const options = exercisesForGroup(catalog.exercises, 'cardio');
    if (options.length > 0) setCardioExerciseId(options[0].id);
  }, [cardioExerciseId, catalog.exercises]);

  // Rutina existente: la hidratamos tal cual está guardada.
  useEffect(() => {
    if (!routineId || catalog.isLoading || isLoadingTemplates) return;

    void getRoutine(routineId)
      .then((routine) => {
        if (!isMountedRef.current || !routine) return;
        setName(routine.name);
        setDaysPerWeek(routine.daysPerWeek);
        setCardioPlacement(routine.cardio.placement);
        setCardioMinutes(routine.cardio.minutes ?? DEFAULT_CARDIO_MINUTES[routine.cardio.placement]);
        if (routine.cardio.exerciseId) setCardioExerciseId(routine.cardio.exerciseId);

        const templateDays = templateForDays(templates, routine.daysPerWeek)?.days ?? [];
        const byIndex = new Map(templateDays.map((day) => [day.dayIndex, day]));
        const grouped = new Map<number, BuilderSlot[]>();

        for (const exercise of routine.exercises) {
          const catalogEntry = catalogById.get(exercise.exerciseId);
          const slots = grouped.get(exercise.dayIndex) ?? [];
          slots.push({
            key: nextKey(),
            exerciseId: exercise.exerciseId,
            muscleGroup: exercise.muscleGroup ?? catalogEntry?.group ?? 'pecho',
            targetSets: exercise.targetSets,
            targetReps: exercise.targetReps,
            restSeconds: exercise.restSeconds ?? catalogEntry?.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
            transitionSeconds:
              exercise.transitionSeconds ?? catalogEntry?.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
            isOptional: false
          });
          grouped.set(exercise.dayIndex, slots);
        }

        setDays(
          Array.from({ length: routine.daysPerWeek }, (_, index) => {
            const dayIndex = index + 1;
            const fromTemplate = byIndex.get(dayIndex);
            return {
              dayIndex,
              name: fromTemplate?.name ?? `Día ${dayIndex}`,
              dayKind: fromTemplate?.dayKind ?? 'torso',
              focusGroups: fromTemplate?.focusGroups ?? [],
              pairingRationale: fromTemplate?.pairingRationale ?? '',
              slots: grouped.get(dayIndex) ?? []
            };
          })
        );
      })
      .catch(() => { if (isMountedRef.current) setError('No pudimos cargar la rutina.'); })
      .finally(() => { if (isMountedRef.current) setIsLoadingRoutine(false); });
  }, [routineId, catalog.isLoading, isLoadingTemplates, templates, catalogById]);

  const applyDays = useCallback((value: number) => {
    const next = templateForDays(templates, value);
    setDaysPerWeek(value);
    setDays(buildFromTemplate(next));
    setName((current) => (isDirty ? current : next?.name ?? current));
    setOpenDay(1);
    setPendingDays(null);
    setIsDirty(false);
  }, [templates, buildFromTemplate, isDirty]);

  const requestDays = useCallback((value: number) => {
    if (value === daysPerWeek) return;
    // Cambiar de split reconstruye los días desde cero. Si el usuario ya tocó algo,
    // preguntamos en línea (Alert.alert no funciona en la versión web).
    if (isDirty) { setPendingDays(value); return; }
    applyDays(value);
  }, [daysPerWeek, isDirty, applyDays]);

  const patchSlot = useCallback((dayIndex: number, slotKey: string, changes: Partial<BuilderSlot>) => {
    setIsDirty(true);
    setDays((current) => current.map((day) => day.dayIndex !== dayIndex ? day : {
      ...day,
      slots: day.slots.map((slot) => slot.key === slotKey ? { ...slot, ...changes } : slot)
    }));
  }, []);

  const removeSlot = useCallback((dayIndex: number, slotKey: string) => {
    setIsDirty(true);
    setDays((current) => current.map((day) => day.dayIndex !== dayIndex ? day : {
      ...day,
      slots: day.slots.filter((slot) => slot.key !== slotKey)
    }));
  }, []);

  /** Reordena dentro de su grupo: mover un press de pecho por encima de un lateral no tendría sentido. */
  const moveSlotInGroup = useCallback((dayIndex: number, group: MuscleGroupSlug, index: number, direction: -1 | 1) => {
    setIsDirty(true);
    setDays((current) => current.map((day) => {
      if (day.dayIndex !== dayIndex) return day;

      const grouped = groupSlotsByMuscle(day.slots).map((entry) => {
        if (entry.group !== group) return entry;
        const target = index + direction;
        if (target < 0 || target >= entry.slots.length) return entry;
        const slots = [...entry.slots];
        [slots[index], slots[target]] = [slots[target], slots[index]];
        return { ...entry, slots };
      });

      return { ...day, slots: grouped.flatMap((entry) => entry.slots) };
    }));
  }, []);

  /**
   * El nombre del día se recalcula solo al editarlo.
   *
   * Si no, alguien que cambia "Torso · Pecho y hombros" por espalda se queda con un día
   * que dice pecho y entrena espalda. Y `pairingRationale` se vacía: ese texto explica
   * por qué van juntos ESOS músculos, y ya no son esos.
   */
  const renameDay = useCallback((day: BuilderDay, kind: DayKind, focusGroups: MuscleGroupSlug[]): BuilderDay => {
    const names = focusGroups.map((group) => MUSCLE_GROUP_LABELS[group] ?? group);
    const tail = names.length === 0
      ? 'sin músculos'
      : names.length === 1
        ? names[0]
        : `${names.slice(0, -1).join(', ')} y ${names[names.length - 1].toLowerCase()}`;

    return { ...day, dayKind: kind, focusGroups, name: `${DAY_KIND_LABELS[kind]} · ${tail}`, pairingRationale: '' };
  }, []);

  const setDayKind = useCallback((dayIndex: number, kind: DayKind) => {
    setIsDirty(true);
    setDays((current) => current.map((day) =>
      day.dayIndex !== dayIndex ? day : renameDay(day, kind, day.focusGroups)
    ));
  }, [renameDay]);

  /** Quitar un músculo del día se lleva sus ejercicios: dejarlos huérfanos sería peor. */
  const removeGroupFromDay = useCallback((dayIndex: number, group: MuscleGroupSlug) => {
    setIsDirty(true);
    setDays((current) => current.map((day) => {
      if (day.dayIndex !== dayIndex) return day;
      const next = renameDay(day, day.dayKind, day.focusGroups.filter((item) => item !== group));
      return { ...next, slots: day.slots.filter((slot) => slot.muscleGroup !== group) };
    }));
  }, [renameDay]);

  /**
   * Añadir un músculo trae sus ejercicios recomendados, tantos como porciones tenga
   * (`min_exercises`: 3 en hombro, 1 en pantorrilla). Añadirlo vacío obligaría al usuario
   * a ir a buscarlos al paso siguiente sin saber cuántos hacen falta.
   */
  const addGroupToDay = useCallback((dayIndex: number, group: MuscleGroupSlug) => {
    setIsDirty(true);
    setAddingGroupTo(null);

    const wanted = groups.find((item) => item.slug === group)?.minExercises ?? 2;

    setDays((current) => current.map((day) => {
      if (day.dayIndex !== dayIndex || day.focusGroups.includes(group)) return day;

      // Se pide de a uno, no se corta una lista precalculada: cada elección tiene
      // que enterarse de la anterior (mismo criterio que buildFromTemplate) para no
      // repetir ejercicio ni región dentro de este grupo.
      const usedInDay = new Set(day.slots.map((slot) => slot.exerciseId));
      const usedRegions = new Set(
        day.slots
          .filter((slot) => slot.muscleGroup === group)
          .map((slot) => catalogById.get(slot.exerciseId)?.region)
          .filter((region): region is MuscleRegion => Boolean(region))
      );

      const picked: TrainingExercise[] = [];
      for (let i = 0; i < wanted; i += 1) {
        const exercise = pickExerciseForSlot(
          undefined,
          group,
          catalog.exercises,
          (item) => suitsLevel(item.difficulty, knowledgeLevel),
          usedInDay,
          usedRegions
        );
        if (!exercise) break; // el grupo entero ya está en el día: no hay más para ofrecer
        picked.push(exercise);
        usedInDay.add(exercise.id);
        if (exercise.region) usedRegions.add(exercise.region);
      }

      const next = renameDay(day, day.dayKind, [...day.focusGroups, group]);
      return {
        ...next,
        slots: [...day.slots, ...picked.map((exercise) => ({
          key: nextKey(),
          exerciseId: exercise.id,
          muscleGroup: group,
          targetSets: 3,
          targetReps: exercise.defaultReps?.high ?? null,
          restSeconds: exercise.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
          transitionSeconds: exercise.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
          isOptional: false
        }))]
      };
    }));
  }, [groups, catalog.exercises, knowledgeLevel, renameDay, catalogById]);

  const restoreRecommendedWeek = useCallback(() => {
    if (!template) return;
    setIsDirty(true);
    setAddingGroupTo(null);
    setDays(buildFromTemplate(template));
  }, [template, buildFromTemplate]);

  const weekPlan = useMemo(
    () => days.map((day) => ({ dayIndex: day.dayIndex, dayKind: day.dayKind, focusGroups: day.focusGroups })),
    [days]
  );

  const weekWarnings = useMemo(() => validateWeekPlan(weekPlan, groups), [weekPlan, groups]);

  /**
   * "Recomendado" solo mientras el reparto sea el de la plantilla. Compara tipo de día y
   * músculos, no ejercicios: cambiar un press por otro no personaliza la semana.
   */
  const isRecommendedWeek = useMemo(() => {
    if (!template) return false;
    return matchesTemplate(
      weekPlan,
      template.days.map((day) => ({ dayIndex: day.dayIndex, dayKind: day.dayKind, focusGroups: day.focusGroups }))
    );
  }, [template, weekPlan]);

  /**
   * Ejercicios que ya están en este día, para no dejar agregar el mismo dos veces.
   * En un swap de slot se excluye ese propio slot: si no, el ejercicio que ya tiene
   * asignado aparecería tildado de "ya está en tu rutina hoy" contra sí mismo.
   *
   * El bloqueo es por nombre normalizado (trim + minúsculas), no solo por id: el
   * catálogo puede tener dos filas para el mismo ejercicio con ids distintos, y
   * bloquear solo por id dejaría agregar ese "gemelo" sin avisar nada.
   */
  const disabledExerciseIds = useMemo(() => {
    if (!swapTarget || swapTarget.kind === 'cardio') return new Set<string>();
    const day = days.find((item) => item.dayIndex === swapTarget.dayIndex);
    if (!day) return new Set<string>();
    const excludeKey = swapTarget.kind === 'slot' ? swapTarget.slotKey : null;

    const usedNames = new Set(
      day.slots
        .filter((slot) => slot.key !== excludeKey)
        .map((slot) => catalogById.get(slot.exerciseId)?.name)
        .filter((name): name is string => Boolean(name))
        .map(normalizeExerciseName)
    );
    if (usedNames.size === 0) return new Set<string>();

    return new Set(
      catalog.exercises
        .filter((exercise) => usedNames.has(normalizeExerciseName(exercise.name)))
        .map((exercise) => exercise.id)
    );
  }, [swapTarget, days, catalogById, catalog.exercises]);

  const handleSwapSelect = useCallback((exercise: TrainingExercise) => {
    const target = swapTarget;
    setSwapTarget(null);
    if (!target) return;

    // Defensa además del deshabilitado en la lista: por si algo dispara onSelect igual.
    if (disabledExerciseIds.has(exercise.id)) return;

    if (target.kind === 'cardio') { setCardioExerciseId(exercise.id); setIsDirty(true); return; }

    if (target.kind === 'slot') {
      patchSlot(target.dayIndex, target.slotKey, {
        exerciseId: exercise.id,
        muscleGroup: exercise.group ?? target.group,
        targetReps: exercise.defaultReps?.high ?? null,
        restSeconds: exercise.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
        transitionSeconds: exercise.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS
      });
      return;
    }

    setIsDirty(true);
    setAddingToDay(null);
    setDays((current) => current.map((day) => day.dayIndex !== target.dayIndex ? day : {
      ...day,
      slots: [...day.slots, {
        key: nextKey(),
        exerciseId: exercise.id,
        muscleGroup: exercise.group ?? target.group,
        targetSets: 3,
        targetReps: exercise.defaultReps?.high ?? null,
        restSeconds: exercise.defaultRestSeconds ?? DEFAULT_REST_SECONDS,
        transitionSeconds: exercise.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS,
        isOptional: false
      }]
    }));
  }, [swapTarget, patchSlot, disabledExerciseIds]);

  /**
   * El reparto que sale de los días elegidos. Se muestra antes de los ejercicios
   * porque es la decisión que el usuario tiene que entender primero: cuántos días de
   * torso y cuántos de pierna.
   */
  const dayBalance = useMemo(() => {
    const torso = days.filter((day) => day.dayKind === 'torso').length;
    return { torso, pierna: days.length - torso };
  }, [days]);

  const allSlots = useMemo(() => days.flatMap((day) => day.slots), [days]);
  const totalSets = useMemo(() => allSlots.reduce((sum, slot) => sum + slot.targetSets, 0), [allSlots]);

  const volume = useMemo<VolumeEntry[]>(
    () => computeWeeklyVolume(allSlots, catalog.exercises, groups, 'beginner'),
    [allSlots, catalog.exercises, groups]
  );

  const save = useCallback(async () => {
    if (!name.trim()) { setError('Ponle un nombre a tu rutina.'); return; }
    if (allSlots.length === 0) { setError('Tu rutina no tiene ningún ejercicio.'); return; }

    const emptyDay = days.find((day) => day.slots.length === 0);
    if (emptyDay) { setError(`"${emptyDay.name}" se quedó sin ejercicios. Añade alguno o baja los días de la semana.`); return; }

    // Última red antes de guardar: si algún camino que no vimos deja el mismo
    // ejercicio dos veces en un día (por id o por nombre normalizado — el catálogo
    // puede tener dos filas para el mismo ejercicio con ids distintos), no se guarda.
    const duplicateDay = days.find((day) => {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      return day.slots.some((slot) => {
        const name = catalogById.get(slot.exerciseId)?.name;
        const normalizedName = name ? normalizeExerciseName(name) : null;
        const isDuplicate = seenIds.has(slot.exerciseId) || (normalizedName !== null && seenNames.has(normalizedName));
        seenIds.add(slot.exerciseId);
        if (normalizedName) seenNames.add(normalizedName);
        return isDuplicate;
      });
    });
    if (duplicateDay) {
      setError(`"${duplicateDay.name}" tiene el mismo ejercicio dos veces. Cambiá uno de los dos antes de guardar.`);
      return;
    }

    // Se recorre agrupado para que el orden guardado sea el mismo que el que se ve.
    const exercises: RoutineExerciseInput[] = days.flatMap((day) =>
      groupSlotsByMuscle(day.slots).flatMap((entry) => entry.slots).map((slot) => ({
        exerciseId: slot.exerciseId,
        dayIndex: day.dayIndex,
        muscleGroup: slot.muscleGroup,
        targetSets: slot.targetSets,
        targetReps: slot.targetReps,
        restSeconds: slot.restSeconds,
        transitionSeconds: slot.transitionSeconds
      }))
    );

    const input = {
      name,
      daysPerWeek,
      splitTemplateSlug: template?.slug ?? null,
      cardio: {
        placement: cardioPlacement,
        exerciseId: cardioPlacement === 'none' ? null : cardioExerciseId,
        minutes: cardioPlacement === 'none' ? null : cardioMinutes
      },
      exercises
    };

    setIsSaving(true);
    setError(null);
    try {
      if (routineId) await updateRoutine(routineId, input);
      else await createRoutine(input);
      if (isMountedRef.current) router.replace('/routines');
    } catch (caught) {
      if (isMountedRef.current) setError(describeSupabaseError(caught, 'No pudimos guardar la rutina.'));
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  }, [name, allSlots.length, days, daysPerWeek, template, cardioPlacement, cardioExerciseId, cardioMinutes, routineId, router, catalogById]);

  if (!isReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ActivityIndicator accessibilityLabel="Cargando el constructor" color={colors.accent} style={styles.centerLoader} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" ref={scrollRef}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <View style={styles.stepHeader}>
          <Eyebrow>{`Paso ${step + 1} de ${STEPS.length}`}</Eyebrow>
          <Text style={styles.title}>{STEPS[step].title}</Text>
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressValue, { width: `${((step + 1) / STEPS.length) * 100}%` }]} />
        </View>

        {stepKey === 'days' ? (
          <Text style={styles.description}>
            Con eso te proponemos un plan completo, con los días de pierna separados de los de
            torso. Todo es editable después.
          </Text>
        ) : null}

        {templatesError ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{templatesError}</Text>
          </View>
        ) : null}

        {catalog.error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{catalog.error}</Text>
          </View>
        ) : null}

        {/* Modo reducido: la app funciona, pero sin evidencia ni agarres. Decirlo es
            mejor que dejar que el usuario note que faltan cosas sin saber por qué. */}
        {catalog.isDegraded || groupsDegraded ? (
          <View style={[styles.notice, styles.noticeWarning]}>
            <Text style={styles.noticeText}>
              Falta aplicar una migración, así que no verás el nivel de evidencia ni los agarres
              de cada ejercicio. Corre npx supabase db push y vuelve a entrar.
            </Text>
          </View>
        ) : null}

        {/* --- Paso 1: días por semana --- */}
        {stepKey === 'days' ? (
        <Card style={styles.block}>
          <View style={styles.chipRow}>
            {DAY_OPTIONS.map((value) => {
              const on = value === daysPerWeek;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => requestDays(value)}
                  style={[styles.dayChip, on && styles.dayChipOn]}
                >
                  <Text style={[styles.dayChipNumber, on && styles.dayChipTextOn]}>{value}</Text>
                  {value === RECOMMENDED_DAYS_PER_WEEK ? (
                    <Text style={[styles.dayChipHint, on && styles.dayChipTextOn]}>sugerido</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          {pendingDays !== null ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>
                Cambiar a {pendingDays} días vuelve a armar la rutina desde cero y pierdes los cambios que hiciste.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable accessibilityRole="button" onPress={() => applyDays(pendingDays)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Sí, rearmar</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => setPendingDays(null)} style={styles.textButton}>
                  <Text style={styles.mutedButtonText}>Cancelar</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {template ? (
            <>
              <Text style={styles.templateName}>{template.name}</Text>
              <Text style={styles.templateSummary}>{template.summary}</Text>
              {/* Antes era texto suelto y no se veía que fuera desplegable. */}
              <InfoNote label="¿Por qué esta distribución?" source={template.evidenceSource}>
                {template.rationale}
              </InfoNote>
            </>
          ) : (
            <Text style={styles.emptyText}>No hay plantilla para {daysPerWeek} días todavía.</Text>
          )}
        </Card>
        ) : null}

        {/* --- Paso 2: cómo queda repartida la semana --- */}
        {stepKey === 'week' && days.length > 0 ? (
          <Card tone="accent" style={styles.block}>
            <View style={styles.weekHeader}>
              <View style={[styles.planBadge, !isRecommendedWeek && styles.planBadgeCustom]}>
                <Text style={[styles.planBadgeText, !isRecommendedWeek && styles.planBadgeTextCustom]}>
                  {isRecommendedWeek ? 'Recomendado' : 'Personalizado'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isEditingWeek ? 'Terminar de editar el reparto' : 'Editar el reparto de la semana'}
                onPress={() => { setIsEditingWeek((value) => !value); setAddingGroupTo(null); }}
                style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
              >
                <Text style={styles.linkText}>{isEditingWeek ? 'Listo' : 'Editar'}</Text>
              </Pressable>
            </View>

            <Text style={styles.balanceLine}>
              {dayBalance.torso === 1 ? '1 día de torso' : `${dayBalance.torso} días de torso`}
              {'  ·  '}
              {dayBalance.pierna === 1 ? '1 día de pierna' : `${dayBalance.pierna} días de pierna`}
            </Text>

            {/* Modo lectura: la propuesta, compacta. Es lo primero que hay que entender,
                y llenarla de controles la haría ilegible. */}
            {!isEditingWeek ? (
              <>
                {days.map((day) => (
                  <View key={day.dayIndex} style={styles.balanceRow}>
                    <View style={[styles.kindDot, day.dayKind === 'pierna' && styles.kindDotLeg]} />
                    <Text style={styles.balanceDay}>{day.name}</Text>
                    <Text style={styles.balanceGroups} numberOfLines={2}>
                      {day.focusGroups.map((group) => MUSCLE_GROUP_LABELS[group]).join(' · ')}
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <>
                {days.map((day) => {
                  const available = groups.filter(
                    (group) => group.slug !== 'cardio' && !day.focusGroups.includes(group.slug)
                  );

                  return (
                    <View key={day.dayIndex} style={styles.editDay}>
                      <View style={styles.editDayHeader}>
                        <Eyebrow>{`Día ${day.dayIndex}`}</Eyebrow>
                        <View style={styles.kindSwitch}>
                          {(['torso', 'pierna'] as DayKind[]).map((kind) => {
                            const on = day.dayKind === kind;
                            return (
                              <Pressable
                                key={kind}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: on }}
                                accessibilityLabel={`Día ${day.dayIndex} de ${DAY_KIND_LABELS[kind]}`}
                                onPress={() => setDayKind(day.dayIndex, kind)}
                                style={({ pressed }) => [styles.kindOption, on && styles.kindOptionOn, pressed && styles.pressed]}
                              >
                                <Text style={[styles.kindOptionText, on && styles.kindOptionTextOn]}>
                                  {DAY_KIND_LABELS[kind]}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>

                      <View style={styles.groupChips}>
                        {day.focusGroups.map((group) => (
                          <Pressable
                            key={group}
                            accessibilityRole="button"
                            accessibilityLabel={`Quitar ${MUSCLE_GROUP_LABELS[group]} del día ${day.dayIndex}`}
                            onPress={() => removeGroupFromDay(day.dayIndex, group)}
                            style={({ pressed }) => [styles.weekGroupChip, pressed && styles.pressed]}
                          >
                            <Text style={styles.weekGroupChipText}>{MUSCLE_GROUP_LABELS[group]}</Text>
                            <Text style={styles.groupChipRemove}>×</Text>
                          </Pressable>
                        ))}

                        {available.length > 0 ? (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{ expanded: addingGroupTo === day.dayIndex }}
                            accessibilityLabel={`Añadir un músculo al día ${day.dayIndex}`}
                            onPress={() => setAddingGroupTo(addingGroupTo === day.dayIndex ? null : day.dayIndex)}
                            style={({ pressed }) => [styles.groupChipAdd, pressed && styles.pressed]}
                          >
                            <Text style={styles.groupChipAddText}>
                              {addingGroupTo === day.dayIndex ? 'Cancelar' : '+ Músculo'}
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>

                      {addingGroupTo === day.dayIndex ? (
                        <View style={styles.groupPicker}>
                          {available.map((group) => (
                            <Pressable
                              key={group.slug}
                              accessibilityRole="button"
                              accessibilityLabel={`Añadir ${group.name} al día ${day.dayIndex}`}
                              onPress={() => addGroupToDay(day.dayIndex, group.slug)}
                              style={({ pressed }) => [styles.pickerChip, pressed && styles.pressed]}
                            >
                              <Text style={styles.pickerChipText}>{group.name}</Text>
                            </Pressable>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })}

                {!isRecommendedWeek && template ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={restoreRecommendedWeek}
                    style={({ pressed }) => [styles.restoreButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.restoreText}>Volver al reparto recomendado</Text>
                  </Pressable>
                ) : null}
              </>
            )}

            {/* Avisos en rojo. No bloquean: el usuario pidió poder editar a criterio, así
                que la app dice qué regla se saltó y por qué existe, y le deja seguir. */}
            {weekWarnings.length > 0 ? (
              <View style={styles.warningBox}>
                <Text style={styles.warningHeading}>
                  {weekWarnings.length === 1 ? 'Revisa esto' : `Revisa estas ${weekWarnings.length} cosas`}
                </Text>
                {weekWarnings.map((warning, index) => (
                  <View key={`${warning.title}-${index}`} style={styles.warningItem}>
                    <Text style={styles.warningTitle}>{warning.title}</Text>
                    <Text style={styles.warningDetail}>{warning.detail}</Text>
                  </View>
                ))}
                <Text style={styles.warningFoot}>
                  Puedes guardar la rutina así. Son avisos, no errores.
                </Text>
              </View>
            ) : null}

            <InfoNote label="¿Por qué pierna y torso van separados?">
              No es que separarlos haga crecer más: a igual volumen semanal da lo mismo. Se separan
              porque una prensa a fondo te deja sin fuerza para hacer bien un jalón después, y porque
              las sesiones quedan más cortas.
            </InfoNote>
          </Card>
        ) : null}

        {/* --- Paso 5: nombre y guardado --- */}
        {stepKey === 'review' ? (
        <Card style={styles.block}>
          <Text style={styles.fieldLabel}>Nombre de la rutina</Text>
          <TextInput
            accessibilityLabel="Nombre de la rutina"
            onChangeText={(value) => { setName(value); setIsDirty(true); }}
            style={styles.input}
            value={name}
          />
        </Card>
        ) : null}

        {/* --- Paso 3: días y ejercicios --- */}
        {stepKey === 'exercises' ? (
        <View style={styles.stepBody}>
        {days.map((day) => {
          const isOpen = openDay === day.dayIndex;
          const daySets = day.slots.reduce((sum, slot) => sum + slot.targetSets, 0);

          return (
            <Card key={day.dayIndex} style={styles.block}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => setOpenDay(isOpen ? null : day.dayIndex)}
                style={styles.dayHeader}
              >
                <View style={styles.dayHeaderText}>
                  <View style={styles.dayBadgeRow}>
                    <Eyebrow>{`Día ${day.dayIndex}`}</Eyebrow>
                    <View style={[styles.kindBadge, day.dayKind === 'pierna' && styles.kindBadgeLeg]}>
                      <Text style={[styles.kindBadgeText, day.dayKind === 'pierna' && styles.kindBadgeTextLeg]}>
                        {DAY_KIND_LABELS[day.dayKind]}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.dayName}>{day.name}</Text>
                  <Text style={styles.dayMeta}>
                    {day.slots.length === 1 ? '1 ejercicio' : `${day.slots.length} ejercicios`} · {daySets} series
                  </Text>
                </View>
                <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
              </Pressable>

              {isOpen ? (
                <View style={styles.dayBody}>
                  {day.pairingRationale ? (
                    <InfoNote label="¿Por qué van juntos estos músculos?">{day.pairingRationale}</InfoNote>
                  ) : null}

                  {day.slots.length === 0 ? (
                    <Text style={styles.emptyText}>Este día está vacío. Añade al menos un ejercicio.</Text>
                  ) : null}

                  {/* Un día trabaja dos o tres músculos. Verlos todos abiertos a la vez
                      era un muro; cada uno se despliega solo si lo tocas. */}
                  {groupSlotsByMuscle(day.slots).map(({ group, slots }) => {
                    const groupKey = `${day.dayIndex}-${group}`;
                    const isGroupOpen = openGroups[groupKey] ?? false;
                    const groupSets = slots.reduce((sum, item) => sum + item.targetSets, 0);

                    return (
                      <View key={groupKey} style={styles.groupSection}>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityState={{ expanded: isGroupOpen }}
                          accessibilityLabel={`${MUSCLE_GROUP_LABELS[group]}, ${slots.length} ejercicios, ${groupSets} series`}
                          onPress={() => setOpenGroups((current) => ({ ...current, [groupKey]: !isGroupOpen }))}
                          style={styles.groupHeader}
                        >
                          <View style={styles.groupHeaderText}>
                            <Text style={styles.groupName}>{MUSCLE_GROUP_LABELS[group]}</Text>
                            <Text style={styles.groupMeta}>
                              {slots.length === 1 ? '1 ejercicio' : `${slots.length} ejercicios`} · {groupSets} series
                            </Text>
                          </View>
                          <Text style={styles.chevron}>{isGroupOpen ? '−' : '+'}</Text>
                        </Pressable>

                        {isGroupOpen ? (
                          <View style={styles.groupBody}>
                            {slots.map((slot, index) => {
                              const exercise = catalogById.get(slot.exerciseId);
                              return (
                                <View key={slot.key} style={styles.slot}>
                                  <View style={styles.slotHead}>
                                    <View style={styles.slotHeadText}>
                                      <Text style={styles.slotName}>{exercise?.name ?? 'Ejercicio'}</Text>
                                      <Text style={styles.slotMeta}>
                                        {exercise ? equipmentLabels[exercise.equipment] : ''}
                                        {/* La región distingue dos ejercicios del mismo músculo de un vistazo
                                            ("Cabeza larga" vs "Cabeza lateral"); la dificultad no — casi todo
                                            el catálogo es "Fácil de ejecutar". Sin región (no debería pasar
                                            fuera de cardio, que no usa esta tarjeta), cae a la dificultad. */}
                                        {exercise ? ` · ${exercise.region ? REGION_LABELS[exercise.region] : DIFFICULTY_LABELS[exercise.difficulty]}` : ''}
                                        {slot.isOptional ? ' · puedes quitarlo' : ''}
                                      </Text>
                                    </View>
                                    <View style={styles.reorder}>
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Subir ejercicio"
                                        disabled={index === 0}
                                        onPress={() => moveSlotInGroup(day.dayIndex, group, index, -1)}
                                        style={[styles.reorderButton, index === 0 && styles.disabled]}
                                      >
                                        <Text style={styles.reorderText}>↑</Text>
                                      </Pressable>
                                      <Pressable
                                        accessibilityRole="button"
                                        accessibilityLabel="Bajar ejercicio"
                                        disabled={index === slots.length - 1}
                                        onPress={() => moveSlotInGroup(day.dayIndex, group, index, 1)}
                                        style={[styles.reorderButton, index === slots.length - 1 && styles.disabled]}
                                      >
                                        <Text style={styles.reorderText}>↓</Text>
                                      </Pressable>
                                    </View>
                                  </View>

                                  <Stepper
                                    label="Series"
                                    value={slot.targetSets}
                                    min={MIN_SETS}
                                    max={MAX_SETS}
                                    onChange={(value) => patchSlot(day.dayIndex, slot.key, { targetSets: value })}
                                  />

                                  <Pressable
                                    accessibilityRole="button"
                                    accessibilityState={{ expanded: openRestSlot === slot.key }}
                                    onPress={() => setOpenRestSlot(openRestSlot === slot.key ? null : slot.key)}
                                    style={styles.restSummary}
                                  >
                                    <Text style={styles.restSummaryText}>
                                      Descanso {formatSeconds(slot.restSeconds ?? DEFAULT_REST_SECONDS)} entre series ·{' '}
                                      {formatSeconds(slot.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS)} al cambiar
                                    </Text>
                                    <Text style={styles.restSummaryChevron}>{openRestSlot === slot.key ? '−' : '+'}</Text>
                                  </Pressable>

                                  {openRestSlot === slot.key ? (
                                    <View style={styles.restBox}>
                                      <Stepper
                                        label="Entre series"
                                        value={slot.restSeconds ?? DEFAULT_REST_SECONDS}
                                        min={MIN_REST_SECONDS}
                                        max={MAX_REST_SECONDS}
                                        step={REST_STEP_SECONDS}
                                        suffix="s"
                                        onChange={(value) => patchSlot(day.dayIndex, slot.key, { restSeconds: value })}
                                      />
                                      <Stepper
                                        label="Al cambiar de ejercicio"
                                        value={slot.transitionSeconds ?? DEFAULT_TRANSITION_SECONDS}
                                        min={MIN_REST_SECONDS}
                                        max={MAX_REST_SECONDS}
                                        step={REST_STEP_SECONDS}
                                        suffix="s"
                                        onChange={(value) => patchSlot(day.dayIndex, slot.key, { transitionSeconds: value })}
                                      />
                                      <InfoNote label="¿De dónde salen estos tiempos?">
                                        {exercise?.isCompound
                                          ? 'Para crecer, 90 segundos entre series es suficiente: el mejor análisis disponible no encuentra más músculo por descansar más. Eso sí, en un compuesto pesado el descanso corto te resta fuerza en las últimas series; si notas que se te caen mucho las repeticiones, súbelo a 2 minutos. El descanso al cambiar de ejercicio no tiene estudios propios: son 2 o 3 minutos porque se van montando la máquina.'
                                          : 'Para crecer, 90 segundos entre series es suficiente: el mejor análisis disponible no encuentra más músculo por descansar más de eso. El descanso al cambiar de ejercicio no tiene estudios propios: son 2 minutos porque se van montando la máquina.'}
                                      </InfoNote>
                                    </View>
                                  ) : null}

                                  {exercise?.evidenceNote ? (
                                    <InfoNote label="¿Por qué este ejercicio?" source={exercise.evidenceSource}>
                                      {exercise.evidenceNote}
                                    </InfoNote>
                                  ) : null}

                                  <View style={styles.slotActions}>
                                    <Pressable
                                      accessibilityRole="button"
                                      onPress={() => setSwapTarget({ kind: 'slot', dayIndex: day.dayIndex, slotKey: slot.key, group: slot.muscleGroup })}
                                      style={styles.textButton}
                                    >
                                      <Text style={styles.textButtonText}>Cambiar</Text>
                                    </Pressable>
                                    <Pressable
                                      accessibilityRole="button"
                                      onPress={() => removeSlot(day.dayIndex, slot.key)}
                                      style={styles.textButton}
                                    >
                                      <Text style={styles.mutedButtonText}>Quitar</Text>
                                    </Pressable>
                                  </View>
                                </View>
                              );
                            })}

                            <Pressable
                              accessibilityRole="button"
                              onPress={() => setSwapTarget({ kind: 'add', dayIndex: day.dayIndex, group })}
                              style={styles.addButton}
                            >
                              <Text style={styles.addButtonText}>
                                + Añadir ejercicio de {MUSCLE_GROUP_LABELS[group].toLowerCase()}
                              </Text>
                            </Pressable>
                          </View>
                        ) : null}
                      </View>
                    );
                  })}

                  {addingToDay === day.dayIndex ? (
                    <View style={styles.addBox}>
                      <Text style={styles.fieldLabel}>Añadir otro grupo muscular a este día</Text>
                      <View style={styles.chipRow}>
                        {groups.filter((group) => group.slug !== 'cardio').map((group) => (
                          <Pressable
                            key={group.slug}
                            accessibilityRole="button"
                            onPress={() => setSwapTarget({ kind: 'add', dayIndex: day.dayIndex, group: group.slug })}
                            style={styles.groupChip}
                          >
                            <Text style={styles.groupChipText}>{group.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                      <Pressable accessibilityRole="button" onPress={() => setAddingToDay(null)} style={styles.textButton}>
                        <Text style={styles.mutedButtonText}>Cancelar</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setAddingToDay(day.dayIndex)}
                      style={styles.addButton}
                    >
                      <Text style={styles.addButtonText}>+ Añadir otro grupo muscular</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}
            </Card>
          );
        })}

        </View>
        ) : null}

        {/* --- Paso 4: cardio --- */}
        {stepKey === 'cardio' ? (
        <Card style={styles.block}>
          <Text style={styles.sectionTitle}>¿Dónde lo pones?</Text>
          <Text style={styles.cardioIntro}>
            Va en todas las sesiones, quieras subir o bajar de peso. Está aquí por tu corazón,
            no por la báscula.
          </Text>

          <View style={styles.chipRow}>
            {CARDIO_OPTIONS.map((placement) => {
              const on = placement === cardioPlacement;
              return (
                <Pressable
                  key={placement}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => {
                    setCardioPlacement(placement);
                    setCardioMinutes(DEFAULT_CARDIO_MINUTES[placement] || 15);
                    setIsDirty(true);
                  }}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{CARDIO_PLACEMENT_LABELS[placement]}</Text>
                </Pressable>
              );
            })}
          </View>

          <InfoNote label="¿Por qué aquí?">{CARDIO_PLACEMENT_NOTES[cardioPlacement]}</InfoNote>

          {cardioPlacement !== 'none' ? (
            <>
              <View style={styles.cardioRow}>
                <Stepper
                  label="Minutos"
                  value={cardioMinutes}
                  min={5}
                  max={cardioPlacement === 'start' ? 15 : 45}
                  step={5}
                  suffix="min"
                  onChange={(value) => { setCardioMinutes(value); setIsDirty(true); }}
                />
              </View>
              {cardioPlacement === 'start' && cardioMinutes > 10 ? (
                <Text style={styles.warning}>
                  Como calentamiento, más de 10 minutos empieza a restarle fuerza a las pesas.
                  Si quieres más cardio, ponlo al final.
                </Text>
              ) : null}

              <Text style={styles.fieldLabel}>Máquina</Text>
              <Text style={styles.cardioExercise}>
                {catalogById.get(cardioExerciseId ?? '')?.name ?? 'Elige una'}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSwapTarget({ kind: 'cardio', group: 'cardio' })}
                style={styles.textButton}
              >
                <Text style={styles.textButtonText}>Cambiar máquina</Text>
              </Pressable>

              <InfoNote label="¿Cómo sé si voy suave?">
                Tienes que poder hablar en frases completas y cómodas. Si te falta el aire para decir
                una frase entera, baja el ritmo. Es más fiable que cualquier fórmula de pulsaciones.
              </InfoNote>
            </>
          ) : null}
        </Card>
        ) : null}

        {/* --- Paso 5: resumen de volumen --- */}
        {stepKey === 'review' ? (
        <Card style={styles.block}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showVolume }}
            onPress={() => setShowVolume((current) => !current)}
            style={styles.dayHeader}
          >
            <View style={styles.dayHeaderText}>
              <Eyebrow>Resumen</Eyebrow>
              <Text style={styles.dayName}>{totalSets} series a la semana</Text>
              <Text style={styles.dayMeta}>Toca para ver cuántas le tocan a cada músculo</Text>
            </View>
            <Text style={styles.chevron}>{showVolume ? '−' : '+'}</Text>
          </Pressable>

          {showVolume ? (
            <View style={styles.dayBody}>
              <InfoNote label="¿Qué significa la estrella?">
                Marca los músculos a los que damos algo más de volumen y los únicos que pueden
                repetirse en la semana: hombros, espalda, pecho y glúteos. Es un criterio de
                apariencia, no científico — ningún estudio dice qué músculos hay que priorizar.
                Viene de una convención muy extendida sobre la silueta, y puedes no compartirla:
                todas las series son editables. Lo que sí está respaldado es el rango en el que
                nos movemos, de 6 a 10 series semanales para quien empieza.
              </InfoNote>

              <InfoNote label="¿Cómo se cuentan estas series?">
                Contamos entero lo que apunta al músculo y la mitad lo que le llega de rebote (un
                press ya trabaja el tríceps). Esa mitad no es un invento: de tres formas de contar el
                trabajo indirecto, es la que mejor encajó con los datos en el análisis más grande que
                existe. El rango para empezar es de 6 a 10 series por músculo a la semana: por debajo
                también sirve, solo que menos, y muy por encima cansa más de lo que aporta.
              </InfoNote>

              {volume.map((entry) => (
                <View key={entry.group} style={styles.volumeRow}>
                  <Text style={styles.volumeLabel}>
                    {entry.label}
                    {entry.priority === 1 ? <Text style={styles.priorityMark}>  ★</Text> : null}
                  </Text>
                  <Text style={styles.volumeValue}>
                    {formatSets(entry.total)}
                    {entry.indirect > 0 ? (
                      <Text style={styles.volumeBreakdown}>{`  (${formatSets(entry.direct)} + ${formatSets(entry.indirect)})`}</Text>
                    ) : null}
                  </Text>
                  <View style={[styles.volumeTag, statusTone(styles, entry.status)]}>
                    <Text style={[styles.volumeTagText, statusTextTone(styles, entry.status)]}>
                      {entry.status === 'bajo' ? `bajo de ${entry.target.min}` : entry.status === 'alto' ? 'de sobra' : 'en rango'}
                    </Text>
                  </View>
                </View>
              ))}

            </View>
          ) : null}
        </Card>
        ) : null}

        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        {blockingReason ? <Text accessibilityLiveRegion="polite" style={styles.blockingHint}>{blockingReason}</Text> : null}

        <View style={styles.stepNav}>
          {step > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setStep((current) => Math.max(0, current - 1))}
              style={({ pressed }) => [styles.backStep, pressed && styles.pressed]}
            >
              <Text style={styles.backStepText}>Atrás</Text>
            </Pressable>
          ) : null}

          <PrimaryButton
            label={isLastStep ? (routineId ? 'Guardar cambios' : 'Guardar mi rutina') : 'Siguiente'}
            icon={isLastStep ? 'check' : 'arrowRight'}
            disabled={Boolean(blockingReason)}
            loading={isSaving}
            onPress={() => {
              if (blockingReason) return;
              if (isLastStep) { void save(); return; }
              setStep((current) => Math.min(STEPS.length - 1, current + 1));
            }}
            style={styles.nextStep}
          />
        </View>
      </ScrollView>

      {swapTarget ? (
        <ExerciseSwapSheet
          visible
          group={swapTarget.group}
          catalog={catalog.exercises}
          selectedExerciseId={selectedIdFor(swapTarget, days, cardioExerciseId)}
          catalogError={catalog.error}
          disabledExerciseIds={disabledExerciseIds}
          disabledReason="Ya está en tu rutina de hoy"
          onSelect={handleSwapSelect}
          onClose={() => setSwapTarget(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function selectedIdFor(target: SwapTarget, days: BuilderDay[], cardioExerciseId: string | null): string | null {
  if (target.kind === 'cardio') return cardioExerciseId;
  if (target.kind === 'add') return null;
  const day = days.find((item) => item.dayIndex === target.dayIndex);
  return day?.slots.find((slot) => slot.key === target.slotKey)?.exerciseId ?? null;
}

function statusTone(styles: ReturnType<typeof createStyles>, status: VolumeEntry['status']) {
  if (status === 'bajo') return styles.tagLow;
  if (status === 'alto') return styles.tagHigh;
  return styles.tagOk;
}

function statusTextTone(styles: ReturnType<typeof createStyles>, status: VolumeEntry['status']) {
  if (status === 'bajo') return styles.tagTextLow;
  if (status === 'alto') return styles.tagTextHigh;
  return styles.tagTextOk;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    centerLoader: { marginTop: spacing.xxl },
    content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginTop: spacing.sm },
    description: { ...type.body, color: colors.textMuted, marginTop: spacing.sm },
    block: { marginTop: spacing.md },
    blockEyebrow: { marginTop: spacing.lg },
    stepHeader: { gap: spacing.xs },
    progressTrack: { backgroundColor: colors.line, borderRadius: 2, height: 4, marginTop: spacing.md, overflow: 'hidden' },
    progressValue: { backgroundColor: colors.accent, borderRadius: 2, height: '100%' },
    stepBody: { gap: 0 },
    stepNav: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
    backStep: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.lg },
    backStepText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    nextStep: { flex: 1 },
    blockingHint: { ...type.small, color: colors.warning, marginTop: spacing.md },
    pressed: { opacity: 0.78 },
    sectionTitle: { ...type.sectionTitle, color: colors.text, marginTop: spacing.xs },
    emptyText: { ...type.small, color: colors.textMuted, marginTop: spacing.sm },

    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    dayChip: {
      alignItems: 'center',
      borderColor: colors.line,
      borderRadius: radii.sm,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 56,
      minWidth: 56,
      paddingHorizontal: spacing.sm
    },
    dayChipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    dayChipNumber: { ...type.cardTitle, color: colors.text },
    dayChipHint: { ...type.small, color: colors.textMuted, fontSize: 10 },
    dayChipTextOn: { color: colors.accent },

    chip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md },
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { ...type.small, color: colors.textMuted, fontWeight: '600' },
    chipTextOn: { color: colors.accent },

    groupChip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md },
    groupChipText: { ...type.small, color: colors.text, fontWeight: '600' },

    confirmBox: { backgroundColor: colors.warningSoft, borderRadius: radii.sm, marginTop: spacing.md, padding: spacing.md },
    confirmText: { ...type.small, color: colors.text },
    confirmActions: { flexDirection: 'row', gap: spacing.lg },

    templateName: { ...type.cardTitle, color: colors.text, marginTop: spacing.md },
    templateSummary: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },

    fieldLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
    input: { borderBottomColor: colors.line, borderBottomWidth: 1.5, color: colors.text, fontFamily: typography.body, fontSize: 16, minHeight: 46, paddingVertical: spacing.sm },

    dayHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
    dayHeaderText: { flexShrink: 1, gap: 2, minWidth: 0 },
    dayBadgeRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    weekHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    planBadge: { backgroundColor: colors.accent, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 3 },
    planBadgeCustom: { backgroundColor: colors.background, borderColor: colors.line, borderWidth: 1 },
    planBadgeText: { ...type.eyebrow, color: colors.surface },
    planBadgeTextCustom: { color: colors.textMuted },
    linkButton: { alignItems: 'center', height: 40, justifyContent: 'center', paddingHorizontal: spacing.sm },
    linkText: { ...type.small, color: colors.accent, fontWeight: '700' },

    editDay: { borderTopColor: colors.line, borderTopWidth: 1, gap: spacing.sm, paddingTop: spacing.md, marginTop: spacing.md },
    editDayHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    kindSwitch: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
    kindOption: { alignItems: 'center', justifyContent: 'center', minHeight: 34, paddingHorizontal: spacing.md },
    kindOptionOn: { backgroundColor: colors.accent },
    kindOptionText: { ...type.small, color: colors.textMuted, fontWeight: '700' },
    kindOptionTextOn: { color: colors.surface },

    groupChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    weekGroupChip: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radii.pill, flexDirection: 'row', gap: 6, minHeight: 36, paddingHorizontal: spacing.md },
    weekGroupChipText: { ...type.small, color: colors.accent, fontWeight: '700' },
    groupChipRemove: { color: colors.accent, fontFamily: typography.body, fontSize: 17, fontWeight: '700', lineHeight: 20 },
    groupChipAdd: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.pill, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: spacing.md },
    groupChipAddText: { ...type.small, color: colors.textMuted, fontWeight: '700' },
    groupPicker: { backgroundColor: colors.background, borderRadius: radii.sm, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, padding: spacing.sm },
    pickerChip: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 36, paddingHorizontal: spacing.md },
    pickerChipText: { ...type.small, color: colors.text, fontWeight: '600' },
    restoreButton: { alignItems: 'center', height: 44, justifyContent: 'center', marginTop: spacing.md },
    restoreText: { ...type.small, color: colors.accent, fontWeight: '700' },

    warningBox: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, gap: spacing.sm, marginTop: spacing.md, padding: spacing.md },
    warningHeading: { ...type.eyebrow, color: colors.danger },
    warningItem: { gap: 2 },
    warningTitle: { color: colors.danger, fontFamily: typography.body, fontSize: 14, fontWeight: '700', lineHeight: 20 },
    warningDetail: { color: colors.text, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
    warningFoot: { ...type.small, color: colors.textMuted },

    balanceLine: { ...type.sectionTitle, color: colors.text, marginTop: spacing.xs },
    balanceRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
    kindDot: { backgroundColor: colors.textMuted, borderRadius: 4, height: 8, marginTop: 6, width: 8 },
    kindDotLeg: { backgroundColor: colors.accent },
    balanceDay: { ...type.small, color: colors.text, fontWeight: '700', width: 116 },
    balanceGroups: { ...type.small, color: colors.textMuted, flex: 1, minWidth: 0 },
    kindBadge: { backgroundColor: colors.background, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.sm, paddingVertical: 1 },
    kindBadgeLeg: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    kindBadgeText: { ...type.eyebrow, color: colors.textMuted },
    kindBadgeTextLeg: { color: colors.accent },
    dayName: { ...type.sectionTitle, color: colors.text },
    dayMeta: { ...type.small, color: colors.textMuted },
    chevron: { color: colors.accent, fontFamily: typography.display, fontSize: 24, fontWeight: '800' },
    dayBody: { gap: spacing.sm, marginTop: spacing.md },


    groupSection: { borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, overflow: 'hidden' },
    groupHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing.md },
    groupHeaderText: { flexShrink: 1, gap: 2, minWidth: 0 },
    groupName: { ...type.cardTitle, color: colors.text },
    groupMeta: { ...type.small, color: colors.textMuted },
    groupBody: { backgroundColor: colors.background, gap: spacing.sm, padding: spacing.md },
    slot: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, gap: spacing.sm, padding: spacing.md },
    slotMeta: { ...type.small, color: colors.textMuted },
    slotHead: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    slotHeadText: { flexShrink: 1, gap: 2, minWidth: 0 },
    slotName: { ...type.cardTitle, color: colors.text },
    optionalTag: { ...type.small, color: colors.textMuted, fontStyle: 'italic' },
    slotNote: { ...type.small, color: colors.textMuted },
    slotActions: { flexDirection: 'row', gap: spacing.lg },
    restSummary: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', minHeight: 44, paddingHorizontal: spacing.md },
    restSummaryText: { ...type.small, color: colors.textMuted, flexShrink: 1, minWidth: 0 },
    restSummaryChevron: { color: colors.accent, fontFamily: typography.display, fontSize: 18, fontWeight: '800' },
    restBox: { backgroundColor: colors.background, borderRadius: radii.sm, gap: spacing.md, padding: spacing.md },
    reorder: { flexDirection: 'row', gap: spacing.xs },
    reorderButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
    reorderText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.35 },

    addBox: { backgroundColor: colors.background, borderRadius: radii.sm, padding: spacing.md },
    addButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderStyle: 'dashed', borderWidth: 1, justifyContent: 'center', minHeight: 48 },
    addButtonText: { ...type.small, color: colors.accent, fontWeight: '700' },

    cardioIntro: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    cardioRow: { flexDirection: 'row', marginTop: spacing.md },
    cardioExercise: { ...type.cardTitle, color: colors.text, marginTop: spacing.xs },
    warning: { ...type.small, color: colors.warning, marginTop: spacing.sm },

    volumeRow: { alignItems: 'center', borderTopColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 44 },
    volumeLabel: { ...type.small, color: colors.text, flex: 1, fontWeight: '600', minWidth: 0 },
    priorityMark: { color: colors.accent },
    volumeValue: { ...type.small, color: colors.text, fontVariant: ['tabular-nums'], fontWeight: '700' },
    volumeBreakdown: { color: colors.textMuted, fontWeight: '400' },
    volumeTag: { borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    tagOk: { backgroundColor: colors.accentSoft },
    tagLow: { backgroundColor: colors.warningSoft },
    tagHigh: { backgroundColor: colors.background },
    volumeTagText: { ...type.small, fontSize: 11, fontWeight: '700' },
    tagTextOk: { color: colors.accent },
    tagTextLow: { color: colors.warning },
    tagTextHigh: { color: colors.textMuted },

    errorBanner: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
    notice: { borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
    noticeWarning: { backgroundColor: colors.warningSoft },
    noticeText: { ...type.small, color: colors.text },
    errorBannerText: { ...type.small, color: colors.text },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md },

    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    mutedButtonText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    saveButton: { marginTop: spacing.lg }
  });
}
