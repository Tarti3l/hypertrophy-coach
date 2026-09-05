import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { MealEntry, MEAL_TYPES } from '../types/nutrition';

type MealListProps = {
  entries: MealEntry[];
  onDelete: (id: string) => void;
};

export function MealList({ entries, onDelete }: MealListProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (entries.length === 0) {
    return (
      <Card>
        <Eyebrow>Hoy</Eyebrow>
        <Text style={styles.empty}>Todavía no registraste nada. Empieza por lo último que comiste.</Text>
      </Card>
    );
  }

  return (
    <Card>
      <Eyebrow>Hoy</Eyebrow>
      {MEAL_TYPES.map((meal) => {
        const group = entries.filter((entry) => entry.mealType === meal.value);
        if (group.length === 0) return null;

        return (
          <View key={meal.value} style={styles.group}>
            <Text style={styles.groupTitle}>{meal.label}</Text>
            {group.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.label}>{entry.label}</Text>
                  <Text style={styles.detail}>
                    {entry.portionLabel ?? (entry.quantityGrams !== null ? `${entry.quantityGrams} g` : 'A mano')} · {Math.round(entry.energyKcal)} kcal · {Math.round(entry.proteinG)} g proteína
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar ${entry.label}`}
                  onPress={() => onDelete(entry.id)}
                  style={styles.remove}
                >
                  <Text style={styles.removeText}>Quitar</Text>
                </Pressable>
              </View>
            ))}
          </View>
        );
      })}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    empty: { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
    group: { marginTop: spacing.md },
    groupTitle: { ...type.cardTitle, color: colors.text, marginBottom: spacing.xs },
    row: { alignItems: 'center', borderColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingVertical: spacing.sm },
    rowMain: { flex: 1, gap: 2, minWidth: 0 },
    label: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    detail: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18 },
    remove: { justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.sm },
    removeText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700' }
  });
}
