import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { gradient, palette, radii, spacing, ThemeColors, type } from '@/theme/tokens';

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

/**
 * El descanso es uno de los tres bloques de acento del sistema (ver
 * docs/diseno.md, sección 6, regla 1): mientras corre, es lo único con color en
 * la pantalla. Sigue siendo una barra dentro del entrenamiento y no una pantalla
 * aparte, porque el socio tiene que ver la lista mientras espera.
 */
export function RestTimer({ remaining, total, label = 'Descanso', isFinished = false, onAdd, onSkip }: RestTimerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Lo que queda, no lo transcurrido: la barra se vacía a medida que corre el reloj.
  const progress = total > 0 ? Math.min(1, remaining / total) : 0;

  return (
    <LinearGradient
      colors={gradient.activo.colors}
      start={gradient.activo.start}
      end={gradient.activo.end}
      style={styles.bar}
    >
      {/* La región viva es solo este texto, que cambia dos veces (al empezar y al
          terminar). Envolver todo el contador hacía que el lector de pantalla
          recitara "1:29, 1:28, 1:27…" durante minuto y medio seguido. */}
      <Text accessibilityLiveRegion="polite" style={styles.announcement}>
        {isFinished ? `${label} terminado` : `${label} de ${formatRest(total)}`}
      </Text>

      <View style={styles.head}>
        <Eyebrow color={colors.onAccent}>{isFinished ? 'Listo' : label}</Eyebrow>
        {isFinished ? null : <Text style={styles.target}>Objetivo {formatRest(total)}</Text>}
      </View>

      <Text style={styles.time} numberOfLines={1} adjustsFontSizeToFit>
        {isFinished ? '¡A darle!' : formatRest(remaining)}
      </Text>

      {isFinished ? null : (
        <View style={styles.track}>
          <View style={[styles.value, { width: `${progress * 100}%` }]} />
        </View>
      )}

      <View style={styles.actions}>
        {isFinished ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Añadir 30 segundos"
            onPress={() => onAdd(30)}
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>+30 s</Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          onPress={onSkip}
          style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>{isFinished ? 'Ocultar' : 'Saltar'}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    bar: {
      borderRadius: radii.xxl,
      gap: spacing.sm,
      marginBottom: spacing.md,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      padding: spacing.lg
    },
    // Ancho y alto cero: existe para el lector de pantalla, no para la vista.
    announcement: { height: 0, overflow: 'hidden', width: 0 },
    head: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    target: { ...type.label, color: colors.onAccent, opacity: 0.85 },
    // Se lee de reojo, a un metro, con el teléfono apoyado en el banco.
    time: { ...type.timer, color: colors.onAccent, fontSize: 76, letterSpacing: -4 },
    track: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: radii.pill, height: 5, overflow: 'hidden' },
    value: { backgroundColor: colors.onAccent, borderRadius: radii.pill, height: '100%' },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    secondary: {
      alignItems: 'center',
      borderColor: 'rgba(255,255,255,0.55)',
      borderRadius: radii.pill,
      borderWidth: 1,
      flex: 1,
      justifyContent: 'center',
      minHeight: 48
    },
    secondaryText: { ...type.pill, color: colors.onAccent, fontSize: 14 },
    primary: { alignItems: 'center', backgroundColor: colors.onAccent, borderRadius: radii.pill, flex: 1, justifyContent: 'center', minHeight: 48 },
    primaryText: { ...type.pill, color: colors.accentDeep, fontSize: 14 },
    pressed: { opacity: 0.78 }
  });
}
