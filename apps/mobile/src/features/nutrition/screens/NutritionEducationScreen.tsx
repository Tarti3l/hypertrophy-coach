import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useGoBack } from '@/hooks/useGoBack';
import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

type Lesson = {
  id: 'protein' | 'carbs' | 'flexibility';
  title: string;
  summary: string;
  body: string;
};

const lessons: Lesson[] = [
  {
    id: 'protein',
    title: 'Proteínas',
    summary: 'Material para recuperar y construir músculo.',
    body: 'Incluye fuentes que disfrutes, como huevos, lácteos, legumbres, pollo, pescado o tofu. El whey protein y la creatina pueden ser ayudas prácticas para llegar a tu meta, pero no son una obligación ni reemplazan una alimentación variada.'
  },
  {
    id: 'carbs',
    title: 'Carbohidratos',
    summary: 'El combustible que te acompaña a entrenar.',
    body: 'Arroz, papa, avena, pan, cereal y fruta aportan energía. Antes o después de entrenar, una comida sencilla con carbohidratos y proteína puede hacer más fácil recuperarte y repetir la sesión con ganas.'
  },
  {
    id: 'flexibility',
    title: 'Flexibilidad',
    summary: 'Una comida no define tu proceso.',
    body: 'Pizza, pollo frito u otra comida rápida de fin de semana pueden convivir con tu objetivo. Piensa en la frecuencia y las porciones, prioriza lo que te ayuda a llegar a proteína y energía, y vuelve a tus hábitos normales sin compensaciones extremas.'
  }
];

export function NutritionEducationScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/nutrition');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expandedId, setExpandedId] = useState<Lesson['id'] | null>('protein');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a alimentación" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>
        <Text style={styles.title}>Comer para sostener tu entrenamiento</Text>
        <Text style={styles.description}>No necesitas hacerlo perfecto. Estas ideas te ayudan a tomar decisiones simples y sostenibles.</Text>

        <View style={styles.accordion}>
          {lessons.map((lesson) => {
            const expanded = lesson.id === expandedId;
            return (
              <View key={lesson.id} style={styles.item}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedId((current) => current === lesson.id ? null : lesson.id)}
                  style={({ pressed }) => [styles.itemButton, pressed && styles.pressed]}
                >
                  <View style={styles.itemCopy}>
                    <Text style={styles.itemTitle}>{lesson.title}</Text>
                    <Text style={styles.itemSummary}>{lesson.summary}</Text>
                  </View>
                  <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={24} color={colors.accent} />
                </Pressable>
                {expanded ? <Text style={styles.itemBody}>{lesson.body}</Text> : null}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
    backButton: { alignSelf: 'flex-start', minHeight: 48, justifyContent: 'center' },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 34, fontWeight: '700', letterSpacing: -0.8, lineHeight: 40, marginTop: spacing.xl },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
    accordion: { borderTopWidth: 1, borderTopColor: colors.line, marginTop: spacing.xl },
    item: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: spacing.md },
    itemButton: { alignItems: 'center', flexDirection: 'row', minHeight: 52 },
    itemCopy: { flex: 1, paddingRight: spacing.md },
    itemTitle: { color: colors.text, fontFamily: typography.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    itemSummary: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
    itemBody: { color: colors.text, fontFamily: typography.body, fontSize: 15, lineHeight: 23, paddingRight: spacing.md, paddingTop: spacing.sm },
    pressed: { opacity: 0.78 }
  });
}
