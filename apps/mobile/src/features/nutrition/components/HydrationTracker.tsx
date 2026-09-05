import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, radii, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { useHydrationLog } from '../hooks/useHydrationLog';
import { formatLitres, formatVolume, HydrationPlan } from '../services/hydrationCalculator';

type HydrationTrackerProps = {
  plan: HydrationPlan | null;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
};

export function HydrationTracker({ plan, isLoading = false, error = null, onRetry }: HydrationTrackerProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { glasses: glassesDrank, setGlasses, isLoading: isLoadingLog, saveFailed } = useHydrationLog(
    plan?.glassSizeMl ?? 250,
    plan?.fromDrinksMl ?? 0
  );

  const targetGlasses = plan?.glasses ?? 0;
  const glassSizeMl = plan?.glassSizeMl ?? 0;
  const consumedMl = glassesDrank * glassSizeMl;
  const targetMl = plan?.fromDrinksMl ?? 0;
  const progress = targetMl > 0 ? Math.min(1, consumedMl / targetMl) : 0;
  const remainingMl = Math.max(0, targetMl - consumedMl);

  function selectGlass(index: number) {
    const selectedAmount = index + 1;
    setGlasses(glassesDrank === selectedAmount ? index : selectedAmount);
  }

  return (
    <Card>
      <View style={styles.header}>
        <Eyebrow>Agua</Eyebrow>
        {plan ? <Text style={styles.count}>{glassesDrank} de {targetGlasses} vasos</Text> : null}
      </View>

      {isLoading || isLoadingLog ? (
        <View style={styles.state}>
          <ActivityIndicator accessibilityLabel="Calculando tu objetivo de agua" color={colors.accent} />
        </View>
      ) : error ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>{error}</Text>
          {onRetry ? (
            <Pressable accessibilityRole="button" onPress={onRetry} style={styles.textButton}>
              <Text style={styles.textButtonText}>Reintentar</Text>
            </Pressable>
          ) : null}
        </View>
      ) : !plan ? (
        <View style={styles.state}>
          <Text style={styles.stateText}>Completa tu punto de partida y calculamos cuánta agua te corresponde.</Text>
        </View>
      ) : (
        <>
          <View accessibilityLiveRegion="polite" accessibilityLabel={`Llevas ${formatVolume(consumedMl)} de ${formatVolume(targetMl)}`} style={styles.counter}>
            <Text style={styles.consumed}>{formatVolume(consumedMl)}</Text>
            <Text style={styles.consumedTarget}>de {formatVolume(targetMl)}</Text>
          </View>

          <View style={styles.progressTrack}>
            <View style={[styles.progressValue, { width: `${progress * 100}%` }]} />
          </View>

          <Text style={styles.description}>
            {consumedMl === 0
              ? `Son ${targetGlasses} vasos de ${plan.glassSizeMl} ml. Toca uno cada vez que lo completes.`
              : remainingMl === 0
                ? 'Objetivo del día cumplido. Sigue bebiendo según tu sed.'
                : `Te faltan ${formatVolume(remainingMl)}.`}
          </Text>

          <View style={styles.glassGrid}>
            {Array.from({ length: targetGlasses }, (_, index) => {
              const filled = index < glassesDrank;
              return (
                <Pressable
                  key={index}
                  accessibilityRole="button"
                  accessibilityLabel={`Vaso ${index + 1} de ${targetGlasses}`}
                  accessibilityState={{ selected: filled }}
                  accessibilityHint={filled ? 'Toca para quitar este vaso y los siguientes.' : 'Toca para marcar este vaso y los anteriores.'}
                  onPress={() => selectGlass(index)}
                  style={({ pressed }) => [styles.glassButton, filled && styles.glassButtonFilled, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="cup-water" size={25} color={filled ? colors.surface : colors.accent} />
                </Pressable>
              );
            })}
          </View>

          {saveFailed ? (
            <Text accessibilityLiveRegion="polite" style={styles.saveWarning}>
              Lo marcamos aquí, pero no se pudo sincronizar. Se reintenta al volver a tocar un vaso.
            </Text>
          ) : null}

          <View style={styles.note}>
            <Text style={styles.noteText}>
              Los días que entrenas, suma {plan.trainingExtraGlasses} vasos más para reponer lo que pierdes por sudor.
            </Text>
            <Text style={styles.noteText}>
              Calculado con tu peso, edad y sexo sobre las guías de EFSA y las Academias Nacionales de EE. UU. Tu objetivo total es {formatLitres(plan.totalWaterMl)}: la diferencia la aportan los alimentos.
              {plan.cappedForSafety ? ' Está topado por seguridad; beber de más no aporta beneficio.' : ''}
            </Text>
          </View>
        </>
      )}
    </Card>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    header: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
    count: { ...type.small, color: colors.textMuted, fontVariant: ['tabular-nums'] },
    counter: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
    consumed: { ...type.metric, color: colors.accent, fontSize: 30 },
    consumedTarget: { ...type.small, color: colors.textMuted },
    progressTrack: { backgroundColor: colors.line, borderRadius: 2, height: 4, marginTop: spacing.sm, overflow: 'hidden' },
    progressValue: { backgroundColor: colors.accent, borderRadius: 2, height: '100%' },
    description: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    state: { alignItems: 'flex-start', gap: spacing.sm, paddingVertical: spacing.md },
    stateText: { ...type.small, color: colors.textMuted },
    textButton: { justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    glassGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    glassButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.sm, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
    glassButtonFilled: { backgroundColor: colors.accent, borderColor: colors.accent },
    saveWarning: { color: colors.warning, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
    note: { borderColor: colors.line, borderTopWidth: 1, gap: spacing.sm, marginTop: spacing.md, paddingTop: spacing.md },
    noteText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18 },
    pressed: { opacity: 0.78 }
  });
}
