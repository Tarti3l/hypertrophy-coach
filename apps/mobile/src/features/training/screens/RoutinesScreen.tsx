import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { useRoutines } from '../hooks/useRoutines';
import { archiveRoutine, getRoutine } from '../services/routineRepository';
import { publishRoutine } from '../services/sharedRoutineRepository';
import { describeSupabaseError } from '@/lib/supabaseErrors';
import { CARDIO_PLACEMENT_LABELS } from '../types/split';

export function RoutinesScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/training');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { routines, isLoading, error, reload } = useRoutines();
  /** Qué día está elegido en cada tarjeta. Empieza en el 1. */
  const [dayByRoutine, setDayByRoutine] = useState<Record<string, number>>({});
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [publishedId, setPublishedId] = useState<string | null>(null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Eyebrow>Entrenamiento</Eyebrow>
        <Text style={styles.title}>Tus rutinas</Text>
        <Text style={styles.description}>
          Armamos tu semana según los días que entrenes, con ejercicios recomendados que puedes
          cambiar cuando quieras.
        </Text>

        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={reload} style={styles.textButton}>
              <Text style={styles.textButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {archiveError ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{archiveError}</Text>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator accessibilityLabel="Cargando rutinas" color={colors.accent} style={styles.loader} />
        ) : routines.length === 0 ? (
          <Card style={styles.block}>
            <Text style={styles.emptyText}>
              Todavía no tienes ninguna rutina. Dinos cuántos días entrenas y te proponemos una
              completa, con el porqué de cada decisión.
            </Text>
          </Card>
        ) : (
          routines.map((routine) => {
            const selectedDay = dayByRoutine[routine.id] ?? 1;
            const days = Array.from({ length: Math.max(1, routine.daysPerWeek) }, (_, index) => index + 1);

            return (
              <Card key={routine.id} style={styles.block}>
                <Text style={styles.routineName}>{routine.name}</Text>
                <Text style={styles.routineMeta}>
                  {routine.daysPerWeek === 1 ? '1 día' : `${routine.daysPerWeek} días`} ·{' '}
                  {routine.exerciseCount === 1 ? '1 ejercicio' : `${routine.exerciseCount} ejercicios`} ·{' '}
                  {routine.totalSets} series
                  {routine.cardioPlacement !== 'none'
                    ? ` · cardio ${CARDIO_PLACEMENT_LABELS[routine.cardioPlacement].toLowerCase()}`
                    : ''}
                </Text>

                {days.length > 1 ? (
                  <>
                    <Text style={styles.pickLabel}>¿Qué día toca hoy?</Text>
                    <View style={styles.dayRow}>
                      {days.map((day) => {
                        const on = day === selectedDay;
                        return (
                          <Pressable
                            key={day}
                            accessibilityRole="button"
                            accessibilityLabel={`Día ${day}`}
                            accessibilityState={{ selected: on }}
                            onPress={() => setDayByRoutine((current) => ({ ...current, [routine.id]: day }))}
                            style={[styles.dayChip, on && styles.dayChipOn]}
                          >
                            <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{day}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </>
                ) : null}

                <PrimaryButton
                  label="Empezar"
                  icon="arrowRight"
                  onPress={() => router.push(`/(tabs)/training/active?routineId=${routine.id}&day=${selectedDay}`)}
                  style={styles.startButton}
                />

                <View style={styles.routineActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => router.push(`/routine-builder?routineId=${routine.id}`)}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonText}>Editar</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    disabled={publishingId === routine.id}
                    onPress={() => {
                      setArchiveError(null);
                      setPublishingId(routine.id);
                      void getRoutine(routine.id)
                        .then((full) => full ? publishRoutine(full, { summary: null }) : null)
                        .then((sharedId) => { if (sharedId) setPublishedId(routine.id); })
                        .catch((caught) => setArchiveError(describeSupabaseError(caught, 'No pudimos publicar la rutina.')))
                        .finally(() => setPublishingId(null));
                    }}
                    style={styles.textButton}
                  >
                    <Text style={styles.textButtonText}>
                      {publishingId === routine.id
                        ? 'Publicando…'
                        : publishedId === routine.id ? 'Publicada' : 'Compartir'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setArchiveError(null);
                      void archiveRoutine(routine.id)
                        .then(reload)
                        // Sin este mensaje, archivar fallaba en silencio y la rutina
                        // simplemente seguía ahí sin explicación.
                        .catch(() => setArchiveError('No pudimos archivar la rutina. Revisa tu conexión.'));
                    }}
                    style={styles.textButton}
                  >
                    <Text style={styles.archiveText}>Archivar</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}

        <PrimaryButton
          label={routines.length === 0 ? 'Armar mi rutina' : 'Crear otra rutina'}
          icon="plus"
          onPress={() => router.push('/routine-builder')}
          style={styles.block}
        />

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/shared-routines')}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Ver rutinas de otros</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginTop: spacing.sm },
    description: { ...type.body, color: colors.textMuted, marginTop: spacing.sm },
    block: { marginTop: spacing.md },
    loader: { alignSelf: 'flex-start', marginTop: spacing.md },
    emptyText: { ...type.small, color: colors.textMuted },
    routineName: { ...type.sectionTitle, color: colors.text },
    routineMeta: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    pickLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
    dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    dayChip: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    dayChipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    dayChipText: { color: colors.text, fontFamily: typography.display, fontSize: 16, fontWeight: '700' },
    dayChipTextOn: { color: colors.accent },
    startButton: { marginTop: spacing.md },
    routineActions: { flexDirection: 'row', gap: spacing.lg },
    banner: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
    bannerText: { ...type.small, color: colors.text },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    archiveText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    secondaryButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', marginTop: spacing.md, minHeight: 52 },
    secondaryButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '700' }
  });
}
