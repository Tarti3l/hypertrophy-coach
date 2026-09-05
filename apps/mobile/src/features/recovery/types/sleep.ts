export type SleepLogEntry = {
  /** Fecha local en formato YYYY-MM-DD. Coincide con la columna date de sleep_logs. */
  sleepDate: string;
  hours: number;
};

export type WeeklySleepSummary = {
  /** null cuando todavía no hay ninguna noche registrada en la ventana. */
  averageHours: number | null;
  nights: number;
  entries: SleepLogEntry[];
};

export const MIN_SLEEP_HOURS = 4;
export const MAX_SLEEP_HOURS = 12;
