import { BiologicalSex } from '@/features/onboarding/types/onboarding';

/**
 * Objetivo de hidratación con respaldo en guías oficiales. Fuentes en docs/hydration.md.
 *
 * - EFSA (2010) fija la Ingesta Adecuada de AGUA TOTAL en 2.5 L/día en hombres adultos
 *   y 2.0 L/día en mujeres adultas. "Agua total" incluye la humedad de los alimentos.
 * - National Academies (2004) fija 3.7 L y 2.7 L, y estima que ~80 % del agua total
 *   viene de bebidas y ~20 % de los alimentos. De ahí BEVERAGE_SHARE.
 * - Las guías por peso corporal (30-35 mL/kg/día) son las que permiten individualizar;
 *   las revisiones en adultos mayores usan 30 mL/kg por la menor capacidad renal.
 * - ACSM recomienda reponer las pérdidas por sudor durante el ejercicio, del orden de
 *   0.4-0.8 L/hora. TRAINING_EXTRA_ML toma el punto medio para una sesión de ~1 h.
 *
 * La estatura NO entra en el cálculo: ninguna de estas guías la usa. El determinante
 * antropométrico es la masa corporal. Añadir un término por estatura sería inventar.
 */

/** Reparto bebidas/alimentos del agua total (National Academies, 2004). */
const BEVERAGE_SHARE = 0.8;

/** Ingesta Adecuada de agua total en adultos, EFSA 2010 (mL/día). */
const ADEQUATE_INTAKE_ML: Record<BiologicalSex, number> = {
  male: 2500,
  female: 2000,
  /** Punto medio: sin el dato no podemos afinar más sin inventar. */
  unspecified: 2250
};

const ML_PER_KG_ADULT = 35;
/** Las revisiones en mayores de 65 usan 30 mL/kg por la menor capacidad de concentración renal. */
const ML_PER_KG_OLDER_ADULT = 30;
const OLDER_ADULT_AGE = 65;

/** Punto medio de los 0.4-0.8 L/hora de ACSM para una sesión de aproximadamente una hora. */
const TRAINING_EXTRA_ML = 500;

/** Techo de seguridad: beber de más no aporta beneficio y en exceso puede causar hiponatremia. */
const SAFETY_CAP_ML = 4000;

export const GLASS_ML = 250;

export type HydrationInputs = {
  ageYears: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
};

export type HydrationPlan = {
  /** Agua total al día: bebidas más la que aportan los alimentos. */
  totalWaterMl: number;
  /** La parte que hay que beber. Es la que se muestra en vasos. */
  fromDrinksMl: number;
  /** Extra a sumar los días de entrenamiento. */
  trainingExtraMl: number;
  trainingExtraGlasses: number;
  glasses: number;
  glassSizeMl: number;
  /** true cuando el peso llevó el cálculo por encima del tope de seguridad. */
  cappedForSafety: boolean;
};

export function calculateHydrationPlan({ ageYears, weightKg, biologicalSex }: HydrationInputs): HydrationPlan {
  const mlPerKg = ageYears >= OLDER_ADULT_AGE ? ML_PER_KG_OLDER_ADULT : ML_PER_KG_ADULT;
  const byBodyMass = weightKg * mlPerKg;
  const adequateIntake = ADEQUATE_INTAKE_ML[biologicalSex];

  // La guía por peso individualiza hacia arriba; la Ingesta Adecuada actúa como piso
  // para que una persona ligera no termine con un objetivo por debajo de lo recomendado.
  const uncapped = Math.max(byBodyMass, adequateIntake);
  const totalWaterMl = Math.min(uncapped, SAFETY_CAP_ML);

  const fromDrinksMl = totalWaterMl * BEVERAGE_SHARE;

  return {
    totalWaterMl: roundTo50(totalWaterMl),
    fromDrinksMl: roundTo50(fromDrinksMl),
    trainingExtraMl: TRAINING_EXTRA_ML,
    trainingExtraGlasses: Math.round(TRAINING_EXTRA_ML / GLASS_ML),
    glasses: Math.max(1, Math.round(fromDrinksMl / GLASS_ML)),
    glassSizeMl: GLASS_ML,
    cappedForSafety: uncapped > SAFETY_CAP_ML
  };
}

export function formatLitres(millilitres: number): string {
  return `${(millilitres / 1000).toFixed(1).replace('.', ',')} L`;
}

/**
 * Para el contador en vivo: por debajo del litro se lee mejor en mililitros, y
 * los vasos de 250 ml necesitan dos decimales para no mentir (1,25 L, no 1,3 L).
 */
export function formatVolume(millilitres: number): string {
  if (millilitres < 1000) return `${Math.round(millilitres)} ml`;

  const litres = (millilitres / 1000).toFixed(2).replace(/\.?0+$/, '');
  return `${litres.replace('.', ',')} L`;
}

function roundTo50(value: number): number {
  return Math.round(value / 50) * 50;
}
