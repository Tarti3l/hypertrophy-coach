import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoNote } from '@/components/ui/InfoNote';
import { Icon } from '@/components/ui/Icon';
import { describeSupabaseError } from '@/lib/supabaseErrors';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';
import { SetTracker } from '@/features/progress/components/SetTracker';
import { formatElapsedTime, useWorkoutSession } from '@/features/progress/hooks/useWorkoutSession';
import { getLastPerformanceByExercise } from '@/features/progress/services/workoutSessionRepository';

import { EquipmentFilter } from '../components/EquipmentFilter';
import { ExerciseMediaPreview } from '../components/ExerciseMediaPreview';
import { ExerciseSwapSheet } from '../components/ExerciseSwapSheet';
import { RestTimer } from '../components/RestTimer';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useProgression } from '../hooks/useProgression';
import { getRoutine } from '../services/routineRepository';
import { equipmentLabels } from '../services/exerciseCatalog';
import { Routine } from '../types/routine';
import { DEFAULT_REST_SECONDS, DEFAULT_TRANSITION_SECONDS, useRestTimer } from '../hooks/useRestTimer';
import { DIFFICULTY_LABELS, EVIDENCE_LABELS, ExerciseFilter, MUSCLE_GROUP_LABELS, MuscleGroupSlug, REGION_LABELS, TrainingExercise } from '../types/training';

