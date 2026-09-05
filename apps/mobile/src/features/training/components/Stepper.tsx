import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { palette, radii, spacing, ThemeColors, typography } from '@/theme/tokens';

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
};

/** Más y menos en vez de teclado: son ajustes de uno en uno y el teclado estorba. */
export function Stepper({ label, value, min, max, step = 1, suffix, onChange }: StepperProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Se hace clamp en vez de bloquear: con value 40, min 30 y step 15, exigir
  // value - step >= min dejaba el "−" muerto y el mínimo era inalcanzable.
  const canDecrease = value > min;
  const canIncrease = value < max;
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: `${value}${suffix ? ` ${suffix}` : ''}` }}
      style={styles.container}
    >
      <Text style={styles.label}>{label}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reducir ${label}`}
          accessibilityState={{ disabled: !canDecrease }}
          disabled={!canDecrease}
          onPress={decrease}
          style={({ pressed }) => [styles.button, !canDecrease && styles.buttonDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>−</Text>
        </Pressable>
        <Text style={styles.value}>{value}{suffix ? ` ${suffix}` : ''}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Aumentar ${label}`}
          accessibilityState={{ disabled: !canIncrease }}
          disabled={!canIncrease}
          onPress={increase}
          style={({ pressed }) => [styles.button, !canIncrease && styles.buttonDisabled, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, gap: spacing.xs, minWidth: 0 },
    label: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, fontWeight: '700' },
    controls: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    button: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
    buttonDisabled: { opacity: 0.4 },
    buttonText: { color: colors.accent, fontFamily: typography.body, fontSize: 20, fontWeight: '700', lineHeight: 24 },
    value: { color: colors.text, flex: 1, fontFamily: typography.display, fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center' },
    pressed: { opacity: 0.78 }
  });
}
