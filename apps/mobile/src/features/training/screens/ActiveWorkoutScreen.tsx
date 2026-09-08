import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { InfoNote } from '@/components/ui/InfoNote';
import { Icon } from '@/components/ui/Icon';
import { describeSupabaseError } from '@/lib/supabaseErrors';
import { images } from '@/theme/images';
import { palette, radii, scrim, spacing, ThemeColors, type, typography } from '@/theme/tokens';
import { SetTracker } from '@/features/progress/components/SetTracker';
import { formatElapsedTime, useWorkoutSession } from '@/features/progress/hooks/useWorkoutSession';
import {
  getLastPerformanceByExercise,
  getTodaysCompletedWorkoutForExercises,
  TodaysCompletedWorkout
} from '@/features/progress/services/workoutSessionRepository';

import { EquipmentFilter } from '../components/EquipmentFilter';
import { ExerciseMediaPreview } from '../components/ExerciseMediaPreview';
import { ExerciseSwapSheet } from '../components/ExerciseSwapSheet';
import { RestTimer } from '../components/RestTimer';
import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { useProgression } from '../hooks/useProgression';
import { getRoutine } from '../services/routineRepository';
import { equipmentLabels, normalizeExerciseName } from '../services/exerciseCatalog';
import { fetchMuscleGroups } from '../services/splitTemplates';
import { Routine } from '../types/routine';
import { DEFAULT_REST_SECONDS, DEFAULT_TRANSITION_SECONDS, useRestTimer } from '../hooks/useRestTimer';
import { EVIDENCE_LABELS, ExerciseFilter, MUSCLE_GROUP_LABELS, MuscleGroupSlug, REGION_LABELS, TrainingExercise } from '../types/training';

/** 'lista' = elegir por dónde seguir. 'ejercicio' = solo el actual y su registro. */
type ViewMode = 'lista' | 'ejercicio';

