import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

type InfoNoteProps = {
  /** Texto corto junto al signo de interrogación. Sin él, solo se ve el botón. */
  label?: string;
  /** Lo que se despliega. */
  children: string;
  /** Cita o fuente, en cursiva bajo el texto. */
  source?: string | null;
};

/**
 * Información opcional detrás de un signo de interrogación.
 *
 * El motivo: la app explica el porqué de cada decisión y cita sus fuentes, y eso
 * estaba bien, pero mostrado todo a la vez convertía el constructor en un muro de
 * texto. Quien quiera saber por qué, lo abre; quien solo quiera armar su rutina,
 * no lo ve.
 *
 * Empieza cerrado siempre: si algo merece leerse sí o sí, no va aquí.
 */
export function InfoNote({ label, children, source = null }: InfoNoteProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={label ? `${label}. Más información` : 'Más información'}
        onPress={() => setIsOpen((current) => !current)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <View style={[styles.badge, isOpen && styles.badgeOn]}>
          <Text style={[styles.badgeText, isOpen && styles.badgeTextOn]}>?</Text>
        </View>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </Pressable>

      {isOpen ? (
        <View style={styles.panel}>
          <Text style={styles.text}>{children}</Text>
          {source ? <Text style={styles.source}>{source}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { alignSelf: 'flex-start', maxWidth: '100%' },
    // 44 de alto aunque el círculo mida 24: el área de toque es lo que importa.
    trigger: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 44 },
    badge: {
      alignItems: 'center',
      borderColor: colors.line,
      borderRadius: 12,
      borderWidth: 1,
      height: 24,
      justifyContent: 'center',
      width: 24
    },
    badgeOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    badgeText: { color: colors.textMuted, fontFamily: typography.display, fontSize: 13, fontWeight: '800' },
    badgeTextOn: { color: colors.surface },
    label: { ...type.small, color: colors.textMuted, flexShrink: 1, fontWeight: '600' },
    panel: { backgroundColor: colors.background, borderRadius: radii.sm, gap: spacing.xs, marginBottom: spacing.sm, padding: spacing.md },
    text: { ...type.small, color: colors.text },
    source: { ...type.small, color: colors.textMuted, fontStyle: 'italic' },
    pressed: { opacity: 0.7 }
  });
}
