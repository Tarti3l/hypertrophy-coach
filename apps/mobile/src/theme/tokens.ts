import { Platform } from 'react-native';

export const palette = {
  light: {
    background: '#F7F8F6',
    surface: '#FFFFFF',
    text: '#14211A',
    textMuted: '#526158',
    line: '#D9E0DA',
    accent: '#226A48',
    accentSoft: '#E7F2EB',
    danger: '#B42318',
    dangerSoft: '#FDECEA',
    warning: '#8A5A00',
    warningSoft: '#FFF1D6'
  },
  dark: {
    background: '#101511',
    surface: '#182019',
    text: '#EFF5F0',
    textMuted: '#B7C3B9',
    line: '#344238',
    accent: '#87D0A4',
    accentSoft: '#1F3929',
    danger: '#FFB4AB',
    dangerSoft: '#482822',
    warning: '#F0C66B',
    warningSoft: '#3A2E16'
  }
} as const;

export type ThemeColors = (typeof palette)[keyof typeof palette];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const typography = {
  display: Platform.select({ ios: 'Avenir Next', android: 'sans-serif-medium' }),
  body: Platform.select({ ios: 'System', android: 'sans-serif' })
};

/**
 * Radios, elevación y escala tipográfica del rediseño.
 * La paleta y el espaciado no cambian: lo que cambia es que ahora hay superficies
 * con profundidad en vez de solo líneas de 1px, y un tercer nivel tipográfico
 * (la etiqueta en mayúsculas) que estructura sin añadir ruido.
 */
export const radii = {
  sm: 12,
  md: 14,
  lg: 16,
  pill: 999
} as const;

export const elevation = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2
  }
} as const;

export const type = {
  /** Etiqueta en mayúsculas: el nivel que faltaba entre el título y el cuerpo. */
  eyebrow: { fontFamily: typography.body, fontSize: 11, fontWeight: '700' as const, letterSpacing: 1.1, textTransform: 'uppercase' as const },
  screenTitle: { fontFamily: typography.display, fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.9, lineHeight: 37 },
  sectionTitle: { fontFamily: typography.display, fontSize: 19, fontWeight: '700' as const, letterSpacing: -0.2 },
  cardTitle: { fontFamily: typography.display, fontSize: 17, fontWeight: '700' as const, letterSpacing: -0.2 },
  metric: { fontFamily: typography.display, fontSize: 34, fontWeight: '800' as const, letterSpacing: -1.2 },
  body: { fontFamily: typography.body, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: typography.body, fontSize: 13, lineHeight: 19 }
} as const;
