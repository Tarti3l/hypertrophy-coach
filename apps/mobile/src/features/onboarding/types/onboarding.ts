export type BiologicalSex = 'female' | 'male' | 'unspecified';
export type KnowledgeLevel = 'none' | 'basic' | 'experienced';

export type OnboardingForm = {
  age: string;
  heightCm: string;
  weightKg: string;
  biologicalSex: BiologicalSex;
  trainingDaysPerWeek: number;
  knowledgeLevel: KnowledgeLevel | null;
  shortTermGoal: string;
  longTermGoal: string;
};

export type MacroPlan = {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  estimatedBmr: number;
  activityMultiplier: number;
};

export type CompletedOnboarding = {
  version: 1;
  completedAt: string;
  profile: OnboardingForm;
  macroPlan: MacroPlan;
};

export type FieldErrors = Partial<Record<keyof OnboardingForm, string>>;

export const initialOnboardingForm: OnboardingForm = {
  age: '',
  heightCm: '',
  weightKg: '',
  biologicalSex: 'unspecified',
  trainingDaysPerWeek: 3,
  knowledgeLevel: null,
  shortTermGoal: '',
  longTermGoal: ''
};
