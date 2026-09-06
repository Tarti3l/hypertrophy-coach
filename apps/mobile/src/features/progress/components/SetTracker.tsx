import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';

import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { WorkoutSetDraft } from '../types/workoutSession';

/**
 * Rango objetivo de las series efectivas.
 *
 * Ojo con el porqué, que no es el que se suele contar: NO hay evidencia de que haga
 * falta un mínimo de 8 repeticiones para hipertrofiar. Schoenfeld et al. (2021)
 * concluyen que se crece de forma similar en todo el espectro por encima de ~30 % 1RM
 * —de ~5 a 30+ reps— siempre que el esfuerzo sea alto.
 *
 * El suelo de 8 es una decisión de la app para principiantes: por debajo de 8 el peso
 * obliga a una técnica que un novato aún no controla, y el riesgo sube sin que el
 * estímulo mejore. El techo de 12 es lo que dispara el aviso de subir peso.
 */
const MIN_REPS = 8;
const REP_CEILING = 12;
/** Salto más pequeño que se puede montar con discos normales (2 × 1,25 kg). */
const WEIGHT_STEP = 2.5;

type SetTrackerProps = {
  sets: WorkoutSetDraft[];
  previousPerformance: string;
  disabled?: boolean;
  /**
   * false en ejercicios de peso corporal: ahí el peso es opcional (lastre) y exigirlo
   * bloquearía al usuario en unas flexiones.
   */
  requiresWeight?: boolean;
  /** Repeticiones a las que apuntar, si la rutina o el catálogo las fijan. */
  targetReps?: number | null;
  onUpdateSet: (setNumber: number, field: 'weightKg' | 'repetitions', value: string) => void;
  onToggleComplete: (setNumber: number) => void;
  /** Quita o devuelve la serie de calentamiento de este ejercicio. */
  onToggleWarmup?: () => void;
};

