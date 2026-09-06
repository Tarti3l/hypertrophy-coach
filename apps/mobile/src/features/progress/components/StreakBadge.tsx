import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

type StreakBadgeProps = {
  streakDays: number;
  isLoading?: boolean;
  /** true cuando no hay ni un dato real que mostrar (nunca cargó y no hay nada en cola). */
  unavailable?: boolean;
};

export function StreakBadge({ streakDays, isLoading = false, unavailable = false }: StreakBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const unit = streakDays === 1 ? 'día seguido' : 'días seguidos';

  return (
    <Card>
      <View style={styles.row}>
        <View style={styles.iconTile}>
          <Icon name="flame" color={colors.accent} size={24} />
        </View>
        <View style={styles.content}>
          <Eyebrow>Racha actual</Eyebrow>
          {isLoading ? (
            <ActivityIndicator accessibilityLabel="Cargando tu racha" color={colors.accent} style={styles.spinner} />
          ) : unavailable ? (
            <Text style={styles.unavailable}>Sin datos disponibles</Text>
          ) : (
            <View style={styles.metricRow}>
              <Text style={styles.metric}>{streakDays}</Text>
              <Text style={styles.unit}>{unit}</Text>
            </View>
          )}
        </View>
      </View>
      {!isLoading && !unavailable ? (
        <Text style={styles.message}>{streakDays === 0 ? 'Tu primera sesión inicia la racha.' : 'Sigue con un paso a la vez.'}</Text>
      ) : null}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
    iconTile: { alignItems: 'center', backgroundColor: colors.accentSoft, borderRadius: radii.md, height: 48, justifyContent: 'center', width: 48 },
    content: { flex: 1, gap: spacing.xs, minWidth: 0 },
    metricRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm },
    metric: { ...type.metric, color: colors.accent },
    unit: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    spinner: { alignSelf: 'flex-start', marginTop: spacing.xs },
    unavailable: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    message: { ...type.small, color: colors.textMuted, marginTop: spacing.md }
  });
}
