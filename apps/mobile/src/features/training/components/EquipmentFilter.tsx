import { useMemo } from 'react';

import { ScrollView, StyleSheet, Text, Pressable, useColorScheme } from 'react-native';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

import { exerciseFilters } from '../services/exerciseCatalog';
import { ExerciseFilter } from '../types/training';

type EquipmentFilterProps = {
  value: ExerciseFilter;
  onChange: (filter: ExerciseFilter) => void;
};

export function EquipmentFilter({ value, onChange }: EquipmentFilterProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  // Sin useMemo se invocaba StyleSheet.create en cada render, y la pantalla de
  // sesión se re-renderiza cada segundo por el cronómetro.
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.container}>
      {exerciseFilters.map((filter) => {
        const selected = filter.value === value;
        return (
          <Pressable
            key={filter.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(filter.value)}
            style={({ pressed }) => [styles.filter, selected && styles.filterSelected, pressed && styles.pressed]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{filter.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { gap: spacing.sm, paddingRight: spacing.lg },
    filter: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.md },
    filterSelected: { backgroundColor: colors.accent, borderColor: colors.accent },
    pressed: { opacity: 0.78 },
    label: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    labelSelected: { color: colors.surface }
  });
}
