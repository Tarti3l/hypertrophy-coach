import { useColorScheme, StyleProp, Text, TextStyle } from 'react-native';

import { palette, type } from '@/theme/tokens';

export function Eyebrow({ children, color, style }: { children: string; color?: string; style?: StyleProp<TextStyle> }) {
  const colorScheme = useColorScheme();
  const colors = palette[colorScheme === 'dark' ? 'dark' : 'light'];

  return <Text style={[type.eyebrow, { color: color ?? colors.textMuted }, style]}>{children}</Text>;
}
