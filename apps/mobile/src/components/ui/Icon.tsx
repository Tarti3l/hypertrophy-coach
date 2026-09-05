import Svg, { Circle, Path } from 'react-native-svg';

/**
 * Iconografía de trazo del rediseño: malla de 24, grosor 1.75, extremos redondeados.
 * Dibujados a mano en vez de usar un set genérico para que compartan peso y ritmo
 * con la tipografía, que es lo que hacía que la app se viera sin terminar.
 */
export type IconName =
  | 'home' | 'dumbbell' | 'bowl' | 'moon' | 'flame' | 'arrowRight' | 'arrowLeft'
  | 'check' | 'clock' | 'play' | 'info' | 'shaker' | 'plus' | 'search'
  | 'machine' | 'cable' | 'body' | 'barbell' | 'chevronDown';

type IconProps = {
  name: IconName;
  color: string;
  size?: number;
};

const PATHS: Record<IconName, string[]> = {
  home: ['M3 10.5 12 3l9 7.5', 'M5.5 9.6V20a1 1 0 0 0 1 1h3.2v-5.6h4.6V21h3.2a1 1 0 0 0 1-1V9.6'],
  dumbbell: ['M6.5 8v8M3.5 10.2v3.6M17.5 8v8M20.5 10.2v3.6M6.5 12h11'],
  bowl: ['M3.5 11.5h17c0 4.4-3.6 8-8 8h-1c-4.4 0-8-3.6-8-8Z', 'M12 4.5c1.7 1.1 2.3 2.5 1.8 4.3'],
  moon: ['M20 14.6A8.5 8.5 0 0 1 9.4 4 8.5 8.5 0 1 0 20 14.6Z'],
  flame: ['M12 3c3.5 3.2 5.5 6 5.5 9a5.5 5.5 0 0 1-11 0c0-1.4.5-2.7 1.4-3.9.6 1 1.3 1.6 2.1 1.8C9.4 8.3 10.2 5.7 12 3Z'],
  arrowRight: ['M5 12h13M13 6.5 18.5 12 13 17.5'],
  arrowLeft: ['M19 12H6M11 6.5 5.5 12 11 17.5'],
  check: ['M5 12.5 10 17.5 19 7.5'],
  clock: ['M12 7.5V12l3 2'],
  play: ['M9.5 7.8v8.4L17 12 9.5 7.8Z'],
  info: ['M12 11v5.5M12 7.6v0.1'],
  // Shaker de proteína: tapa, cuerpo y la marca de nivel.
  shaker: ['M8.2 3.5h7.6l-.5 3H8.7l-.5-3Z', 'M8.7 6.5h6.6l.9 12.1a2 2 0 0 1-2 2.15H9.8a2 2 0 0 1-2-2.15L8.7 6.5Z', 'M8.15 13.2h7.7'],
  plus: ['M12 5.5v13M5.5 12h13'],
  search: ['M20.5 20.5 16.2 16.2'],
  // Barra olímpica: discos a los lados y el eje.
  barbell: ['M4 8v8M7 6.5v11M17 6.5v11M20 8v8M7 12h10'],
  // Máquina guiada: asiento, respaldo y la torre de placas.
  machine: ['M4.5 20v-7.5h6.5V20', 'M4.5 12.5V6.5h6.5', 'M15 4.5h4.5v15H15z', 'M15 8.5h4.5M15 12.5h4.5M15 16.5h4.5'],
  // Polea: la torre, el cable y el agarre.
  cable: ['M6 3.5v17', 'M6 5.5h9.5a2 2 0 0 1 2 2v3.5', 'M17.5 11v5', 'M14.5 16h6'],
  // Peso corporal: una figura de pie.
  body: ['M12 3.6a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Z', 'M12 7.6v6.4', 'M7.5 10.2 12 8.6l4.5 1.6', 'M12 14 9 20.4M12 14l3 6.4'],
  chevronDown: ['M6.5 9.5 12 15l5.5-5.5']
};

const CIRCLED: Partial<Record<IconName, number>> = { clock: 8.5, info: 9, search: 6.6 };

export function Icon({ name, color, size = 23 }: IconProps) {
  const radius = CIRCLED[name];

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {radius ? (
        <Circle
          cx={name === 'search' ? 10.6 : 12}
          cy={name === 'search' ? 10.6 : 12}
          r={radius}
          stroke={color}
          strokeWidth={1.75}
        />
      ) : null}
      {PATHS[name].map((d) => (
        <Path key={d} d={d} stroke={color} strokeWidth={name === 'check' ? 2.5 : 1.75} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </Svg>
  );
}

/** El icono que representa cada equipamiento en la lista de ejercicios. */
export function equipmentIcon(equipment: string): IconName {
  if (equipment === 'machine') return 'machine';
  if (equipment === 'cable') return 'cable';
  if (equipment === 'barbell') return 'barbell';
  if (equipment === 'dumbbell') return 'dumbbell';
  if (equipment === 'bodyweight') return 'body';
  return 'dumbbell';
}
