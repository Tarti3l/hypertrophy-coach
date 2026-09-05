import { round, toNumber } from '@/utils/numbers';

import { MacroPlan, OnboardingForm } from '../types/onboarding';

const SEX_ADJUSTMENT = {
  female: -161,
  male: -5,
  unspecified: -83
} as const;

function activityMultiplier(trainingDaysPerWeek: number): number {
  if (trainingDaysPerWeek <= 1) return 1.35;
  if (trainingDaysPerWeek === 2) return 1.4;
  if (trainingDaysPerWeek === 3) return 1.5;
  if (trainingDaysPerWeek === 4) return 1.55;
  return 1.6;
}

/**
 * Educational estimate for a beginner hypertrophy starting point.
 * It is not a diagnosis or individualized nutrition prescription.
 */
export function calculateMacroPlan(form: OnboardingForm): MacroPlan | null {
  const age = toNumber(form.age);
  const heightCm = toNumber(form.heightCm);
  const weightKg = toNumber(form.weightKg);

  if (!age || !heightCm || !weightKg) return null;

  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + SEX_ADJUSTMENT[form.biologicalSex];
  const multiplier = activityMultiplier(form.trainingDaysPerWeek);
  const calories = round(bmr * multiplier + 200);
  const proteinGrams = round(weightKg * 1.8);
  const fatGrams = round(weightKg * 0.8);
  const carbsGrams = Math.max(0, round((calories - proteinGrams * 4 - fatGrams * 9) / 4));

  return {
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    estimatedBmr: round(bmr),
    activityMultiplier: multiplier
  };
}
