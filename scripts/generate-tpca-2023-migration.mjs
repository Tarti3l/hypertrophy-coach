// Genera supabase/migrations/00023_food_catalog_tpca_2023.sql a partir de
// docs/fuentes/TPCA-Edicion-11-2023-INS-CENAN.xlsx.
//
// Herramienta de una sola vez, no se corre en la app ni en CI. Si hace falta corregir
// algo del catálogo, corregir este script y volver a correrlo (`node
// scripts/generate-tpca-2023-migration.mjs`) para regenerar el archivo de migración
// completo — no editar el .sql generado a mano.
//
// Requiere la dependencia de desarrollo `xlsx` (raíz del monorepo): es la única forma
// razonable de leer un .xlsx real: no se usa en la app, solo acá.
//
// Qué hace, en orden:
//  1. Lee los 884 códigos TPCA de la edición 2017 (supabase/migrations/00008) para
//     saber qué slug (y por lo tanto qué id) ya existe para cada código que se repite
//     en la edición 2023 — así el insert de abajo actualiza esas filas en vez de
//     crear otras nuevas. Ver el comentario grande al principio de
//     supabase/migrations/00023_food_catalog_tpca_2023.sql para el porqué.
//  2. Lee la hoja maestra "TPCA EDICIÓN 11 2023", filas 8 a 1196 (0-indexed): son los
//     alimentos simples, grupos A a U. OJO: esa hoja sigue después de la fila 1196
//     con una copia completa de la sección de preparados (a partir de "S - ALIMENTOS
//     PREPARADOS" en la fila 1197) — no se lee esa parte de la maestra, para no cargar
//     cada preparación dos veces.
//  3. Lee la hoja aparte "S- Alimentos Preparados" para las 1103 preparaciones. Tiene
//     una columna menos que la maestra (no reporta betacaroteno), así que sus índices
//     de columna para vitamina A en adelante están corridos uno a la izquierda
//     respecto a la maestra.
//  4. Agrupa las preparaciones por código TPCA (el mismo código se repite hasta 5
//     veces, una por estrato socioeconómico encuestado) y marca con
//     is_default_variant = true a la de mediana de energy_kcal en cada grupo — con un
//     número par de variantes, la menor de las dos del medio.
//  5. Escribe el archivo de migración completo: el fragmento de esquema
//     (tpca-2023-schema.sql, en esta misma carpeta) seguido del insert con los datos.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import xlsx from 'xlsx';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_FILE = path.join(ROOT, 'docs/fuentes/TPCA-Edicion-11-2023-INS-CENAN.xlsx');
const MIGRATION_2017 = path.join(ROOT, 'supabase/migrations/00008_food_catalog.sql');
const SCHEMA_FRAGMENT = path.join(ROOT, 'scripts/tpca-2023-schema.sql');
const OUTPUT = path.join(ROOT, 'supabase/migrations/00023_food_catalog_tpca_2023.sql');

const CATEGORY_BY_GROUP = {
  A: 'Cereales y derivados',
  B: 'Verduras, hortalizas y derivados',
  C: 'Frutas y derivados',
  D: 'Grasas, aceites y oleaginosas',
  E: 'Pescados y mariscos',
  F: 'Carnes y derivados',
  G: 'Leche y derivados',
  H: 'Bebidas',
  J: 'Huevos y derivados',
  K: 'Productos azucarados',
  L: 'Misceláneos',
  Q: 'Alimentos infantiles',
  T: 'Leguminosas y derivados',
  U: 'Tubérculos, raíces y derivados'
};

const wb = xlsx.readFile(SOURCE_FILE, { cellDates: false });

