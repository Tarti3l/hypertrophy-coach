import { requireSupabase, requireUserId } from '@/lib/supabase';

export type HydrationLog = {
  glasses: number;
  glassSizeMl: number;
};

export async function getHydrationLog(date = new Date()): Promise<HydrationLog | null> {
  const client = requireSupabase();

  const { data, error } = await client
    .from('hydration_logs')
    .select('glasses, glass_size_ml')
    .eq('logged_on', localDateKey(date))
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { glasses: Number(data.glasses), glassSizeMl: Number(data.glass_size_ml) };
}

/** Un registro por usuario y día: tocar vasos actualiza la fila, no crea otra. */
export async function saveHydrationLog(glasses: number, glassSizeMl: number, targetMl: number, date = new Date()): Promise<void> {
  const client = requireSupabase();
  const userId = await requireUserId();

  const { error } = await client.from('hydration_logs').upsert({
    user_id: userId,
    logged_on: localDateKey(date),
    glasses,
    glass_size_ml: glassSizeMl,
    target_ml: targetMl,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,logged_on' });

  if (error) throw error;
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
