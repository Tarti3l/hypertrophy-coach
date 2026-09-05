/**
 * uuid v4 para claves de idempotencia. No es criptográfico y no necesita serlo:
 * solo debe ser único por dispositivo para que el servidor pueda deduplicar reintentos.
 * Hermes aún no expone crypto.randomUUID en todas las plataformas, de ahí el fallback.
 */
export function createUuid(): string {
  const cryptoRef = globalThis.crypto as { randomUUID?: () => string } | undefined;
  if (typeof cryptoRef?.randomUUID === 'function') return cryptoRef.randomUUID();

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}
