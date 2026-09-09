import { MacroPlan } from '@/features/onboarding/types/onboarding';

export type DailyMacroConsumption = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
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

/** Composición por 100 g de porción comestible, como la publican las tablas. */
export type Food = {
  id: string;
  slug: string;
  name: string;
  category: string;
  energyKcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
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

/** Escala la composición por 100 g a la cantidad realmente consumida. */
export function scaleFood(food: Food, grams: number): Pick<NewMealEntry, 'energyKcal' | 'proteinG' | 'carbsG' | 'fatG'> {
  const factor = grams / 100;
  return {
    energyKcal: round1(food.energyKcal * factor),
    proteinG: round1(food.proteinG * factor),
    carbsG: round1(food.carbsG * factor),
    fatG: round1(food.fatG * factor)
  };
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