// ---------- 1. Códigos 2017 -> slug existente ----------
const sql2017 = fs.readFileSync(MIGRATION_2017, 'utf8');
const rowRe2017 = /\('([^']+)',\s*'((?:[^'\\]|\\.)*)',\s*'([^']+)',\s*([\d.]+),\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*'TPCA 2017 \(INS\/CENAN\), cód\. ([A-Z]+)(\d+)'/g;
const oldSlugByCode = new Map();
let m2017;
while ((m2017 = rowRe2017.exec(sql2017))) {
  const [, slug, , , , group, num] = m2017;
  oldSlugByCode.set(`${group}${num}`, slug);
}
if (oldSlugByCode.size !== 884) {
  throw new Error(`Se esperaban 884 códigos de 2017, se parsearon ${oldSlugByCode.size}. Revisar el regex contra 00008_food_catalog.sql.`);
}

// ---------- Helpers ----------
function slugify(text) {
  return text
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/["'*]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function num(v) {
  if (v === null || v === undefined || v === '•') return null;
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function sqlNum(v) { return v === null ? 'null' : String(v); }
function sqlStr(v) { return v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`; }

// Solo el nombre decide la preparación. Nunca las calorías ni ningún otro dato:
// inventar un dato nutricional es peor que admitir que falta.
const PREP_WORDS = [
  [/\bcruda?s?\b/i, 'crudo'],
  [/\b(cocidas?|cocidos?|sancochadas?|sancochados?|hervidas?|hervidos?)\b/i, 'cocido'],
  [/\btostadas?|tostados?\b/i, 'tostado'],
  [/\bfritas?|fritos?\b/i, 'frito'],
  [/\bsecas?|secos?\b/i, 'seco'],
  [/\bfrescas?|frescos?\b/i, 'fresco']
];

function derivePreparation(name) {
  const plain = name.normalize('NFD').replace(/[̀-ͯ]/g, '');
  for (const [re, value] of PREP_WORDS) if (re.test(plain)) return value;
  return 'no_especificado';
}

function readRows(sheetName) {
  const ws = wb.Sheets[sheetName];
  if (!ws) throw new Error(`No se encontró la hoja "${sheetName}" en el archivo fuente.`);
  return xlsx.utils.sheet_to_json(ws, { header: 1, range: 0, defval: null, raw: true });
}

// ---------- 2. Alimentos simples: hoja maestra, filas 8-1196 ----------
const masterRows = readRows('TPCA EDICIÓN 11 2023');
const rawFoods = [];
for (let i = 8; i <= 1196; i++) {
  const r = masterRows[i];
  if (!r || typeof r[3] !== 'number') continue;
  const group = r[0];
  if (typeof group !== 'string' || !/^[A-Z]$/.test(group)) continue;
  const number = r[1];
  const name = String(r[2]).trim();
  rawFoods.push({
    code: `${group}${number}`, group, number, name,
    energyKcal: num(r[3]), energyKj: num(r[4]), waterG: num(r[5]), proteinG: num(r[6]),
    fatG: num(r[7]), carbsG: num(r[8]), carbsAvailableG: num(r[9]), fiberG: num(r[10]),
    ashG: num(r[11]), calciumMg: num(r[12]), phosphorusMg: num(r[13]), zincMg: num(r[14]),
    ironMg: num(r[15]), sodiumMg: num(r[16]), potassiumMg: num(r[17]), betacaroteneUg: num(r[18]),
    vitaminAUg: num(r[19]), thiamineMg: num(r[20]), riboflavinMg: num(r[21]), niacinMg: num(r[22]),
    vitaminCMg: num(r[23]), folicAcidUg: num(r[24]),
    dataIncomplete: r.slice(3, 25).some((v) => v === '•')
  });
}

// ---------- 3. Preparaciones: hoja aparte, columnas corridas (sin betacaroteno) ----------
const prepRows = readRows('S- Alimentos Preparados');
const preparations = [];
let lastGroup = null;
let lastNumber = null;
for (let i = 8; i < prepRows.length; i++) {
  const r = prepRows[i];
  if (!r || typeof r[3] !== 'number') continue;
  const group = typeof r[0] === 'string' && /^[A-Z]+$/.test(r[0]) ? r[0] : lastGroup;
  const number = typeof r[1] === 'number' ? r[1] : lastNumber;
  if (group === null || number === null) continue;
  lastGroup = group; lastNumber = number;
  const name = String(r[2]).trim();
  const estrato = typeof r[24] === 'string' ? r[24].trim() : null;
  preparations.push({
    code: `${group}${number}`, group, number, name, estrato,
    energyKcal: num(r[3]), energyKj: num(r[4]), waterG: num(r[5]), proteinG: num(r[6]),
    fatG: num(r[7]), carbsG: num(r[8]), carbsAvailableG: num(r[9]), fiberG: num(r[10]),
    ashG: num(r[11]), calciumMg: num(r[12]), phosphorusMg: num(r[13]), zincMg: num(r[14]),
    ironMg: num(r[15]), sodiumMg: num(r[16]), potassiumMg: num(r[17]), betacaroteneUg: null,
    vitaminAUg: num(r[18]), thiamineMg: num(r[19]), riboflavinMg: num(r[20]), niacinMg: num(r[21]),
    vitaminCMg: num(r[22]), folicAcidUg: num(r[23]),
    dataIncomplete: r.slice(3, 24).some((v) => v === '•')
  });
}

// ---------- 4. Mediana por código (estrato) ----------
const prepByCode = new Map();
for (const p of preparations) {
  if (!prepByCode.has(p.code)) prepByCode.set(p.code, []);
  prepByCode.get(p.code).push(p);
}
for (const group of prepByCode.values()) {
  const sorted = [...group].sort((a, b) => a.energyKcal - b.energyKcal);
  const medianIdx = sorted.length % 2 === 1 ? (sorted.length - 1) / 2 : sorted.length / 2 - 1;
  const medianItem = sorted[medianIdx];
  for (const p of group) { p.isDefault = p === medianItem; p.variantCount = group.length; }
}

// ---------- Slugs ----------
const usedSlugs = new Set(oldSlugByCode.values());
function uniqueSlug(base) {
  let slug = base;
  let n = 2;
  while (usedSlugs.has(slug)) { slug = `${base}-v${n}`; n += 1; }
  usedSlugs.add(slug);
  return slug;
}

for (const f of rawFoods) {
  f.slug = oldSlugByCode.get(f.code) ?? uniqueSlug(`${f.group.toLowerCase()}${f.number}-${slugify(f.name)}`);
  f.preparation = derivePreparation(f.name);
  f.category = CATEGORY_BY_GROUP[f.group] ?? f.group;
}

const ESTRATO_LETTERS = 'abcdefghij';
for (const group of prepByCode.values()) {
  group.sort((a, b) => (a.estrato ?? '').localeCompare(b.estrato ?? ''));
  group.forEach((p, idx) => {
    const base = `${p.group.toLowerCase()}${p.number}-${slugify(p.name)}`;
    p.slug = group.length > 1 ? uniqueSlug(`${base}-${ESTRATO_LETTERS[idx]}`) : uniqueSlug(base);
    p.preparation = 'preparado';
    p.category = 'Alimentos preparados';
  });
}

// ---------- Reporte ----------
const matched = rawFoods.filter((f) => oldSlugByCode.has(f.code)).length;
console.log('--- Catálogo TPCA 2023 ---');
console.log('Alimentos simples parseados:', rawFoods.length, `(actualizados: ${matched}, nuevos: ${rawFoods.length - matched})`);
console.log('Preparaciones parseadas:', preparations.length, `(grupos de código únicos: ${prepByCode.size}, con variantes de estrato: ${[...prepByCode.values()].filter((g) => g.length > 1).length})`);

const byGroup = {};
for (const f of rawFoods) byGroup[f.group] = (byGroup[f.group] ?? 0) + 1;
console.log('Por grupo:', JSON.stringify(byGroup));

const byPrep = {};
for (const f of [...rawFoods, ...preparations]) byPrep[f.preparation] = (byPrep[f.preparation] ?? 0) + 1;
console.log('Por preparation:', JSON.stringify(byPrep));

const allFoods = [...rawFoods, ...preparations];
const MACRO_FIELDS = { energy_kcal: 'energyKcal', protein_g: 'proteinG', carbs_g: 'carbsG', fat_g: 'fatG' };
console.log('\n--- Nulls en las 4 columnas de macros (antes not null), sobre', allFoods.length, 'alimentos ---');
for (const [col, field] of Object.entries(MACRO_FIELDS)) {
  const nulls = allFoods.filter((f) => f[field] === null);
  console.log(`  ${col}: ${nulls.length} null` + (nulls.length > 0 ? ` — ej.: ${nulls.slice(0, 5).map((f) => f.code).join(', ')}` : ''));
}

// ---------- SQL ----------
const COLS = [
  'slug', 'name', 'category', 'energy_kcal', 'energy_kj', 'water_g', 'protein_g', 'fat_g',
  'carbs_g', 'carbs_available_g', 'fiber_g', 'ash_g', 'calcium_mg', 'phosphorus_mg', 'zinc_mg',
  'iron_mg', 'sodium_mg', 'potassium_mg', 'betacarotene_ug', 'vitamin_a_ug', 'thiamine_mg',
  'riboflavin_mg', 'niacin_mg', 'vitamin_c_mg', 'folic_acid_ug', 'tpca_code', 'tpca_edition',
  'is_preparation', 'estrato', 'is_default_variant', 'preparation', 'data_incomplete',
  'source', 'is_published'
];

function foodTuple(f, { isPreparation, estrato, isDefaultVariant, source }) {
  const vals = [
    sqlStr(f.slug), sqlStr(f.name), sqlStr(f.category), sqlNum(f.energyKcal), sqlNum(f.energyKj),
    sqlNum(f.waterG), sqlNum(f.proteinG), sqlNum(f.fatG), sqlNum(f.carbsG), sqlNum(f.carbsAvailableG),
    sqlNum(f.fiberG), sqlNum(f.ashG), sqlNum(f.calciumMg), sqlNum(f.phosphorusMg), sqlNum(f.zincMg),
    sqlNum(f.ironMg), sqlNum(f.sodiumMg), sqlNum(f.potassiumMg), sqlNum(f.betacaroteneUg),
    sqlNum(f.vitaminAUg), sqlNum(f.thiamineMg), sqlNum(f.riboflavinMg), sqlNum(f.niacinMg),
    sqlNum(f.vitaminCMg), sqlNum(f.folicAcidUg), sqlStr(f.code), sqlStr('2023'),
    isPreparation, sqlStr(estrato), isDefaultVariant, sqlStr(f.preparation),
    f.dataIncomplete, sqlStr(source), 'true'
  ];
  return `  (${vals.join(', ')})`;
}

const rawTuples = rawFoods.map((f) =>
  foodTuple(f, { isPreparation: 'false', estrato: null, isDefaultVariant: 'true', source: `TPCA 2023 (INS/CENAN), cód. ${f.code}` })
);
const prepTuples = preparations.map((p) => {
  const source = p.variantCount > 1
    ? `TPCA 2023 (INS/CENAN), Alimentos Preparados, cód. ${p.code}, estrato ${p.estrato}`
    : `TPCA 2023 (INS/CENAN), Alimentos Preparados, cód. ${p.code}`;
  return foodTuple(p, { isPreparation: 'true', estrato: p.estrato, isDefaultVariant: String(Boolean(p.isDefault)), source });
});

const dataSql = [
  '-- Datos generados por scripts/generate-tpca-2023-migration.mjs. No editar a mano:',
  '-- corregir el script y volver a correrlo para regenerar este archivo completo.',
  '',
  `insert into public.foods (${COLS.join(', ')}) values`,
  [...rawTuples, ...prepTuples].join(',\n'),
  'on conflict (slug) do update set',
  '  name = excluded.name, category = excluded.category,',
  '  energy_kcal = excluded.energy_kcal, energy_kj = excluded.energy_kj, water_g = excluded.water_g,',
  '  protein_g = excluded.protein_g, fat_g = excluded.fat_g, carbs_g = excluded.carbs_g,',
  '  carbs_available_g = excluded.carbs_available_g, fiber_g = excluded.fiber_g, ash_g = excluded.ash_g,',
  '  calcium_mg = excluded.calcium_mg, phosphorus_mg = excluded.phosphorus_mg, zinc_mg = excluded.zinc_mg,',
  '  iron_mg = excluded.iron_mg, sodium_mg = excluded.sodium_mg, potassium_mg = excluded.potassium_mg,',
  '  betacarotene_ug = excluded.betacarotene_ug, vitamin_a_ug = excluded.vitamin_a_ug,',
  '  thiamine_mg = excluded.thiamine_mg, riboflavin_mg = excluded.riboflavin_mg, niacin_mg = excluded.niacin_mg,',
  '  vitamin_c_mg = excluded.vitamin_c_mg, folic_acid_ug = excluded.folic_acid_ug,',
  '  tpca_code = excluded.tpca_code, tpca_edition = excluded.tpca_edition,',
  '  is_preparation = excluded.is_preparation, estrato = excluded.estrato,',
  '  is_default_variant = excluded.is_default_variant, preparation = excluded.preparation,',
  '  data_incomplete = excluded.data_incomplete, source = excluded.source,',
  '  is_published = excluded.is_published, updated_at = now();',
  ''
].join('\n');

const schemaSql = fs.readFileSync(SCHEMA_FRAGMENT, 'utf8');
fs.writeFileSync(OUTPUT, schemaSql + '\n' + dataSql);
console.log(`\nMigración escrita en ${path.relative(ROOT, OUTPUT)}`);