export function ActiveWorkoutScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/training');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { routineId, day } = useLocalSearchParams<{ routineId?: string; day?: string }>();
  const dayIndex = Number(day) || 1;

  const [routine, setRoutine] = useState<Routine | null>(null);
  const [routineError, setRoutineError] = useState<string | null>(null);
  const [isRoutineLoading, setIsRoutineLoading] = useState(Boolean(routineId));
  const [routineReloadToken, setRoutineReloadToken] = useState(0);

  const { exercises: catalogExercises, isLoading: isCatalogLoading, error: catalogError, reload: reloadCatalog } = useExerciseCatalog();

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  /**
   * La rutina se carga con estado de error visible.
   *
   * Antes era `.catch(() => undefined)`: si fallaba la red o la política RLS, `routine`
   * se quedaba null para siempre y la pantalla caía al catálogo completo, presentando
   * los ~55 ejercicios como si fueran el entrenamiento del día. El usuario entrenaba
   * lo que no tocaba y nada se lo decía.
   */
  useEffect(() => {
    if (!routineId) return;

    let active = true;
    setIsRoutineLoading(true);
    setRoutineError(null);

    void getRoutine(routineId)
      .then((loaded) => {
        if (!active) return;
        if (!loaded) {
          setRoutineError('No encontramos esa rutina. Puede que la hayas archivado.');
          return;
        }
        setRoutine(loaded);
      })
      .catch((caught) => {
        if (active) setRoutineError(describeSupabaseError(caught, 'No pudimos cargar tu rutina.'));
      })
      .finally(() => { if (active) setIsRoutineLoading(false); });

    return () => { active = false; };
  }, [routineId, routineReloadToken]);

  /**
   * Los ejercicios del día que se está entrenando, no los de toda la rutina.
   * Si el día no existe (rutina vieja, o enlace con un día fuera de rango) caemos a la
   * lista completa y lo avisamos, en vez de dejar la sesión vacía sin explicación.
   */
  const routineExercises = useMemo(() => {
    if (!routine) return [];
    const forDay = routine.exercises.filter((item) => item.dayIndex === dayIndex);
    return forDay.length > 0 ? forDay : routine.exercises;
  }, [routine, dayIndex]);

  const dayOutOfRange = Boolean(routine) && routine!.exercises.every((item) => item.dayIndex !== dayIndex);

  /** Sustituciones de esta sesión: id original -> ejercicio de reemplazo. No tocan la rutina guardada. */
  const [swaps, setSwaps] = useState<Record<string, TrainingExercise>>({});
  /** Ejercicios que el usuario decidió saltarse hoy. */
  const [skipped, setSkipped] = useState<string[]>([]);

  const catalogById = useMemo(
    () => new Map(catalogExercises.map((exercise) => [exercise.id, exercise])),
    [catalogExercises]
  );

  /**
   * Ejercicios de la sesión. Cuenta los que la rutina pide pero el catálogo ya no
   * publica: desaparecían en silencio y el usuario no sabía qué había pasado con ellos.
   */
  const { exercises, missingCount } = useMemo(() => {
    if (!routine) return { exercises: catalogExercises, missingCount: 0 };

    const resolved: TrainingExercise[] = [];
    let missing = 0;

    for (const item of routineExercises) {
      const swapped = swaps[item.exerciseId];
      const exercise = swapped ?? catalogById.get(item.exerciseId);
      if (exercise) resolved.push(exercise);
      else missing += 1;
    }

    return { exercises: resolved, missingCount: missing };
  }, [routine, routineExercises, catalogExercises, catalogById, swaps]);

  const activeExercises = useMemo(
    () => exercises.filter((exercise) => !skipped.includes(exercise.id)),
    [exercises, skipped]
  );

  /**
   * Las series objetivo, siguiendo las sustituciones. Si la rutina pedía 4 series de
   * press y el usuario cambia a otro ejercicio, esas 4 series se mantienen.
   */
  const setsByExerciseId = useMemo(() => {
    if (!routine) return undefined;
    const entries: [string, number][] = [];
    for (const item of routineExercises) {
      const exercise = swaps[item.exerciseId] ?? catalogById.get(item.exerciseId);
      if (exercise) entries.push([exercise.id, item.targetSets]);
    }
    return Object.fromEntries(entries);
  }, [routine, routineExercises, swaps, catalogById]);

  const [filter, setFilter] = useState<ExerciseFilter>('all');
  const [currentExerciseId, setCurrentExerciseId] = useState<string | null>(null);
  const [previousPerformance, setPreviousPerformance] = useState<Record<string, string>>({});
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  /** null = se abre solo el grupo del ejercicio activo. '' = todos cerrados. */
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const exerciseIds = useMemo(() => activeExercises.map((exercise) => exercise.id), [activeExercises]);
  const session = useWorkoutSession(exerciseIds, setsByExerciseId);

  const rest = useRestTimer();
  /** Duración con la que arrancó el contador: sin esto la barra de progreso miente. */
  const [restTotal, setRestTotal] = useState(DEFAULT_REST_SECONDS);
  const [restLabel, setRestLabel] = useState('Descanso');

  const routineItemFor = useCallback((exerciseId: string) => {
    const direct = routineExercises.find((item) => item.exerciseId === exerciseId);
    if (direct) return direct;
    // El ejercicio pudo entrar por una sustitución: buscamos por el id original.
    const originalId = Object.keys(swaps).find((key) => swaps[key].id === exerciseId);
    return originalId ? routineExercises.find((item) => item.exerciseId === originalId) : undefined;
  }, [routineExercises, swaps]);

  const restSecondsFor = useCallback((exerciseId: string) => {
    const fromRoutine = routineItemFor(exerciseId)?.restSeconds;
    if (fromRoutine) return fromRoutine;
    return catalogById.get(exerciseId)?.defaultRestSeconds ?? DEFAULT_REST_SECONDS;
  }, [routineItemFor, catalogById]);

  const transitionSecondsFor = useCallback((exerciseId: string) => {
    const fromRoutine = routineItemFor(exerciseId)?.transitionSeconds;
    if (fromRoutine) return fromRoutine;
    return catalogById.get(exerciseId)?.defaultTransitionSeconds ?? DEFAULT_TRANSITION_SECONDS;
  }, [routineItemFor, catalogById]);

  const startRest = useCallback((seconds: number, label: string) => {
    setRestTotal(seconds);
    setRestLabel(label);
    rest.start(seconds);
  }, [rest]);

  // El descanso arranca al completar una serie, no al descompletarla.
  const toggleSet = useCallback((exerciseId: string, setNumber: number) => {
    const wasCompleted = session.setsByExercise[exerciseId]?.find((set) => set.setNumber === setNumber)?.completed ?? false;
    session.toggleSetComplete(exerciseId, setNumber);
    if (wasCompleted) return;

    const sets = session.setsByExercise[exerciseId] ?? [];
    // Si esta era la última serie del ejercicio, el descanso que toca es el de cambio,
    // que es más largo porque hay que montar la siguiente máquina.
    const wasLastSet = sets.every((set) => set.setNumber === setNumber || set.completed);

    startRest(
      wasLastSet ? transitionSecondsFor(exerciseId) : restSecondsFor(exerciseId),
      wasLastSet ? 'Cambio de ejercicio' : 'Descanso'
    );
  }, [session, startRest, restSecondsFor, transitionSecondsFor]);

  // Referencia "Anterior: 20 kg x 10" tomada del último registro real del usuario.
  useEffect(() => {
    if (exerciseIds.length === 0) return;
    void getLastPerformanceByExercise(exerciseIds)
      .then((result) => { if (isMountedRef.current) setPreviousPerformance(result); })
      .catch(() => { /* la referencia es opcional: si falla, el tracker muestra "Sin registro previo". */ });
  }, [exerciseIds]);

  // El filtro de equipamiento solo tiene sentido sin rutina: con rutina, lo que el
  // usuario necesita cuando la máquina está ocupada es un cambio de ejercicio, no
  // esconder los suyos. Para eso está la hoja de sustitución.
  const visibleExercises = useMemo(
    () => (routine || filter === 'all')
      ? activeExercises
      : activeExercises.filter((exercise) => exercise.equipmentGroup === filter),
    [routine, activeExercises, filter]
  );

  // Mantiene una selección válida cuando el catálogo llega o cambia el filtro.
  useEffect(() => {
    if (visibleExercises.length === 0) return;
    if (!visibleExercises.some((exercise) => exercise.id === currentExerciseId)) {
      setCurrentExerciseId(visibleExercises[0].id);
    }
  }, [currentExerciseId, visibleExercises]);

  /** Los ejercicios del día por músculo, en orden de primera aparición. */
  const groupedExercises = useMemo(() => {
    const order: (MuscleGroupSlug | null)[] = [];
    const byGroup = new Map<string, { group: MuscleGroupSlug | null; items: TrainingExercise[] }>();

    for (const exercise of visibleExercises) {
      const key = exercise.group ?? 'otros';
      const entry = byGroup.get(key);
      if (entry) entry.items.push(exercise);
      else { byGroup.set(key, { group: exercise.group, items: [exercise] }); order.push(exercise.group); }
    }

    return order.map((group) => byGroup.get(group ?? 'otros')!);
  }, [visibleExercises]);

  const currentExercise = visibleExercises.find((exercise) => exercise.id === currentExerciseId) ?? visibleExercises[0] ?? null;
  const currentSets = currentExercise ? session.setsByExercise[currentExercise.id] : undefined;
  const currentIndex = currentExercise ? visibleExercises.findIndex((exercise) => exercise.id === currentExercise.id) : -1;
  const isCurrentDone = Boolean(currentSets && currentSets.length > 0 && currentSets.every((set) => set.completed));
  const hasLoggedCurrent = Boolean(currentSets?.some((set) => set.completed));
  const canFinish = session.completedSetCount > 0 && !session.isFinishing && !session.isFinished;

  /** El siguiente ejercicio sin terminar, empezando por el que va después del actual. */
  const nextExercise = useMemo(() => {
    if (visibleExercises.length === 0 || currentIndex < 0) return null;
    const ordered = [...visibleExercises.slice(currentIndex + 1), ...visibleExercises.slice(0, currentIndex)];
    return ordered.find((exercise) => {
      const sets = session.setsByExercise[exercise.id];
      return !sets || sets.length === 0 || sets.some((set) => !set.completed);
    }) ?? null;
  }, [visibleExercises, currentIndex, session.setsByExercise]);

  // Si la rutina fija repeticiones objetivo, esa cifra manda sobre el valor por defecto.
  const targetReps = useMemo(() => {
    if (!currentExercise) return undefined;
    const fromRoutine = routineItemFor(currentExercise.id)?.targetReps;
    return fromRoutine ?? currentExercise.defaultReps?.high ?? undefined;
  }, [currentExercise, routineItemFor]);

  const progression = useProgression(currentExercise?.id ?? null, currentExercise?.muscleGroup ?? '', targetReps);

  const applySwap = useCallback((replacement: TrainingExercise) => {
    setIsSwapOpen(false);
    if (!currentExercise) return;

    // La clave es el id ORIGINAL de la rutina, no el que se está viendo: así cambiar
    // dos veces seguidas no deja huérfana la primera sustitución.
    const originalId = Object.keys(swaps).find((key) => swaps[key].id === currentExercise.id) ?? currentExercise.id;
    setSwaps((current) => ({ ...current, [originalId]: replacement }));
    setCurrentExerciseId(replacement.id);
  }, [currentExercise, swaps]);

  const skipCurrent = useCallback(() => {
    if (!currentExercise) return;
    setSkipped((current) => current.includes(currentExercise.id) ? current : [...current, currentExercise.id]);
    if (nextExercise) setCurrentExerciseId(nextExercise.id);
  }, [currentExercise, nextExercise]);

  const isPreparing = isCatalogLoading || isRoutineLoading;
  const blockingError = catalogError ?? routineError;

  // Solo bloqueamos la pantalla por problemas de carga. Un filtro sin resultados se
  // resuelve dentro de la pantalla, para que el usuario pueda volver a cambiarlo.
  if (isPreparing || blockingError || exercises.length === 0) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>
        </View>
        <View style={styles.stateArea}>
          {isPreparing ? (
            <ActivityIndicator accessibilityLabel="Preparando tu entrenamiento" color={colors.accent} />
          ) : (
            <>
              <Text accessibilityLiveRegion="polite" style={styles.stateText}>
                {blockingError ?? (routine
                  ? 'Ninguno de los ejercicios de este día sigue disponible. Abre tu rutina y reemplázalos.'
                  : 'Todavía no hay ejercicios publicados en el catálogo.')}
              </Text>
              {catalogError ? (
                <Pressable accessibilityRole="button" onPress={reloadCatalog} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Reintentar</Text>
                </Pressable>
              ) : null}
              {routineError ? (
                <Pressable accessibilityRole="button" onPress={() => setRoutineReloadToken((value) => value + 1)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Reintentar</Text>
                </Pressable>
              ) : null}
              {routine && exercises.length === 0 ? (
                <Pressable accessibilityRole="button" onPress={() => router.push(`/routine-builder?routineId=${routine.id}`)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Abrir mi rutina</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.content, rest.isRunning && styles.contentWithTimer]}>
        <View style={styles.topbar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver al calentamiento" onPress={goBack} style={styles.backButton}>
            <Text style={styles.backText}>Volver</Text>
          </Pressable>
          <View style={styles.timerPill}>
            <Icon name="clock" color={colors.accent} size={15} />
            <Text style={styles.sessionText}>{formatElapsedTime(session.elapsedSeconds)}</Text>
          </View>
        </View>

        <View style={styles.headingBlock}>
          <Eyebrow>{routine ? routine.name : 'Sesión libre'}</Eyebrow>
          <Text style={styles.title}>
            {routine ? `Tus ${visibleExercises.length} ejercicios de hoy` : 'Elige qué vas a entrenar'}
          </Text>
          <Text style={styles.description}>
            {routine
              ? 'Ve marcando cada serie. Si una máquina está ocupada, cambia el ejercicio sin perder el día.'
              : 'Sin rutina cargada: elige del catálogo lo que quieras registrar.'}
          </Text>
        </View>

        {/* Avisos que antes eran silencios */}
        {missingCount > 0 ? (
          <View style={[styles.notice, styles.noticeWarning]}>
            <Text style={styles.noticeText}>
              {missingCount === 1
                ? 'Un ejercicio de tu rutina ya no está disponible y no aparece aquí.'
                : `${missingCount} ejercicios de tu rutina ya no están disponibles y no aparecen aquí.`}
              {' '}Ábrela para reemplazarlos.
            </Text>
          </View>
        ) : null}

        {dayOutOfRange ? (
          <View style={[styles.notice, styles.noticeWarning]}>
            <Text style={styles.noticeText}>
              Tu rutina no tiene un día {dayIndex}, así que te mostramos todos sus ejercicios.
            </Text>
          </View>
        ) : null}

        {!routine ? (
          <View style={styles.filterSection}>
            <EquipmentFilter value={filter} onChange={setFilter} />
          </View>
        ) : null}

        {currentExercise ? (
          <>
            {/* Agrupada por músculo y plegada: un día son 6-8 ejercicios y verlos
                todos sueltos era un muro. Solo se abre el grupo del ejercicio activo. */}
            <View style={styles.groupList}>
              {groupedExercises.map(({ group, items }) => {
                const groupKey = group ?? 'otros';
                const hasCurrent = items.some((item) => item.id === currentExercise.id);
                const isGroupOpen = openGroup === null ? hasCurrent : openGroup === groupKey;

                const groupSets = items.reduce((sum, item) => sum + (session.setsByExercise[item.id]?.length ?? 0), 0);
                const groupDone = items.reduce(
                  (sum, item) => sum + (session.setsByExercise[item.id]?.filter((set) => set.completed).length ?? 0),
                  0
                );

                return (
                  <View key={groupKey} style={styles.groupSection}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ expanded: isGroupOpen }}
                      accessibilityLabel={`${group ? MUSCLE_GROUP_LABELS[group] : 'Otros'}, ${groupDone} de ${groupSets} series`}
                      onPress={() => setOpenGroup(isGroupOpen ? '' : groupKey)}
                      style={styles.groupHeader}
                    >
                      <View style={styles.groupHeaderText}>
                        <Text style={styles.groupName}>{group ? MUSCLE_GROUP_LABELS[group] : 'Otros'}</Text>
                        <Text style={styles.groupMeta}>
                          {items.length === 1 ? '1 ejercicio' : `${items.length} ejercicios`} · {groupDone}/{groupSets} series
                        </Text>
                      </View>
                      <Text style={styles.chevron}>{isGroupOpen ? '−' : '+'}</Text>
                    </Pressable>

                    {isGroupOpen ? (
                      <View style={styles.groupBody}>
                        {items.map((exercise) => {
                          const selected = exercise.id === currentExercise.id;
                          const sets = session.setsByExercise[exercise.id] ?? [];
                          const done = sets.length > 0 && sets.every((set) => set.completed);
                          const completedSets = sets.filter((set) => set.completed).length;

                          return (
                            <Pressable
                              key={exercise.id}
                              accessibilityRole="radio"
                              accessibilityLabel={`${exercise.name}, ${completedSets} de ${sets.length} series`}
                              accessibilityState={{ selected }}
                              onPress={() => setCurrentExerciseId(exercise.id)}
                              style={({ pressed }) => [styles.variant, selected && styles.variantSelected, pressed && styles.pressed]}
                            >
                              <View style={styles.variantText}>
                                <Text numberOfLines={2} style={[styles.variantName, selected && styles.variantNameSelected]}>
                                  {exercise.name}
                                </Text>
                                {exercise.region ? (
                                  <Text style={styles.variantRegion}>{REGION_LABELS[exercise.region]}</Text>
                                ) : null}
                              </View>
                              <Text style={[styles.variantSets, selected && styles.variantNameSelected]}>
                                {done ? '✓' : `${completedSets}/${sets.length || '·'}`}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>

            <ExerciseMediaPreview exercise={currentExercise} />

            <View style={styles.exerciseHeader}>
              <Eyebrow>{`Ejercicio ${currentIndex + 1} de ${visibleExercises.length}`}</Eyebrow>
              <Text style={styles.exerciseName}>{currentExercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {equipmentLabels[currentExercise.equipment]}
                {currentExercise.group ? ` · ${MUSCLE_GROUP_LABELS[currentExercise.group]}` : ''}
                {currentExercise.region ? ` · ${REGION_LABELS[currentExercise.region]}` : ''}
                {currentExercise.isCompound ? ' · Compuesto' : ''}
                {` · ${DIFFICULTY_LABELS[currentExercise.difficulty]}`}
              </Text>

              {/* Los agarres importan para el confort y para cuánto peso puedes mover,
                  aunque ningún estudio haya comparado accesorios midiendo crecimiento. */}
              {currentExercise.gripOptions.length > 0 ? (
                <InfoNote label="¿Qué agarre uso?">
                  {currentExercise.gripOptions.map((grip) => `${grip.name}: ${grip.note}`).join('\n\n')}
                </InfoNote>
              ) : null}

              {currentExercise.evidenceNote ? (
                <InfoNote
                  label={`¿Por qué este ejercicio? · ${EVIDENCE_LABELS[currentExercise.evidenceLevel]}`}
                  source={currentExercise.evidenceSource}
                >
                  {currentExercise.evidenceNote}
                </InfoNote>
              ) : null}

              <View style={styles.exerciseActions}>
                <Pressable accessibilityRole="button" onPress={() => setIsSwapOpen(true)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>
                    {currentExercise.group ? `Cambiar por otro de ${MUSCLE_GROUP_LABELS[currentExercise.group].toLowerCase()}` : 'Cambiar ejercicio'}
                  </Text>
                </Pressable>
                {routine && !hasLoggedCurrent ? (
                  <Pressable accessibilityRole="button" onPress={skipCurrent} style={styles.textButton}>
                    <Text style={styles.mutedButtonText}>Saltar</Text>
                  </Pressable>
                ) : null}
              </View>

              {hasLoggedCurrent ? (
                <Text style={styles.swapWarning}>
                  Ya registraste series aquí: si lo cambias, esas series se quedan guardadas igual.
                </Text>
              ) : null}
            </View>

            {progression ? (
              <View style={styles.suggestion}>
                <Eyebrow color={colors.accent}>
                  {progression.kind === 'add-weight' ? 'Toca subir peso' : progression.kind === 'add-reps' ? 'Una repetición más' : progression.kind === 'first-time' ? 'Punto de partida' : 'Consolida'}
                </Eyebrow>
                <Text style={styles.suggestionText}>{progression.message}</Text>
              </View>
            ) : null}

            <View style={styles.logSection}>
              {currentSets ? (
                <SetTracker
                  sets={currentSets}
                  previousPerformance={previousPerformance[currentExercise.id] ?? 'Sin registro previo'}
                  disabled={session.isFinished}
                  requiresWeight={currentExercise.equipment !== 'bodyweight'}
                  targetReps={targetReps ?? null}
                  onUpdateSet={(setNumber, field, value) => session.updateSet(currentExercise.id, setNumber, field, value)}
                  onToggleComplete={(setNumber) => toggleSet(currentExercise.id, setNumber)}
                  onToggleWarmup={() => session.toggleWarmup(currentExercise.id)}
                />
              ) : (
                <ActivityIndicator accessibilityLabel="Preparando tus series" color={colors.accent} />
              )}
            </View>

            {/* Al terminar un ejercicio, el descanso decía "Cambio de ejercicio" y no
                cambiaba nada: el usuario tenía que descubrir solo que debía volver
                arriba a tocar la siguiente tarjeta. */}
            {isCurrentDone && nextExercise ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setCurrentExerciseId(nextExercise.id)}
                style={({ pressed }) => [styles.nextExerciseButton, pressed && styles.pressed]}
              >
                <View style={styles.nextExerciseText}>
                  <Eyebrow color={colors.accent}>Siguiente</Eyebrow>
                  <Text style={styles.nextExerciseName} numberOfLines={2}>{nextExercise.name}</Text>
                </View>
                <Icon name="arrowRight" color={colors.accent} size={20} />
              </Pressable>
            ) : null}

            {isCurrentDone && !nextExercise ? (
              <Text accessibilityLiveRegion="polite" style={styles.allDone}>
                Terminaste todos los ejercicios de hoy. Dale a finalizar para guardarlo.
              </Text>
            ) : null}
          </>
        ) : (
          <View style={styles.stateArea}>
            <Text style={styles.stateText}>
              {skipped.length > 0
                ? 'Te saltaste todos los ejercicios. Vuelve a entrar para empezar de nuevo.'
                : 'No hay ejercicios con ese equipamiento. Prueba con otro filtro.'}
            </Text>
            {filter !== 'all' ? (
              <Pressable accessibilityRole="button" onPress={() => setFilter('all')} style={styles.textButton}>
                <Text style={styles.textButtonText}>Ver todos</Text>
              </Pressable>
            ) : null}
          </View>
        )}

        {session.finishError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{session.finishError}</Text> : null}
        {session.isFinished ? (
          <Text accessibilityLiveRegion="polite" style={session.saveState === 'queued' ? styles.pendingNotice : styles.success}>
            {session.saveState === 'queued'
              ? 'Entrenamiento guardado localmente. Se sincronizará cuando haya conexión.'
              : 'Entrenamiento guardado. Tu racha y calendario ya se actualizaron.'}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !canFinish }}
          disabled={!canFinish}
          onPress={() => void session.finishWorkout()}
          style={({ pressed }) => [styles.nextButton, !canFinish && styles.nextButtonDisabled, pressed && styles.pressed]}
        >
          {session.isFinishing ? (
            <ActivityIndicator color={colors.surface} />
          ) : (
            <Text style={styles.nextButtonText}>
              {session.isFinished
                ? 'Entrenamiento finalizado'
                : `Finalizar entrenamiento · ${session.completedSetCount} ${session.completedSetCount === 1 ? 'serie' : 'series'}`}
            </Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Fuera del ScrollView: dentro se renderizaba debajo de la tabla de series y
          quedaba fuera de pantalla justo cuando arrancaba, así que el usuario ni se
          enteraba de que había un descanso corriendo. */}
      {rest.isRunning ? (
        <View style={styles.restDock} pointerEvents="box-none">
          <RestTimer remaining={rest.remaining} total={restTotal} label={restLabel} isFinished={rest.isFinished} onAdd={rest.add} onSkip={rest.stop} />
        </View>
      ) : null}

      {isSwapOpen && currentExercise?.group ? (
        <ExerciseSwapSheet
          visible
          group={currentExercise.group}
          catalog={catalogExercises}
          selectedExerciseId={currentExercise.id}
          catalogError={catalogError}
          onSelect={applySwap}
          onClose={() => setIsSwapOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingBottom: spacing.xl },
    /** Hueco para que la barra de descanso no tape el botón de finalizar. */
    contentWithTimer: { paddingBottom: 128 },
    topbar: { minHeight: 48, alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg },
    backButton: { minWidth: 48, minHeight: 44, justifyContent: 'center' },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    sessionText: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
    headingBlock: { gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
    title: { ...type.screenTitle, color: colors.text, fontSize: 28, lineHeight: 33 },
    timerPill: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, flexDirection: 'row', gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: 6 },
    description: { ...type.body, color: colors.textMuted },

    notice: { borderRadius: radii.sm, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md },
    noticeWarning: { backgroundColor: colors.warningSoft },
    noticeText: { ...type.small, color: colors.text },

    filterSection: { marginTop: spacing.lg, paddingLeft: spacing.lg },

    groupList: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
    groupSection: { borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, overflow: 'hidden' },
    groupHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 56, paddingHorizontal: spacing.md },
    groupHeaderText: { flexShrink: 1, gap: 2, minWidth: 0 },
    groupName: { ...type.cardTitle, color: colors.text },
    chevron: { color: colors.accent, fontFamily: typography.display, fontSize: 22, fontWeight: '800' },
    groupMeta: { ...type.small, color: colors.textMuted },
    groupBody: { backgroundColor: colors.surface, gap: spacing.sm, padding: spacing.md },
    variantText: { flex: 1, gap: 1, minWidth: 0 },
    variantRegion: { ...type.small, color: colors.textMuted, fontSize: 12 },
    variant: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    variantSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    variantName: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600', lineHeight: 19 },
    variantNameSelected: { color: colors.accent },
    variantSets: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, fontVariant: ['tabular-nums'] },

    exerciseHeader: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    exerciseName: { ...type.screenTitle, color: colors.text, fontSize: 25, lineHeight: 30 },
    exerciseMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
    exerciseActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    swapWarning: { ...type.small, color: colors.textMuted },

    suggestion: { backgroundColor: colors.accentSoft, borderRadius: radii.md, gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md },
    suggestionText: { ...type.small, color: colors.text },
    logSection: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },

    nextExerciseButton: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radii.md, flexDirection: 'row', gap: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, minHeight: 64, paddingHorizontal: spacing.md },
    nextExerciseText: { flex: 1, gap: 2, minWidth: 0 },
    nextExerciseName: { ...type.cardTitle, color: colors.text },
    allDone: { ...type.body, color: colors.accent, marginHorizontal: spacing.lg, marginTop: spacing.md },

    restDock: { bottom: 0, left: 0, position: 'absolute', right: 0 },

    nextButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.accent, marginHorizontal: spacing.lg, marginTop: spacing.xl },
    nextButtonDisabled: { backgroundColor: colors.line },
    nextButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 18, marginHorizontal: spacing.lg, marginTop: spacing.md },
    pendingNotice: { color: colors.warning, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginHorizontal: spacing.lg, marginTop: spacing.md },
    success: { color: colors.accent, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginHorizontal: spacing.lg, marginTop: spacing.md },
    stateArea: { alignItems: 'center', gap: spacing.md, justifyContent: 'center', minHeight: 220, paddingHorizontal: spacing.lg },
    stateText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, textAlign: 'center' },
    textButton: { justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    mutedButtonText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.78 }
  });
}
