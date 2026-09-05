export function toNumber(value: string): number | null {
  const normalized = value.replace(',', '.').trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function round(value: number): number {
  return Math.round(value);
}
