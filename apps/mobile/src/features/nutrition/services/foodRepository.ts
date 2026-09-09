import { requireSupabase } from '@/lib/supabase';

import { Food, FoodPortion, FoodPreparation } from '../types/nutrition';

type PortionRow = { id: string; label: string; grams: number; is_default: boolean; sort_order: number };
type FoodRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  energy_kcal: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  source: string;
  preparation: FoodPreparation;
  tpca_code: string | null;
  food_portions: PortionRow[] | null;
};

const SELECT =
  'id, slug, name, category, energy_kcal, protein_g, carbs_g, fat_g, source, preparation, tpca_code, food_portions(id, label, grams, is_default, sort_order)';

/**
 * Búsqueda por nombre. RLS ya limita a los alimentos publicados; is_default_variant
 * limita además a una sola fila por tpca_code cuando hay varias preparaciones por
 * estrato socioeconómico (ver comentario en supabase/migrations/00023).
 */
export async function searchFoods(term: string, limit = 25): Promise<Food[]> {
  const client = requireSupabase();
  const trimmed = term.trim();

  let query = client
    .from('foods')
    .select(SELECT)
    .eq('is_published', true)
    .eq('is_default_variant', true)
    .order('name')
    .limit(limit);
  if (trimmed.length > 0) query = query.ilike('name', `%${trimmed}%`);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as FoodRow[]).map(toFood);
}

/**
 * Rango real de kcal por 100 g entre las variantes (por estrato) de un mismo
 * tpca_code, para mostrar en el detalle sin exponer el concepto de estrato.
 * Devuelve null cuando el alimento no tiene tpca_code o solo tiene una variante.
 */
export async function getKcalRangeByTpcaCode(tpcaCode: string | null): Promise<{ min: number; max: number } | null> {
  if (!tpcaCode) return null;
  const client = requireSupabase();
  const { data, error } = await client.from('foods').select('energy_kcal').eq('tpca_code', tpcaCode).eq('is_published', true);
  if (error) throw error;

  const values = (data ?? [])
    .map((row) => (row as { energy_kcal: number | null }).energy_kcal)
    .filter((value): value is number => value !== null);
  if (values.length <= 1) return null;

  return { min: Math.min(...values), max: Math.max(...values) };
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
    energyKcal: numOrNull(row.energy_kcal),
    proteinG: numOrNull(row.protein_g),
    carbsG: numOrNull(row.carbs_g),
    fatG: numOrNull(row.fat_g),
    source: row.source,
    preparation: row.preparation,
    tpcaCode: row.tpca_code,
    portions
  };
}

function numOrNull(value: number | null): number | null {
  return value === null ? null : Number(value);
}
