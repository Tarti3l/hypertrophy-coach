export type UUID = string;
export type ISODateTime = string;

export type KnowledgeLevel = 'none' | 'basic' | 'experienced';
export type BiologicalSex = 'female' | 'male' | 'unspecified';

export interface MacroTargets {
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  formulaVersion: number;
}

export interface UserProfile {
  id: UUID;
  age: number;
  heightCm: number;
  weightKg: number;
  biologicalSex: BiologicalSex;
  knowledgeLevel: KnowledgeLevel;
  trainingDaysPerWeek: number;
  shortTermGoal: string;
  longTermGoal: string;
  macroTargets: MacroTargets;
  onboardingCompletedAt: ISODateTime | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ExerciseEquipment = 'barbell' | 'dumbbell' | 'machine' | 'bodyweight' | 'cable' | 'other';

export interface Exercise {
  id: UUID;
  slug: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: ExerciseEquipment;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  mediaGifUrl: string | null;
  mediaVideoUrl: string | null;
  mediaPosterUrl: string | null;
  isPublished: boolean;
}

export interface WorkoutSet {
  id: UUID;
  exerciseId: UUID;
  setNumber: number;
  targetReps: number | null;
  completedReps: number | null;
  weightKg: number | null;
  rpe: number | null;
  completedAt: ISODateTime | null;
}

export interface Workout {
  id: UUID;
  userId: UUID;
  programId: UUID | null;
  startedAt: ISODateTime;
  endedAt: ISODateTime | null;
  durationMinutes: number | null;
  notes: string | null;
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  sets: WorkoutSet[];
}

export interface SleepLog {
  id: UUID;
  userId: UUID;
  sleepDate: string;
  durationMinutes: number;
  quality: 1 | 2 | 3 | 4 | 5 | null;
  note: string | null;
  createdAt: ISODateTime;
}
