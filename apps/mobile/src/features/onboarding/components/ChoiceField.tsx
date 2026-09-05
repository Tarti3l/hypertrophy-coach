import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

type Option<T extends string | number> = {
  label: string;
  value: T;
  description?: string;
};

type ChoiceFieldProps<T extends string | number> = {
  accessibilityLabel: string;
  options: Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

export function ChoiceField<T extends string | number>({
  accessibilityLabel,
  options,
  value,
  onChange
}: ChoiceFieldProps<T>) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = createStyles(colors);

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.option, selected && styles.optionSelected, pressed && styles.pressed]}
          >
            <View style={styles.copy}>
              <Text style={[styles.label, selected && styles.labelSelected]}>{option.label}</Text>
              {option.description ? <Text style={styles.description}>{option.description}</Text> : null}
            </View>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioInner} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    group: { gap: spacing.sm },
    option: {
      minHeight: 56,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between'
    },
    optionSelected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    pressed: { opacity: 0.76 },
    copy: { flex: 1, paddingRight: spacing.md },
    label: { color: colors.text, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    labelSelected: { color: colors.accent },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: 2 },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.textMuted, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: colors.accent },
    radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent }
  });
}
