import AsyncStorage from '@react-native-async-storage/async-storage';

import { CompletedOnboarding } from '../types/onboarding';

const ONBOARDING_STORAGE_KEY = '@hypertrophy-coach/onboarding/v1';

export async function saveCompletedOnboarding(payload: CompletedOnboarding): Promise<void> {
  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(payload));
}

export async function getCompletedOnboarding(): Promise<CompletedOnboarding | null> {
  const rawValue = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
  return rawValue ? (JSON.parse(rawValue) as CompletedOnboarding) : null;
}
