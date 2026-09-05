import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

const warmupSteps = [
  ['Movilidad de hombros', '2 min de círculos suaves y elevaciones sin carga.'],
  ['Empuje ligero', '2 series lentas con poco peso o flexiones apoyadas.'],
  ['Primera serie de práctica', 'Haz pocas repeticiones antes de usar tu carga de trabajo.']
];

export function WarmupScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/training');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a entrenamiento" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>Calentamiento de empuje</Text>
        <Text style={styles.description}>Dedica unos minutos a practicar el movimiento del día. Debes sentirte preparado, no cansado.</Text>

        <View style={styles.steps}>
          {warmupSteps.map(([title, body], index) => (
            <View key={title} style={styles.step}>
              <Text style={styles.stepNumber}>{index + 1}</Text>
              <View style={styles.stepCopy}>
                <Text style={styles.stepTitle}>{title}</Text>
                <Text style={styles.stepBody}>{body}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.note}>
          <Text style={styles.noteText}>Si algo duele de forma aguda o extraña, detente y pide orientación profesional.</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.push('/training/active')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
          <Text style={styles.primaryButtonText}>Empezar mi rutina</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    backButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 36, fontWeight: '700', letterSpacing: -0.8, lineHeight: 42, marginTop: spacing.xxl },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 17, lineHeight: 25, marginTop: spacing.md },
    steps: { marginTop: spacing.xxl, gap: spacing.lg },
    step: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: spacing.lg },
    stepNumber: { color: colors.accent, fontFamily: typography.display, fontSize: 20, fontWeight: '700', width: 32 },
    stepCopy: { flex: 1 },
    stepTitle: { color: colors.text, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    stepBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.xs },
    note: { backgroundColor: colors.accentSoft, borderRadius: 14, marginTop: spacing.xl, padding: spacing.md },
    noteText: { color: colors.text, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
    primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accent, marginTop: spacing.xl },
    primaryButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    pressed: { opacity: 0.8 }
  });
}
