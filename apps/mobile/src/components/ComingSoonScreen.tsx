import { useMemo } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { palette, spacing, ThemeColors, typography } from '@/theme/tokens';

type ComingSoonScreenProps = {
  title: string;
  description: string;
};

export function ComingSoonScreen({ title, description }: ComingSoonScreenProps) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
        <View style={styles.line} />
        <Text style={styles.message}>Lo construiremos en los próximos módulos.</Text>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.background },
    content: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
    title: { color: colors.text, fontFamily: typography.display, fontSize: 36, fontWeight: '700', letterSpacing: -0.8 },
    description: { color: colors.textMuted, fontFamily: typography.body, fontSize: 17, lineHeight: 25, marginTop: spacing.md },
    line: { height: 1, backgroundColor: colors.line, marginVertical: spacing.xl },
    message: { color: colors.accent, fontFamily: typography.body, fontSize: 15, fontWeight: '600' }
  });
}
