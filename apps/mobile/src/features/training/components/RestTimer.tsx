import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { formatRest } from '../hooks/useRestTimer';

type RestTimerProps = {
  remaining: number;
  total: number;
  /** "Descanso" entre series, "Cambio de ejercicio" al pasar al siguiente. */
  label?: string;
  /** true cuando la cuenta llegó a cero: el aviso se queda unos segundos. */
  isFinished?: boolean;
  onAdd: (seconds: number) => void;
  onSkip: () => void;
};

export function RestTimer({ remaining, total, label = 'Descanso', isFinished = false, onAdd, onSkip }: RestTimerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;

  return (
    <View style={[styles.bar, isFinished && styles.barFinished]}>
      {/* La región viva es solo este texto, que cambia dos veces (al empezar y al
          terminar). Envolver todo el contador hacía que el lector de pantalla
          recitara "1:29, 1:28, 1:27…" durante minuto y medio seguido. */}
      <Text accessibilityLiveRegion="polite" style={styles.announcement}>
        {isFinished ? `${label} terminado` : `${label} de ${formatRest(total)}`}
      </Text>

      <View style={styles.row}>
        <View style={styles.labels}>
          <Eyebrow color={colors.accent}>{isFinished ? 'Listo' : label}</Eyebrow>
          <Text style={styles.time}>{isFinished ? '¡A darle!' : formatRest(remaining)}</Text>
        </View>
        {isFinished ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="Añadir 30 segundos" onPress={() => onAdd(30)} style={styles.action}>
            <Text style={styles.actionText}>+30 s</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.action}>
          <Text style={styles.actionMuted}>{isFinished ? 'Ocultar' : 'Saltar'}</Text>
        </Pressable>
      </View>

      {isFinished ? null : (
        <View style={styles.track}>
          <View style={[styles.value, { width: `${progress * 100}%` }]} />
        </View>
      )}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: { backgroundColor: colors.accentSoft, borderColor: colors.accent, borderRadius: radii.md, borderWidth: 1, marginBottom: spacing.md, marginHorizontal: spacing.lg, marginTop: spacing.md, padding: spacing.md },
    barFinished: { backgroundColor: colors.accent, borderColor: colors.accent },
    // Ancho y alto cero: existe para el lector de pantalla, no para la vista.
    announcement: { height: 0, overflow: 'hidden', width: 0 },
    row: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    labels: { flex: 1, minWidth: 0 },
    time: { ...type.metric, color: colors.accent, fontSize: 28 },
    action: { justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.sm },
    actionText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    actionMuted: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    track: { backgroundColor: colors.line, borderRadius: 2, height: 4, marginTop: spacing.sm, overflow: 'hidden' },
    value: { backgroundColor: colors.accent, borderRadius: 2, height: '100%' }
  });
}
