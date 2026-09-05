import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View, ViewStyle } from 'react-native';

import { palette, radii, spacing, ThemeColors, typography } from '@/theme/tokens';

import { Icon, IconName } from './Icon';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  style?: ViewStyle;
};

export function PrimaryButton({ label, onPress, disabled = false, loading = false, icon, style }: PrimaryButtonProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isBlocked = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isBlocked }}
      disabled={isBlocked}
      onPress={onPress}
      style={({ pressed }) => [styles.button, isBlocked && styles.disabled, pressed && styles.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator color={colors.surface} />
      ) : (
        <View style={styles.content}>
          <Text style={styles.label}>{label}</Text>
          {icon ? <Icon name={icon} color={colors.surface} size={18} /> : null}
        </View>
      )}
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    button: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: radii.md, justifyContent: 'center', minHeight: 52 },
    content: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    label: { color: colors.surface, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.82 }
  });
}
