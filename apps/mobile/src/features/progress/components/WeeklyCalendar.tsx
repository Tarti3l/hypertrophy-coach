import { useMemo } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

type WeekDay = {
  label: string;
  dateKey: string;
  dayOfMonth: number;
};

type WeeklyCalendarProps = {
  completedDates: string[];
  referenceDate?: Date;
  /** true cuando no hay ni un dato real que mostrar (nunca cargó y no hay nada en cola). */
  unavailable?: boolean;
};

export function WeeklyCalendar({ completedDates, referenceDate = new Date(), unavailable = false }: WeeklyCalendarProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const week = useMemo(() => getCurrentWeek(referenceDate), [referenceDate]);
  const completed = new Set(completedDates);
  const todayKey = dateKey(referenceDate);
  const doneThisWeek = week.filter((day) => completed.has(day.dateKey)).length;

  return (
    <Card>
      <View accessibilityLabel="Calendario semanal de entrenamientos">
        <View style={styles.header}>
          <Text style={styles.title}>Esta semana</Text>
          <Text style={styles.count}>
            {unavailable ? 'Sin datos disponibles' : doneThisWeek === 1 ? '1 sesión' : `${doneThisWeek} sesiones`}
          </Text>
        </View>
        <View style={styles.days}>
          {week.map((day) => {
            const trained = completed.has(day.dateKey);
            const isToday = day.dateKey === todayKey;
            return (
              <View key={day.dateKey} style={styles.dayWrap}>
                <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>{day.label}</Text>
                <View style={[styles.day, trained && styles.dayTrained, isToday && styles.dayToday]}>
                  <Text style={[styles.dayNumber, trained && styles.dayNumberTrained]}>{day.dayOfMonth}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Card>
  );
}

function getCurrentWeek(referenceDate: Date): WeekDay[] {
  const mondayOffset = (referenceDate.getDay() + 6) % 7;
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - mondayOffset);
  // Iniciales en la convención peruana: miércoles es M, no X.
  const labels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  return labels.map((label, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return { label, dateKey: dateKey(date), dayOfMonth: date.getDate() };
  });
}

function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    title: { ...type.cardTitle, color: colors.text },
    count: { ...type.small, color: colors.textMuted },
    days: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
    dayWrap: { alignItems: 'center', gap: spacing.sm },
    dayLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, fontWeight: '700' },
    dayLabelToday: { color: colors.text },
    day: { alignItems: 'center', borderColor: colors.line, borderRadius: 18, borderWidth: 1, height: 36, justifyContent: 'center', width: 36 },
    dayTrained: { backgroundColor: colors.accent, borderColor: colors.accent },
    dayToday: { borderColor: colors.text, borderWidth: 2 },
    dayNumber: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700' },
    dayNumberTrained: { color: colors.surface }
  });
}
