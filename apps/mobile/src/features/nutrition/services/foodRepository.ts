import { requireSupabase } from '@/lib/supabase';

import { Food, FoodPortion, FoodPreparation } from '../types/nutrition';
import { rankFoodsByRelevance } from './foodSearchRanking';

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
  is_preparation: boolean;
  food_portions: PortionRow[] | null;
};

const SELECT =
  'id, slug, name, category, energy_kcal, protein_g, carbs_g, fat_g, source, preparation, tpca_code, is_preparation, food_portions(id, label, grams, is_default, sort_order)';

/**
 * Cuántas filas se traen para ordenar por relevancia antes de recortar a las que se
 * muestran. Hay términos con cientos de coincidencias ("arroz" tiene 317), así que
 * ordenar solo las 25 que se muestran no alcanza: el alimento correcto puede no estar
 * entre ellas. El orden del `select` (primero los simples, después los preparados)
 * garantiza que los alimentos simples entren siempre en este lote.
 */
const CANDIDATE_LIMIT = 100;

/**
 * Búsqueda por nombre. RLS ya limita a los alimentos publicados; is_default_variant
 * limita además a una sola fila por tpca_code cuando hay varias preparaciones por
 * estrato socioeconómico (ver comentario en supabase/migrations/00023).
 *
 * El resultado se ordena por relevancia, no por nombre: ver foodSearchRanking.ts para
 * por qué el alfabético dejaba el arroz fuera de la búsqueda de "arroz".
 */
export async function searchFoods(term: string, limit = 25): Promise<Food[]> {
  const client = requireSupabase();
  const trimmed = term.trim();

  let query = client
    .from('foods')
    .select(SELECT)
    .eq('is_published', true)
    .eq('is_default_variant', true)
    // Los alimentos simples antes que los platos preparados: quien escribe "arroz"
    // busca el ingrediente, no los 310 guisos que lo llevan de acompañamiento.
    .order('is_preparation')
    .order('name')
    .limit(trimmed.length > 0 ? CANDIDATE_LIMIT : limit);
  if (trimmed.length > 0) query = query.ilike('name', `%${trimmed}%`);

  const { data, error } = await query;
  if (error) throw error;

  const foods = ((data ?? []) as unknown as FoodRow[]).map(toFood);
  if (trimmed.length === 0) return foods;

  return rankFoodsByRelevance(foods, trimmed).slice(0, limit);
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
    isPreparation: row.is_preparation,
    portions
  };
}

function numOrNull(value: number | null): number | null {
  return value === null ? null : Number(value);
}
