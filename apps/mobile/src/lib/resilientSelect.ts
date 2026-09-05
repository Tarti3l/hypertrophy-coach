import { isMissingSchemaError } from './supabaseErrors';

type QueryLike = PromiseLike<{ data: unknown; error: unknown }>;

/**
 * Un select que sobrevive a una migración pendiente.
 *
 * PostgREST rechaza **toda** la consulta si le pides una sola columna que no existe. Con
 * los catálogos cacheados a nivel de módulo, eso deja pantallas enteras vacías o en
 * rojo. Ya ha pasado tres veces en este proyecto:
 *   1. `grip_options` en `exercises` → el catálogo entero vacío en todos los grupos.
 *   2. `is_small` y `aesthetic_priority` en `muscle_groups` → el constructor en rojo.
 *   3. (evitada) `day_kind` en `split_template_days`.
 *
 * La regla: las columnas que añade una migración reciente van en `optional`. Si faltan,
 * se reintenta solo con `base` y se marca `degraded`, para que la app funcione con menos
 * información en vez de no funcionar.
 *
 * @param build recibe la lista de columnas ya unida y devuelve la consulta construida.
 */
export async function selectWithOptionalColumns<TRow>(
  build: (columns: string) => QueryLike,
  base: string[],
  optional: string[]
): Promise<{ rows: TRow[]; degraded: boolean }> {
  const full = await build([...base, ...optional].join(', '));

  if (!full.error) {
    return { rows: ((full.data ?? []) as TRow[]), degraded: false };
  }

  // Un fallo que no sea de columna inexistente (red, permisos, RLS) sí debe subir:
  // esconderlo detrás del modo reducido sería mentir sobre lo que pasa.
  if (!isMissingSchemaError(full.error)) throw full.error;

  const basic = await build(base.join(', '));
  if (basic.error) throw basic.error;

  return { rows: ((basic.data ?? []) as TRow[]), degraded: true };
}
