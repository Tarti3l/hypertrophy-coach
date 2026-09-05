import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import Slider from '@react-native-community/slider';

import { elevation, palette, radii, spacing, ThemeColors, typography } from '@/theme/tokens';

import { SleepSaveState } from '../hooks/useSleepLog';
import { MAX_SLEEP_HOURS, MIN_SLEEP_HOURS, WeeklySleepSummary } from '../types/sleep';

type SleepFeedback = {
  title: string;
  body: string;
  tone: 'danger' | 'warning' | 'success' | 'neutral';
};

type SleepTrackerProps = {
  hours: number;
  weekly: WeeklySleepSummary;
  saveState: SleepSaveState;
  isLoading: boolean;
  loadError: string | null;
  /** Mientras el dedo arrastra: solo estado local, sin tocar la red. */
  onChange: (hours: number) => void;
  /** Al soltar el slider: es cuando persistimos. */
  onCommit: (hours: number) => void;
  onRetry: () => void;
};

/**
 * Componente de presentación: no sabe que existe Supabase. Los datos y el guardado
 * llegan por props desde useSleepLog, igual que StreakBadge con useProgressSummary.
 */
export function SleepTracker({ hours, weekly, saveState, isLoading, loadError, onChange, onCommit, onRetry }: SleepTrackerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const feedback = getSleepFeedback(hours);
  const feedbackColors = getFeedbackColors(feedback.tone, colors);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Sueño de anoche</Text>
        {isLoading
          ? <ActivityIndicator accessibilityLabel="Cargando tu registro" color={colors.accent} />
          : <Text accessibilityLabel={`${formatHours(hours)} dormidas`} style={styles.hours}>{formatHours(hours)}</Text>}
      </View>

      <Text style={styles.description}>Mueve el control para registrar el tiempo aproximado que descansaste.</Text>

      <Slider
        accessibilityLabel="Horas de sueño"
        accessibilityValue={{ min: MIN_SLEEP_HOURS, max: MAX_SLEEP_HOURS, now: hours, text: formatHours(hours) }}
        disabled={isLoading}
        minimumValue={MIN_SLEEP_HOURS}
        maximumValue={MAX_SLEEP_HOURS}
        step={0.5}
        value={hours}
        onValueChange={onChange}
        onSlidingComplete={onCommit}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.line}
        thumbTintColor={colors.accent}
        style={styles.slider}
      />

      <View accessibilityLiveRegion="polite" style={styles.statusRow}>
        <Text style={styles.weeklyText}>
          {weekly.averageHours !== null
            ? `Promedio de la semana: ${formatHours(weekly.averageHours)} · ${weekly.nights === 1 ? '1 noche registrada' : `${weekly.nights} noches registradas`}`
            : 'Registra tus noches y aquí verás tu promedio semanal.'}
        </Text>
        {saveState === 'saving' ? <Text style={styles.savingText}>Guardando…</Text> : null}
        {saveState === 'saved' ? <Text style={styles.savedText}>Guardado</Text> : null}
      </View>

      {saveState === 'error' || loadError ? (
        <View style={styles.errorRow}>
          <Text style={styles.errorText}>
            {saveState === 'error' ? 'No pudimos guardar tu sueño. Revisa tu conexión.' : loadError}
          </Text>
          <Pressable accessibilityRole="button" onPress={onRetry} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={[styles.feedback, { backgroundColor: feedbackColors.background }]}>
        <Text style={[styles.feedbackTitle, { color: feedbackColors.text }]}>{feedback.title}</Text>
        <Text style={styles.feedbackBody}>{feedback.body}</Text>
      </View>
    </View>
  );
}

function getSleepFeedback(hours: number): SleepFeedback {
  if (hours < 6) {
    return {
      title: 'Alerta: Riesgo de pérdida de masa muscular.',
      body: 'Una mala noche no define tu progreso, pero dormir poco de forma repetida puede dificultar la recuperación.',
      tone: 'danger'
    };
  }

  if (hours < 7) {
    return {
      title: 'Aceptable, pero intenta descansar más.',
      body: 'Si puedes, prioriza una rutina nocturna más tranquila para acercarte a un descanso más completo.',
      tone: 'warning'
    };
  }

  if (hours <= 9) {
    return {
      title: '¡Óptimo para hipertrofia y recuperación!',
      body: 'Sostener este rango junto con comida y entrenamiento consistentes apoya tu recuperación.',
      tone: 'success'
    };
  }

  return {
    title: 'Más descanso no siempre significa mejor recuperación.',
    body: 'Observa cómo te sientes durante el día y busca una rutina de sueño que puedas mantener.',
    tone: 'neutral'
  };
}

function getFeedbackColors(tone: SleepFeedback['tone'], colors: ThemeColors) {
  if (tone === 'danger') return { background: colors.dangerSoft, text: colors.danger };
  if (tone === 'warning') return { background: colors.warningSoft, text: colors.warning };
  if (tone === 'success') return { background: colors.accentSoft, text: colors.accent };
  return { background: colors.surface, text: colors.text };
}

function formatHours(hours: number): string {
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1).replace('.', ',')} h`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, ...elevation.card },
    header: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between', minHeight: 30 },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },
    hours: { color: colors.accent, fontFamily: typography.display, fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
    slider: { height: 44, marginTop: spacing.md, marginHorizontal: -spacing.sm },
    statusRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', minHeight: 20, marginTop: spacing.sm },
    weeklyText: { color: colors.text, flex: 1, fontFamily: typography.body, fontSize: 14, fontWeight: '600', lineHeight: 20 },
    savingText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13 },
    savedText: { color: colors.accent, fontFamily: typography.body, fontSize: 13, fontWeight: '600' },
    errorRow: { backgroundColor: colors.dangerSoft, borderRadius: 12, marginTop: spacing.sm, padding: spacing.sm },
    errorText: { color: colors.text, fontFamily: typography.body, fontSize: 13, lineHeight: 19 },
    retryButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, paddingRight: spacing.md },
    retryText: { color: colors.accent, fontFamily: typography.body, fontSize: 14, fontWeight: '700' },
    feedback: { borderRadius: 14, marginTop: spacing.md, padding: spacing.md },
    feedbackTitle: { fontFamily: typography.body, fontSize: 15, fontWeight: '700', lineHeight: 21 },
    feedbackBody: { color: colors.text, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.xs }
  });
}
