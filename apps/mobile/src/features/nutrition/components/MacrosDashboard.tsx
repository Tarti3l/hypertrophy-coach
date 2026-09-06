import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { elevation, palette, radii, spacing, ThemeColors, typography } from '@/theme/tokens';

import { MacroDashboardData } from '../types/nutrition';

type MacrosDashboardProps = MacroDashboardData & {
  hasEntries: boolean;
  hasLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

export function MacrosDashboard({ plan, consumed, hasEntries, hasLoaded, isLoading, error, onRetry }: MacrosDashboardProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (error) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.container}>
        <Text style={styles.title}>Consumo de hoy</Text>
        <Text style={styles.stateText}>No pudimos consultar tus registros. Tu consumo de hoy no está disponible todavía.</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
          <Text style={styles.retryLabel}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (isLoading && !hasLoaded) {
    return (
      <View accessibilityLiveRegion="polite" style={styles.container}>
        <Text style={styles.title}>Consumo de hoy</Text>
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Consultando tus registros de hoy…</Text>
        </View>
      </View>
    );
  }

  const macros = [
    { label: 'Proteínas', consumed: consumed.proteinGrams, target: plan.proteinGrams, unit: 'g' },
    { label: 'Carbohidratos', consumed: consumed.carbsGrams, target: plan.carbsGrams, unit: 'g' },
    { label: 'Grasas', consumed: consumed.fatGrams, target: plan.fatGrams, unit: 'g' }
  ];
  const calorieProgress = progressFor(consumed.calories, plan.calories);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Consumo registrado hoy</Text>
      <View style={styles.caloriesRow}>
        <View>
          <Text style={styles.calories}>{formatAmount(consumed.calories)} kcal registradas</Text>
          <Text style={styles.caloriesCaption}>Meta de hoy: {formatAmount(plan.calories)} kcal</Text>
        </View>
      </View>
      <ProgressBar progress={calorieProgress} colors={colors} />
      <View style={styles.macroList}>
        {macros.map((macro) => {
          const progress = progressFor(macro.consumed, macro.target);
          return (
            <View key={macro.label} style={styles.macro}>
              <View style={styles.macroTopline}>
                <Text style={styles.macroLabel}>{macro.label}</Text>
                <Text style={styles.macroAmount}>{formatAmount(macro.consumed)} de {formatAmount(macro.target)} {macro.unit}</Text>
              </View>
              <ProgressBar progress={progress} colors={colors} />
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>
        {hasEntries
          ? 'Incluye solo las comidas que registraste hoy. La meta es una referencia de tu onboarding.'
          : 'Todavía no hay comidas registradas hoy. La meta se mantiene como referencia.'}
      </Text>
    </View>
  );
}

function formatAmount(value: number) {
  return Number(value.toFixed(1)).toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

function progressFor(consumed: number, target: number) {
  if (!Number.isFinite(consumed) || !Number.isFinite(target) || target <= 0) return 0;
  return Math.min(100, Math.max(0, (consumed / target) * 100));
}

function ProgressBar({ progress, colors }: { progress: number; colors: ThemeColors }) {
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress) }} style={[styles.progressTrack, { backgroundColor: colors.line }]}>
      <View style={[styles.progressValue, { backgroundColor: colors.accent, width: `${progress}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  progressTrack: { borderRadius: 4, height: 7, overflow: 'hidden' },
  progressValue: { borderRadius: 4, height: '100%' }
});

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { backgroundColor: colors.surface, borderColor: colors.line, borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, ...elevation.card },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },
    caloriesRow: { marginTop: spacing.md },
    calories: { color: colors.text, fontFamily: typography.display, fontSize: 21, fontWeight: '700', letterSpacing: -0.2 },
    caloriesCaption: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
    macroList: { gap: spacing.md, marginTop: spacing.lg },
    macro: { gap: spacing.sm },
    macroTopline: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'space-between' },
    macroLabel: { color: colors.text, flexShrink: 1, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    macroAmount: { color: colors.textMuted, flexShrink: 1, fontFamily: typography.body, fontSize: 14, fontVariant: ['tabular-nums'], textAlign: 'right' },
    note: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
    loadingRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    loadingText: { color: colors.textMuted, flex: 1, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
    stateText: { color: colors.textMuted, flex: 1, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
    retryButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44, marginTop: spacing.md, paddingHorizontal: spacing.sm },
    retryLabel: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    pressed: { opacity: 0.78 }
  });
}
