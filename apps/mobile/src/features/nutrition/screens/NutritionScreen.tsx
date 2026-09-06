import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getCompletedOnboarding } from '@/features/onboarding/services/onboardingStorage';
import { MacroPlan } from '@/features/onboarding/types/onboarding';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { PrimaryButton } from '@/components/ui/PrimaryButton';

import { HydrationTracker } from '../components/HydrationTracker';
import { MealList } from '../components/MealList';
import { useDailyNutrition } from '../hooks/useDailyNutrition';
import { useHydrationPlan } from '../hooks/useHydrationPlan';
import { deleteMealEntry } from '../services/mealLogRepository';
import { MacrosDashboard } from '../components/MacrosDashboard';

const fallbackPlan: MacroPlan = {
  calories: 2300,
  proteinGrams: 130,
  carbsGrams: 285,
  fatGrams: 64,
  estimatedBmr: 0,
  activityMultiplier: 0
};

export function NutritionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [macroPlan, setMacroPlan] = useState<MacroPlan>(fallbackPlan);
  const hydration = useHydrationPlan();
  const daily = useDailyNutrition();

  useFocusEffect(useCallback(() => {
    void getCompletedOnboarding()
      .then((onboarding) => setMacroPlan(onboarding?.macroPlan ?? fallbackPlan))
      .catch(() => setMacroPlan(fallbackPlan));
  }, []));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Eyebrow>Alimentación</Eyebrow>
        <Text style={styles.title}>Nutrición que acompaña tu progreso</Text>
        <Text style={styles.description}>Tu meta no es comer perfecto: es darle a tu cuerpo suficiente energía para entrenar y recuperarse.</Text>

        <View style={styles.dashboard}>
          <MacrosDashboard
            plan={macroPlan}
            consumed={daily.consumed}
            hasEntries={daily.entries.length > 0}
            hasLoaded={daily.hasLoaded}
            isLoading={daily.isLoading}
            error={daily.error}
            onRetry={daily.reload}
          />

          <PrimaryButton label="Registrar comida" onPress={() => router.push('/log-meal')} />

          <MealList
            entries={daily.entries}
            isInitialLoading={daily.isLoading && !daily.hasLoaded}
            error={daily.error}
            onDelete={(id) => { void deleteMealEntry(id).then(daily.reload).catch(() => undefined); }}
          />
          <HydrationTracker plan={hydration.plan} isLoading={hydration.isLoading} error={hydration.error} onRetry={hydration.reload} />
        </View>

        <View style={styles.educationSection}>
          <Text style={styles.educationTitle}>Guía rápida de alimentación</Text>
          <Text style={styles.educationDescription}>Proteínas, carbohidratos y flexibilidad explicados sin reglas rígidas.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/nutrition-education')} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
            <Text style={styles.outlineButtonText}>Abrir guía de nutrición</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    title: { ...type.screenTitle, color: colors.text },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
    dashboard: { marginTop: spacing.xl },
    educationSection: { borderTopWidth: 1, borderColor: colors.line, marginTop: spacing.xl, paddingTop: spacing.lg },
    educationTitle: { color: colors.text, fontFamily: typography.display, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
    educationDescription: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
    outlineButton: { alignItems: 'center', borderColor: colors.accent, borderRadius: 14, borderWidth: 1, justifyContent: 'center', minHeight: 50, marginTop: spacing.lg },
    outlineButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    pressed: { opacity: 0.78 }
  });
}
