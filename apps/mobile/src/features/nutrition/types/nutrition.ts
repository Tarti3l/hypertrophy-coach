import { MacroPlan } from '@/features/onboarding/types/onboarding';

export type DailyMacroConsumption = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  /** true si alguna comida de hoy vino de un alimento sin todos sus macros medidos por la fuente. */
  hasIncompleteData: boolean;
};

export type MacroDashboardData = {
  plan: MacroPlan;
  consumed: DailyMacroConsumption;
};

export type MealType = 'desayuno' | 'almuerzo' | 'cena' | 'snack';

export const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snack' }
];

export type FoodPortion = {
  id: string;
  label: string;
  grams: number;
  isDefault: boolean;
};

/** Estado del alimento tal como lo declara el nombre de la fuente (TPCA). */
export type FoodPreparation =
  | 'crudo'
  | 'cocido'
  | 'tostado'
  | 'frito'
  | 'seco'
  | 'fresco'
  | 'preparado'
  | 'no_especificado';

export const FOOD_PREPARATION_LABELS: Record<FoodPreparation, string> = {
  crudo: 'Crudo',
  cocido: 'Cocido',
  tostado: 'Tostado',
  frito: 'Frito',
  seco: 'Seco',
  fresco: 'Fresco',
  preparado: 'Preparado',
  no_especificado: 'Preparación no especificada'
};

/**
 * Composición por 100 g de porción comestible, como la publican las tablas.
 * Un macro en null es un dato que la fuente no midió (marcado '•' en la TPCA), no un
 * cero: no lo trates como 0 en ningún cálculo ni lo muestres como número.
 */
export type Food = {
  id: string;
  slug: string;
  name: string;
  category: string;
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  source: string;
  preparation: FoodPreparation;
  tpcaCode: string | null;
  portions: FoodPortion[];
};

export type MealEntry = {
  id: string;
  mealType: MealType;
  label: string;
  quantityGrams: number | null;
  portionLabel: string | null;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparation: FoodPreparation | null;
  /** true si el alimento de origen no tenía todos los macros medidos por la fuente. */
  hasIncompleteMacros: boolean;
};

export type NewMealEntry = {
  mealType: MealType;
  foodId: string | null;
  label: string;
  quantityGrams: number | null;
  portionLabel: string | null;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  preparation: FoodPreparation | null;
};

export type ScaledMacros = {
  energyKcal: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
};

/**
 * Escala la composición por 100 g a la cantidad realmente consumida. Un macro null en
 * el alimento (no medido por la fuente) se mantiene null: escalarlo no lo inventa.
 */
export function scaleFood(food: Food, grams: number): ScaledMacros {
  const factor = grams / 100;
  return {
    energyKcal: scaleValue(food.energyKcal, factor),
    proteinG: scaleValue(food.proteinG, factor),
    carbsG: scaleValue(food.carbsG, factor),
    fatG: scaleValue(food.fatG, factor)
  };
}

function scaleValue(value: number | null, factor: number): number | null {
  return value === null ? null : round1(value * factor);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export type FoodShortcut = {
  id: string;
  name: string;
  icon: string;
  servingLabel: string | null;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NewFoodShortcut = Omit<FoodShortcut, 'id'>;
