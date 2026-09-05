import { DayKind, MuscleGroupInfo } from '../types/split';
import { MUSCLE_GROUP_LABELS, MuscleGroupSlug } from '../types/training';

/**
 * Validación del reparto semanal cuando el usuario lo edita a mano.
 *
 * Las reglas son las mismas que la migración 00016 impone a las plantillas, pero aquí
 * **avisan, no bloquean**: el usuario pidió poder editar a criterio. La diferencia es
 * deliberada — una plantilla que rompe las reglas es un bug nuestro, una rutina que las
 * rompe es una decisión suya.
 *
 * Cada aviso dice qué regla se saltó Y por qué existe. Un aviso que solo dice "esto está
 * mal" no enseña nada y se ignora a la segunda vez.
 */
export type WeekPlanDay = {
  dayIndex: number;
  dayKind: DayKind;
  focusGroups: MuscleGroupSlug[];
};

export type WeekPlanWarning = {
  /** Para poder marcar el día concreto en la UI. null = afecta a la semana entera. */
  dayIndex: number | null;
  title: string;
  detail: string;
};

const label = (group: MuscleGroupSlug) => MUSCLE_GROUP_LABELS[group] ?? group;

function listar(groups: MuscleGroupSlug[]): string {
  const names = groups.map(label);
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} y ${names[names.length - 1]}`;
}

/**
 * R1 admite un tercer grupo si es pequeño, o si los compuestos del día ya lo trabajan
 * (tríceps en un día de empuje, bíceps en uno de tirón). Lo segundo no se puede leer del
 * modelo de datos —no sabemos si el día es de empuje o de tirón hasta ver los ejercicios—
 * así que se aproxima permitiendo siempre tríceps y bíceps como tercero. Es la
 * aproximación permisiva a propósito: esto avisa, no bloquea.
 */
const REMATE_DE_COMPUESTO: MuscleGroupSlug[] = ['triceps', 'biceps'];

export function validateWeekPlan(days: WeekPlanDay[], groups: MuscleGroupInfo[]): WeekPlanWarning[] {
  const info = new Map(groups.map((group) => [group.slug, group]));
  const warnings: WeekPlanWarning[] = [];

  // --- R1: dos grupos por día, tres bajo condición ---
  for (const day of days) {
    if (day.focusGroups.length === 0) {
      warnings.push({
        dayIndex: day.dayIndex,
        title: `El día ${day.dayIndex} está vacío`,
        detail: 'Un día sin ningún músculo no se puede entrenar. Añádele al menos uno o baja el número de días de la semana.'
      });
      continue;
    }

    if (day.focusGroups.length <= 2) continue;

    const extra = day.focusGroups.filter(
      (group) => !(info.get(group)?.isSmall ?? false) && !REMATE_DE_COMPUESTO.includes(group)
    );

    // Con 3 grupos, uno de ellos puede ser el "grande" del día sin problema: solo avisa
    // si hay más grandes de los que caben.
    if (extra.length > 2) {
      warnings.push({
        dayIndex: day.dayIndex,
        title: `El día ${day.dayIndex} carga ${day.focusGroups.length} músculos grandes`,
        detail:
          `${listar(extra)} piden volumen y series pesadas. Metidos en la misma sesión, los últimos ` +
          'llegan con el depósito vacío y sus series valen menos. Los pequeños (antebrazo, pantorrilla, ' +
          'abdomen) y el remate de bíceps o tríceps sí caben como tercero.'
      });
    }
  }

  // --- R2: ningún músculo repetido, salvo prioridad estética alta ---
  const daysByGroup = new Map<MuscleGroupSlug, number[]>();
  for (const day of days) {
    for (const group of day.focusGroups) {
      daysByGroup.set(group, [...(daysByGroup.get(group) ?? []), day.dayIndex]);
    }
  }

  for (const [group, indices] of daysByGroup) {
    if (indices.length < 2) continue;

    // El hombro es la excepción a la excepción: aunque tiene prioridad alta, sus tres
    // porciones van el mismo día. Repartirlo fue un bug real de una plantilla anterior.
    if (group === 'hombros') {
      warnings.push({
        dayIndex: null,
        title: 'Los hombros están repartidos en varios días',
        detail:
          'El hombro tiene tres porciones (anterior, medial y posterior) y se entrenan juntas el mismo ' +
          `día. Ahora aparece en los días ${indices.join(', ')}.`
      });
      continue;
    }

    if ((info.get(group)?.aestheticPriority ?? 2) === 1) continue;

    const separation = Math.min(...indices.slice(1).map((value, i) => value - indices[i]));
    warnings.push({
      dayIndex: null,
      title: `${label(group)} se repite en la semana`,
      detail:
        `Aparece en los días ${indices.join(', ')}` +
        (separation < 2
          ? ' y con menos de 48 h entre medias. El músculo necesita ese margen para recuperarse; entrenarlo antes resta en vez de sumar.'
          : '. No es un error, pero el reparto está pensado para que cada músculo tenga una sesión y todo su volumen concentrado ahí.')
    });
  }

  // --- R3: los días de pierna, separados ---
  const legDays = days.filter((day) => day.dayKind === 'pierna').map((day) => day.dayIndex).sort((a, b) => a - b);
  for (let i = 1; i < legDays.length; i += 1) {
    if (legDays[i] - legDays[i - 1] >= 3) continue;
    warnings.push({
      dayIndex: legDays[i],
      title: `Los días de pierna ${legDays[i - 1]} y ${legDays[i]} están demasiado juntos`,
      detail:
        'La pierna necesita al menos dos días de descanso entre sesiones. Es el grupo que más fatiga ' +
        'acumula, y llevar las series al fallo alarga la recuperación a 48-72 h.'
    });
  }

  // --- Cobertura: qué se quedó fuera de la semana ---
  if (days.length > 0) {
    const trained = new Set(days.flatMap((day) => day.focusGroups));
    const missing = groups
      .filter((group) => group.slug !== 'cardio' && !trained.has(group.slug))
      .map((group) => group.slug);

    if (missing.length > 0) {
      warnings.push({
        dayIndex: null,
        title: `${missing.length === 1 ? 'Un músculo se queda' : `${missing.length} músculos se quedan`} sin entrenar`,
        detail: `${listar(missing)} no ${missing.length === 1 ? 'aparece' : 'aparecen'} en ningún día. Es válido si es a propósito, pero conviene saberlo.`
      });
    }
  }

  if (legDays.length === 0 && days.length > 0) {
    warnings.push({
      dayIndex: null,
      title: 'No hay ningún día de pierna',
      detail: 'Toda la semana es torso. Además del desequilibrio visible, la pierna es la mitad del cuerpo con más masa muscular.'
    });
  }

  return warnings;
}

/**
 * ¿El reparto sigue siendo el que propone la app?
 *
 * Compara solo lo que el usuario puede tocar en el paso 2 —tipo de día y grupos—, no los
 * ejercicios: cambiar un press por otro no convierte la semana en personalizada.
 */
export function matchesTemplate(days: WeekPlanDay[], templateDays: WeekPlanDay[]): boolean {
  if (days.length !== templateDays.length) return false;

  const key = (day: WeekPlanDay) => `${day.dayIndex}|${day.dayKind}|${[...day.focusGroups].sort().join(',')}`;
  const expected = new Set(templateDays.map(key));
  return days.every((day) => expected.has(key(day)));
}
