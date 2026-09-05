import { requireSupabase } from '@/lib/supabase';

import { BiologicalSex, MacroPlan, OnboardingForm } from '../types/onboarding';

export type StoredUserProfile = {
  ageYears: number;
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
  trainingDaysPerWeek: number;
};

/** Datos físicos del perfil. RLS ya limita la fila a la del usuario autenticado. */
export async function getUserProfile(): Promise<StoredUserProfile | null> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('user_profiles')
    .select('age, height_cm, weight_kg, biological_sex, training_days_per_week')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ageYears: Number(data.age),
    heightCm: Number(data.height_cm),
    weightKg: Number(data.weight_kg),
    biologicalSex: data.biological_sex as BiologicalSex,
    trainingDaysPerWeek: Number(data.training_days_per_week)
  };
}

export async function saveOnboardingProfile(form: OnboardingForm, macroPlan: MacroPlan): Promise<void> {
  if (!form.knowledgeLevel) throw new Error('Completa tu nivel de conocimiento antes de guardar.');

  const client = requireSupabase();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError) throw userError;
  if (!userData.user) throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');

  const { error } = await client.from('user_profiles').upsert({
    id: userData.user.id,
    age: Number(form.age.replace(',', '.')),
    height_cm: Number(form.heightCm.replace(',', '.')),
    weight_kg: Number(form.weightKg.replace(',', '.')),
    biological_sex: form.biologicalSex,
    knowledge_level: form.knowledgeLevel,
    training_days_per_week: form.trainingDaysPerWeek,
    short_term_goal: form.shortTermGoal.trim(),
    long_term_goal: form.longTermGoal.trim(),
    macro_targets: {
      calories: macroPlan.calories,
      protein_grams: macroPlan.proteinGrams,
      carbs_grams: macroPlan.carbsGrams,
      fat_grams: macroPlan.fatGrams,
      estimated_bmr: macroPlan.estimatedBmr,
      activity_multiplier: macroPlan.activityMultiplier
    },
    onboarding_completed_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });

  if (error) throw error;
}
