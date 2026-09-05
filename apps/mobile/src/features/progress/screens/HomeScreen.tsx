import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRoutines } from '@/features/training/hooks/useRoutines';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { StreakBadge } from '../components/StreakBadge';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { usePendingWorkouts } from '../hooks/usePendingWorkouts';
import { useProgressSummary } from '../hooks/useProgressSummary';

export function HomeScreen() {
  const router = useRouter();
  const { routines, isLoading: areRoutinesLoading } = useRoutines();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { profileError, refreshProfile, signOut } = useAuth();
  const { completedDates, streakDays, isLoading, error, reload } = useProgressSummary();
  const { count: pendingCount, blockedCount } = usePendingWorkouts();

  const banner = profileError
    ? { message: profileError, retry: () => void refreshProfile() }
    : error
      ? { message: error, retry: reload }
      : null;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Eyebrow>{formatToday()}</Eyebrow>
          <Text style={styles.title}>Tu semana, a tu ritmo</Text>
        </View>

        {pendingCount > 0 ? (
          blockedCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Abre la lista de entrenamientos con problemas de sincronización"
              onPress={() => router.push('/sync-errors')}
              style={({ pressed }) => [styles.syncRow, pressed && styles.pressed]}
            >
              <View style={[styles.syncDot, styles.syncDotBlocked]} />
              <Text style={styles.syncText}>
                {blockedCount === 1 ? 'Un entrenamiento no pudo sincronizarse' : `${blockedCount} entrenamientos no pudieron sincronizarse`}. Sigue guardado en tu dispositivo.
              </Text>
              <Text style={styles.syncAction}>Ver</Text>
            </Pressable>
          ) : (
            <View accessibilityLiveRegion="polite" style={styles.syncRow}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>
                {pendingCount === 1 ? 'Un entrenamiento' : `${pendingCount} entrenamientos`} por sincronizar.
              </Text>
            </View>
          )
        ) : null}

        {banner ? (
          <View accessibilityLiveRegion="polite" style={styles.banner}>
            <Text style={styles.bannerText}>{banner.message}</Text>
            <Pressable accessibilityRole="button" onPress={banner.retry} style={styles.textButton}>
              <Text style={styles.textButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.stack}>
          <StreakBadge streakDays={streakDays} isLoading={isLoading} />
          <WeeklyCalendar completedDates={completedDates} />

          <Card tone="accent">
            <Eyebrow color={colors.accent}>Cuando quieras</Eyebrow>
            <Text style={styles.actionTitle}>Tu próxima sesión</Text>
            <Text style={styles.actionMeta}>
              {areRoutinesLoading
                ? 'Buscando tu rutina…'
                : routines.length === 0
                  ? 'Todavía no tienes rutina. Te ayudamos a armar una en cinco pasos.'
                  : routines.length === 1
                    ? `Tienes "${routines[0].name}" lista para empezar.`
                    : 'Elige cuál de tus rutinas quieres hacer hoy.'}
            </Text>
            <PrimaryButton
              label={routines.length === 0 && !areRoutinesLoading ? 'Armar mi rutina' : 'Empezar entrenamiento'}
              icon="arrowRight"
              disabled={areRoutinesLoading}
              // Sin rutina, mandar a una lista vacía es un paso de más: va directo al
              // constructor. Con rutina, a la lista para elegir el día.
              onPress={() => router.push(routines.length === 0 ? '/routine-builder' : '/routines')}
              style={styles.actionButton}
            />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Tu progreso</Text>
            <Text style={styles.sectionDescription}>Mira cómo evoluciona tu fuerza sin perseguir cambios de un día a otro.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/progress')} style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}>
              <Text style={styles.outlineButtonText}>Ver evolución de fuerza</Text>
            </Pressable>
          </Card>
        </View>

        <View style={styles.footer}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding')} style={styles.textButton}>
            <Text style={styles.textButtonText}>Revisar mi punto de partida</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.textButton}>
            <Text style={styles.signOutText}>Cerrar sesión</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** Intl no está garantizado en todos los runtimes de RN, de ahí el respaldo. */
function formatToday(): string {
  const today = new Date();
  try {
    return today.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  } catch {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    return `${days[today.getDay()]} ${today.getDate()} de ${months[today.getMonth()]}`;
  }
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    header: { gap: spacing.sm },
    title: { ...type.screenTitle, color: colors.text },
    stack: { gap: spacing.md, marginTop: spacing.xl },
    actionTitle: { ...type.sectionTitle, color: colors.text, marginTop: spacing.xs },
    actionMeta: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    actionButton: { marginTop: spacing.md },
    sectionTitle: { ...type.cardTitle, color: colors.text },
    sectionDescription: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    outlineButton: { alignItems: 'center', borderColor: colors.accent, borderRadius: 14, borderWidth: 1, justifyContent: 'center', marginTop: spacing.md, minHeight: 48 },
    outlineButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    syncRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, minHeight: 44 },
    syncDot: { backgroundColor: colors.warning, borderRadius: 4, height: 8, width: 8 },
    syncDotBlocked: { backgroundColor: colors.danger },
    syncText: { ...type.small, color: colors.textMuted, flex: 1 },
    syncAction: { color: colors.accent, fontFamily: typography.body, fontSize: 13, fontWeight: '700' },
    banner: { backgroundColor: colors.dangerSoft, borderRadius: 14, marginTop: spacing.md, padding: spacing.md },
    bannerText: { ...type.small, color: colors.text },
    footer: { alignItems: 'flex-start', borderColor: colors.line, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.xl, paddingTop: spacing.md },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    signOutText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.78 }
  });
}
