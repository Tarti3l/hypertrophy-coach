import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { ShortcutRow } from '../components/ShortcutRow';
import { getKcalRangeByTpcaCode, searchFoods } from '../services/foodRepository';
import { deleteShortcut, listShortcuts, saveShortcut } from '../services/foodShortcutRepository';
import { addMealEntry, getFrequentEntries } from '../services/mealLogRepository';
import {
  Food,
  FoodShortcut,
  FOOD_PREPARATION_LABELS,
  MealEntry,
  MealType,
  MEAL_TYPES,
  NewFoodShortcut,
  NewMealEntry,
  scaleFood
} from '../types/nutrition';

type Mode = 'buscar' | 'manual';

export function LogMealScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)/nutrition');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [mealType, setMealType] = useState<MealType>(defaultMealType());
  const [mode, setMode] = useState<Mode>('buscar');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Food[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selected, setSelected] = useState<Food | null>(null);
  const [portionId, setPortionId] = useState<string | null>(null);
  const [gramsText, setGramsText] = useState('');
  const [kcalRange, setKcalRange] = useState<{ min: number; max: number } | null>(null);

  const [frequent, setFrequent] = useState<MealEntry[]>([]);
  const [shortcuts, setShortcuts] = useState<FoodShortcut[]>([]);
  const [isSavingShortcut, setIsSavingShortcut] = useState(false);
  const [shortcutError, setShortcutError] = useState<string | null>(null);

  const [manualName, setManualName] = useState('');
  const [manualKcal, setManualKcal] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  useEffect(() => {
    void getFrequentEntries().then((items) => { if (isMountedRef.current) setFrequent(items); }).catch(() => undefined);
  }, []);

  // Nada de tragarse el error: si los atajos no cargan, hay que decir por qué.
  // Un fallo silencioso aquí se ve idéntico a "no tengo atajos".
  const reloadShortcuts = useCallback(() => {
    void listShortcuts()
      .then((items) => {
        if (!isMountedRef.current) return;
        setShortcuts(items);
        setShortcutError(null);
      })
      .catch((cause: unknown) => {
        if (isMountedRef.current) setShortcutError(describeShortcutError(cause));
      });
  }, []);

  useEffect(reloadShortcuts, [reloadShortcuts]);

  const persistShortcut = useCallback(async (shortcut: NewFoodShortcut, id?: string) => {
    setIsSavingShortcut(true);
    try {
      await saveShortcut(shortcut, id);
      reloadShortcuts();
    } catch (cause) {
      if (isMountedRef.current) setShortcutError(describeShortcutError(cause));
    } finally {
      if (isMountedRef.current) setIsSavingShortcut(false);
    }
  }, [reloadShortcuts]);


  // Búsqueda con retardo: sin esto se dispara una consulta por cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSearching(true);
      void searchFoods(term)
        .then((foods) => { if (isMountedRef.current) setResults(foods); })
        .catch(() => { if (isMountedRef.current) setError('No pudimos buscar alimentos. Revisa tu conexión.'); })
        .finally(() => { if (isMountedRef.current) setIsSearching(false); });
    }, 300);
    return () => clearTimeout(timer);
  }, [term]);

  function chooseFood(food: Food) {
    setSelected(food);
    setError(null);
    setKcalRange(null);
    const preferred = food.portions.find((portion) => portion.isDefault) ?? food.portions[0] ?? null;
    setPortionId(preferred?.id ?? null);
    setGramsText(preferred ? String(preferred.grams) : '100');

    void getKcalRangeByTpcaCode(food.tpcaCode)
      .then((range) => { if (isMountedRef.current) setKcalRange(range); })
      .catch(() => undefined);
  }

  const grams = Number(gramsText.replace(',', '.'));
  const gramsAreValid = Number.isFinite(grams) && grams > 0 && grams <= 3000;
  const preview = selected && gramsAreValid ? scaleFood(selected, grams) : null;
  const activePortion = selected?.portions.find((portion) => portion.id === portionId) ?? null;

  const save = useCallback(async (entry: NewMealEntry) => {
    setIsSaving(true);
    setError(null);
    try {
      await addMealEntry(entry);
      goBack();
    } catch {
      if (isMountedRef.current) setError('No pudimos guardar la comida. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  }, [router]);

  const useShortcut = useCallback((shortcut: FoodShortcut) => {
    void save({
      mealType,
      foodId: null,
      label: shortcut.servingLabel ? `${shortcut.name} (${shortcut.servingLabel})` : shortcut.name,
      quantityGrams: null,
      portionLabel: shortcut.servingLabel,
      energyKcal: shortcut.energyKcal,
      proteinG: shortcut.proteinG,
      carbsG: shortcut.carbsG,
      fatG: shortcut.fatG,
      preparation: null
    });
  }, [mealType, save]);

  function addFromCatalog() {
    if (!selected || !preview || !gramsAreValid) return;
    void save({
      mealType,
      foodId: selected.id,
      label: selected.name,
      quantityGrams: grams,
      // Si el usuario cambió los gramos a mano, la etiqueta de porción ya no describe lo que comió.
      portionLabel: activePortion && Math.abs(activePortion.grams - grams) < 0.5 ? activePortion.label : null,
      preparation: selected.preparation,
      // meal_entries exige un número (es historial, no catálogo): un macro que la fuente
      // no midió se guarda como 0, igual que ya hace el registro manual, pero el usuario
      // ya lo vio marcado como "no reportado" arriba, así que no es un 0 silencioso.
      energyKcal: preview.energyKcal ?? 0,
      proteinG: preview.proteinG ?? 0,
      carbsG: preview.carbsG ?? 0,
      fatG: preview.fatG ?? 0
    });
  }

  function addManual() {
    const kcal = Number(manualKcal.replace(',', '.'));
    const protein = Number(manualProtein.replace(',', '.'));
    const carbs = Number(manualCarbs.replace(',', '.'));
    const fat = Number(manualFat.replace(',', '.'));

    if (!manualName.trim()) { setError('Ponle un nombre a lo que comiste.'); return; }
    if (!Number.isFinite(kcal) || kcal < 0) { setError('Las calorías deben ser un número.'); return; }

    void save({
      mealType,
      foodId: null,
      label: manualName.trim(),
      quantityGrams: null,
      portionLabel: null,
      energyKcal: kcal,
      proteinG: Number.isFinite(protein) && protein >= 0 ? protein : 0,
      carbsG: Number.isFinite(carbs) && carbs >= 0 ? carbs : 0,
      fatG: Number.isFinite(fat) && fat >= 0 ? fat : 0,
      preparation: null
    });
  }

  function repeat(entry: MealEntry) {
    void save({
      mealType,
      foodId: null,
      label: entry.label,
      quantityGrams: entry.quantityGrams,
      portionLabel: entry.portionLabel,
      energyKcal: entry.energyKcal,
      proteinG: entry.proteinG,
      carbsG: entry.carbsG,
      fatG: entry.fatG,
      preparation: entry.preparation
    });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.title}>Registrar comida</Text>

        <View style={styles.chipRow}>
          {MEAL_TYPES.map((meal) => (
            <Pressable
              key={meal.value}
              accessibilityRole="button"
              accessibilityState={{ selected: meal.value === mealType }}
              onPress={() => setMealType(meal.value)}
              style={[styles.chip, meal.value === mealType && styles.chipOn]}
            >
              <Text style={[styles.chipText, meal.value === mealType && styles.chipTextOn]}>{meal.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.block}>
          <ShortcutRow
            shortcuts={shortcuts}
            isSaving={isSavingShortcut}
            mealLabel={MEAL_TYPES.find((meal) => meal.value === mealType)?.label ?? 'tu comida'}
            onUse={useShortcut}
            onSave={(shortcut, id) => void persistShortcut(shortcut, id)}
            onDelete={(id) => {
              void deleteShortcut(id)
                .then(reloadShortcuts)
                .catch((cause: unknown) => setShortcutError(describeShortcutError(cause)));
            }}
          />
          {shortcutError ? <Text accessibilityLiveRegion="polite" style={styles.error}>{shortcutError}</Text> : null}
        </View>

        {frequent.length > 0 ? (
          <Card style={styles.block}>
            <Eyebrow>Lo que más repites</Eyebrow>
            <View style={styles.chipRow}>
              {frequent.map((entry) => (
                <Pressable key={entry.id} accessibilityRole="button" onPress={() => repeat(entry)} style={styles.repeatChip}>
                  <Text style={styles.repeatText}>{entry.label}</Text>
                  <Text style={styles.repeatMeta}>{Math.round(entry.energyKcal)} kcal</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        ) : null}

        <View style={styles.modeRow}>
          {(['buscar', 'manual'] as Mode[]).map((option) => (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected: option === mode }}
              onPress={() => { setMode(option); setError(null); }}
              style={[styles.modeButton, option === mode && styles.modeButtonOn]}
            >
              <Text style={[styles.modeText, option === mode && styles.modeTextOn]}>
                {option === 'buscar' ? 'Buscar alimento' : 'Escribir a mano'}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'buscar' ? (
          <Card style={styles.block}>
            <TextInput
              accessibilityLabel="Buscar alimento"
              onChangeText={setTerm}
              placeholder="Arroz, pan, avena…"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={term}
            />

            {isSearching ? <ActivityIndicator color={colors.accent} style={styles.searching} /> : null}

            {!selected ? (
              results.length === 0 && !isSearching ? (
                <Text style={styles.hint}>No encontramos ese alimento. Puedes escribirlo a mano.</Text>
              ) : (
                results.map((food) => (
                  <Pressable key={food.id} accessibilityRole="button" onPress={() => chooseFood(food)} style={styles.resultRow}>
                    <Text style={styles.resultName}>{food.name}</Text>
                    <Text style={styles.resultMeta}>{formatKcal(food.energyKcal)} · {formatMacro(food.proteinG, 'proteína')} por 100 g</Text>
                    <View style={styles.metaPills}>
                      <Text style={styles.metaPill}>{FOOD_PREPARATION_LABELS[food.preparation]}</Text>
                    </View>
                  </Pressable>
                ))
              )
            ) : (
              <View style={styles.selection}>
                <Text style={styles.resultName}>{selected.name}</Text>
                <View style={styles.metaPills}>
                  <Text style={styles.metaPill}>{FOOD_PREPARATION_LABELS[selected.preparation]}</Text>
                </View>
                {kcalRange ? (
                  <Text style={styles.hint}>
                    Entre {Math.round(kcalRange.min)} y {Math.round(kcalRange.max)} kcal por 100 g según la preparación.
                  </Text>
                ) : null}

                {selected.portions.length > 0 ? (
                  <View style={styles.chipRow}>
                    {selected.portions.map((portion) => (
                      <Pressable
                        key={portion.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: portion.id === portionId }}
                        onPress={() => { setPortionId(portion.id); setGramsText(String(portion.grams)); }}
                        style={[styles.chip, portion.id === portionId && styles.chipOn]}
                      >
                        <Text style={[styles.chipText, portion.id === portionId && styles.chipTextOn]}>{portion.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                <Text style={styles.fieldLabel}>Cantidad en gramos</Text>
                <TextInput
                  accessibilityLabel="Cantidad en gramos"
                  inputMode="decimal"
                  keyboardType="numeric"
                  onChangeText={(value) => { setGramsText(value); setPortionId(null); }}
                  style={styles.input}
                  value={gramsText}
                />

                {preview ? (
                  <Text style={styles.preview}>
                    {formatKcal(preview.energyKcal)} · {formatMacro(preview.proteinG, 'proteína')} · {formatMacro(preview.carbsG, 'carbos')} · {formatMacro(preview.fatG, 'grasas')}
                  </Text>
                ) : (
                  <Text style={styles.hint}>Escribe una cantidad entre 1 y 3000 gramos.</Text>
                )}

                <Text style={styles.source}>Fuente: {selected.source}</Text>

                <PrimaryButton label="Añadir" onPress={addFromCatalog} disabled={!preview} loading={isSaving} style={styles.submit} />
                <Pressable accessibilityRole="button" onPress={() => setSelected(null)} style={styles.textButton}>
                  <Text style={styles.textButtonText}>Elegir otro alimento</Text>
                </Pressable>
              </View>
            )}
          </Card>
        ) : (
          <Card style={styles.block}>
            <Text style={styles.fieldLabel}>Qué comiste</Text>
            <TextInput accessibilityLabel="Qué comiste" onChangeText={setManualName} placeholder="Menú del almuerzo" placeholderTextColor={colors.textMuted} style={styles.input} value={manualName} />

            <Text style={styles.fieldLabel}>Calorías</Text>
            <TextInput accessibilityLabel="Calorías" inputMode="decimal" keyboardType="numeric" onChangeText={setManualKcal} placeholder="650" placeholderTextColor={colors.textMuted} style={styles.input} value={manualKcal} />

            <View style={styles.macroRow}>
              <View style={styles.macroField}>
                <Text style={styles.fieldLabel}>Proteína (g)</Text>
                <TextInput accessibilityLabel="Proteína en gramos" inputMode="decimal" keyboardType="numeric" onChangeText={setManualProtein} placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} value={manualProtein} />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.fieldLabel}>Carbos (g)</Text>
                <TextInput accessibilityLabel="Carbohidratos en gramos" inputMode="decimal" keyboardType="numeric" onChangeText={setManualCarbs} placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} value={manualCarbs} />
              </View>
              <View style={styles.macroField}>
                <Text style={styles.fieldLabel}>Grasas (g)</Text>
                <TextInput accessibilityLabel="Grasas en gramos" inputMode="decimal" keyboardType="numeric" onChangeText={setManualFat} placeholder="0" placeholderTextColor={colors.textMuted} style={styles.input} value={manualFat} />
              </View>
            </View>

            <Text style={styles.hint}>Si solo sabes las calorías, deja los macros en cero. Un registro incompleto es mejor que ninguno.</Text>
            <PrimaryButton label="Añadir" onPress={addManual} loading={isSaving} style={styles.submit} />
          </Card>
        )}

        {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * 42P01 = la tabla no existe: pasa cuando falta correr la migración, y sin este
 * mensaje el síntoma es idéntico a "guardé y no aparece".
 */
function describeShortcutError(cause: unknown): string {
  const code = typeof cause === 'object' && cause !== null && 'code' in cause
    ? String((cause as { code: unknown }).code ?? '')
    : '';

  if (code === '42P01') return 'Falta crear la tabla de atajos en la base de datos. Corre las migraciones pendientes con «npx supabase db push».';
  if (code === '42501' || code === 'PGRST301') return 'Tu sesión expiró. Vuelve a iniciar sesión para guardar atajos.';

  return 'No pudimos guardar el atajo. Revisa tu conexión e inténtalo de nuevo.';
}

// Un macro null es un dato que la fuente TPCA no midió, no un cero: mostrarlo como
// "no reportado" en vez de "0 g" evita que un socio crea que un alimento no tiene ese
// nutriente cuando en realidad nunca se lo midieron.
function formatMacro(value: number | null, label: string): string {
  return value === null ? `${label} no reportada` : `${value} g ${label}`;
}

function formatKcal(value: number | null): string {
  return value === null ? 'kcal no reportadas' : `${Math.round(value)} kcal`;
}

function defaultMealType(): MealType {
  const hour = new Date().getHours();
  if (hour < 11) return 'desayuno';
  if (hour < 16) return 'almuerzo';
  if (hour < 21) return 'cena';
  return 'snack';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginBottom: spacing.lg, marginTop: spacing.md },
    block: { marginTop: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    chip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    chipTextOn: { color: colors.accent },
    repeatChip: { borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, gap: 2, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    repeatText: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    repeatMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12 },
    modeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    modeButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flex: 1, justifyContent: 'center', minHeight: 46 },
    modeButtonOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    modeText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '700' },
    modeTextOn: { color: colors.accent },
    input: { borderBottomColor: colors.line, borderBottomWidth: 1.5, color: colors.text, fontFamily: typography.body, fontSize: 16, marginBottom: spacing.sm, minHeight: 46, paddingVertical: spacing.sm },
    searching: { alignSelf: 'flex-start', marginVertical: spacing.sm },
    resultRow: { borderColor: colors.line, borderTopWidth: 1, gap: 2, justifyContent: 'center', minHeight: 60, paddingVertical: spacing.sm },
    resultName: { color: colors.text, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    resultMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18 },
    metaPills: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
    metaPill: {
      ...type.label,
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderRadius: radii.pill,
      borderWidth: 1,
      color: colors.textLabel,
      overflow: 'hidden',
      paddingHorizontal: 12,
      paddingVertical: 7
    },
    selection: { gap: spacing.xs },
    fieldLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.sm },
    preview: { color: colors.accent, fontFamily: typography.body, fontSize: 14, fontWeight: '700', lineHeight: 20, marginTop: spacing.xs },
    source: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11, lineHeight: 16, marginTop: spacing.xs },
    macroRow: { flexDirection: 'row', gap: spacing.md },
    macroField: { flex: 1, minWidth: 0 },
    hint: { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
    submit: { marginTop: spacing.md },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md }
  });
}
