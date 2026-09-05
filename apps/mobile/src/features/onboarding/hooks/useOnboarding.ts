import { useMemo, useState } from 'react';

import { useAuth } from '@/features/auth/AuthProvider';

import { calculateMacroPlan } from '../services/macroCalculator';
import { saveOnboardingProfile } from '../services/onboardingProfileRepository';
import { saveCompletedOnboarding } from '../services/onboardingStorage';
import {
  FieldErrors,
  initialOnboardingForm,
  OnboardingForm
} from '../types/onboarding';
import { toNumber } from '@/utils/numbers';

const TOTAL_STEPS = 4;

export function useOnboarding() {
  const { refreshProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OnboardingForm>(initialOnboardingForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const macroPlan = useMemo(() => calculateMacroPlan(form), [form]);

  function update<K extends keyof OnboardingForm>(key: K, value: OnboardingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function validateCurrentStep(): boolean {
    const nextErrors: FieldErrors = {};
    const age = toNumber(form.age);
    const height = toNumber(form.heightCm);
    const weight = toNumber(form.weightKg);

    if (step === 0) {
      if (!age || age < 14 || age > 100) nextErrors.age = 'Ingresa una edad entre 14 y 100 años.';
      if (!height || height < 120 || height > 230) nextErrors.heightCm = 'Usa una estatura entre 120 y 230 cm.';
      if (!weight || weight < 35 || weight > 300) nextErrors.weightKg = 'Usa un peso entre 35 y 300 kg.';
    }

    if (step === 2) {
      if (!form.knowledgeLevel) nextErrors.knowledgeLevel = 'Elige el punto de partida que más se parezca a ti.';
      if (!form.shortTermGoal.trim()) nextErrors.shortTermGoal = 'Escribe una meta para las próximas semanas.';
      if (!form.longTermGoal.trim()) nextErrors.longTermGoal = 'Escribe una meta para los próximos meses.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((current) => Math.min(current + 1, TOTAL_STEPS - 1));
  }

  function goBack() {
    setErrors({});
    setStep((current) => Math.max(0, current - 1));
  }

  async function complete() {
    if (!macroPlan || !form.knowledgeLevel) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await saveOnboardingProfile(form, macroPlan);
      await saveCompletedOnboarding({
        version: 1,
        completedAt: new Date().toISOString(),
        profile: form,
        macroPlan
      });
      await refreshProfile();
      setIsCompleted(true);
    } catch {
      setSaveError('No pudimos guardar tu punto de partida. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      setIsSaving(false);
    }
  }

  return {
    step,
    totalSteps: TOTAL_STEPS,
    form,
    errors,
    macroPlan,
    isSaving,
    isCompleted,
    saveError,
    update,
    goNext,
    goBack,
    complete
  };
}
