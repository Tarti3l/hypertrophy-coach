import { requireSupabase, requireUserId } from '@/lib/supabase';

import { SleepLogEntry, WeeklySleepSummary } from '../types/sleep';

const WEEK_LENGTH_DAYS = 7;

/**
 * Registra el sueño de una noche. La tabla tiene unique (user_id, sleep_date), así que
 * mover el slider varias veces el mismo día actualiza la fila en lugar de crear duplicados.
 */
export async function logSleep(hours: number, date = new Date()): Promise<SleepLogEntry> {
  const client = requireSupabase();
  const userId = await requireUserId();

  // El check de la tabla es 0..1440 minutos; redondeamos a minutos enteros.
  const durationMinutes = Math.max(0, Math.min(1440, Math.round(hours * 60)));
  const sleepDate = localDateKey(date);

  const { error } = await client
    .from('sleep_logs')
    .upsert({
      user_id: userId,
      sleep_date: sleepDate,
      duration_minutes: durationMinutes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,sleep_date' });

  if (error) throw error;

  return { sleepDate, hours: durationMinutes / 60 };
}

export async function getSleepLogForDate(date = new Date()): Promise<SleepLogEntry | null> {
  const client = requireSupabase();
  const sleepDate = localDateKey(date);

  const { data, error } = await client
    .from('sleep_logs')
    .select('sleep_date, duration_minutes')
    .eq('sleep_date', sleepDate)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return { sleepDate: data.sleep_date as string, hours: (data.duration_minutes as number) / 60 };
}

/** Promedio de las últimas 7 noches registradas (incluye hoy). RLS ya filtra por usuario. */
export async function getWeeklySleepAverage(referenceDate = new Date()): Promise<WeeklySleepSummary> {
  const client = requireSupabase();

  const from = new Date(referenceDate);
  from.setDate(from.getDate() - (WEEK_LENGTH_DAYS - 1));

  const { data, error } = await client
    .from('sleep_logs')
    .select('sleep_date, duration_minutes')
    .gte('sleep_date', localDateKey(from))
    .lte('sleep_date', localDateKey(referenceDate))
    .order('sleep_date', { ascending: true });

  if (error) throw error;

  const entries: SleepLogEntry[] = ((data ?? []) as { sleep_date: string; duration_minutes: number }[])
    .map((row) => ({ sleepDate: row.sleep_date, hours: row.duration_minutes / 60 }));

  if (entries.length === 0) return { averageHours: null, nights: 0, entries };

  // Promediamos solo las noches registradas: contar los días vacíos como 0 h
  // mostraría un promedio alarmante y falso a quien apenas empieza a registrar.
  const total = entries.reduce((sum, entry) => sum + entry.hours, 0);

  return {
    averageHours: Math.round((total / entries.length) * 10) / 10,
    nights: entries.length,
    entries
  };
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}
