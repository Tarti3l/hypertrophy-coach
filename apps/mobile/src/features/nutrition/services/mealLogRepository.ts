import { requireSupabase, requireUserId } from '@/lib/supabase';

import { DailyMacroConsumption, FoodPreparation, MealEntry, MealType, NewMealEntry } from '../types/nutrition';

type EntryRow = {
  id: string;
  meal_type: MealType;
  label: string;
  quantity_grams: number | null;
  portion_label: string | null;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  preparation: FoodPreparation | null;
};

const SELECT = 'id, meal_type, label, quantity_grams, portion_label, energy_kcal, protein_g, carbs_g, fat_g, preparation';

export async function addMealEntry(entry: NewMealEntry, date = new Date()): Promise<void> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const { error } = await client.from('meal_entries').insert({
    user_id: userId,
    eaten_on: localDateKey(date),
    meal_type: entry.mealType,
    food_id: entry.foodId,
    label: entry.label,
    quantity_grams: entry.quantityGrams,
    portion_label: entry.portionLabel,
    energy_kcal: entry.energyKcal,
    protein_g: entry.proteinG,
    carbs_g: entry.carbsG,
    fat_g: entry.fatG,
    preparation: entry.preparation
  });

  if (error) throw error;
}

export async function getDayEntries(date = new Date()): Promise<MealEntry[]> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('meal_entries')
    .select(SELECT)
    .eq('eaten_on', localDateKey(date))
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as EntryRow[]).map(toEntry);
}

export async function deleteMealEntry(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('meal_entries').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Lo que más se repite en los últimos 30 días. Es el atajo que de verdad baja la
 * fricción: después de una semana, casi todo lo que se registra es repetición.
 */
export async function getFrequentEntries(limit = 6): Promise<MealEntry[]> {
  const client = requireSupabase();
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const { data, error } = await client
    .from('meal_entries')
    .select(SELECT)
    .gte('eaten_on', localDateKey(since))
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;

  const counts = new Map<string, { entry: MealEntry; count: number }>();
  for (const row of (data ?? []) as EntryRow[]) {
    const entry = toEntry(row);
    const key = `${entry.label}|${entry.portionLabel ?? entry.quantityGrams ?? ''}`;
    const existing = counts.get(key);
    if (existing) existing.count += 1;
    else counts.set(key, { entry, count: 1 });
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((item) => item.entry);
}

export function sumEntries(entries: MealEntry[]): DailyMacroConsumption {
  return entries.reduce<DailyMacroConsumption>((total, entry) => ({
    calories: total.calories + entry.energyKcal,
    proteinGrams: total.proteinGrams + entry.proteinG,
    carbsGrams: total.carbsGrams + entry.carbsG,
    fatGrams: total.fatGrams + entry.fatG
  }), { calories: 0, proteinGrams: 0, carbsGrams: 0, fatGrams: 0 });
}

function toEntry(row: EntryRow): MealEntry {
  return {
    id: row.id,
    mealType: row.meal_type,
    label: row.label,
    quantityGrams: row.quantity_grams === null ? null : Number(row.quantity_grams),
    portionLabel: row.portion_label,
    energyKcal: Number(row.energy_kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    preparation: row.preparation
  };
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
