import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

const lessons = [
  {
    title: '45–60 min',
    body: 'Es suficiente para practicar con atención, descansar entre series y salir con energía para volver.'
  },
  {
    title: '2–3 días',
    body: 'Empieza con una frecuencia que puedas mantener. La constancia vale más que una semana intensa.'
  },
  {
    title: 'Push · Pull · Legs',
    body: 'Empuje trabaja pecho, hombros y tríceps. Tirón reúne espalda y bíceps. Piernas completa el ciclo.',
    rows: ['Push — pecho, hombro y tríceps', 'Pull — espalda y bíceps', 'Legs — piernas y glúteos']
  }
];

export function TrainingTheoryScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Entrena con una estructura simple</Text>
        <Text style={styles.description}>No necesitas hacer de todo. Estos fundamentos te ayudan a empezar sin perderte.</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={288}
          decelerationRate="fast"
          contentContainerStyle={styles.lessonTrack}
          style={styles.lessonScroller}
        >
          {lessons.map((lesson) => (
            <View key={lesson.title} style={styles.lesson}>
              <Text style={styles.lessonTitle}>{lesson.title}</Text>
              <Text style={styles.lessonBody}>{lesson.body}</Text>
              {lesson.rows ? (
                <View style={styles.lessonRows}>
                  {lesson.rows.map((row) => <Text key={row} style={styles.lessonRow}>{row}</Text>)}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Tu primera sesión</Text>
          <Text style={styles.footerDescription}>Hoy haremos un día de empuje con variantes para gimnasio o casa.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/training/warmup')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Preparar mi rutina</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 36, fontWeight: '700', letterSpacing: -0.8, lineHeight: 42, paddingHorizontal: spacing.lg },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 17, lineHeight: 25, marginTop: spacing.md, paddingHorizontal: spacing.lg },
    lessonScroller: { marginTop: spacing.xl },
    lessonTrack: { gap: spacing.md, paddingHorizontal: spacing.lg, paddingRight: spacing.xxl },
    lesson: { width: 272, minHeight: 260, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, justifyContent: 'space-between', padding: spacing.lg },
    lessonTitle: { color: colors.text, fontFamily: typography.display, fontSize: 29, fontWeight: '700', letterSpacing: -0.5 },
    lessonBody: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 23, marginTop: spacing.md },
    lessonRows: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.lg, paddingTop: spacing.sm },
    lessonRow: { color: colors.text, fontFamily: typography.body, fontSize: 13, lineHeight: 21 },
    footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl },
    footerTitle: { color: colors.text, fontFamily: typography.display, fontSize: 25, fontWeight: '700', letterSpacing: -0.4 },
    footerDescription: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 23, marginTop: spacing.sm },
    primaryButton: { minHeight: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accent, marginTop: spacing.lg },
    primaryButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    pressed: { opacity: 0.8 }
  });
}
