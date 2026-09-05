import { useMemo } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { elevation, palette, radii, spacing, ThemeColors, typography } from '@/theme/tokens';

import { MacroDashboardData } from '../types/nutrition';

export function MacrosDashboard({ plan, consumed }: MacroDashboardData) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const macros = [
    { label: 'Proteínas', consumed: consumed.proteinGrams, target: plan.proteinGrams, unit: 'g' },
    { label: 'Carbohidratos', consumed: consumed.carbsGrams, target: plan.carbsGrams, unit: 'g' },
    { label: 'Grasas', consumed: consumed.fatGrams, target: plan.fatGrams, unit: 'g' }
  ];
  const calorieProgress = Math.min(100, (consumed.calories / plan.calories) * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tu referencia de hoy</Text>
      <View style={styles.caloriesRow}>
        <View>
          <Text style={styles.calories}>{consumed.calories.toLocaleString('es-ES')} / {plan.calories.toLocaleString('es-ES')} kcal</Text>
          <Text style={styles.caloriesCaption}>Energía diaria para tu etapa de ganancia</Text>
        </View>
      </View>
      <ProgressBar progress={calorieProgress} colors={colors} />
      <View style={styles.macroList}>
        {macros.map((macro) => {
          const progress = Math.min(100, (macro.consumed / macro.target) * 100);
          return (
            <View key={macro.label} style={styles.macro}>
              <View style={styles.macroTopline}>
                <Text style={styles.macroLabel}>{macro.label}</Text>
                <Text style={styles.macroAmount}>{macro.consumed} / {macro.target} {macro.unit}</Text>
              </View>
              <ProgressBar progress={progress} colors={colors} />
            </View>
          );
        })}
      </View>
      <Text style={styles.note}>Los consumos son de ejemplo por ahora. La meta sí usa tu cálculo de onboarding cuando está disponible.</Text>
    </View>
  );
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
    macroTopline: { flexDirection: 'row', justifyContent: 'space-between' },
    macroLabel: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    macroAmount: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontVariant: ['tabular-nums'] },
    note: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.lg }
  });
}
