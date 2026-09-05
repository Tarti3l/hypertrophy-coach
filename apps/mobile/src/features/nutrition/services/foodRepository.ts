import { requireSupabase } from '@/lib/supabase';

import { Food, FoodPortion } from '../types/nutrition';

type PortionRow = { id: string; label: string; grams: number; is_default: boolean; sort_order: number };
type FoodRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  energy_kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  source: string;
  food_portions: PortionRow[] | null;
};

const SELECT = 'id, slug, name, category, energy_kcal, protein_g, carbs_g, fat_g, source, food_portions(id, label, grams, is_default, sort_order)';

/** Búsqueda por nombre. RLS ya limita a los alimentos publicados. */
export async function searchFoods(term: string, limit = 25): Promise<Food[]> {
  const client = requireSupabase();
  const trimmed = term.trim();

  let query = client.from('foods').select(SELECT).eq('is_published', true).order('name').limit(limit);
  if (trimmed.length > 0) query = query.ilike('name', `%${trimmed}%`);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as FoodRow[]).map(toFood);
}

function toFood(row: FoodRow): Food {
  const portions: FoodPortion[] = (row.food_portions ?? [])
    .slice()
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((portion) => ({
      id: portion.id,
      label: portion.label,
      grams: Number(portion.grams),
      isDefault: portion.is_default
    }));

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    energyKcal: Number(row.energy_kcal),
    proteinG: Number(row.protein_g),
    carbsG: Number(row.carbs_g),
    fatG: Number(row.fat_g),
    source: row.source,
    portions
  };
}
