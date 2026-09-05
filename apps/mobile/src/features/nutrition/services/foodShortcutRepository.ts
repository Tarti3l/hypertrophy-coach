import { requireSupabase, requireUserId } from '@/lib/supabase';

import { FoodShortcut, NewFoodShortcut } from '../types/nutrition';

type ShortcutRow = {
  id: string;
  name: string;
  icon: string;
  serving_label: string | null;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

const SELECT = 'id, name, icon, serving_label, energy_kcal, protein_g, carbs_g, fat_g';

export async function listShortcuts(): Promise<FoodShortcut[]> {
  const client = requireSupabase();
  const { data, error } = await client.from('food_shortcuts').select(SELECT).order('position');
  if (error) throw error;
  return ((data ?? []) as ShortcutRow[]).map(toShortcut);
}

export async function saveShortcut(shortcut: NewFoodShortcut, id?: string): Promise<void> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const payload = {
    user_id: userId,
    name: shortcut.name.trim(),
    icon: shortcut.icon,
    serving_label: shortcut.servingLabel,
    energy_kcal: shortcut.energyKcal,
    protein_g: shortcut.proteinG,
    carbs_g: shortcut.carbsG,
    fat_g: shortcut.fatG,
    updated_at: new Date().toISOString()
  };

  const { error } = id
    ? await client.from('food_shortcuts').update(payload).eq('id', id)
    : await client.from('food_shortcuts').insert(payload);

  if (error) throw error;
}

export async function deleteShortcut(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('food_shortcuts').delete().eq('id', id);
  if (error) throw error;
}

function toShortcut(row: ShortcutRow): FoodShortcut {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    servingLabel: row.serving_label,
    energyKcal: Number(row.energy_kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g)
  };
}
