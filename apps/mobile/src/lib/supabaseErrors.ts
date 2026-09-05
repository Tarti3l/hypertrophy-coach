/**
 * Traduce un error de Supabase a algo que el usuario pueda accionar.
 *
 * El motivo de que esto exista: cuando falta una tabla, PostgREST NO devuelve el
 * código de Postgres 42P01. Devuelve el suyo, PGRST205 ("Could not find the table
 * ... in the schema cache"). La primera versión solo miraba 42P01, así que una
 * migración sin aplicar se mostraba como "revisa tu conexión" y mandaba a buscar el
 * problema al sitio equivocado.
 *
 * Los códigos PGRST que importan aquí:
 *   PGRST205 - tabla no encontrada en el schema cache
 *   PGRST204 - columna no encontrada
 *   PGRST200 - falta la relación entre dos tablas (el select con recurso embebido)
 *   PGRST202 - función RPC no encontrada
 * Los tres primeros significan lo mismo en la práctica: falta correr la migración,
 * o PostgREST todavía no ha recargado su cache.
 */

type MaybePostgrestError = {
  code?: unknown;
  message?: unknown;
  details?: unknown;
  hint?: unknown;
};

const MISSING_SCHEMA_CODES = new Set(['PGRST200', 'PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703']);

export function errorCodeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const code = (error as MaybePostgrestError).code;
  return typeof code === 'string' ? code : null;
}

export function errorMessageOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null;
  const message = (error as MaybePostgrestError).message;
  return typeof message === 'string' && message.trim().length > 0 ? message : null;
}

export function isMissingSchemaError(error: unknown): boolean {
  const code = errorCodeOf(error);
  if (code && MISSING_SCHEMA_CODES.has(code)) return true;

  // Algunos despliegues devuelven el aviso del schema cache sin código.
  const message = errorMessageOf(error)?.toLowerCase() ?? '';
  return message.includes('schema cache') || message.includes('does not exist');
}

/**
 * Mensaje para el usuario. Cuando el error no es de los conocidos incluimos el texto
 * original: es feo, pero es la diferencia entre poder arreglarlo y adivinar.
 */
export function describeSupabaseError(error: unknown, fallback: string): string {
  if (isMissingSchemaError(error)) {
    return 'Faltan tablas o columnas nuevas en la base de datos. Abre el Terminal, corre npx supabase db push y vuelve a entrar.';
  }

  const code = errorCodeOf(error);
  if (code === 'PGRST301' || code === '42501') {
    return 'Tu sesión no tiene permiso para leer esto. Cierra sesión y vuelve a entrar.';
  }

  const message = errorMessageOf(error);
  if (!message) return fallback;

  // "Failed to fetch" / "Network request failed" son el caso real de falta de conexión.
  const lowered = message.toLowerCase();
  if (lowered.includes('fetch') || lowered.includes('network')) {
    return 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo otra vez.';
  }

  return `${fallback} (${message})`;
}
