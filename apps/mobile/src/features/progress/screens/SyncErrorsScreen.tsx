import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoBack } from '@/hooks/useGoBack';
import { useAuth } from '@/features/auth/AuthProvider';
import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

import { usePendingWorkouts } from '../hooks/usePendingWorkouts';
import { flushQueue } from '../hooks/useOfflineSync';
import { removeWorkout, retryWorkout } from '../services/offlineWorkoutQueue';
import { PendingWorkoutPayload } from '../types/workoutSession';

export function SyncErrorsScreen() {
  const router = useRouter();
  const goBack = useGoBack('/(tabs)');
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { user } = useAuth();
  const { pending } = usePendingWorkouts();
  const [busyClientId, setBusyClientId] = useState<string | null>(null);
  const [confirmingClientId, setConfirmingClientId] = useState<string | null>(null);

  const blocked = useMemo(() => pending.filter((item) => item.blocked), [pending]);

  const handleRetry = useCallback(async (clientId: string) => {
    setBusyClientId(clientId);
    setConfirmingClientId(null);
    try {
      await retryWorkout(clientId);
      // Reintento inmediato: el usuario está mirando la pantalla, esperar al backoff sería raro.
      if (user?.id) await flushQueue(user.id);
    } finally {
      setBusyClientId(null);
    }
  }, [user?.id]);

  const handleDiscard = useCallback(async (clientId: string) => {
    setBusyClientId(clientId);
    try {
      await removeWorkout(clientId);
    } finally {
      setBusyClientId(null);
      setConfirmingClientId(null);
    }
  }, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al inicio" onPress={goBack} style={styles.backButton}>
          <Text style={styles.backText}>Volver</Text>
        </Pressable>

        <Text style={styles.title}>Entrenamientos sin sincronizar</Text>
        <Text style={styles.description}>
          Estos entrenamientos están guardados en tu dispositivo, pero el servidor los rechazó. No se han perdido: puedes reintentar o descartarlos.
        </Text>

        {blocked.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No hay entrenamientos con problemas de sincronización.</Text>
          </View>
        ) : (
          blocked.map((item) => (
            <BlockedWorkoutCard
              key={item.workout.clientId}
              item={item}
              styles={styles}
              colors={colors}
              isBusy={busyClientId === item.workout.clientId}
              isConfirming={confirmingClientId === item.workout.clientId}
              onRetry={() => void handleRetry(item.workout.clientId)}
              onAskDiscard={() => setConfirmingClientId(item.workout.clientId)}
              onCancelDiscard={() => setConfirmingClientId(null)}
              onConfirmDiscard={() => void handleDiscard(item.workout.clientId)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

type BlockedWorkoutCardProps = {
  item: PendingWorkoutPayload;
  styles: ReturnType<typeof createStyles>;
  colors: ThemeColors;
  isBusy: boolean;
  isConfirming: boolean;
  onRetry: () => void;
  onAskDiscard: () => void;
  onCancelDiscard: () => void;
  onConfirmDiscard: () => void;
};

function BlockedWorkoutCard({ item, styles, colors, isBusy, isConfirming, onRetry, onAskDiscard, onCancelDiscard, onConfirmDiscard }: BlockedWorkoutCardProps) {
  const setCount = item.workout.sets.length;
  const exerciseCount = new Set(item.workout.sets.map((set) => set.exerciseId)).size;

  return (
    <View style={styles.card}>
      <Text style={styles.cardDate}>{formatWorkoutDate(item.workout.endedAt)}</Text>
      <Text style={styles.cardMeta}>
        {setCount === 1 ? '1 serie' : `${setCount} series`} · {exerciseCount === 1 ? '1 ejercicio' : `${exerciseCount} ejercicios`} · {item.workout.durationMinutes} min
      </Text>
      <Text style={styles.cardError}>{item.lastError ?? 'El servidor rechazó este entrenamiento.'}</Text>
      <Text style={styles.cardAttempts}>
        {item.attempts === 1 ? '1 intento' : `${item.attempts} intentos`} · en cola desde {formatWorkoutDate(item.queuedAt)}
      </Text>

      {isBusy ? (
        <View style={styles.cardActions}>
          <ActivityIndicator accessibilityLabel="Procesando" color={colors.accent} />
        </View>
      ) : isConfirming ? (
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={onConfirmDiscard} style={({ pressed }) => [styles.dangerButton, pressed && styles.pressed]}>
            <Text style={styles.dangerButtonText}>Sí, descartar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onCancelDiscard} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.cardActions}>
          <Pressable accessibilityRole="button" onPress={onRetry} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
            <Text style={styles.primaryButtonText}>Reintentar</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onAskDiscard} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Descartar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function formatWorkoutDate(isoDate: string): string {
  const date = new Date(isoDate);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()} · ${hours}:${minutes}`;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { backgroundColor: colors.background, flex: 1 },
    content: { flexGrow: 1, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg },
    backButton: { alignSelf: 'flex-start', justifyContent: 'center', minHeight: 48 },
    backText: { color: colors.accent, fontFamily: typography.body, fontSize: 16, fontWeight: '600' },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 32, fontWeight: '700', letterSpacing: -0.7, lineHeight: 38, marginTop: spacing.xl },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 23, marginTop: spacing.md },
    emptyState: { borderColor: colors.line, borderRadius: 14, borderWidth: 1, marginTop: spacing.xl, padding: spacing.lg },
    emptyText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
    card: { borderColor: colors.line, borderRadius: 14, borderWidth: 1, marginTop: spacing.lg, padding: spacing.md },
    cardDate: { color: colors.text, fontFamily: typography.display, fontSize: 19, fontWeight: '700', letterSpacing: -0.2 },
    cardMeta: { color: colors.textMuted, fontFamily: typography.body, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
    cardError: { backgroundColor: colors.dangerSoft, borderRadius: 10, color: colors.text, fontFamily: typography.body, fontSize: 13, lineHeight: 19, marginTop: spacing.md, padding: spacing.sm },
    cardAttempts: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.sm },
    cardActions: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, minHeight: 48 },
    primaryButton: { alignItems: 'center', backgroundColor: colors.accent, borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.lg },
    primaryButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    dangerButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 12, justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.lg },
    dangerButtonText: { color: colors.surface, fontFamily: typography.body, fontSize: 15, fontWeight: '700' },
    secondaryButton: { justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.md },
    secondaryButtonText: { color: colors.textMuted, fontFamily: typography.body, fontSize: 15, fontWeight: '600' },
    pressed: { opacity: 0.78 }
  });
}
