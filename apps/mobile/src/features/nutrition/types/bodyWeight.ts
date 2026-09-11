/**
 * Peso corporal medido por la persona. Es historial, no perfil: nada de esto entra en
 * el cálculo de macros, que sigue saliendo del peso declarado en el onboarding.
 */
export type BodyWeightEntry = {
  id: string;
  /** Fecha de la medición en formato YYYY-MM-DD. Una por día: ver el unique de la tabla. */
  measuredOn: string;
  weightKg: number;
};

export type NewBodyWeightEntry = {
  measuredOn: string;
  weightKg: number;
};

/**
 * El peso con el que se calcularon las metas, tal como se declaró en el onboarding.
 * `declaredOn` es cuándo se completó el formulario, no cuándo la persona se pesó, y
 * puede faltar. Por eso se muestra aparte y nunca como una medición del historial.
 */
export type StartingWeight = {
  weightKg: number;
  declaredOn: string | null;
};

export const MIN_WEIGHT_KG = 35;
export const MAX_WEIGHT_KG = 300;

/** Fecha local en YYYY-MM-DD. Sin UTC: a las 22 h de Lima, toISOString() ya dice mañana. */
export function localDateKey(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/** "12 mar" para el eje del gráfico y la lista. El año solo estorba en el eje. */
export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
}
