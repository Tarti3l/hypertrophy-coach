import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Eyebrow } from '@/components/ui/Eyebrow';
import { palette, spacing, ThemeColors, type, typography } from '@/theme/tokens';

import { RedFlagsWarnings } from '../components/RedFlagsWarnings';
import { SleepTracker } from '../components/SleepTracker';
import { useSleepLog } from '../hooks/useSleepLog';

export function RecoveryScreen() {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { hours, setHours, save, saveState, isLoading, loadError, weekly, reload } = useSleepLog();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Eyebrow>Recuperación</Eyebrow>
        <Text style={styles.title}>Tu cuerpo también progresa fuera del gimnasio</Text>
        <Text style={styles.description}>Dormir, manejar el estrés y recuperarte son parte del entrenamiento, no una pausa de él.</Text>
        <View style={styles.sleepSection}>
          <SleepTracker
            hours={hours}
            weekly={weekly}
            saveState={saveState}
            isLoading={isLoading}
            loadError={loadError}
            onChange={setHours}
            onCommit={save}
            onRetry={() => (loadError ? reload() : save(hours))}
          />
        </View>
        <RedFlagsWarnings />
        <Text style={styles.disclaimer}>Contenido educativo. Si el cansancio, el sueño o el estrés interfieren de forma persistente con tu vida diaria, consulta a un profesional de salud.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl },
    title: { ...type.screenTitle, color: colors.text },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 16, lineHeight: 24, marginTop: spacing.md },
    sleepSection: { marginTop: spacing.xl },
    disclaimer: { color: colors.textMuted, fontFamily: typography.body, fontSize: 12, lineHeight: 18, marginTop: spacing.xl }
  });
}
