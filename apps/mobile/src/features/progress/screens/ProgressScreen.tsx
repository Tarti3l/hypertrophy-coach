import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { LineChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { useExerciseCatalog } from '@/features/training/hooks/useExerciseCatalog';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { deleteCompletedWorkout, getCompletedWorkouts, getStrengthProgress } from '../services/workoutSessionRepository';
import { CompletedWorkoutSummary, StrengthPoint } from '../types/workoutSession';

export function ProgressScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chartWidth = Math.max(250, Math.min(width, 520) - spacing.lg * 2 - 48);

  const catalog = useExerciseCatalog();
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [points, setPoints] = useState<StrengthPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  const [sessions, setSessions] = useState<CompletedWorkoutSummary[]>([]);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  // Borrar pide dos toques a propósito: el id que está esperando confirmación.
  // Alert.alert no funciona en la versión web, así que se pregunta en línea.
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => () => { isMountedRef.current = false; }, []);

  // El primer ejercicio del catálogo es el seleccionado por defecto.
  useEffect(() => {
    if (!exerciseId && catalog.exercises.length > 0) setExerciseId(catalog.exercises[0].id);
  }, [catalog.exercises, exerciseId]);

  const loadProgress = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getStrengthProgress(id);
      if (!isMountedRef.current) return;
      setPoints(data);
    } catch {
      if (!isMountedRef.current) return;
      setError('No pudimos cargar tu progreso. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!exerciseId) return;
    void loadProgress(exerciseId);
  }, [exerciseId, loadProgress]);

  const loadSessions = useCallback(async () => {
    try {
      const recent = await getCompletedWorkouts();
      if (!isMountedRef.current) return;
      setSessions(recent);
      setSessionsError(null);
    } catch {
      if (isMountedRef.current) setSessionsError('No pudimos cargar tus sesiones. Revisa tu conexión e inténtalo de nuevo.');
    }
  }, []);

  useEffect(() => { void loadSessions(); }, [loadSessions]);

  const removeSession = useCallback(async (workoutId: string) => {
    setDeletingId(workoutId);
    try {
      await deleteCompletedWorkout(workoutId);
      if (!isMountedRef.current) return;
      setConfirmingId(null);
      await loadSessions();
      // El gráfico sale de las series que acabamos de borrar: recargarlo o quedaría
      // mostrando una sesión que ya no existe.
      if (exerciseId) await loadProgress(exerciseId);
    } catch {
      if (isMountedRef.current) setSessionsError('No pudimos eliminar esa sesión. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      if (isMountedRef.current) setDeletingId(null);
    }
  }, [exerciseId, loadProgress, loadSessions]);

  const selectedExercise = catalog.exercises.find((exercise) => exercise.id === exerciseId) ?? null;
  const isBusy = catalog.isLoading || (Boolean(exerciseId) && isLoading);
  const activeError = catalog.error ?? error;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Eyebrow>Progreso</Eyebrow>
        <Text style={styles.title}>Tu fuerza crece con práctica</Text>
        <Text style={styles.description}>
          {selectedExercise ? `Peso máximo levantado en ${selectedExercise.name.toLowerCase()}.` : 'Elige un ejercicio para ver tu evolución.'}
        </Text>

        {catalog.exercises.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipTrack}>
            {catalog.exercises.map((exercise) => {
              const selected = exercise.id === exerciseId;
              return (
                <Pressable
                  key={exercise.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => setExerciseId(exercise.id)}
                  style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
                >
                  <Text numberOfLines={1} style={[styles.chipText, selected && styles.chipTextSelected]}>{exercise.name}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {activeError ? (
          <View accessibilityLiveRegion="polite" style={styles.banner}>
            <Text style={styles.bannerText}>{activeError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => (catalog.error ? catalog.reload() : exerciseId && void loadProgress(exerciseId))}
              style={styles.textButton}
            >
              <Text style={styles.textButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : isBusy ? (
          <View accessibilityLabel="Cargando tu progreso" style={styles.stateArea}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : points.length >= 2 ? (
          <View style={styles.chartArea}>
            <LineChart
              areaChart
              curved
              data={points.map((point) => ({ value: point.value, label: point.label }))}
              width={chartWidth}
              height={210}
              color={colors.accent}
              startFillColor={colors.accent}
              endFillColor={colors.accentSoft}
              startOpacity={0.18}
              endOpacity={0.02}
              thickness={3}
              dataPointsColor={colors.accent}
              dataPointsRadius={4}
              hideRules={false}
              rulesColor={colors.line}
              xAxisColor={colors.line}
              yAxisColor={colors.line}
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              initialSpacing={8}
              endSpacing={8}
              noOfSections={4}
              yAxisLabelSuffix=" kg"
              disableScroll
            />
          </View>
        ) : (
          <View style={styles.note}>
            <Text style={styles.noteText}>
              {points.length === 1
                ? 'Ya tienes tu primer registro. Con una sesión más podrás ver la línea de tu progreso.'
                : 'Aún no hay registros de este ejercicio. Complétalo en un entrenamiento y aparecerá aquí.'}
            </Text>
          </View>
        )}

        <View style={styles.sessionsSection}>
          <Eyebrow>Tus sesiones</Eyebrow>
          <Text style={styles.sessionsHint}>
            Si finalizaste un entrenamiento por error, puedes eliminarlo. Sus series dejan de contar en tu progreso.
          </Text>

          {sessionsError ? (
            <View accessibilityLiveRegion="polite" style={styles.banner}>
              <Text style={styles.bannerText}>{sessionsError}</Text>
              <Pressable accessibilityRole="button" onPress={() => void loadSessions()} style={styles.textButton}>
                <Text style={styles.textButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : null}

          {sessions.length === 0 && !sessionsError ? (
            <Text style={styles.sessionsHint}>Todavía no terminaste ningún entrenamiento.</Text>
          ) : null}

          {sessions.map((session) => (
            <View key={session.id} style={styles.sessionRow}>
              <Text style={styles.sessionDate}>{formatSessionDate(session.endedAt)}</Text>
              <Text style={styles.sessionMeta}>{describeSession(session)}</Text>

              {deletingId === session.id ? (
                <ActivityIndicator accessibilityLabel="Eliminando la sesión" color={colors.accent} style={styles.sessionBusy} />
              ) : confirmingId === session.id ? (
                <View style={styles.sessionActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Confirmar que se elimina la sesión del ${formatSessionDate(session.endedAt)}`}
                    onPress={() => void removeSession(session.id)}
                    style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.dangerButtonText}>Sí, eliminar</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={() => setConfirmingId(null)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryButtonText}>Cancelar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Eliminar la sesión del ${formatSessionDate(session.endedAt)}`}
                  onPress={() => setConfirmingId(session.id)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Eliminar</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatSessionDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} · ${hours}:${minutes}`;
}

function describeSession(session: CompletedWorkoutSummary): string {
  const sets = session.setCount === 1 ? '1 serie' : `${session.setCount} series`;
  const exercises = session.exerciseCount === 1 ? '1 ejercicio' : `${session.exerciseCount} ejercicios`;
  const parts = [sets, exercises];
  if (session.durationMinutes !== null) parts.push(`${session.durationMinutes} min`);
  return parts.join(' · ');
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    backButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginTop: spacing.xl },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 23, marginTop: spacing.md },
    chipTrack: { gap: spacing.sm, paddingVertical: spacing.lg },
    chip: { borderColor: colors.line, borderRadius: 999, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
    chipSelected: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600', maxWidth: 200 },
    chipTextSelected: { color: colors.accent },
    stateArea: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl, minHeight: 210 },
    chartArea: { borderBottomWidth: 1, borderColor: colors.line, marginTop: spacing.sm, paddingBottom: spacing.lg },
    axisText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11 },
    banner: { backgroundColor: colors.dangerSoft, borderRadius: 14, marginTop: spacing.lg, padding: spacing.md },
    bannerText: { color: colors.text, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, marginTop: spacing.xs },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    note: { backgroundColor: colors.accentSoft, borderRadius: 14, marginTop: spacing.lg, padding: spacing.md },
    sessionsSection: { borderColor: colors.line, borderTopWidth: 1, marginTop: spacing.xl, paddingTop: spacing.lg },
    sessionsHint: { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
    sessionRow: { borderColor: colors.line, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md },
    sessionDate: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    sessionMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
    sessionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
    sessionBusy: { alignSelf: 'flex-start', marginTop: spacing.sm },
    dangerButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: radii.sm, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.lg },
    dangerButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    secondaryButton: { alignItems: 'center', alignSelf: 'flex-start', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, justifyContent: 'center', minHeight: 44, marginTop: spacing.xs, paddingHorizontal: spacing.lg },
    secondaryButtonText: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    noteText: { color: colors.text, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
    pressed: { opacity: 0.78 }
  });
}
