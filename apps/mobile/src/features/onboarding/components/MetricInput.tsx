import { KeyboardTypeOptions, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

type MetricInputProps = {
  label: string;
  value: string;
  unit: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
};

export function MetricInput({
  label,
  value,
  unit,
  onChangeText,
  error,
  keyboardType = 'numeric'
}: MetricInputProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputRow, error && styles.inputRowError]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          inputMode="decimal"
          placeholder="—"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          maxLength={5}
        />
        <Text style={styles.unit}>{unit}</Text>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, minWidth: 0 },
    label: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600', marginBottom: spacing.sm },
    inputRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1.5, borderBottomColor: colors.line },
    inputRowError: { borderBottomColor: colors.danger },
    input: { flex: 1, color: colors.text, fontFamily: typography.display, fontSize: 26, paddingVertical: 0 },
    unit: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, marginLeft: spacing.sm },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 18, marginTop: spacing.xs }
  });
}