export function ActiveWorkoutScreen() {
  const router = useRouter();
  // La pestaña de Entrenamiento está oculta de la barra: caer ahí sin historial
  // dejaría al socio en una pantalla sin ningún enlace visible para salir.
  const goBack = useGoBack('/(tabs)');
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
   * Qué músculos son "chicos" (antebrazo, pantorrilla, abdomen), para ordenar el modo
   * lista de grande a chico. Es catálogo — igual que el de ejercicios, se pide una vez
   * y no pasa nada si falla: el orden cae de vuelta al de aparición en la rutina.
   */
  const [smallGroups, setSmallGroups] = useState<Set<MuscleGroupSlug>>(new Set());
  useEffect(() => {
    let active = true;
    void fetchMuscleGroups()
      .then((groups) => {
        if (!active) return;
        setSmallGroups(new Set(groups.filter((group) => group.isSmall).map((group) => group.slug)));
      })
      .catch(() => { /* orden por tamaño es una mejora, no algo de lo que dependa la sesión */ });
    return () => { active = false; };
  }, []);

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

  /**
   * Modo lista (elegir por dónde seguir) o modo ejercicio (solo el actual). Tocar un
   * ejercicio en la lista es lo único que entra en modo ejercicio; terminar todas sus
   * series es lo único que vuelve solo a la lista (ver el efecto sobre `isCurrentDone`
   * más abajo). El resto de la pantalla (borrador de sesión, timer, SetTracker) vive
   * arriba de este estado y no se entera de en qué modo está — por eso cambiar de modo
   * no puede romper el borrador del [3], el timer, ni el aviso del [12]: ninguno de
   * esos tres se desmonta ni se reinicia al alternar entre "lista" y "ejercicio".
   */
  const [viewMode, setViewMode] = useState<ViewMode>('lista');
  /** «¿Cómo se hace?» empieza cerrado en cada ejercicio nuevo: el video no es lo primero que se ve. */
  const [showHowTo, setShowHowTo] = useState(false);

  const exerciseIds = useMemo(() => activeExercises.map((exercise) => exercise.id), [activeExercises]);
  // Identifica la sesión para recuperar su borrador tras cerrar y reabrir la app. Sin
  // rutina (sesión libre) no hay borrador que restaurar, igual que antes de este cambio.
  const sessionKey = routineId ? `${routineId}:${dayIndex}` : null;
  const session = useWorkoutSession(exerciseIds, setsByExerciseId, sessionKey);

  /**
   * Si ya se completó un entrenamiento hoy para este mismo día, se muestra en modo
   * lectura en vez de arrancar una sesión nueva en blanco: entrar sin querer no debe
   * dejar un entrenamiento fantasma en el historial. "Entrenar de nuevo" es la salida
   * explícita para quien sí quiere una segunda sesión — `forceNewSession` la habilita.
   * No toca el borrador del [3] ni el guardado: es una lectura aparte, ver
   * getTodaysCompletedWorkoutForExercises.
   */
  const [todaysWorkout, setTodaysWorkout] = useState<TodaysCompletedWorkout | null>(null);
  const [isCheckingToday, setIsCheckingToday] = useState(Boolean(routineId));
  const [forceNewSession, setForceNewSession] = useState(false);

  useEffect(() => {
    if (!routineId || exerciseIds.length === 0) {
      setIsCheckingToday(false);
      return;
    }
    let active = true;
    setIsCheckingToday(true);
    void getTodaysCompletedWorkoutForExercises(exerciseIds)
      .then((found) => { if (active) setTodaysWorkout(found); })
      .catch(() => { /* si falla la lectura, mejor dejar entrar a una sesión normal que bloquear la pantalla */ })
      .finally(() => { if (active) setIsCheckingToday(false); });
    return () => { active = false; };
  }, [routineId, exerciseIds]);

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

  /**
   * Colapsa ejercicios repetidos dentro del día: mismo `exercise_id` o mismo nombre
   * normalizado (el catálogo puede tener dos filas para el mismo ejercicio con ids
   * distintos — ver `normalizeExerciseName`). El constructor ya lo impide al armar o
   * editar una rutina, pero una rutina vieja o compartida puede traerlo igual, y
   * arreglarlo ahí depende de que alguien entre a editar. Acá se resuelve solo, al
   * leer, sin tocar la base.
   *
   * Se queda con la PRIMERA aparición. Excepción: si la aparición que se
   * descartaría ya tiene alguna serie completada en esta sesión, no se colapsa —
   * esconder trabajo ya registrado es peor que mostrar el repetido.
   */
  const { exercises: dedupedExercises, hadDuplicate } = useMemo(() => {
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const kept: TrainingExercise[] = [];
    let collapsed = false;

    for (const exercise of activeExercises) {
      const normalizedName = normalizeExerciseName(exercise.name);
      const isDuplicate = seenIds.has(exercise.id) || seenNames.has(normalizedName);

      if (!isDuplicate) {
        seenIds.add(exercise.id);
        seenNames.add(normalizedName);
        kept.push(exercise);
        continue;
      }

      const hasRegisteredSets = Boolean(session.setsByExercise[exercise.id]?.some((set) => set.completed));
      if (hasRegisteredSets) kept.push(exercise);
      else collapsed = true;
    }

    return { exercises: kept, hadDuplicate: collapsed };
  }, [activeExercises, session.setsByExercise]);

  // El filtro de equipamiento solo tiene sentido sin rutina: con rutina, lo que el
  // usuario necesita cuando la máquina está ocupada es un cambio de ejercicio, no
  // esconder los suyos. Para eso está la hoja de sustitución.
  const visibleExercises = useMemo(
    () => (routine || filter === 'all')
      ? dedupedExercises
      : dedupedExercises.filter((exercise) => exercise.equipmentGroup === filter),
    [routine, dedupedExercises, filter]
  );

  // Mantiene una selección válida cuando el catálogo llega o cambia el filtro.
  useEffect(() => {
    if (visibleExercises.length === 0) return;
    if (!visibleExercises.some((exercise) => exercise.id === currentExerciseId)) {
      setCurrentExerciseId(visibleExercises[0].id);
    }
  }, [currentExerciseId, visibleExercises]);

  /**
   * Los ejercicios del día por músculo, de grande a chico (el más grande primero,
   * mientras hay más fuerza), y dentro de cada tamaño en el orden en que aparecen en
   * la rutina. Si el catálogo de tamaños todavía no llegó, cae al orden de aparición
   * tal cual estaba antes de este item.
   */
  const groupedExercises = useMemo(() => {
    const order: (MuscleGroupSlug | null)[] = [];
    // `position` es el índice en `visibleExercises`, no en el grupo: es lo que permite
    // distinguir dos filas del mismo ejercicio (mismo id) al comparar contra
    // `nextExercise.position` más abajo, en vez de comparar por id y marcar las dos.
    const byGroup = new Map<string, { group: MuscleGroupSlug | null; items: { exercise: TrainingExercise; position: number }[] }>();

    visibleExercises.forEach((exercise, position) => {
      const key = exercise.group ?? 'otros';
      const entry = byGroup.get(key);
      if (entry) entry.items.push({ exercise, position });
      else { byGroup.set(key, { group: exercise.group, items: [{ exercise, position }] }); order.push(exercise.group); }
    });

    const sizeRank = (group: MuscleGroupSlug | null) => (group && smallGroups.has(group) ? 1 : 0);
    const sortedOrder = order
      .map((group, index) => ({ group, index }))
      .sort((a, b) => sizeRank(a.group) - sizeRank(b.group) || a.index - b.index)
      .map((entry) => entry.group);

    return sortedOrder.map((group) => byGroup.get(group ?? 'otros')!);
  }, [visibleExercises, smallGroups]);

  const firstGroupKey = groupedExercises[0]?.group ?? (groupedExercises.length > 0 ? 'otros' : null);

  const currentExercise = visibleExercises.find((exercise) => exercise.id === currentExerciseId) ?? visibleExercises[0] ?? null;
  const currentSets = currentExercise ? session.setsByExercise[currentExercise.id] : undefined;
  const currentIndex = currentExercise ? visibleExercises.findIndex((exercise) => exercise.id === currentExercise.id) : -1;
  const isCurrentDone = Boolean(currentSets && currentSets.length > 0 && currentSets.every((set) => set.completed));
  const hasLoggedCurrent = Boolean(currentSets?.some((set) => set.completed));
  const canFinish = session.completedSetCount > 0 && !session.isFinishing && !session.isFinished;

  /**
   * Antes se quedaba en esta misma pantalla con un texto fijo de "guardado". Ahora
   * vuelve a Inicio, que es donde vive el festejo temporal — ver HomeScreen.
   */
  const hasRedirectedAfterFinish = useRef(false);
  useEffect(() => {
    if (session.isFinished && !hasRedirectedAfterFinish.current) {
      hasRedirectedAfterFinish.current = true;
      router.replace('/(tabs)?justFinished=1');
    }
  }, [session.isFinished, router]);

  /**
   * El siguiente ejercicio sin terminar, empezando por el que va después del actual.
   *
   * Guarda también `position` (el índice en `visibleExercises`), no solo el ejercicio:
   * si una rutina tiene el mismo ejercicio dos veces (dato que el constructor ya no
   * deja crear, pero que una rutina vieja puede traer), comparar solo por id marcaba
   * "Seguí acá" en las dos filas a la vez. La posición distingue cuál de las dos es.
   */
  const nextExercise = useMemo(() => {
    if (visibleExercises.length === 0 || currentIndex < 0) return null;
    const rotatedPositions = [
      ...Array.from({ length: visibleExercises.length - currentIndex - 1 }, (_, i) => currentIndex + 1 + i),
      ...Array.from({ length: currentIndex }, (_, i) => i)
    ];
    const position = rotatedPositions.find((index) => {
      const exercise = visibleExercises[index];
      const sets = session.setsByExercise[exercise.id];
      return !sets || sets.length === 0 || sets.some((set) => !set.completed);
    });
    return position === undefined ? null : { exercise: visibleExercises[position], position };
  }, [visibleExercises, currentIndex, session.setsByExercise]);

  /**
   * Vuelve sola a la lista cuando el ejercicio actual PASA a estar terminado mientras
   * se lo está viendo — no server cuando se entra a uno que ya estaba terminado desde
   * antes (por eso compara contra el valor previo, no contra `true` a secas). "Terminado"
   * ya incluía el calentamiento antes de este item (ver `isCurrentDone` arriba); esto
   * dispara igual sin importar si lo que faltaba era una serie o saltar el calentamiento
   * — cualquier acción que lo complete cuenta, no solo `toggleSet`.
   */
  const wasCurrentDoneRef = useRef(isCurrentDone);
  useEffect(() => {
    wasCurrentDoneRef.current = isCurrentDone;
    // Nueva base cada vez que cambia el ejercicio: solo importa la transición dentro
    // del mismo ejercicio, no el estado con el que llegó uno nuevo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExercise?.id]);

  useEffect(() => {
    if (viewMode === 'ejercicio' && isCurrentDone && !wasCurrentDoneRef.current) {
      setViewMode('lista');
      setCurrentExerciseId(nextExercise?.exercise.id ?? null);
    }
    wasCurrentDoneRef.current = isCurrentDone;
  }, [isCurrentDone, viewMode, nextExercise]);

  // Si la rutina fija repeticiones objetivo, esa cifra manda sobre el valor por defecto.
  const targetReps = useMemo(() => {
    if (!currentExercise) return undefined;
    const fromRoutine = routineItemFor(currentExercise.id)?.targetReps;
    return fromRoutine ?? currentExercise.defaultReps?.high ?? undefined;
  }, [currentExercise, routineItemFor]);

  const progression = useProgression(currentExercise?.id ?? null, currentExercise?.muscleGroup ?? '', targetReps);

  /**
   * Ejercicios ya presentes hoy, para no dejar "Cambiar por otro" meter un duplicado
   * (mismo bloqueo, por nombre normalizado, que ya tiene RoutineBuilderScreen). Sin
   * esto, elegir acá un ejercicio que ya está en otro grupo del mismo día dejaba el
   * mismo ejercicio dos veces en modo lista.
   */
  const disabledExerciseIds = useMemo(() => {
    if (!isSwapOpen || !currentExercise) return new Set<string>();
    const usedNames = new Set(
      exercises
        .filter((exercise) => exercise.id !== currentExercise.id)
        .map((exercise) => normalizeExerciseName(exercise.name))
    );
    if (usedNames.size === 0) return new Set<string>();
    return new Set(
      catalogExercises
        .filter((exercise) => usedNames.has(normalizeExerciseName(exercise.name)))
        .map((exercise) => exercise.id)
    );
  }, [isSwapOpen, currentExercise, exercises, catalogExercises]);

  const applySwap = useCallback((replacement: TrainingExercise) => {
    setIsSwapOpen(false);
    if (!currentExercise) return;
    // Defensa además del deshabilitado en la lista: por si algo dispara onSelect igual.
    if (disabledExerciseIds.has(replacement.id)) return;

    // La clave es el id ORIGINAL de la rutina, no el que se está viendo: así cambiar
    // dos veces seguidas no deja huérfana la primera sustitución.
    const originalId = Object.keys(swaps).find((key) => swaps[key].id === currentExercise.id) ?? currentExercise.id;
    setSwaps((current) => ({ ...current, [originalId]: replacement }));
    setCurrentExerciseId(replacement.id);
    setShowHowTo(false);
  }, [currentExercise, swaps, disabledExerciseIds]);

  const skipCurrent = useCallback(() => {
    if (!currentExercise) return;
    setSkipped((current) => current.includes(currentExercise.id) ? current : [...current, currentExercise.id]);
    if (nextExercise) {
      setCurrentExerciseId(nextExercise.exercise.id);
      setShowHowTo(false);
    } else {
      setViewMode('lista');
    }
  }, [currentExercise, nextExercise]);

  /** Tocar un ejercicio en la lista es el único gesto que entra en modo ejercicio. */
  const openExercise = useCallback((exerciseId: string) => {
    setCurrentExerciseId(exerciseId);
    setShowHowTo(false);
    setViewMode('ejercicio');
  }, []);

  /** Series de hoy agrupadas por ejercicio, en el orden en que aparecieron en el registro. */
  const todaysWorkoutByExercise = useMemo(() => {
    if (!todaysWorkout) return [];
    const order: string[] = [];
    const byExercise = new Map<string, TodaysCompletedWorkout['sets']>();
    for (const set of todaysWorkout.sets) {
      if (!byExercise.has(set.exerciseId)) order.push(set.exerciseId);
      const list = byExercise.get(set.exerciseId) ?? [];
      list.push(set);
      byExercise.set(set.exerciseId, list);
    }
    return order.map((exerciseId) => ({
      exerciseId,
      exercise: catalogById.get(exerciseId),
      sets: byExercise.get(exerciseId)!
    }));
  }, [todaysWorkout, catalogById]);

  const isPreparing = isCatalogLoading || isRoutineLoading || isCheckingToday;
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
              {blockingError ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    // Los dos fallan por la misma causa (sin red): un solo toque reintenta
                    // los que hagan falta, en vez de mostrar un botón por cada fuente.
                    if (catalogError) reloadCatalog();
                    if (routineError) setRoutineReloadToken((value) => value + 1);
                  }}
                  style={styles.textButton}
                >
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

  // Ya se entrenó esto hoy: se muestra en modo lectura en vez de arrancar en blanco.
  // "Entrenar de nuevo" es la única salida hacia una sesión nueva.
  if (todaysWorkout && !forceNewSession) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.topbar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.backButton}>
              <Text style={styles.backText}>Volver</Text>
            </Pressable>
          </View>
          <View style={styles.headingBlock}>
            <Eyebrow>{routine ? routine.name : 'Sesión libre'}</Eyebrow>
            <Text style={styles.title}>Ya completaste este entrenamiento hoy</Text>
            <Text style={styles.description}>Esto fue lo que registraste:</Text>
          </View>
          <View style={styles.logSection}>
            {todaysWorkoutByExercise.map(({ exerciseId, exercise, sets }) => (
              <View key={exerciseId} style={styles.readOnlyExercise}>
                <Text style={styles.readOnlyExerciseName}>{exercise?.name ?? 'Ejercicio'}</Text>
                <Text style={styles.readOnlyExerciseSets}>
                  {sets.map((set) => formatReadOnlySet(set)).join(' · ')}
                </Text>
              </View>
            ))}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setForceNewSession(true)} style={styles.textButton}>
            <Text style={styles.textButtonText}>Entrenar de nuevo</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const isListMode = viewMode === 'lista';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={[styles.content, rest.isRunning && styles.contentWithTimer]}>
        <View style={styles.topbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isListMode ? 'Volver' : 'Volver a la lista'}
            onPress={() => (isListMode ? goBack() : setViewMode('lista'))}
            style={styles.backButton}
          >
            <Text style={styles.backText}>{isListMode ? 'Volver' : 'Volver a la lista'}</Text>
          </Pressable>
          <View style={styles.timerPill}>
            <Icon name="clock" color={colors.accent} size={15} />
            <Text style={styles.sessionText}>{formatElapsedTime(session.elapsedSeconds)}</Text>
          </View>
        </View>

        {/* Modo lista: nunca se desmonta al pasar a modo ejercicio, solo se oculta. Así
            el borrador de sesión del [3], el timer y el estado interno de SetTracker
            (el aviso del [12]) no se reinician al ir y volver entre modos. */}
        <View style={isListMode ? undefined : styles.hidden}>
          <View style={styles.headingBlock}>
            <Eyebrow>{routine ? routine.name : 'Sesión libre'}</Eyebrow>
            <Text style={styles.title}>
              {routine ? `Tus ${visibleExercises.length} ejercicios de hoy` : 'Elige qué vas a entrenar'}
            </Text>
            <Text style={styles.description}>
              {routine
                ? 'Elegí por dónde seguir. Si una máquina está ocupada, cambiá el ejercicio sin perder el día.'
                : 'Sin rutina cargada: elegí del catálogo lo que quieras registrar.'}
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

          {hadDuplicate ? (
            <View style={[styles.notice, styles.noticeWarning]}>
              <Text style={styles.noticeText}>
                Tu rutina tenía un ejercicio repetido y lo mostramos una sola vez. Ábrela para reemplazarlo.
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
            <View style={styles.groupList}>
              {groupedExercises.map(({ group, items }) => {
                const groupKey = group ?? 'otros';
                const hasCurrent = items.some((item) => item.exercise.id === currentExercise.id);
                const isGroupOpen = openGroup === null ? hasCurrent : openGroup === groupKey;
                const isFirstGroup = groupKey === firstGroupKey;

                const groupSets = items.reduce((sum, item) => sum + (session.setsByExercise[item.exercise.id]?.length ?? 0), 0);
                const groupDone = items.reduce(
                  (sum, item) => sum + (session.setsByExercise[item.exercise.id]?.filter((set) => set.completed).length ?? 0),
                  0
                );

                // La imagen se resuelve por slug. Si el grupo no la tiene, o es "Otros",
                // cae al estado sin imagen en vez de romperse: docs/diseno.md, regla 3.
                const groupPhoto = group ? images.musculo[group] : undefined;
                const groupThumb = group ? images.musculoThumb[group] : undefined;
                const groupLabel = group ? MUSCLE_GROUP_LABELS[group] : 'Otros';
                const groupCount = `${items.length === 1 ? '1 ejercicio' : `${items.length} ejercicios`} · ${groupDone}/${groupSets} series`;

                return (
                  <View key={groupKey} style={styles.groupSection}>
                    {isFirstGroup ? (
                      /* El grupo recomendado es el unico bloque grande de la lista: se
                         reconoce por la foto, sin leer. */
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isGroupOpen }}
                        accessibilityLabel={`${groupLabel}, ${groupDone} de ${groupSets} series`}
                        onPress={() => setOpenGroup(isGroupOpen ? '' : groupKey)}
                        style={styles.groupHero}
                      >
                        {groupPhoto ? (
                          <>
                            <Image source={groupPhoto} style={styles.groupHeroImage} resizeMode="cover" />
                            <LinearGradient
                              colors={scrim.card.colors}
                              locations={scrim.card.locations}
                              style={StyleSheet.absoluteFill}
                              pointerEvents="none"
                            />
                          </>
                        ) : (
                          <View style={[StyleSheet.absoluteFill, styles.sinImagen]}>
                            <Text style={styles.sinImagenText}>Sin foto</Text>
                          </View>
                        )}
                        <View style={styles.groupHeroText}>
                          <Text style={styles.startHereTag}>Empezá por acá</Text>
                          <Text style={[styles.groupHeroName, !groupPhoto && styles.groupNameSinFoto]}>{groupLabel}</Text>
                          <Text style={styles.groupHeroMeta}>{groupCount}</Text>
                          <Text style={styles.groupHeroNote}>Los músculos grandes primero, mientras tenés más fuerza.</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: isGroupOpen }}
                        accessibilityLabel={`${groupLabel}, ${groupDone} de ${groupSets} series`}
                        onPress={() => setOpenGroup(isGroupOpen ? '' : groupKey)}
                        style={styles.groupHeader}
                      >
                        {groupThumb ? (
                          <Image source={groupThumb} style={styles.groupThumb} resizeMode="cover" />
                        ) : (
                          <View style={[styles.groupThumb, styles.sinImagen]} />
                        )}
                        <View style={styles.groupHeaderText}>
                          <Text style={[styles.groupName, !groupThumb && styles.groupNameSinFoto]}>{groupLabel}</Text>
                          <Text style={styles.groupMeta}>{groupCount}</Text>
                        </View>
                        <Text style={styles.chevron}>{isGroupOpen ? '−' : '+'}</Text>
                      </Pressable>
                    )}

                    {isGroupOpen ? (
                      <View style={styles.groupBody}>
                        {items.map(({ exercise, position }, index) => {
                          const sets = session.setsByExercise[exercise.id] ?? [];
                          const done = sets.length > 0 && sets.every((set) => set.completed);
                          const completedSets = sets.filter((set) => set.completed).length;
                          // Por posición, no por exercise.id: dos filas del mismo ejercicio
                          // comparten id, y comparar por id marcaba "Seguí acá" en las dos.
                          const isRecommendedNext = position === nextExercise?.position;

                          return (
                            <Pressable
                              // Por posición, no por exercise.id: si la rutina tiene el mismo
                              // ejercicio dos veces en este músculo (dato que el constructor ya
                              // no deja crear, pero que una rutina vieja puede traer), dos
                              // ejercicios con la misma key hacían que React tratara ambas filas
                              // como una sola.
                              key={`${groupKey}-${index}`}
                              accessibilityRole="button"
                              accessibilityLabel={`${exercise.name}, ${completedSets} de ${sets.length} series${isRecommendedNext ? ', seguí acá' : ''}`}
                              onPress={() => openExercise(exercise.id)}
                              style={({ pressed }) => [styles.variant, isRecommendedNext && styles.variantRecommended, pressed && styles.pressed]}
                            >
                              <View style={styles.variantText}>
                                <Text numberOfLines={2} style={styles.variantName}>{exercise.name}</Text>
                                {exercise.region ? (
                                  <Text style={styles.variantRegion}>{REGION_LABELS[exercise.region]}</Text>
                                ) : null}
                                {isRecommendedNext ? <Text style={styles.variantRecommendedTag}>Seguí acá</Text> : null}
                              </View>
                              <Text style={styles.variantSets}>
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
                : 'Entrenamiento guardado. Tu racha ya se actualizó.'}
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
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.nextButtonText}>
                {session.isFinished
                  ? 'Entrenamiento finalizado'
                  : `Finalizar entrenamiento · ${session.completedSetCount} ${session.completedSetCount === 1 ? 'serie' : 'series'}`}
              </Text>
            )}
          </Pressable>
        </View>

        {/* Modo ejercicio: mismo trato — se oculta, no se desmonta, para no reiniciar
            el aviso del [12] dentro de SetTracker si se va y se vuelve sin terminar. */}
        <View style={isListMode ? styles.hidden : undefined}>
          {currentExercise ? (
            <>
              <View style={styles.exerciseHeader}>
                <Eyebrow>{`Ejercicio ${currentIndex + 1} de ${visibleExercises.length}`}</Eyebrow>
                <Text style={styles.exerciseName}>{currentExercise.name}</Text>
                {/* Datos, no prosa: se leen de un vistazo entre serie y serie. */}
                <View style={styles.metaPills}>
                  <Text style={styles.metaPill}>{equipmentLabels[currentExercise.equipment]}</Text>
                  {targetReps ? <Text style={styles.metaPill}>{targetReps} reps</Text> : null}
                  <Text style={styles.metaPill}>{previousPerformance[currentExercise.id] ?? 'Sin registro previo'}</Text>
                </View>
              </View>

              {/* Pegada al registro, no con el resto de abajo: no es información extra, es
                  la instrucción de con qué peso arrancar cuando no hay historial. */}
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

              {/* Todo lo que no hace falta leer antes de registrar: la técnica, por qué
                  este ejercicio, y cambiarlo o saltarlo. Va después del registro, no antes. */}
              <View style={styles.exerciseExtras}>
                <Pressable accessibilityRole="button" onPress={() => setShowHowTo((value) => !value)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>{showHowTo ? 'Ocultar cómo se hace' : '¿Cómo se hace?'}</Text>
                </Pressable>

                {showHowTo ? <ExerciseMediaPreview exercise={currentExercise} /> : null}

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
            </>
          ) : null}
        </View>
      </ScrollView>

      {/* Fuera del ScrollView: dentro se renderizaba debajo de la tabla de series y
          quedaba fuera de pantalla justo cuando arrancaba, así que el usuario ni se
          enteraba de que había un descanso corriendo. Se ve en los dos modos. */}
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
          disabledExerciseIds={disabledExerciseIds}
          disabledReason="Ya está en tu rutina de hoy"
          onSelect={applySwap}
          onClose={() => setIsSwapOpen(false)}
        />
      ) : null}
    </SafeAreaView>
  );
}

function formatReadOnlySet(set: { weightKg: number | null; completedReps: number | null }): string {
  const reps = set.completedReps ?? '-';
  if (!set.weightKg) return `${reps} reps`;
  const weight = Number.isInteger(set.weightKg) ? String(set.weightKg) : set.weightKg.toFixed(1).replace('.', ',');
  return `${weight} kg × ${reps}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingBottom: spacing.xl },
    /** Hueco para que la barra de descanso no tape el botón de finalizar. */
    contentWithTimer: { paddingBottom: 128 },
    hidden: { display: 'none' },
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
    groupSection: { borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
    groupHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', minHeight: 76, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    groupThumb: { borderRadius: radii.sm, height: 52, width: 52 },
    groupHero: { height: 184, justifyContent: 'flex-end' },
    groupHeroImage: { height: '100%', position: 'absolute', width: '100%' },
    groupHeroText: { gap: 2, padding: spacing.md },
    groupHeroName: { ...type.sectionTitle, color: colors.onAccent },
    groupHeroMeta: { ...type.small, color: colors.onAccent, opacity: 0.9 },
    groupHeroNote: { ...type.small, color: colors.onAccent, fontSize: 13, marginTop: 2, opacity: 0.82 },
    sinImagen: { alignItems: 'center', backgroundColor: colors.surface, justifyContent: 'center' },
    sinImagenText: { ...type.label, color: colors.empty },
    groupNameSinFoto: { color: colors.textLabel },
    groupHeaderText: { flexShrink: 1, gap: 2, minWidth: 0 },
    groupName: { ...type.cardTitle, color: colors.text },
    chevron: { color: colors.accent, fontFamily: typography.display, fontSize: 22, fontWeight: '800' },
    groupMeta: { ...type.small, color: colors.textMuted },
    groupBody: { backgroundColor: colors.surface, gap: spacing.sm, padding: spacing.md },
    variantText: { flex: 1, gap: 1, minWidth: 0 },
    variantRegion: { ...type.small, color: colors.textMuted, fontSize: 12 },
    variant: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    variantRecommended: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    variantName: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '600', lineHeight: 19 },
    variantRecommendedTag: { ...type.small, color: colors.accent, fontSize: 11, fontWeight: '700', marginTop: 1 },
    variantSets: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, fontVariant: ['tabular-nums'] },

    startHereRow: { flexDirection: 'row' },
    startHereTag: { ...type.eyebrow, backgroundColor: colors.accentSoft, borderRadius: radii.pill, color: colors.accent, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
    startHereNote: { ...type.small, color: colors.textMuted, marginTop: 2 },

    exerciseHeader: { gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    exerciseExtras: { gap: spacing.xs, marginTop: spacing.lg, paddingHorizontal: spacing.lg },
    exerciseName: { ...type.screenTitle, color: colors.text, fontSize: 25, lineHeight: 30 },
    metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    metaPill: { ...type.label, backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, color: colors.textLabel, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 7 },
    exerciseActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
    swapWarning: { ...type.small, color: colors.textMuted },

    suggestion: { backgroundColor: colors.accentSoft, borderRadius: radii.md, gap: spacing.xs, marginHorizontal: spacing.lg, marginTop: spacing.lg, padding: spacing.md },
    suggestionText: { ...type.small, color: colors.text },
    logSection: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
    readOnlyExercise: { gap: spacing.xs, marginBottom: spacing.md, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
    readOnlyExerciseName: { ...type.body, color: colors.text, fontWeight: '600' },
    readOnlyExerciseSets: { ...type.small, color: colors.textMuted },

    restDock: { bottom: 0, left: 0, position: 'absolute', right: 0 },

    nextButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, backgroundColor: colors.accentFill, marginHorizontal: spacing.lg, marginTop: spacing.xl },
    nextButtonDisabled: { backgroundColor: colors.line },
    nextButtonText: { ...type.pill, color: colors.onAccent },
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
