import { useMemo } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

const warnings = [
  {
    title: 'Alcohol',
    body: 'Beber después de entrenar puede reducir la respuesta de síntesis de proteína muscular y también complicar tu hidratación. Si eliges tomar, planifica agua, comida y descanso sin convertirlo en una regla de “todo o nada”.'
  },
  {
    title: 'Sueño y salidas nocturnas',
    body: 'Un concierto de reggaetón o una salida por Barranco puede recortar horas de sueño, sumar alcohol y cambiar el balance de comidas del fin de semana. Disfrútalo si quieres; solo cuenta con una recuperación más tranquila después.'
  },
  {
    title: 'Estrés sostenido',
    body: 'El cortisol forma parte de la respuesta normal al estrés. Cuando el estrés se mantiene alto y se junta con poco sueño o poca comida, recuperar y entrenar puede sentirse más difícil. Un día intenso no arruina tu progreso.'
  }
];

export function RedFlagsWarnings() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Factores para tener en cuenta</Text>
      <Text style={styles.description}>No son prohibiciones: son señales para ajustar expectativas y cuidar tu recuperación.</Text>
      <View style={styles.list}>
        {warnings.map((warning) => (
          <View key={warning.title} style={styles.warning}>
            <MaterialCommunityIcons name="alert-circle-outline" size={22} color={colors.danger} style={styles.icon} />
            <View style={styles.copy}>
              <Text style={styles.warningTitle}>{warning.title}</Text>
              <Text style={styles.warningBody}>{warning.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { paddingTop: spacing.xl },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
    list: { gap: spacing.md, marginTop: spacing.lg },
    warning: { backgroundColor: colors.dangerSoft, borderRadius: 14, flexDirection: 'row', padding: spacing.md },
    icon: { marginRight: spacing.sm, marginTop: 1 },
    copy: { flex: 1 },
    warningTitle: { color: colors.danger, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    warningBody: { color: colors.text, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: spacing.xs }
  });
}
