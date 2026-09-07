import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, equipmentIcon } from '@/components/ui/Icon';
import { InfoNote } from '@/components/ui/InfoNote';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { equipmentLabels, exercisesForGroupByLevel } from '../services/exerciseCatalog';
import { suitsLevel, useKnowledgeLevel } from '../hooks/useKnowledgeLevel';
import {
  DIFFICULTY_LABELS,
  DIFFICULTY_NOTES,
  EVIDENCE_EXPLANATIONS,
  EVIDENCE_LABELS,
  ExerciseEquipment,
  MUSCLE_GROUP_LABELS,
  MuscleGroupSlug,
  TrainingExercise
} from '../types/training';

type ExerciseSwapSheetProps = {
  visible: boolean;
  /** El grupo desde el que se abrió. Es el filtro inicial, no una restricción. */
  group: MuscleGroupSlug;
  catalog: TrainingExercise[];
  selectedExerciseId: string | null;
  catalogError?: string | null;
  /**
   * Ejercicios que no se pueden elegir acá — hoy, los que ya están en este mismo día de
   * la rutina. Se muestran igual (buscarlos y no encontrarlos sería más confuso), pero
   * sin poder tocarlos y con el motivo en una línea.
   */
  disabledExerciseIds?: Set<string>;
  disabledReason?: string;
  onSelect: (exercise: TrainingExercise) => void;
  onClose: () => void;
};

type MuscleFilter = MuscleGroupSlug | 'all';
type EquipmentSelection = ExerciseEquipment | 'all';

const MUSCLE_ORDER: MuscleGroupSlug[] = [
  'pecho', 'espalda', 'hombros', 'biceps', 'triceps', 'antebrazo',
  'abs', 'cuadriceps', 'femorales', 'gluteos', 'pantorrilla', 'cardio'
];

const EQUIPMENT_ORDER: ExerciseEquipment[] = ['machine', 'cable', 'barbell', 'dumbbell', 'bodyweight', 'other'];

/**
 * Elegir un ejercicio del catálogo.
 *
 * Buscador arriba, dos filtros —músculo y equipamiento— que abren su propia hoja, y una
 * lista donde cada fila cabe de un vistazo. Todo el contexto (por qué lo recomendamos,
 * qué respaldo tiene, qué agarre usar) vive detrás del icono de información, para que
 * la lista se lea rápido y quien quiera profundizar pueda.
 */
