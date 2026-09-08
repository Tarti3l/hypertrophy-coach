import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRoutines } from '@/features/training/hooks/useRoutines';
import { Card } from '@/components/ui/Card';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { useAuth } from '@/features/auth/AuthProvider';
import { images } from '@/theme/images';
import { gradient, palette, radii, scrim, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { StreakBadge } from '../components/StreakBadge';
import { WeeklyCalendar } from '../components/WeeklyCalendar';
import { usePendingWorkouts } from '../hooks/usePendingWorkouts';
import { useProgressSummary } from '../hooks/useProgressSummary';

/** Cuánto se muestra el festejo antes de desaparecer solo. */
const CELEBRATION_DURATION_MS = 5000;

/** Alto de la foto a sangre. Ver docs/diseno.md, sección 4. */
const HERO_HEIGHT = 372;

export function HomeScreen() {
  const router = useRouter();
  const { justFinished } = useLocalSearchParams<{ justFinished?: string }>();
  const { routines, isLoading: areRoutinesLoading, error: routinesError, reload: reloadRoutines } = useRoutines();
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  // La foto va a sangre por debajo de la barra de estado, así que el respeto del
  // notch lo hace el contenido del héroe y no un SafeAreaView que recortaría la imagen.
  const insets = useSafeAreaInsets();

  /**
   * Festejo temporal al volver de un entrenamiento recién terminado (ver
   * ActiveWorkoutScreen). No es un diálogo: no bloquea nada, desaparece solo y también
   * se puede cerrar a mano. El parámetro se limpia enseguida para que no vuelva a
   * aparecer si el socio navega de acá para allá dentro de Inicio.
   */
  const [showCelebration, setShowCelebration] = useState(false);
  useEffect(() => {
    if (!justFinished) return;
    setShowCelebration(true);
    router.setParams({ justFinished: undefined });
  }, [justFinished, router]);

  useEffect(() => {
    if (!showCelebration) return;
    const timer = setTimeout(() => setShowCelebration(false), CELEBRATION_DURATION_MS);
    return () => clearTimeout(timer);
  }, [showCelebration]);

  const { profileError, refreshProfile, signOut } = useAuth();
  const { completedDates, streakDays, isLoading, error, hasData, reload } = useProgressSummary();
  const { count: pendingCount, blockedCount } = usePendingWorkouts();

  const banner = profileError
    ? { message: profileError, retry: () => void refreshProfile() }
    : error
      ? { message: error, retry: reload }
      : null;

  // Nunca cargó ninguna rutina Y el intento falló: no es lo mismo que "el usuario no
  // tiene rutina". Sin esto, quedarse sin red mandaba a "Armar mi rutina" y el socio
  // terminaba creando una rutina duplicada en vez de simplemente reintentar.
  const routinesUnavailable = Boolean(routinesError) && routines.length === 0;
  const showProgressUnavailable = Boolean(error) && !hasData;

  const actionLabel = routinesUnavailable
    ? 'Reintentar'
    : routines.length === 0 && !areRoutinesLoading
      ? 'Armar mi rutina'
      : 'Empezar entrenamiento';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Foto a sangre. El velo arranca transparente y termina en negro: es lo que
            hace que el titular se lea sobre cualquier imagen, sin depender de que la
            foto traiga una zona oscura. */}
        <View style={styles.hero}>
          <Image source={images.inicio} style={styles.heroImage} resizeMode="cover" />
          <LinearGradient
            colors={scrim.hero.colors}
            locations={scrim.hero.locations}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={[styles.heroText, { paddingTop: insets.top + spacing.lg }]}>
            <Eyebrow color={colors.text}>{formatToday()}</Eyebrow>
            <Text style={styles.heroTitle}>Tu semana,{'\n'}a tu ritmo</Text>
          </View>
        </View>

        <View style={styles.body}>
          {/* La acción principal es el único bloque de color de la pantalla. */}
          <LinearGradient
            colors={gradient.activo.colors}
            start={gradient.activo.start}
            end={gradient.activo.end}
            style={styles.action}
          >
            <Eyebrow color={colors.onAccent}>Cuando quieras</Eyebrow>
            <Text style={styles.actionTitle}>Tu próxima sesión</Text>
            <Text style={styles.actionMeta}>
              {areRoutinesLoading
                ? 'Buscando tu rutina…'
                : routinesUnavailable
                  ? 'No pudimos comprobar tu rutina. Revisa tu conexión.'
                  : routines.length === 0
                    ? 'Todavía no tienes rutina. Te ayudamos a armar una en cinco pasos.'
                    : routines.length === 1
                      ? `Tienes "${routines[0].name}" lista para empezar.`
                      : 'Elige cuál de tus rutinas quieres hacer hoy.'}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={actionLabel}
              disabled={areRoutinesLoading}
              onPress={() => {
                // Sin datos por un fallo de red, reintentar; nunca ofrecer crear una rutina
                // duplicada solo porque no pudimos confirmar que ya tiene una.
                if (routinesUnavailable) { reloadRoutines(); return; }
                // Sin rutina, mandar a una lista vacía es un paso de más: va directo al
                // constructor. Con rutina, a la lista para elegir el día.
                router.push(routines.length === 0 ? '/routine-builder' : '/routines');
              }}
              style={({ pressed }) => [styles.actionButton, (pressed || areRoutinesLoading) && styles.pressed]}
            >
              <Text style={styles.actionButtonText}>{actionLabel}</Text>
            </Pressable>
          </LinearGradient>

          {showCelebration ? (
            <View accessibilityLiveRegion="polite" style={styles.celebration}>
              <Text style={styles.celebrationText}>¡Bien ahí! Entrenamiento registrado.</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cerrar aviso"
                onPress={() => setShowCelebration(false)}
                style={styles.celebrationClose}
              >
                <Text style={styles.celebrationCloseText}>Cerrar</Text>
              </Pressable>
            </View>
          ) : null}

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
            <StreakBadge streakDays={streakDays} isLoading={isLoading} unavailable={showProgressUnavailable} />
            <WeeklyCalendar completedDates={completedDates} unavailable={showProgressUnavailable} />

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
        </View>
      </ScrollView>
    </View>
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
    screen: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl },
    hero: { height: HERO_HEIGHT, justifyContent: 'flex-end' },
    heroImage: { height: '100%', position: 'absolute', width: '100%' },
    heroText: { gap: spacing.sm, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg },
    heroTitle: { ...type.hero, color: colors.text },
    body: { paddingHorizontal: spacing.lg },
    action: { borderRadius: radii.xl, gap: spacing.xs, marginTop: spacing.xs, padding: spacing.lg },
    actionTitle: { ...type.sectionTitle, color: colors.onAccent },
    actionMeta: { ...type.small, color: colors.onAccent, opacity: 0.88 },
    actionButton: { alignItems: 'center', backgroundColor: colors.onAccent, borderRadius: radii.pill, justifyContent: 'center', marginTop: spacing.md, minHeight: 52 },
    actionButtonText: { ...type.pill, color: colors.accentDeep },
    stack: { gap: spacing.md, marginTop: spacing.md },
    sectionTitle: { ...type.cardTitle, color: colors.text },
    sectionDescription: { ...type.small, color: colors.textMuted, marginTop: spacing.xs },
    outlineButton: { alignItems: 'center', borderColor: colors.line, borderRadius: radii.pill, borderWidth: 1, justifyContent: 'center', marginTop: spacing.md, minHeight: 48 },
    outlineButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    syncRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, minHeight: 44 },
    syncDot: { backgroundColor: colors.warning, borderRadius: radii.pill, height: 8, width: 8 },
    syncDotBlocked: { backgroundColor: colors.danger },
    syncText: { ...type.small, color: colors.textMuted, flex: 1 },
    syncAction: { color: colors.accent, fontFamily: typography.body, fontSize: 13, fontWeight: '700' },
    banner: { backgroundColor: colors.dangerSoft, borderRadius: radii.md, marginTop: spacing.md, padding: spacing.md },
    bannerText: { ...type.small, color: colors.text },
    celebration: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: radii.md,
      flexDirection: 'row',
      gap: spacing.sm,
      justifyContent: 'space-between',
      marginTop: spacing.md,
      padding: spacing.md
    },
    celebrationText: { ...type.small, color: colors.accent, flex: 1, fontWeight: '700', minWidth: 0 },
    celebrationClose: { justifyContent: 'center', minHeight: 32 },
    celebrationCloseText: { ...type.small, color: colors.accent, fontWeight: '700' },
    footer: { alignItems: 'flex-start', borderColor: colors.line, borderTopWidth: 1, gap: spacing.xs, marginTop: spacing.xl, paddingTop: spacing.md },
    textButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 44 },
    textButtonText: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    signOutText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.78 }
  });
}