export function SetTracker({
  sets,
  previousPerformance,
  disabled = false,
  requiresWeight = true,
  targetReps = null,
  onUpdateSet,
  onToggleComplete,
  onToggleWarmup
}: SetTrackerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  /**
   * Explicación del rango efectivo, una sola vez por ejercicio: al cerrar la PRIMERA
   * serie efectiva, sin importar cuántas reps hizo. Antes aparecía en cada serie que
   * llegaba a 12, que en la práctica era casi todas (el arrastre copia el valor hacia
   * abajo) — un socio nuevo no necesita que se lo repitan tres veces por ejercicio.
   */
  const [guidance, setGuidance] = useState<{ setNumber: number; reps: number } | null>(null);
  /** Solo se pregunta "¿te costó?" cuando esa primera serie llegó a 12: por debajo no aplica. */
  const [repVerdict, setRepVerdict] = useState<{ setNumber: number; couldDoMore: boolean } | null>(null);

  const effectiveSets = sets.filter((set) => set.kind === 'effective');
  const completedEffective = effectiveSets.filter((set) => set.completed).length;
  const hasWarmup = sets.some((set) => set.kind === 'warmup');

  const handleToggle = (set: WorkoutSetDraft) => {
    const isCompleting = !set.completed;
    // Antes de togglear: cuántas series efectivas ya estaban completas. Si es la
    // primera vez que completamos una serie efectiva de este ejercicio, corresponde
    // la explicación; en la segunda y la tercera, no.
    const wasFirstEffective = set.kind === 'effective' && completedEffective === 0;
    onToggleComplete(set.setNumber);

    if (!isCompleting) {
      if (guidance?.setNumber === set.setNumber) setGuidance(null);
      if (repVerdict?.setNumber === set.setNumber) setRepVerdict(null);
      return;
    }

    const reps = Number(set.repetitions.trim());
    if (wasFirstEffective && Number.isInteger(reps)) {
      setGuidance({ setNumber: set.setNumber, reps });
      setRepVerdict(null);
    }
  };

  /** Sube el peso de las series que aún no se han hecho. La actual ya está cerrada. */
  const bumpRemainingWeight = (fromSetNumber: number, currentWeight: number) => {
    const next = currentWeight + WEIGHT_STEP;
    const text = Number.isInteger(next) ? String(next) : next.toFixed(1).replace('.', ',');
    for (const set of sets) {
      if (set.kind !== 'effective' || set.setNumber <= fromSetNumber || set.completed) continue;
      onUpdateSet(set.setNumber, 'weightKg', text);
    }
    setGuidance(null);
    setRepVerdict(null);
  };

  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Registra tus series</Text>
          <Text style={styles.progress}>{completedEffective} de {effectiveSets.length}</Text>
        </View>
        <Text style={styles.previous}>
          Anterior: {previousPerformance}
          {targetReps ? `  ·  Apunta a ${targetReps} reps` : `  ·  Apunta a ${MIN_REPS}-${REP_CEILING} reps`}
        </Text>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.columnLabel, styles.seriesColumn]}>Nº</Text>
        <Text style={[styles.columnLabel, styles.inputColumn]}>{requiresWeight ? 'Peso' : 'Lastre'}</Text>
        <Text style={[styles.columnLabel, styles.inputColumn]}>Reps</Text>
        <View style={styles.actionColumn} />
      </View>

      {!hasWarmup && onToggleWarmup && !disabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Añadir una serie de calentamiento antes de las series al fallo"
          onPress={onToggleWarmup}
          style={({ pressed }) => [styles.warmupToggleRow, pressed && styles.pressed]}
        >
          <Text style={styles.warmupToggleText}>+ Añadir serie de calentamiento</Text>
        </Pressable>
      ) : null}

      {sets.map((set, index) => {
        const isFirstPending = sets.findIndex((item) => !item.completed) === index;
        const isWarmup = set.kind === 'warmup';
        const firstEffective = !isWarmup && sets.findIndex((item) => item.kind === 'effective') === index;

        const trimmedWeight = set.weightKg.trim();
        const weight = Number(trimmedWeight.replace(',', '.'));
        const repetitions = Number(set.repetitions.trim());

        // Antes bastaba con las repeticiones: Number('') es 0, que es finito y >= 0,
        // así que un peso vacío se guardaba como 0 kg sin avisar. Ese 0 luego
        // envenenaba la sugerencia de progresión ("la última vez hiciste 10 con 0 kg").
        const hasWeight = trimmedWeight.length > 0 && Number.isFinite(weight) && weight >= 0;
        const hasReps = Number.isInteger(repetitions) && repetitions > 0;
        const canComplete = hasReps && (hasWeight || !requiresWeight);

        const isBlocked = disabled || (!canComplete && !set.completed);
        const missing = !hasReps
          ? 'Escribe las repeticiones para marcarla'
          : requiresWeight && !hasWeight
            ? 'Escribe el peso para marcarla'
            : null;

        // El suelo de 8 avisa, no bloquea: fallar en la 7 de la última serie es normal,
        // y bloquear ahí sería castigar justo el esfuerzo que se pide.
        const belowFloor = !isWarmup && hasReps && repetitions < MIN_REPS;

        const showGuidance = guidance?.setNumber === set.setNumber;
        const guidanceReachedCeiling = showGuidance && guidance.reps >= REP_CEILING;
        const showVerdict = repVerdict?.setNumber === set.setNumber;

        return (
          <View key={set.id}>
            {isWarmup ? (
              <View style={styles.bandRow}>
                <Text style={[styles.band, styles.bandWarmup]}>Calentamiento</Text>
                {onToggleWarmup && !set.completed && !disabled ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Saltar el calentamiento e ir directo a las series al fallo"
                    onPress={onToggleWarmup}
                    style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.skipText}>Saltar</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {firstEffective ? (
              <View style={styles.bandRow}>
                <Text style={[styles.band, styles.bandEffective]}>
                  Al fallo · {effectiveSets.length} {effectiveSets.length === 1 ? 'serie' : 'series'}
                </Text>
              </View>
            ) : null}

            <View style={[styles.setRow, isWarmup && styles.setRowWarmup, set.completed && styles.setRowComplete]}>
              <Text style={[styles.setNumber, styles.seriesColumn, isWarmup && styles.setNumberWarmup]}>
                {set.setNumber}
              </Text>
              <View style={styles.inputColumn}>
                <TextInput
                  accessibilityLabel={`${requiresWeight ? 'Peso' : 'Lastre'} en kg, serie ${set.setNumber}${isWarmup ? ', calentamiento' : ''}`}
                  value={set.weightKg}
                  onChangeText={(value) => onUpdateSet(set.setNumber, 'weightKg', value)}
                  keyboardType="numeric"
                  inputMode="decimal"
                  editable={!set.completed && !disabled}
                  placeholder={requiresWeight ? 'kg' : 'opcional'}
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <View style={styles.inputColumn}>
                <TextInput
                  accessibilityLabel={`Repeticiones, serie ${set.setNumber}`}
                  value={set.repetitions}
                  onChangeText={(value) => onUpdateSet(set.setNumber, 'repetitions', value)}
                  keyboardType="numeric"
                  inputMode="numeric"
                  editable={!set.completed && !disabled}
                  placeholder="reps"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                />
              </View>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityLabel={`Completar serie ${set.setNumber}`}
                accessibilityHint={missing ?? undefined}
                accessibilityState={{ checked: set.completed, disabled: isBlocked }}
                disabled={isBlocked}
                onPress={() => handleToggle(set)}
                style={({ pressed }) => [
                  styles.completeButton,
                  set.completed && styles.completeButtonDone,
                  isBlocked && styles.completeButtonDisabled,
                  pressed && styles.pressed
                ]}
              >
                <Text style={[styles.completeText, set.completed && styles.completeTextDone]}>
                  {set.completed ? 'Lista' : 'Hecha'}
                </Text>
              </Pressable>
            </View>

            {/* Un botón gris que no responde y no dice por qué es la forma más rápida
                de que alguien piense que la app está rota. */}
            {missing && isFirstPending && !disabled ? <Text style={styles.hint}>{missing}</Text> : null}

            {belowFloor && !showGuidance && !showVerdict ? (
              <Text style={styles.hintWarn}>
                {repetitions} reps. Si no llegas a {MIN_REPS}, baja el peso: con menos la técnica se rompe
                antes de que el músculo se canse.
              </Text>
            ) : null}

            {showGuidance ? (
              <View style={styles.prompt}>
                <Text style={styles.promptTitle}>Cuántas repeticiones buscar</Text>
                <Text style={styles.promptBody}>Entre {MIN_REPS} y {REP_CEILING} por serie.</Text>
                <Text style={styles.promptBody}>
                  Si llegas a {REP_CEILING} y sientes que podías hacer más, el peso está bajo: súbelo en la
                  próxima serie.
                </Text>
                {guidanceReachedCeiling ? (
                  <>
                    <Text style={styles.promptBody}>¿Esta serie te costó?</Text>
                    <View style={styles.promptActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { setRepVerdict({ setNumber: set.setNumber, couldDoMore: false }); setGuidance(null); }}
                        style={({ pressed }) => [styles.promptButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.promptButtonText}>Me costó</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => { setRepVerdict({ setNumber: set.setNumber, couldDoMore: true }); setGuidance(null); }}
                        style={({ pressed }) => [styles.promptButton, styles.promptButtonAlt, pressed && styles.pressed]}
                      >
                        <Text style={[styles.promptButtonText, styles.promptButtonTextAlt]}>Podía hacer más</Text>
                      </Pressable>
                    </View>
                  </>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setGuidance(null)}
                    style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
                  >
                    <Text style={styles.dismissText}>Entendido</Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            {showVerdict ? (
              <View style={[styles.prompt, repVerdict.couldDoMore ? styles.promptWarn : null]}>
                <Text style={styles.promptTitle}>
                  {repVerdict.couldDoMore ? 'Sube el peso' : 'Bien, mantén ese peso'}
                </Text>
                <Text style={styles.promptBody}>
                  {repVerdict.couldDoMore
                    ? `Si pasas de ${REP_CEILING} sin que cueste, la serie se queda lejos del fallo y el estímulo se pierde. Sube en la siguiente.`
                    : `Perfecto. Cuando llegar a ${REP_CEILING} deje de costarte, ahí toca subir.`}
                </Text>
                {repVerdict.couldDoMore && requiresWeight && hasWeight && weight > 0 ? (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => bumpRemainingWeight(set.setNumber, weight)}
                    style={({ pressed }) => [styles.promptButton, styles.promptButtonAlt, pressed && styles.pressed]}
                  >
                    <Text style={[styles.promptButtonText, styles.promptButtonTextAlt]}>
                      +{String(WEIGHT_STEP).replace('.', ',')} kg en las siguientes
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setRepVerdict(null)}
                  style={({ pressed }) => [styles.dismiss, pressed && styles.pressed]}
                >
                  <Text style={styles.dismissText}>Entendido</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { paddingBottom: spacing.md },
    headerRow: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    title: { ...type.sectionTitle, color: colors.text, flexShrink: 1, minWidth: 0 },
    progress: { ...type.small, color: colors.accent, fontWeight: '700', fontVariant: ['tabular-nums'] },
    previous: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.xs },
    tableHeader: { alignItems: 'center', flexDirection: 'row', minHeight: 34, paddingHorizontal: spacing.sm },
    columnLabel: { ...type.eyebrow, color: colors.textMuted },
    seriesColumn: { width: 38 },
    inputColumn: { flex: 1, minWidth: 0 },
    actionColumn: { width: 64 },

    // La banda separa el calentamiento de las series que sí cuentan. Sin ella, cuatro
    // filas idénticas hacen pensar que todas se hacen igual de fuerte.
    bandRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between', marginBottom: spacing.xs, paddingHorizontal: spacing.sm },
    band: { ...type.eyebrow, borderRadius: radii.pill, overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 3 },
    bandWarmup: { backgroundColor: colors.warningSoft, color: colors.warning },
    bandEffective: { backgroundColor: colors.accentSoft, color: colors.accent },
    skipButton: { alignItems: 'center', height: 32, justifyContent: 'center', paddingHorizontal: spacing.sm },
    skipText: { ...type.small, color: colors.accent, fontWeight: '700' },
    warmupToggleRow: { alignItems: 'center', height: 40, justifyContent: 'center', marginBottom: spacing.sm },
    warmupToggleText: { ...type.small, color: colors.accent, fontWeight: '700' },

    setRow: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, flexDirection: 'row', marginBottom: spacing.sm, minHeight: 60, paddingHorizontal: spacing.sm },
    setRowWarmup: { borderStyle: 'dashed' },
    setRowComplete: { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
    setNumber: { color: colors.text, fontFamily: typography.display, fontSize: 17, fontWeight: '800' },
    setNumberWarmup: { color: colors.textMuted },
    input: { color: colors.text, fontFamily: typography.body, fontSize: 16, height: 44, paddingHorizontal: 0 },
    // 44 de alto: es el control que más se pulsa de la app, y con las manos sudadas.
    completeButton: { alignItems: 'center', borderColor: colors.line, borderRadius: 10, borderWidth: 1, height: 44, justifyContent: 'center', width: 64 },
    completeButtonDone: { backgroundColor: colors.accent, borderColor: colors.accent },
    completeButtonDisabled: { opacity: 0.45 },
    completeText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, fontWeight: '700' },
    completeTextDone: { color: colors.surface },

    hint: { ...type.small, color: colors.textMuted, marginBottom: spacing.sm, marginTop: -spacing.xs, paddingHorizontal: spacing.sm },
    hintWarn: { ...type.small, color: colors.warning, marginBottom: spacing.sm, marginTop: -spacing.xs, paddingHorizontal: spacing.sm },

    prompt: { backgroundColor: colors.accentSoft, borderRadius: radii.md, gap: spacing.sm, marginBottom: spacing.sm, padding: spacing.md },
    promptWarn: { backgroundColor: colors.warningSoft },
    promptTitle: { ...type.sectionTitle, color: colors.text },
    promptBody: { color: colors.text, fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
    promptActions: { flexDirection: 'row', gap: spacing.sm },
    promptButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.line, borderRadius: 10, borderWidth: 1, flexGrow: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
    promptButtonAlt: { backgroundColor: colors.accent, borderColor: colors.accent },
    promptButtonText: { color: colors.text, fontFamily: typography.body, fontSize: 14, fontWeight: '700', textAlign: 'center' },
    promptButtonTextAlt: { color: colors.surface },
    dismiss: { alignItems: 'center', height: 36, justifyContent: 'center' },
    dismissText: { ...type.small, color: colors.textMuted, fontWeight: '700' },

    pressed: { opacity: 0.78 }
  });
}
