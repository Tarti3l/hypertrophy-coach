import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { useBodyWeightLog } from '../hooks/useBodyWeightLog';
import { deleteBodyWeight, saveBodyWeight } from '../services/bodyWeightRepository';
import {
  formatShortDate,
  isValidDateKey,
  localDateKey,
  MAX_WEIGHT_KG,
  MIN_WEIGHT_KG
} from '../types/bodyWeight';

export function MyWeightScreen() {
  const goBack = useGoBack('/(tabs)/nutrition');
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const chartWidth = Math.max(250, Math.min(width, 520) - spacing.lg * 2 - 48);

  const log = useBodyWeightLog();
  const [weightText, setWeightText] = useState('');
  const [dateKey, setDateKey] = useState(localDateKey());
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const today = localDateKey();
  const yesterday = localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  // Avisar antes de guardar, no después: la fecha ya registrada se corrige, no se duplica.
  const existingForDate = log.entries.find((entry) => entry.measuredOn === dateKey) ?? null;

  async function save() {
    const weight = Number(weightText.replace(',', '.'));

    if (!Number.isFinite(weight) || weight <= 0) {
      setError('Escribe tu peso en kilos, por ejemplo 72.5.');
      return;
    }
    if (weight < MIN_WEIGHT_KG || weight > MAX_WEIGHT_KG) {
      setError(`El peso debe estar entre ${MIN_WEIGHT_KG} y ${MAX_WEIGHT_KG} kg.`);
      return;
    }
    if (!isValidDateKey(dateKey)) {
      setError('La fecha va en formato AAAA-MM-DD, por ejemplo 2026-09-11.');
      return;
    }
    if (dateKey > today) {
      setError('No puedes registrar un peso con fecha futura.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await saveBodyWeight({ measuredOn: dateKey, weightKg: Math.round(weight * 10) / 10 });
      if (!isMountedRef.current) return;
      setWeightText('');
      setDateKey(today);
      log.reload();
    } catch {
      if (isMountedRef.current) setError('No pudimos guardar tu peso. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      if (isMountedRef.current) setIsSaving(false);
    }
  }

  // Del más viejo al más nuevo para el gráfico; la lista los muestra al revés.
  const points = log.entries.map((entry) => ({ value: entry.weightKg, label: formatShortDate(entry.measuredOn) }));
  const recentFirst = [...log.entries].reverse();
  const latest = recentFirst[0] ?? null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" accessibilityLabel="Volver a Alimentación" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Eyebrow>Alimentación</Eyebrow>
        <Text style={styles.title}>Mi peso</Text>
        <Text style={styles.description}>
          Anota tu peso cuando quieras. Esto no cambia tus metas de calorías ni de macros: es solo tu historial.
        </Text>

        <Card style={styles.block}>
          <Text style={styles.fieldLabel}>Peso en kilos</Text>
          <TextInput
            accessibilityLabel="Peso en kilos"
            inputMode="decimal"
            keyboardType="numeric"
            onChangeText={(value) => { setWeightText(value); setError(null); }}
            placeholder="72.5"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={weightText}
          />

          <Text style={styles.fieldLabel}>Fecha</Text>
          <View style={styles.chipRow}>
            {[{ key: today, label: 'Hoy' }, { key: yesterday, label: 'Ayer' }].map((option) => (
              <Pressable
                key={option.key}
                accessibilityRole="button"
                accessibilityState={{ selected: option.key === dateKey }}
                onPress={() => { setDateKey(option.key); setError(null); }}
                style={[styles.chip, option.key === dateKey && styles.chipOn]}
              >
                <Text style={[styles.chipText, option.key === dateKey && styles.chipTextOn]}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            accessibilityLabel="Fecha de la medición, formato año-mes-día"
            autoCapitalize="none"
            onChangeText={(value) => { setDateKey(value); setError(null); }}
            placeholder="2026-09-11"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={dateKey}
          />

          {existingForDate ? (
            <Text style={styles.hint}>
              Ya tienes {existingForDate.weightKg} kg anotados ese día. Al guardar se corrige ese registro, no se agrega otro.
            </Text>
          ) : null}

          <PrimaryButton label="Guardar peso" onPress={() => void save()} loading={isSaving} style={styles.submit} />
          {error ? <Text accessibilityLiveRegion="polite" style={styles.error}>{error}</Text> : null}
        </Card>

        <Card style={styles.block}>
          <Eyebrow>Tu evolución</Eyebrow>

          {log.error ? (
            <View accessibilityLiveRegion="polite">
              <Text style={styles.hint}>{log.error}</Text>
              <Pressable accessibilityRole="button" onPress={log.reload} style={styles.textButton}>
                <Text style={styles.textButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : log.isLoading && !log.hasLoaded ? (
            <View accessibilityLabel="Cargando tu historial de peso" style={styles.stateArea}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : points.length >= 2 ? (
            <View style={styles.chartArea}>
              <LineChart
                areaChart
                curved
                data={points}
                width={chartWidth}
                height={210}
                color={colors.accent}
                startFillColor={colors.accent}
                endFillColor={colors.accentSoft}
                startOpacity={0.18}
                endOpacity={0.02}
                thickness={3}
                dataPointsColor={colors.accent}
                dataPointsRadius={4}
                hideRules={false}
                rulesColor={colors.line}
                xAxisColor={colors.line}
                yAxisColor={colors.line}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                initialSpacing={8}
                endSpacing={8}
                noOfSections={4}
                yAxisLabelSuffix=" kg"
                yAxisOffset={Math.max(0, Math.floor(Math.min(...points.map((point) => point.value)) - 2))}
                disableScroll
              />
            </View>
          ) : (
            <Text style={styles.hint}>
              {points.length === 1
                ? `Tu primer registro: ${latest?.weightKg} kg. Con una medición más vas a ver la línea de tu evolución.`
                : 'Todavía no registraste ningún peso. El primero lo anotas acá arriba.'}
            </Text>
          )}

          {log.startingWeight ? (
            <Text style={styles.startingNote}>
              Al empezar declaraste {log.startingWeight.weightKg} kg
              {log.startingWeight.declaredOn && isValidDateKey(log.startingWeight.declaredOn.slice(0, 10))
                ? ` el ${formatShortDate(log.startingWeight.declaredOn.slice(0, 10))}`
                : ''}
              . Es el dato con el que se calcularon tus metas, no una medición, así que no entra en la evolución.
            </Text>
          ) : null}
        </Card>

        {recentFirst.length > 0 ? (
          <Card style={styles.block}>
            <Eyebrow>Tus registros</Eyebrow>
            {recentFirst.map((entry) => (
              <View key={entry.id} style={styles.row}>
                <View style={styles.rowMain}>
                  <Text style={styles.rowWeight}>{entry.weightKg} kg</Text>
                  <Text style={styles.rowDate}>
                    {formatShortDate(entry.measuredOn)}{entry.measuredOn === today ? ' · hoy' : ''}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Corregir el peso del ${formatShortDate(entry.measuredOn)}`}
                  onPress={() => {
                    setDateKey(entry.measuredOn);
                    setWeightText(String(entry.weightKg));
                    setError(null);
                  }}
                  style={styles.rowAction}
                >
                  <Text style={styles.rowActionText}>Corregir</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar el peso del ${formatShortDate(entry.measuredOn)}`}
                  onPress={() => { void deleteBodyWeight(entry.id).then(log.reload).catch(() => undefined); }}
                  style={styles.rowAction}
                >
                  <Text style={styles.rowActionText}>Quitar</Text>
                </Pressable>
              </View>
            ))}
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginTop: spacing.sm },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22, marginTop: spacing.md },
    block: { marginTop: spacing.lg },
    fieldLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.sm },
    input: { borderBottomColor: colors.line, borderBottomWidth: 1.5, color: colors.text, fontFamily: typography.body, fontSize: 16, marginBottom: spacing.sm, minHeight: 46, paddingVertical: spacing.sm },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    chip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
    chipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    chipText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, fontWeight: '600' },
    chipTextOn: { color: colors.accent },
    submit: { marginTop: spacing.md },
    stateArea: { alignItems: 'center', justifyContent: 'center', minHeight: 210 },
    chartArea: { marginTop: spacing.sm },
    axisText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 11 },
    hint: { ...type.small, color: colors.textMuted, marginTop: spacing.sm },
    startingNote: { ...type.small, borderColor: colors.line, borderTopWidth: 1, color: colors.textMuted, marginTop: spacing.md, paddingTop: spacing.md },
    row: { alignItems: 'center', borderColor: colors.line, borderTopWidth: 1, flexDirection: 'row', gap: spacing.sm, minHeight: 56, paddingVertical: spacing.sm },
    rowMain: { flex: 1, gap: 2, minWidth: 0 },
    rowWeight: { color: colors.text, fontFamily: typography.body, fontSize: 16, fontWeight: '700' },
    rowDate: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18 },
    rowAction: { justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.sm },
    rowActionText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700' },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    error: { color: colors.danger, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md }
  });
}
