import { PropsWithChildren, useMemo } from 'react';
import { StyleSheet, useColorScheme, View, ViewStyle } from 'react-native';

import { elevation, palette, radii, spacing, ThemeColors } from '@/theme/tokens';

type CardProps = PropsWithChildren<{
  /** 'accent' para la tarjeta de acción principal de cada pantalla. */
  tone?: 'surface' | 'accent';
  style?: ViewStyle;
}>;

export function Card({ children, tone = 'surface', style }: CardProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return <View style={[styles.card, tone === 'accent' ? styles.accent : styles.surface, style]}>{children}</View>;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: { borderRadius: radii.lg, padding: spacing.md },
    surface: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, ...elevation.card },
    accent: { backgroundColor: colors.accentSoft }
  });
}
