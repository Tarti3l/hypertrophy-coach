import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

import { MacroPlan } from '../types/onboarding';

export function MacroSummary({ plan }: { plan: MacroPlan }) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = createStyles(colors);
  const metrics = [
    ['Proteína', `${plan.proteinGrams} g`],
    ['Carbohidratos', `${plan.carbsGrams} g`],
    ['Grasas', `${plan.fatGrams} g`]
  ];

  return (
    <View style={styles.wrapper}>
      <Text style={styles.calories}>{plan.calories.toLocaleString('es-ES')}</Text>
      <Text style={styles.calorieLabel}>kcal al día para empezar</Text>
      <View style={styles.metrics}>
        {metrics.map(([label, value]) => (
          <View key={label} style={styles.metric}>
            <Text style={styles.metricLabel}>{label}</Text>
            <Text style={styles.metricValue}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrapper: { paddingTop: spacing.xl },
    calories: { color: colors.text, fontFamily: typography.display, fontSize: 52, fontWeight: '700', letterSpacing: -1.5 },
    calorieLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24, marginTop: spacing.xs },
    metrics: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line },
    metric: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 56, borderBottomWidth: 1, borderBottomColor: colors.line },
    metricLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16 },
    metricValue: { color: colors.text, fontFamily: typography.display, fontSize: 19, fontWeight: '600' }
  });
}
