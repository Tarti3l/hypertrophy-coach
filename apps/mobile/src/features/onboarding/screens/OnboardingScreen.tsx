import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceField } from '../components/ChoiceField';
import { MacroSummary } from '../components/MacroSummary';
import { WheelPicker } from '../components/WheelPicker';
import { useOnboarding } from '../hooks/useOnboarding';
import { BiologicalSex, KnowledgeLevel } from '../types/onboarding';
import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

/**
 * THESIS: A calm interview turns unfamiliar body data into one clear next step, not a dashboard.
 * OWN-WORLD: Paper-like neutral surfaces, deep leaf tint, hairline dividers, generous native spacing.
 * STORY: A beginner answers only what is needed, sees an explainable starting estimate, and saves it.
 * FIRST VIEWPORT: Title and short context lead; the next single input group fills the comfortable reading area.
 * FORM: Quiet coaching flow, grounded direction 3, seed 6e7f0b22.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */

const stepCopy = [
  {
    title: 'Tu punto de partida',
    description: 'Con tres datos creamos una estimación inicial. La ajustarás con tu progreso.'
  },
  {
    title: 'Tu semana real',
    description: 'No buscamos el plan perfecto. Buscamos uno que puedas repetir.'
  },
  {
    title: 'Lo que quieres construir',
    description: 'Cuéntanos desde dónde partes y qué te gustaría conseguir.'
  },
  {
    title: 'Tu primera referencia',
    description: 'Úsala como punto de partida durante dos semanas y observa cómo respondes.'
  }
];