export function ExerciseSwapSheet({
  visible,
  group,
  catalog,
  selectedExerciseId,
  catalogError = null,
  disabledExerciseIds,
  disabledReason,
  onSelect,
  onClose
}: ExerciseSwapSheetProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { level } = useKnowledgeLevel();

  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<MuscleFilter>(group);
  const [equipment, setEquipment] = useState<EquipmentSelection>('all');
  const [openPicker, setOpenPicker] = useState<'muscle' | 'equipment' | null>(null);
  const [detailFor, setDetailFor] = useState<TrainingExercise | null>(null);

  const suits = (exercise: TrainingExercise) => suitsLevel(exercise.difficulty, level);

  /** Base: el grupo elegido, o todo el catálogo ordenado grupo a grupo. */
  const base = useMemo(() => {
    if (muscle !== 'all') return exercisesForGroupByLevel(catalog, muscle, suits);
    return MUSCLE_ORDER.flatMap((slug) => exercisesForGroupByLevel(catalog, slug, suits));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, muscle, level]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return base.filter((exercise) => {
      if (equipment !== 'all' && exercise.equipment !== equipment) return false;
      if (!needle) return true;
      // Se busca también por músculo para que "gemelo" encuentre las elevaciones de talón.
      return `${exercise.name} ${exercise.muscleGroup}`.toLowerCase().includes(needle);
    });
  }, [base, equipment, query]);

  const firstUnsuitedId = useMemo(
    () => results.find((exercise) => !suits(exercise))?.id ?? null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results, level]
  );

  const muscleLabel = muscle === 'all' ? 'Todos los músculos' : MUSCLE_GROUP_LABELS[muscle];
  const equipmentLabel = equipment === 'all' ? 'Equipamiento' : equipmentLabels[equipment];

  const countFor = (value: EquipmentSelection) =>
    value === 'all' ? base.length : base.filter((exercise) => exercise.equipment === value).length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Volver" onPress={onClose} style={styles.headerButton}>
            <Icon name="arrowLeft" color={colors.text} size={22} />
          </Pressable>
          <Text style={styles.headerTitle}>Elegir ejercicio</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchRow}>
          <Icon name="search" color={colors.textMuted} size={19} />
          <TextInput
            accessibilityLabel="Buscar ejercicio"
            onChangeText={setQuery}
            placeholder="Buscar ejercicio"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={query}
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Borrar búsqueda" onPress={() => setQuery('')} style={styles.clear}>
              <Text style={styles.clearText}>Borrar</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          <FilterButton
            label={muscleLabel}
            isActive={muscle !== 'all'}
            onPress={() => setOpenPicker('muscle')}
            styles={styles}
            colors={colors}
          />
          <FilterButton
            label={equipmentLabel}
            isActive={equipment !== 'all'}
            onPress={() => setOpenPicker('equipment')}
            styles={styles}
            colors={colors}
          />
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {results.length === 0 ? (
            <Text style={styles.empty}>
              {catalogError
                ? catalogError
                : catalog.length === 0
                  ? 'El catálogo de ejercicios no cargó. Corre npx supabase db push y vuelve a entrar.'
                  : query.trim()
                    ? `Ningún ejercicio coincide con "${query.trim()}".`
                    : 'No hay ejercicios con esos filtros. Prueba con otro equipamiento.'}
            </Text>
          ) : null}

          {results.map((exercise) => {
            const isSelected = exercise.id === selectedExerciseId;
            const isDisabled = Boolean(disabledExerciseIds?.has(exercise.id)) && !isSelected;

            return (
              <View key={exercise.id}>
                {/* Lo que pide más técnica va al final, con una línea que lo explica.
                    No se esconde: quien empieza puede querer verlo igual. */}
                {exercise.id === firstUnsuitedId ? (
                  <Text style={styles.divider}>
                    {level === 'none'
                      ? 'Estos piden más técnica. Puedes hacerlos, pero mejor con alguien que te corrija al principio.'
                      : 'Estos piden más técnica o que alguien te asegure.'}
                  </Text>
                ) : null}

                <View style={[styles.row, isSelected && styles.rowOn]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected, disabled: isDisabled }}
                    accessibilityLabel={`${exercise.name}. ${exercise.muscleGroup}. ${DIFFICULTY_LABELS[exercise.difficulty]}${isDisabled && disabledReason ? `. ${disabledReason}` : ''}`}
                    disabled={isDisabled}
                    onPress={() => onSelect(exercise)}
                    style={({ pressed }) => [styles.rowMain, isDisabled && styles.rowMainDisabled, pressed && !isDisabled && styles.pressed]}
                  >
                    <View style={styles.avatar}>
                      <Icon name={equipmentIcon(exercise.equipment)} color={colors.accent} size={24} />
                    </View>

                    <View style={styles.rowText}>
                      <Text style={[styles.rowName, isSelected && styles.rowNameOn]} numberOfLines={2}>
                        {exercise.name}
                      </Text>
                      <Text style={styles.rowMeta} numberOfLines={1}>
                        {equipmentLabels[exercise.equipment]} · {DIFFICULTY_LABELS[exercise.difficulty]}
                      </Text>
                      {isDisabled && disabledReason ? (
                        <Text style={styles.rowDisabledReason} numberOfLines={1}>{disabledReason}</Text>
                      ) : (
                        <Text style={styles.rowMuscles} numberOfLines={1}>{exercise.muscleGroup}</Text>
                      )}
                    </View>

                    {isSelected ? <Icon name="check" color={colors.accent} size={20} /> : null}
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Información sobre ${exercise.name}`}
                    onPress={() => setDetailFor(exercise)}
                    style={styles.infoButton}
                  >
                    <Icon name="info" color={colors.textMuted} size={21} />
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      <OptionPicker
        visible={openPicker === 'muscle'}
        title="Grupo muscular"
        options={[
          { value: 'all', label: 'Todos los músculos', count: null },
          ...MUSCLE_ORDER.map((slug) => ({
            value: slug,
            label: MUSCLE_GROUP_LABELS[slug],
            count: catalog.filter((exercise) => exercise.group === slug).length
          }))
        ]}
        selected={muscle}
        onSelect={(value) => { setMuscle(value as MuscleFilter); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
        styles={styles}
        colors={colors}
      />

      <OptionPicker
        visible={openPicker === 'equipment'}
        title="Equipamiento"
        options={[
          { value: 'all', label: 'Todo el equipamiento', count: countFor('all') },
          ...EQUIPMENT_ORDER.map((value) => ({ value, label: equipmentLabels[value], count: countFor(value) }))
            // Una opción que no da resultados es peor que no ofrecerla.
            .filter((option) => option.count > 0)
        ]}
        selected={equipment}
        onSelect={(value) => { setEquipment(value as EquipmentSelection); setOpenPicker(null); }}
        onClose={() => setOpenPicker(null)}
        styles={styles}
        colors={colors}
      />

      <ExerciseDetail exercise={detailFor} onClose={() => setDetailFor(null)} styles={styles} colors={colors} />
    </Modal>
  );
}

function FilterButton({
  label,
  isActive,
  onPress,
  styles,
  colors
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Filtrar por ${label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.filterButton, isActive && styles.filterButtonOn, pressed && styles.pressed]}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextOn]} numberOfLines={1}>
        {label}
      </Text>
      <Icon name="chevronDown" color={isActive ? colors.accent : colors.textMuted} size={16} />
    </Pressable>
  );
}

function OptionPicker({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
  styles,
  colors
}: {
  visible: boolean;
  title: string;
  options: { value: string; label: string; count: number | null }[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>{title}</Text>
        <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
          {options.map((option) => {
            const isOn = option.value === selected;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="button"
                accessibilityState={{ selected: isOn }}
                onPress={() => onSelect(option.value)}
                style={({ pressed }) => [styles.sheetRow, isOn && styles.sheetRowOn, pressed && styles.pressed]}
              >
                <Text style={[styles.sheetRowText, isOn && styles.sheetRowTextOn]}>{option.label}</Text>
                {option.count !== null ? <Text style={styles.sheetCount}>{option.count}</Text> : null}
                {isOn ? <Icon name="check" color={colors.accent} size={19} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

function ExerciseDetail({
  exercise,
  onClose,
  styles,
  colors
}: {
  exercise: TrainingExercise | null;
  onClose: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  if (!exercise) return null;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.detailName}>{exercise.name}</Text>
          <Text style={styles.rowMeta}>
            {equipmentLabels[exercise.equipment]} · {exercise.isCompound ? 'Compuesto' : 'Aislamiento'} ·{' '}
            {DIFFICULTY_LABELS[exercise.difficulty]}
          </Text>

          <Eyebrow color={colors.accent} style={styles.detailHeading}>Cómo se hace</Eyebrow>
          {exercise.instructions.map((step, index) => (
            <View key={`${exercise.id}-step-${index}`} style={styles.step}>
              <View style={styles.stepBullet}>
                <Text style={styles.stepNumber}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          <View style={styles.detailNotes}>
            {exercise.evidenceNote ? (
              <InfoNote label="¿Por qué este ejercicio?" source={exercise.evidenceSource}>
                {exercise.evidenceNote}
              </InfoNote>
            ) : null}

            <InfoNote label={`¿Qué respaldo tiene? · ${EVIDENCE_LABELS[exercise.evidenceLevel]}`}>
              {EVIDENCE_EXPLANATIONS[exercise.evidenceLevel]}
            </InfoNote>

            <InfoNote label={`¿${DIFFICULTY_LABELS[exercise.difficulty]}?`}>
              {DIFFICULTY_NOTES[exercise.difficulty]}
            </InfoNote>

            {exercise.gripOptions.length > 0 ? (
              <InfoNote label="¿Qué agarre uso?">
                {exercise.gripOptions.map((grip) => `${grip.name}: ${grip.note}`).join('\n\n')}
              </InfoNote>
            ) : null}
          </View>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailClose}>
            <Text style={styles.detailCloseText}>Cerrar</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { backgroundColor: colors.background, flex: 1 },

    header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.md },
    headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
    headerTitle: { ...type.cardTitle, color: colors.text },

    searchRow: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderRadius: radii.md,
      borderWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      marginHorizontal: spacing.lg,
      minHeight: 48,
      paddingHorizontal: spacing.md
    },
    searchInput: { color: colors.text, flex: 1, fontFamily: typography.body, fontSize: 16, height: 46, minWidth: 0 },
    clear: { justifyContent: 'center', minHeight: 44, paddingLeft: spacing.sm },
    clearText: { ...type.small, color: colors.accent, fontWeight: '700' },

    filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    filterButton: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderRadius: radii.md,
      borderWidth: 1,
      flex: 1,
      flexDirection: 'row',
      gap: spacing.xs,
      justifyContent: 'center',
      minHeight: 48,
      minWidth: 0,
      paddingHorizontal: spacing.md
    },
    filterButtonOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
    filterButtonText: { ...type.small, color: colors.textMuted, flexShrink: 1, fontWeight: '600' },
    filterButtonTextOn: { color: colors.accent },

    list: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
    empty: { ...type.body, color: colors.textMuted, paddingVertical: spacing.lg },
    divider: { ...type.small, color: colors.textMuted, paddingBottom: spacing.sm, paddingTop: spacing.lg },

    row: { alignItems: 'center', borderBottomColor: colors.line, borderBottomWidth: 1, flexDirection: 'row' },
    rowOn: { backgroundColor: colors.accentSoft, borderBottomColor: colors.accentSoft, borderRadius: radii.sm },
    rowMain: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: spacing.md, minHeight: 76, minWidth: 0, paddingVertical: spacing.sm },
    rowMainDisabled: { opacity: 0.45 },
    avatar: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.line,
      borderRadius: 26,
      borderWidth: 1,
      height: 52,
      justifyContent: 'center',
      width: 52
    },
    rowText: { flex: 1, gap: 1, minWidth: 0 },
    rowName: { ...type.body, color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 21 },
    rowNameOn: { color: colors.accent },
    rowMeta: { ...type.small, color: colors.textMuted },
    rowMuscles: { ...type.small, color: colors.textMuted, fontSize: 12 },
    rowDisabledReason: { ...type.small, color: colors.warning, fontSize: 12 },
    infoButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 44 },

    backdrop: { backgroundColor: 'rgba(0,0,0,0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      bottom: 0,
      left: 0,
      maxHeight: '82%',
      paddingBottom: spacing.xl,
      position: 'absolute',
      right: 0
    },
    grabber: { alignSelf: 'center', backgroundColor: colors.line, borderRadius: 3, height: 5, marginTop: spacing.sm, width: 44 },
    sheetTitle: { ...type.cardTitle, color: colors.text, paddingBottom: spacing.sm, paddingTop: spacing.md, textAlign: 'center' },
    sheetList: { paddingBottom: spacing.md },
    sheetRow: {
      alignItems: 'center',
      borderTopColor: colors.line,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: spacing.md,
      minHeight: 56,
      paddingHorizontal: spacing.lg
    },
    sheetRowOn: { backgroundColor: colors.accentSoft },
    sheetRowText: { ...type.body, color: colors.text, flex: 1, minWidth: 0 },
    sheetRowTextOn: { color: colors.accent, fontWeight: '700' },
    sheetCount: { ...type.small, color: colors.textMuted, fontVariant: ['tabular-nums'] },

    detailBody: { gap: spacing.xs, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    detailName: { ...type.sectionTitle, color: colors.text },
    detailHeading: { marginTop: spacing.md },
    step: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    stepBullet: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 11, height: 22, justifyContent: 'center', marginTop: 1, width: 22 },
    stepNumber: { color: colors.surface, fontFamily: typography.display, fontSize: 12, fontWeight: '800' },
    stepText: { ...type.body, color: colors.text, flex: 1, fontSize: 15, lineHeight: 22, minWidth: 0 },
    detailNotes: { marginTop: spacing.md },
    detailClose: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', marginTop: spacing.md, minHeight: 48 },
    detailCloseText: { ...type.body, color: colors.accent, fontWeight: '700' },

    pressed: { opacity: 0.78 }
  });
}
