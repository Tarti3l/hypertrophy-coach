import { Platform } from 'react-native';

/**
 * Sistema visual "vino sobre negro" — ver docs/diseno.md, que es la fuente de verdad.
 *
 * Tres ideas sostienen todo lo de abajo:
 *  - Fondo negro real. En OLED el color flota sobre nada, y contra el negro el
 *    vino se despega mucho más de lo que se despegaba contra sí mismo.
 *  - El vino no es papel tapiz: aparece en tres lugares con una función clara —
 *    el degradado del bloque que está en curso, el velo que baja sobre las fotos
 *    hasta fundirse en negro, y el acento de lo que está activo.
 *  - Fotografía como material. Las pantallas están pensadas con imagen; cuando
 *    falta, hay un estado dibujado a propósito (ver `empty` y docs/diseno.md).
 *
 * Regla dura: ningún componente escribe un color, un radio ni una familia
 * tipográfica a mano. Todo sale de acá.
 */
export const palette = {
  light: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    surfaceRaised: '#F6F1F3',
    text: '#1A0710',
    textMuted: '#6E5560',
    textLabel: '#8A6E78',
    textFaint: '#A8929C',
    line: '#E7DDE1',
    /** Acento para texto e íconos sobre claro: #E8215E no pasa contraste ahí. */
    accent: '#A8103F',
    /** Relleno de bloques. El texto blanco encima se lee. */
    accentFill: '#A8103F',
    /** Extremo oscuro del degradado, y color del texto sobre píldoras blancas. */
    accentDeep: '#7A0E3C',
    onAccent: '#FFFFFF',
    /** Fondo tenue de acento. Lo usan Card, ChoiceField, WheelPicker y SetTracker. */
    accentSoft: '#FBE8EE',
    empty: '#C4B2BA',
    danger: '#B42318',
    dangerSoft: '#FDECEA',
    warning: '#8A5A00',
    warningSoft: '#FFF1D6'
  },
  dark: {
    /** Negro real. No lo aclares: es la mitad del efecto. */
    background: '#000000',
    /** Tarjetas y superficies. Siempre con `line` de borde, nunca con sombra. */
    surface: '#0E090C',
    surfaceRaised: '#141014',
    text: '#FFFFFF',
    textMuted: '#A08B96',
    textLabel: '#8B7580',
    /** Valores sin cargar, contadores en cero. */
    textFaint: '#6A5A63',
    line: '#241C21',
    /** Acento para texto, íconos y bordes sobre negro. */
    accent: '#E8215E',
    /**
     * Relleno de bloques. Es #E8215E apenas oscurecido: el mismo tono, pero acá
     * el texto blanco encima llega a contraste. No uses #E8215E como fondo de
     * algo con texto blanco.
     */
    accentFill: '#C41450',
    accentDeep: '#7A0E3C',
    onAccent: '#FFFFFF',
    /** Fondo tenue de acento. Lo usan Card, ChoiceField, WheelPicker y SetTracker. */
    accentSoft: '#2A0A18',
    /** Íconos en contorno del estado sin imagen y sin video. */
    empty: '#4A3E45',
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

/** Gutter de pantalla. Las fotos a sangre y los bloques de grupo lo ignoran. */
export const gutter = 22;

/**
 * Archivo, en cinco pesos. No viene con el sistema: hay que empaquetarla
 * (item [D2]). Mientras no esté, cae al tipo del sistema y el diseño pierde
 * buena parte de lo que lo distingue.
 */
export const typography = {
  display: Platform.select({ ios: 'Archivo', android: 'Archivo', default: 'Archivo' }),
  body: Platform.select({ ios: 'Archivo', android: 'Archivo', default: 'Archivo' })
};

/**
 * Radios generosos: es lo que separa esta dirección de una ficha técnica.
 * No los bajes de a poco — la mezcla de esquinas duras y blandas fue
 * exactamente lo que se veía roto en el intento anterior.
 */
export const radii = {
  sm: 15,
  md: 18,
  lg: 22,
  xl: 24,
  xxl: 28,
  pill: 999
} as const;

/**
 * Sin sombras. La jerarquía la dan el negro, el borde de 1px y el bloque de
 * color. Se deja la clave para no romper los imports existentes.
 */
export const elevation = {
  card: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0
  }
} as const;

/**
 * El velo sobre las fotos. Arranca transparente y termina en negro con una
 * pizca de vino. Es lo que hace que el texto se lea sobre CUALQUIER foto, sin
 * depender de que la imagen traiga una zona oscura.
 *
 * Se consume con expo-linear-gradient: `colors={scrim.photo.colors}`,
 * `locations={scrim.photo.locations}`.
 */
export const scrim = {
  /** Foto a sangre con texto abajo (inicio). */
  hero: {
    colors: ['rgba(0,0,0,0.10)', 'rgba(122,14,60,0.22)', 'rgba(0,0,0,0.80)', '#000000'],
    locations: [0, 0.48, 0.78, 1]
  },
  /** Tarjeta de grupo muscular. */
  card: {
    colors: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.90)', 'rgba(122,14,60,0.42)'],
    locations: [0, 0.52, 0.8, 1]
  }
} as const;

/** Degradado del bloque en curso: la serie activa, el contador de descanso. */
export const gradient = {
  activo: {
    colors: ['#7A0E3C', '#C41450'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 }
  }
} as const;

export const type = {
  /** Titular sobre la foto de inicio. El texto más grande de la app. */
  hero: { fontFamily: typography.display, fontSize: 36, fontWeight: '800' as const, letterSpacing: -1.5, lineHeight: 38 },
  screenTitle: { fontFamily: typography.display, fontSize: 32, fontWeight: '800' as const, letterSpacing: -1.3, lineHeight: 34 },
  /** Nombre del ejercicio en modo ejercicio, nombre del grupo en su tarjeta. */
  sectionTitle: { fontFamily: typography.display, fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.9 },
  cardTitle: { fontFamily: typography.display, fontSize: 16, fontWeight: '700' as const },
  rowTitle: { fontFamily: typography.body, fontSize: 15, fontWeight: '600' as const },
  /** Peso y reps de la serie en curso. */
  metric: { fontFamily: typography.display, fontSize: 56, fontWeight: '800' as const, letterSpacing: -2.6 },
  /** El contador de descanso. */
  timer: { fontFamily: typography.display, fontSize: 96, fontWeight: '800' as const, letterSpacing: -6 },
  /** Racha, series de la semana: números de tarjeta chica. */
  stat: { fontFamily: typography.display, fontSize: 26, fontWeight: '800' as const, letterSpacing: -1 },
  body: { fontFamily: typography.body, fontSize: 15, lineHeight: 22 },
  small: { fontFamily: typography.body, fontSize: 14, lineHeight: 20 },
  /**
   * Etiqueta en mayúsculas: el nivel que estructura sin agregar ruido.
   * `eyebrow` es el nombre con el que ya la usan 7 componentes; `label` es el
   * nombre nuevo. Son el mismo estilo a propósito: renombrar de golpe rompía
   * esos componentes y ese cambio no pertenece a este item.
   */
  eyebrow: { fontFamily: typography.body, fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  label: { fontFamily: typography.body, fontSize: 11, fontWeight: '600' as const, letterSpacing: 1.6, textTransform: 'uppercase' as const },
  pill: { fontFamily: typography.display, fontSize: 15, fontWeight: '700' as const }
} as const;
