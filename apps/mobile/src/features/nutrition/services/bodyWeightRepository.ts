import { requireSupabase, requireUserId } from '@/lib/supabase';

import { BodyWeightEntry, NewBodyWeightEntry } from '../types/bodyWeight';

type WeightRow = { id: string; measured_on: string; weight_kg: number };

const SELECT = 'id, measured_on, weight_kg';

/**
 * Guarda el peso de un día. La tabla tiene unique (user_id, measured_on), así que
 * registrar dos veces la misma fecha corrige ese día en vez de duplicar la medición.
 */
export async function saveBodyWeight(entry: NewBodyWeightEntry): Promise<void> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const { error } = await client
    .from('body_weight_logs')
    .upsert({
      user_id: userId,
      measured_on: entry.measuredOn,
      weight_kg: entry.weightKg,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,measured_on' });

  if (error) throw error;
}

/** Historial completo, del más viejo al más nuevo: es el orden en que se dibuja. */
export async function listBodyWeights(): Promise<BodyWeightEntry[]> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('body_weight_logs')
    .select(SELECT)
    .order('measured_on', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as WeightRow[]).map((row) => ({
    id: row.id,
    measuredOn: row.measured_on,
    weightKg: Number(row.weight_kg)
  }));
}

export async function deleteBodyWeight(id: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('body_weight_logs').delete().eq('id', id);
  if (error) throw error;
}
