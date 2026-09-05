import { PropsWithChildren, useMemo } from 'react';
import { Platform, StyleSheet, useColorScheme, useWindowDimensions, View } from 'react-native';

import { palette, ThemeColors } from '@/theme/tokens';

const DESKTOP_BREAKPOINT = 768;
const APP_FRAME_MAX_WIDTH = 520;
const APP_FRAME_MAX_HEIGHT = 900;

/**
 * Conserva la composición mobile-first en navegadores anchos sin afectar
 * el layout ni las áreas seguras de dispositivos móviles reales.
 */
export function WebLayoutWrapper({ children }: PropsWithChildren) {
  const { width } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = palette[isDark ? 'dark' : 'light'];
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const isDesktopWeb = Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;

  return (
    <View style={[styles.viewport, isDesktopWeb && styles.desktopViewport]}>
      <View style={[styles.appFrame, isDesktopWeb && styles.desktopAppFrame]}>{children}</View>
    </View>
  );
}

function createStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    viewport: {
      backgroundColor: colors.background,
      flex: 1
    },
    desktopViewport: {
      alignItems: 'center',
      backgroundColor: isDark ? '#090D0A' : '#E7EBE7',
      justifyContent: 'center',
      paddingVertical: 24
    },
    appFrame: {
      backgroundColor: colors.background,
      flex: 1,
      width: '100%'
    },
    desktopAppFrame: {
      borderRadius: 24,
      elevation: 10,
      // flexGrow: 0 sin altura definida colapsaba el marco a 0 px: el Stack hijo usa
      // flex: 1 y no tenia contra que medirse, asi que la pantalla salia en negro.
      flexGrow: 1,
      flexShrink: 1,
      flexBasis: 'auto',
      height: '100%',
      width: '100%',
      maxHeight: APP_FRAME_MAX_HEIGHT,
      maxWidth: APP_FRAME_MAX_WIDTH,
      overflow: 'hidden',
      shadowColor: '#14211A',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.14,
      shadowRadius: 30
    }
  });
}