export function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const {
    step,
    totalSteps,
    form,
    errors,
    macroPlan,
    isSaving,
    isCompleted,
    saveError,
    update,
    goNext,
    goBack,
    complete
  } = useOnboarding();

  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const content = stepCopy[step];
  const isResult = step === totalSteps - 1;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.topbar}>
            {step > 0 ? (
              <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={goBack} style={styles.backButton}>
                <Text style={styles.backText}>Volver</Text>
              </Pressable>
            ) : <View style={styles.backSpacer} />}
            <Text accessibilityLabel={`Paso ${step + 1} de ${totalSteps}`} style={styles.stepText}>{step + 1} / {totalSteps}</Text>
          </View>
          <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: totalSteps, now: step + 1 }} style={styles.progressTrack}>
            <View style={[styles.progressValue, { width: `${((step + 1) / totalSteps) * 100}%` }]} />
          </View>

          <View style={styles.headingBlock}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.description}>{content.description}</Text>
          </View>

          <View style={styles.formArea}>
            {step === 0 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.hint}>Desliza cada rueda hasta tu dato. No tiene que ser exacto.</Text>
                <View style={styles.wheelRow}>
                  <WheelPicker label="Edad" unit="años" min={14} max={100} initial={25} value={form.age} onChange={(value) => update('age', value)} error={errors.age} />
                  <View style={styles.wheelGap} />
                  <WheelPicker label="Estatura" unit="cm" min={120} max={230} initial={170} value={form.heightCm} onChange={(value) => update('heightCm', value)} error={errors.heightCm} />
                  <View style={styles.wheelGap} />
                  <WheelPicker label="Peso" unit="kg" min={35} max={300} initial={70} value={form.weightKg} onChange={(value) => update('weightKg', value)} error={errors.weightKg} />
                </View>
                <View style={styles.separator} />
                <Text style={styles.sectionLabel}>Dato opcional para afinar la estimación</Text>
                <ChoiceField<BiologicalSex>
                  accessibilityLabel="Sexo asignado al nacer"
                  value={form.biologicalSex}
                  onChange={(value) => update('biologicalSex', value)}
                  options={[
                    { label: 'Mujer', value: 'female' },
                    { label: 'Hombre', value: 'male' },
                    { label: 'Prefiero no indicarlo', value: 'unspecified', description: 'Usaremos una estimación intermedia.' }
                  ]}
                />
              </View>
            ) : null}

            {step === 1 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>¿Cuántos días puedes entrenar normalmente?</Text>
                <ChoiceField<number>
                  accessibilityLabel="Días de entrenamiento semanales"
                  value={form.trainingDaysPerWeek}
                  onChange={(value) => update('trainingDaysPerWeek', value)}
                  options={[1, 2, 3, 4, 5].map((day) => ({ label: `${day} ${day === 1 ? 'día' : 'días'} por semana`, value: day }))}
                />
                <Text style={styles.hint}>Elige tu semana habitual, no tu semana ideal.</Text>
              </View>
            ) : null}

            {step === 2 ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.sectionLabel}>¿Qué tanto conoces del entrenamiento de fuerza?</Text>
                <ChoiceField<KnowledgeLevel>
                  accessibilityLabel="Nivel de conocimiento previo"
                  value={form.knowledgeLevel}
                  onChange={(value) => update('knowledgeLevel', value)}
                  options={[
                    { label: 'Estoy empezando desde cero', value: 'none', description: 'Nunca he seguido una rutina de fuerza.' },
                    { label: 'Conozco lo básico', value: 'basic', description: 'He entrenado alguna vez, pero sin una estructura clara.' },
                    { label: 'Ya tengo algo de experiencia', value: 'experienced', description: 'Busco ordenar mis fundamentos y ser constante.' }
                  ]}
                />
                {errors.knowledgeLevel ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.knowledgeLevel}</Text> : null}
                <View style={styles.separator} />
                <Text style={styles.sectionLabel}>Meta a corto plazo</Text>
                <TextInput
                  accessibilityLabel="Meta a corto plazo"
                  value={form.shortTermGoal}
                  onChangeText={(value) => update('shortTermGoal', value)}
                  placeholder="Ej. entrenar 3 días por semana durante 8 semanas"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.textArea, errors.shortTermGoal && styles.textAreaError]}
                />
                {errors.shortTermGoal ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.shortTermGoal}</Text> : null}
                <Text style={styles.sectionLabel}>Meta a largo plazo</Text>
                <TextInput
                  accessibilityLabel="Meta a largo plazo"
                  value={form.longTermGoal}
                  onChangeText={(value) => update('longTermGoal', value)}
                  placeholder="Ej. ganar fuerza y masa muscular de forma sostenible"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  textAlignVertical="top"
                  style={[styles.textArea, errors.longTermGoal && styles.textAreaError]}
                />
                {errors.longTermGoal ? <Text accessibilityLiveRegion="polite" style={styles.error}>{errors.longTermGoal}</Text> : null}
              </View>
            ) : null}

            {isResult && macroPlan ? (
              <View>
                <MacroSummary plan={macroPlan} />
                <View style={styles.note}>
                  <Text style={styles.noteText}>Esta cifra parte de tu información actual y un superávit moderado. No sustituye asesoramiento médico o nutricional. La revisaremos cuando tengas dos semanas de registros.</Text>
                </View>
                {isCompleted ? <Text accessibilityLiveRegion="polite" style={styles.success}>Punto de partida guardado. Ya puedes empezar a entrenar.</Text> : null}
              </View>
            ) : null}
          </View>

          {saveError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{saveError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            // Una vez guardado el perfil, el guardian de rutas ya no redirige desde
            // /onboarding (onboardingCompleted pasa a true), asi que la salida a la app
            // tiene que ser explicita o la pantalla queda sin salida.
            onPress={isCompleted ? () => router.replace('/') : isResult ? complete : goNext}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, isSaving && styles.primaryButtonDisabled]}
          >
            <Text style={styles.primaryButtonText}>
              {isCompleted ? 'Ir a mi plan' : isResult ? (isSaving ? 'Guardando…' : 'Guardar mi punto de partida') : 'Continuar'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    topbar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { minWidth: 48, minHeight: 44, justifyContent: 'center' },
    backSpacer: { width: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    stepText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontVariant: ['tabular-nums'] },
    progressTrack: { height: 3, backgroundColor: colors.line, overflow: 'hidden', borderRadius: 2 },
    progressValue: { height: '100%', backgroundColor: colors.accent, borderRadius: 2 },
    headingBlock: { paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 36, fontWeight: '700', letterSpacing: -0.8, lineHeight: 42 },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 17, lineHeight: 25, marginTop: spacing.md, maxWidth: 390 },
    formArea: { flex: 1 },
    fieldGroup: { gap: spacing.md },
    row: { flexDirection: 'row' },
    wheelRow: { flexDirection: 'row', alignItems: 'flex-start' },
    wheelGap: { width: spacing.md },
    rowGap: { width: spacing.lg },
    separator: { height: 1, backgroundColor: colors.line, marginVertical: spacing.sm },
    sectionLabel: { color: colors.text, fontFamily: typography.body, fontSize: 16, fontWeight: '600', lineHeight: 23 },
    hint: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: spacing.sm },
    textArea: { minHeight: 92, borderBottomWidth: 1.5, borderBottomColor: colors.line, color: colors.text, fontFamily: typography.body, fontSize: 16, lineHeight: 23, paddingTop: spacing.sm, paddingBottom: spacing.sm },
    textAreaError: { borderBottomColor: colors.danger },
    note: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line, marginTop: spacing.xl, paddingVertical: spacing.md },
    noteText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 21 },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 18 },
    success: { color: colors.accent, fontFamily: typography.body, fontSize: 14, lineHeight: 21, marginTop: spacing.md },
    primaryButton: { minHeight: 52, backgroundColor: colors.accent, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl },
    primaryButtonPressed: { opacity: 0.82 },
    primaryButtonDisabled: { opacity: 0.56 },
    primaryButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 16, fontWeight: '700' }
  });
}
