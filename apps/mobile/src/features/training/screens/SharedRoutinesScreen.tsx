import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { InfoNote } from '@/components/ui/InfoNote';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { describeSupabaseError } from '@/lib/supabaseErrors';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { useExerciseCatalog } from '../hooks/useExerciseCatalog';
import { createRoutine } from '../services/routineRepository';
import {
  buildRoutineInputFromShared,
  getSharedRoutine,
  listSharedRoutines,
  registerAdoption,
  SharedRoutineDetail,
  SharedRoutineSummary
} from '../services/sharedRoutineRepository';
import { MUSCLE_GROUP_LABELS, MuscleGroupSlug } from '../types/training';

type AdoptTarget = { shared: SharedRoutineDetail; group: MuscleGroupSlug | null };

export function SharedRoutinesScreen() {
  const router = useRouter();
  const goBack = useGoBack('/routines');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const catalog = useExerciseCatalog();
  const [routines, setRoutines] = useState<SharedRoutineSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<SharedRoutineDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [adoptTarget, setAdoptTarget] = useState<AdoptTarget | null>(null);
  const [isAdopting, setIsAdopting] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => () => { isMountedRef.current = false; }, []);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    void listSharedRoutines()
      .then((items) => { if (isMountedRef.current) setRoutines(items); })
      .catch((caught) => { if (isMountedRef.current) setError(describeSupabaseError(caught, 'No pudimos cargar las rutinas compartidas.')); })
      .finally(() => { if (isMountedRef.current) setIsLoading(false); });
  }, []);

  useEffect(load, [load]);

  const openDetail = useCallback((id: string) => {
    if (openId === id) { setOpenId(null); setDetail(null); return; }
    setOpenId(id);
    setDetail(null);
    setIsLoadingDetail(true);
    void getSharedRoutine(id)
      .then((loaded) => { if (isMountedRef.current) setDetail(loaded); })
      .catch((caught) => { if (isMountedRef.current) setError(describeSupabaseError(caught, 'No pudimos abrir esa rutina.')); })
      .finally(() => { if (isMountedRef.current) setIsLoadingDetail(false); });
  }, [openId]);

  const adopt = useCallback(async () => {
    if (!adoptTarget) return;
    const { shared, group } = adoptTarget;

    setIsAdopting(true);
    setError(null);
    try {
      const name = group
        ? `${MUSCLE_GROUP_LABELS[group]} de ${shared.name}`
        : `${shared.name} (copia)`;

      const routineId = await createRoutine(buildRoutineInputFromShared(shared, { name, onlyGroup: group }));
      // El contador es informativo: si falla, la copia ya está hecha.
      await registerAdoption(shared.id).catch(() => undefined);

      if (isMountedRef.current) {
        setAdoptTarget(null);
        router.push(`/routine-builder?routineId=${routineId}`);
      }
    } catch (caught) {
      if (isMountedRef.current) setError(describeSupabaseError(caught, 'No pudimos copiar la rutina.'));
    } finally {
      if (isMountedRef.current) setIsAdopting(false);
    }
  }, [adoptTarget, router]);

  const groupsIn = (shared: SharedRoutineDetail): MuscleGroupSlug[] =>
    [...new Set(shared.exercises.map((item) => item.muscleGroup))];

  const nameOf = (exerciseId: string) =>
    catalog.exercises.find((exercise) => exercise.id === exerciseId)?.name ?? 'Ejercicio';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Eyebrow>Guías</Eyebrow>
        <Text style={styles.title}>Rutinas de otros</Text>
        <Text style={styles.description}>
          Para mirar cómo entrena otra gente y coger ideas. Puedes copiar la rutina entera o
          solo un grupo muscular.
        </Text>

        <InfoNote label="¿Me conviene seguir la rutina de otra persona?">
          Como guía, sí. Como calco, con cuidado: la misma rutina produce resultados muy
          distintos según la persona. En el estudio más grande que lo midió, 585 personas
          hicieron el mismo programa y los cambios fueron desde perder un 2% hasta ganar un
          59%. Cógelo como punto de partida y ajústalo a lo que tú puedas sostener.
        </InfoNote>

        {error ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={load} style={styles.textButton}>
              <Text style={styles.textButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {isLoading ? (
          <ActivityIndicator accessibilityLabel="Cargando rutinas" color={colors.accent} style={styles.loader} />
        ) : routines.length === 0 ? (
          <Card style={styles.block}>
            <Text style={styles.emptyText}>
              Todavía no hay ninguna rutina publicada. Puedes publicar la tuya desde "Tus rutinas".
            </Text>
          </Card>
        ) : (
          routines.map((routine) => {
            const isOpen = openId === routine.id;

            return (
              <Card key={routine.id} style={styles.block}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  onPress={() => openDetail(routine.id)}
                  style={styles.header}
                >
                  <View style={styles.headerText}>
                    <View style={styles.tagRow}>
                      {routine.isCurated ? (
                        <View style={styles.tag}><Text style={styles.tagText}>Del equipo</Text></View>
                      ) : null}
                      {routine.isMine ? (
                        <View style={styles.tag}><Text style={styles.tagText}>Tuya</Text></View>
                      ) : null}
                      <Text style={styles.adopts}>
                        {routine.adoptCount === 1 ? '1 copia' : `${routine.adoptCount} copias`}
                      </Text>
                    </View>

                    <Text style={styles.routineName}>{routine.name}</Text>

                    {/* Nunca "La rutina de X": eso afirmaría un hecho que no podemos
                        comprobar. Siempre atribución + fuente. */}
                    {routine.attributedTo ? (
                      <Text style={styles.attribution}>
                        Atribuida a {routine.attributedTo} · según {routine.sourceNote}
                      </Text>
                    ) : null}

                    <Text style={styles.routineMeta}>
                      {routine.daysPerWeek === 1 ? '1 día' : `${routine.daysPerWeek} días`} por semana
                    </Text>
                    {routine.summary ? <Text style={styles.summary}>{routine.summary}</Text> : null}
                  </View>
                  <Text style={styles.chevron}>{isOpen ? '−' : '+'}</Text>
                </Pressable>

                {isOpen ? (
                  isLoadingDetail ? (
                    <ActivityIndicator color={colors.accent} style={styles.loader} />
                  ) : detail ? (
                    <View style={styles.detail}>
                      {detail.days.map((day) => {
                        const items = detail.exercises.filter((item) => item.dayIndex === day.dayIndex);
                        return (
                          <View key={day.dayIndex} style={styles.dayBlock}>
                            <Eyebrow>{`Día ${day.dayIndex} · ${day.name}`}</Eyebrow>
                            {items.map((item) => (
                              <Text key={`${item.dayIndex}-${item.position}`} style={styles.exerciseLine}>
                                {nameOf(item.exerciseId)} · {item.targetSets} series
                              </Text>
                            ))}
                          </View>
                        );
                      })}

                      <PrimaryButton
                        label="Copiar la rutina entera"
                        icon="check"
                        onPress={() => setAdoptTarget({ shared: detail, group: null })}
                        style={styles.adoptButton}
                      />

                      <Text style={styles.fieldLabel}>O copia solo un grupo muscular</Text>
                      <View style={styles.chipRow}>
                        {groupsIn(detail).map((group) => (
                          <Pressable
                            key={group}
                            accessibilityRole="button"
                            accessibilityLabel={`Copiar solo ${MUSCLE_GROUP_LABELS[group]}`}
                            onPress={() => setAdoptTarget({ shared: detail, group })}
                            style={styles.groupChip}
                          >
                            <Text style={styles.groupChipText}>{MUSCLE_GROUP_LABELS[group]}</Text>
                          </Pressable>
                        ))}
                      </View>

                      {detail.sourceUrl ? <Text style={styles.source}>Fuente: {detail.sourceUrl}</Text> : null}
                    </View>
                  ) : (
                    <Text style={styles.emptyText}>No pudimos cargar el detalle.</Text>
                  )
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>

      <AdoptWarning
        target={adoptTarget}
        isBusy={isAdopting}
        onConfirm={() => void adopt()}
        onCancel={() => setAdoptTarget(null)}
        styles={styles}
        colors={colors}
      />
    </SafeAreaView>
  );
}

/**
 * El aviso antes de copiar.
 *
 * El texto es deliberadamente distinto de lo que se suele decir. "No cambies de rutina
 * porque perjudica tus ganancias" **es falso**: los tres ensayos que lo midieron
 * (Baz-Valle 2019, Fonseca 2014, Kassiano 2024) encuentran hipertrofia equivalente
 * rotando ejercicios o manteniéndolos, y Baz-Valle además midió que variar **subió** la
 * motivación. Tampoco existe ninguna cifra publicada de "mantén el programa X semanas".
 *
 * Lo que sí está respaldado es un argumento de medición: con ~8% de crecimiento en 13
 * semanas y errores de medida de hasta el 20%, cambiarlo todo a la vez deja al usuario
 * sin forma de saber si progresa. Eso es lo que dice el aviso.
 */
function AdoptWarning({
  target,
  isBusy,
  onConfirm,
  onCancel,
  styles,
  colors
}: {
  target: AdoptTarget | null;
  isBusy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
}) {
  if (!target) return null;
  const isPartial = Boolean(target.group);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onCancel}>
      <Pressable accessibilityRole="button" accessibilityLabel="Cancelar" onPress={onCancel} style={styles.backdrop} />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <ScrollView contentContainerStyle={styles.sheetBody} showsVerticalScrollIndicator={false}>
          <View style={styles.warnIcon}>
            <Icon name="info" color={colors.warning} size={26} />
          </View>

          <Text style={styles.sheetTitle}>Antes de copiarla</Text>

          <Text style={styles.warnText}>
            {isPartial
              ? `Vas a copiar solo los ejercicios de ${MUSCLE_GROUP_LABELS[target.group as MuscleGroupSlug]}. Se creará como una rutina nueva; la tuya actual no se toca.`
              : 'Se creará como una rutina nueva. La tuya actual no se toca.'}
          </Text>

          <Text style={styles.warnText}>
            Cambiar de rutina no arruina tus resultados —eso se repite mucho y no es lo que
            dicen los estudios— pero cambiarlo todo a la vez sí te deja sin referencia:
            si estrenas ejercicios y series el mismo día, no vas a poder saber qué te
            estaba funcionando.
          </Text>

          <Text style={styles.warnStrong}>
            Dale al menos 8 semanas antes de volver a cambiar.
          </Text>

          <InfoNote label="¿De dónde sale esto?">
            Los tres ensayos que lo han medido encuentran el mismo crecimiento rotando
            ejercicios o manteniéndolos, y uno de ellos midió que variar aumenta la
            motivación. Así que cambiar no es el problema. El problema es medir: en unas 13
            semanas se espera un 8% de crecimiento, y el error de las mediciones puede
            llegar al 20%. En pocas semanas estarías leyendo ruido, no progreso. Además,
            buena parte de lo que sube en la barra al estrenar un ejercicio es aprenderlo:
            en un estudio clásico el peso levantado subió un 200% mientras la fuerza real
            solo subía un 15-20%.
          </InfoNote>

          <PrimaryButton
            label={isPartial ? 'Copiar este grupo' : 'Copiar la rutina'}
            icon="check"
            loading={isBusy}
            onPress={onConfirm}
            style={styles.adoptButton}
          />
          <Pressable accessibilityRole="button" onPress={onCancel} style={styles.textButton}>
            <Text style={styles.mutedButtonText}>Mejor no</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { ...type.screenTitle, color: colors.text, marginTop: spacing.sm },
    description: { ...type.body, color: colors.textMuted, marginBottom: spacing.sm, marginTop: spacing.sm },
    block: { marginTop: spacing.md },
    loader: { alignSelf: 'flex-start', marginTop: spacing.md },
    emptyText: { ...type.small, color: colors.textMuted },

    header: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
    headerText: { flexShrink: 1, gap: 3, minWidth: 0 },
    tagRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
    tag: { backgroundColor: colors.accentSoft, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
    tagText: { ...type.eyebrow, color: colors.accent },
    adopts: { ...type.small, color: colors.textMuted },
    routineName: { ...type.sectionTitle, color: colors.text },
    attribution: { ...type.small, color: colors.textMuted, fontStyle: 'italic' },
    routineMeta: { ...type.small, color: colors.textMuted },
    summary: { ...type.small, color: colors.text, marginTop: spacing.xs },
    chevron: { color: colors.accent, fontFamily: typography.display, fontSize: 24, fontWeight: '800' },

    detail: { gap: spacing.sm, marginTop: spacing.md },
    dayBlock: { borderTopColor: colors.line, borderTopWidth: 1, gap: 2, paddingTop: spacing.sm },
    exerciseLine: { ...type.small, color: colors.text },
    adoptButton: { marginTop: spacing.md },
    fieldLabel: { color: colors.textMuted, fontFamily: typography.body, fontSize: 13, fontWeight: '700', marginTop: spacing.md },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
    groupChip: { borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: spacing.md },
    groupChipText: { ...type.small, color: colors.text, fontWeight: '600' },
    source: { ...type.small, color: colors.textMuted, fontStyle: 'italic', marginTop: spacing.sm },

    banner: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
    bannerText: { ...type.small, color: colors.text },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    mutedButtonText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },

    backdrop: { backgroundColor: 'rgba(0,0,0,0.45)', bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      bottom: 0,
      left: 0,
      maxHeight: '86%',
      position: 'absolute',
      right: 0
    },
    grabber: { alignSelf: 'center', backgroundColor: colors.line, borderRadius: 3, height: 5, marginTop: spacing.sm, width: 44 },
    sheetBody: { gap: spacing.sm, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    warnIcon: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.warningSoft, borderRadius: 22, height: 44, justifyContent: 'center', width: 44 },
    sheetTitle: { ...type.sectionTitle, color: colors.text },
    warnText: { ...type.body, color: colors.text, fontSize: 15, lineHeight: 22 },
    warnStrong: { ...type.body, color: colors.accent, fontSize: 15, fontWeight: '700', lineHeight: 22 }
  });
}
