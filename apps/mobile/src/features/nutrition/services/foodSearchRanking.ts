import type { Food } from '../types/nutrition';

/**
 * Orden por relevancia para el buscador de alimentos.
 *
 * El catálogo TPCA trae 1103 platos preparados junto a los alimentos simples, y muchos
 * de esos platos llevan el ingrediente en el nombre. Ordenar solo por nombre hace que
 * escribir "arroz" devuelva 25 guisos ("Adobo de cerdo con arroz") y deje fuera el
 * arroz: de las 317 coincidencias de "arroz", solo 7 son alimentos simples, y el
 * ingrediente cae recién en la posición 42 del alfabeto.
 *
 * Quien escribe el nombre de un alimento busca ese alimento, no los platos que lo
 * contienen. El orden sale de eso, de más específico a menos:
 *   0. el nombre es exactamente el término,
 *   1. el nombre empieza con el término,
 *   2. alguna palabra del nombre empieza con el término,
 *   3. el término aparece en cualquier parte.
 * A igual nivel, primero el alimento simple y después el plato preparado, y entre dos
 * iguales el nombre más corto, que es siempre el más genérico ("Arroz blanco corriente"
 * antes que "Arroz blanco con tortilla de atún").
 */
export function rankFoodsByRelevance(foods: Food[], term: string): Food[] {
  const needle = normalize(term);
  if (needle.length === 0) return foods;

  return [...foods].sort((a, b) => {
    const tierDiff = matchTier(a.name, needle) - matchTier(b.name, needle);
    if (tierDiff !== 0) return tierDiff;

    if (a.isPreparation !== b.isPreparation) return a.isPreparation ? 1 : -1;

    const lengthDiff = a.name.length - b.name.length;
    if (lengthDiff !== 0) return lengthDiff;

    return a.name.localeCompare(b.name, 'es');
  });
}

/** Menor es más relevante. 4 = no coincide (no debería llegar: el filtro ya lo hizo). */
function matchTier(name: string, needle: string): number {
  const plain = normalize(name);
  if (plain === needle) return 0;
  if (plain.startsWith(needle)) return 1;
  if (startsAWord(plain, needle)) return 2;
  return plain.includes(needle) ? 3 : 4;
}

/**
 * El término arranca una palabra del nombre. Distingue "Harina de arroz" (palabra
 * completa) de una coincidencia a mitad de palabra, que casi siempre es casual.
 */
function startsAWord(plain: string, needle: string): boolean {
  let from = plain.indexOf(needle);
  while (from !== -1) {
    const before = from === 0 ? ' ' : plain[from - 1];
    if (!/[a-z0-9]/.test(before)) return true;
    from = plain.indexOf(needle, from + 1);
  }
  return false;
}

/** Sin tildes y en minúsculas: el socio escribe "platano", la tabla dice "Plátano". */
function normalize(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
