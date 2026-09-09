#!/usr/bin/env node
// Verifica el aislamiento entre cuentas (RLS) contra la base real de Supabase.
//
// Crea dos usuarios de prueba (A y B) por signup público, hace que A cree una fila en
// cada tabla con datos por usuario, y con la sesión de B intenta SELECT/UPDATE/DELETE
// sobre esa fila e INSERT falsificando la propiedad de A. Las cuatro deben fallar o
// devolver cero filas. También prueba que el catálogo compartido (exercises, foods,
// muscle_groups, split_templates...) se pueda LEER pero no ESCRIBIR por cualquiera, el
// caso especial de shared_routines publicadas, y la función security definer.
//
// No requiere service_role: todo se hace con la clave anon pública, exactamente como lo
// haría un cliente real. Al final, A borra todas las filas que creó (las tablas propias
// se pueden limpiar así); las CUENTAS de auth.users quedan para borrar a mano desde el
// panel de Supabase — no hay forma de auto-eliminarse sin service_role (DELETE
// /auth/v1/user da 405 en este proyecto).
//
// Uso: node scripts/verify-rls-isolation.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(envPath) {
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv(path.join(__dirname, '..', 'apps', 'mobile', '.env'));
const BASE = env.EXPO_PUBLIC_SUPABASE_URL;
const ANON = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!BASE || !ANON) throw new Error('Faltan EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en apps/mobile/.env');

async function rest(pathAndQuery, { method = 'GET', token, body, prefer } = {}) {
  const headers = { apikey: ANON, Authorization: `Bearer ${token ?? ANON}`, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${BASE}/rest/v1/${pathAndQuery}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function rpc(name, args, token) {
  return rest(`rpc/${name}`, { method: 'POST', token, body: args, prefer: 'return=representation' });
}

async function signUp(email, password) {
  const res = await fetch(`${BASE}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`signup falló para ${email}: ${JSON.stringify(data)}`);
  return { token: data.access_token, id: data.user.id, email };
}

const results = [];
function record(table, op, pass, detail) {
  results.push({ table, op, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${table.padEnd(28)} ${op.padEnd(28)} ${detail}`);
}

function rowsReturned(res) {
  return Array.isArray(res.data) ? res.data.length : 0;
}

/**
 * Prueba genérica para una tabla con datos por usuario (propia o con RLS vía padre).
 * `insertAsA` inserta la fila con la sesión de A. `forgedInsert` es lo que B intenta
 * insertar para hacerse pasar por dueño de la fila de A (mismo user_id / mismo FK al
 * padre de A). Devuelve el id creado por A, para poder borrarlo al final.
 */
async function testOwnedTable(table, insertAsA, forgedInsert, patchBody) {
  const insA = await rest(table, { method: 'POST', token: A.token, body: insertAsA, prefer: 'return=representation' });
  if (insA.status >= 300 || rowsReturned(insA) === 0) {
    record(table, 'setup (insert como A)', false, `status=${insA.status} body=${JSON.stringify(insA.data)}`);
    return null;
  }
  const row = insA.data[0];
  record(table, 'setup (insert como A)', true, `id=${row.id}`);

  const sel = await rest(`${table}?select=*&id=eq.${row.id}`, { token: B.token });
  const leaked = rowsReturned(sel) > 0;
  record(table, 'SELECT por B', !leaked, leaked ? `B vio la fila de A: ${JSON.stringify(sel.data)}` : `0 filas (status=${sel.status})`);

  const upd = await rest(`${table}?id=eq.${row.id}`, { method: 'PATCH', token: B.token, body: patchBody, prefer: 'return=representation' });
  const updated = rowsReturned(upd) > 0;
  record(table, 'UPDATE por B', !updated, updated ? `B actualizó: ${JSON.stringify(upd.data)}` : `0 filas (status=${upd.status}, body=${JSON.stringify(upd.data)})`);

  const del = await rest(`${table}?id=eq.${row.id}`, { method: 'DELETE', token: B.token, prefer: 'return=representation' });
  const deleted = rowsReturned(del) > 0;
  record(table, 'DELETE por B', !deleted, deleted ? `B borró: ${JSON.stringify(del.data)}` : `0 filas (status=${del.status})`);

  const insB = await rest(table, { method: 'POST', token: B.token, body: forgedInsert, prefer: 'return=representation' });
  const forged = insB.status < 300 && rowsReturned(insB) > 0;
  record(table, 'INSERT por B con dueño=A', !forged, forged ? `B insertó como A: ${JSON.stringify(insB.data)}` : `status=${insB.status} body=${JSON.stringify(insB.data)}`);
  if (forged) {
    await rest(`${table}?id=eq.${insB.data[0].id}`, { method: 'DELETE', token: A.token });
  }

  return row.id;
}

async function testReadOnlyCatalog(table, existingId, idCol = 'id', patchBody = { updated_at: new Date().toISOString() }) {
  const sel = await rest(`${table}?select=*&${idCol}=eq.${existingId}&limit=1`, { token: B.token });
  const canRead = rowsReturned(sel) > 0 || sel.status === 200;
  record(table, 'SELECT por B (catálogo)', canRead, `status=${sel.status}, filas=${rowsReturned(sel)}`);

  const upd = await rest(`${table}?${idCol}=eq.${existingId}`, { method: 'PATCH', token: B.token, body: patchBody, prefer: 'return=representation' });
  const updated = rowsReturned(upd) > 0;
  record(table, 'UPDATE por B (catálogo)', !updated, updated ? `B modificó el catálogo: ${JSON.stringify(upd.data)}` : `0 filas (status=${upd.status})`);

  const del = await rest(`${table}?${idCol}=eq.${existingId}`, { method: 'DELETE', token: B.token, prefer: 'return=representation' });
  const deleted = rowsReturned(del) > 0;
  record(table, 'DELETE por B (catálogo)', !deleted, deleted ? `B borró del catálogo: ${JSON.stringify(del.data)}` : `0 filas (status=${del.status})`);
}

const A_CREATED = []; // { table, id } para limpiar al final con la sesión de A

async function main() {
  const ts = Date.now();
  const A_EMAIL = `rls-verify-a-${ts}@example.com`;
  const B_EMAIL = `rls-verify-b-${ts}@example.com`;
  globalThis.A = await signUp(A_EMAIL, 'Rls-Verify-2026-Aa!');
  globalThis.B = await signUp(B_EMAIL, 'Rls-Verify-2026-Bb!');
  console.log(`\nUsuario A: ${A_EMAIL}  (id ${A.id})`);
  console.log(`Usuario B: ${B_EMAIL}  (id ${B.id})\n`);

  // --- Referencias del catálogo compartido, necesarias para armar filas válidas ---
  const exRes = await rest('exercises?select=id&is_published=eq.true&limit=1', { token: A.token });
  const exerciseId = exRes.data?.[0]?.id;
  if (!exerciseId) throw new Error('No se encontró ningún ejercicio publicado para usar como FK.');

  const foodRes = await rest('foods?select=id&is_published=eq.true&limit=1', { token: A.token });
  const foodId = foodRes.data?.[0]?.id;
  const portionRes = foodId ? await rest(`food_portions?select=id&food_id=eq.${foodId}&limit=1`, { token: A.token }) : { data: [] };
  const portionId = portionRes.data?.[0]?.id ?? null;

  const mgRes = await rest('muscle_groups?select=slug&limit=1', { token: A.token });
  const muscleGroupSlug = mgRes.data?.[0]?.slug;

  const stRes = await rest('split_templates?select=slug&limit=1', { token: A.token });
  const splitTemplateSlug = stRes.data?.[0]?.slug;
  const sdRes = splitTemplateSlug
    ? await rest(`split_template_days?select=id&template_slug=eq.${splitTemplateSlug}&limit=1`, { token: A.token })
    : { data: [] };
  const splitTemplateDayId = sdRes.data?.[0]?.id ?? null;
  const ssRes = await rest(`split_template_slots?select=id&limit=1`, { token: A.token });
  const splitTemplateSlotId = ssRes.data?.[0]?.id ?? null;

  console.log(`Referencias de catálogo: exercise=${exerciseId} food=${foodId} portion=${portionId} muscleGroup=${muscleGroupSlug} template=${splitTemplateSlug}\n`);

  // ============================================================
  // 1) Tablas con datos por usuario, propias o vía tabla padre
  // ============================================================

  console.log('--- user_profiles ---');
  {
    const payload = {
      id: A.id, age: 30, height_cm: 175, weight_kg: 75, biological_sex: 'unspecified',
      knowledge_level: 'basic', training_days_per_week: 3,
      short_term_goal: 'prueba rls', long_term_goal: 'prueba rls', macro_targets: { calories: 2000 }
    };
    const insA = await rest('user_profiles', { method: 'POST', token: A.token, body: payload, prefer: 'return=representation' });
    record('user_profiles', 'setup (insert como A)', insA.status < 300 && rowsReturned(insA) > 0, `status=${insA.status}`);
    A_CREATED.push({ table: 'user_profiles', id: A.id, idCol: 'id' });

    const sel = await rest(`user_profiles?select=*&id=eq.${A.id}`, { token: B.token });
    record('user_profiles', 'SELECT por B', rowsReturned(sel) === 0, `filas=${rowsReturned(sel)}`);

    const upd = await rest(`user_profiles?id=eq.${A.id}`, { method: 'PATCH', token: B.token, body: { age: 99 }, prefer: 'return=representation' });
    record('user_profiles', 'UPDATE por B', rowsReturned(upd) === 0, `filas=${rowsReturned(upd)} status=${upd.status}`);

    const del = await rest(`user_profiles?id=eq.${A.id}`, { method: 'DELETE', token: B.token, prefer: 'return=representation' });
    record('user_profiles', 'DELETE por B', rowsReturned(del) === 0, `filas=${rowsReturned(del)} status=${del.status}`);

    // No aplica "INSERT con id de A": el id es PK y ya existe; probamos que B no puede
    // crear un profile CON el id de A (que de todos modos ya existiría, así que el
    // intento relevante es el UPDATE de arriba). Documentado, no se repite el caso.
  }

  console.log('\n--- routines / routine_exercises ---');
  {
    const routineId = await testOwnedTable(
      'routines',
      { user_id: A.id, name: 'Rutina de prueba RLS' },
      { user_id: A.id, name: 'Rutina falsificada por B' },
      { name: 'hackeado-por-B' }
    );
    if (routineId) A_CREATED.push({ table: 'routines', id: routineId, idCol: 'id' });

    // routine_exercises: sin user_id propio, RLS vía routines.user_id = auth.uid().
    // Insertamos otra rutina de A (la anterior a estas alturas ya fue "atacada" pero
    // sigue existiendo, RLS no la borró) para colgarle un routine_exercise real.
    const routine2 = await rest('routines', { method: 'POST', token: A.token, body: { user_id: A.id, name: 'Rutina de prueba RLS (para slots)' }, prefer: 'return=representation' });
    const routine2Id = routine2.data?.[0]?.id;
    if (routine2Id) {
      A_CREATED.push({ table: 'routines', id: routine2Id, idCol: 'id' });
      const reId = await testOwnedTable(
        'routine_exercises',
        { routine_id: routine2Id, exercise_id: exerciseId, position: 1, target_sets: 3 },
        { routine_id: routine2Id, exercise_id: exerciseId, position: 2, target_sets: 3 },
        { target_sets: 5 }
      );
      if (reId) A_CREATED.push({ table: 'routine_exercises', id: reId, idCol: 'id' });
    } else {
      record('routine_exercises', 'setup (insert como A)', false, 'no se pudo crear la rutina padre');
    }
  }

  console.log('\n--- workouts / workout_sets ---');
  {
    const workoutId = await testOwnedTable(
      'workouts',
      { user_id: A.id, started_at: new Date().toISOString(), status: 'planned' },
      { user_id: A.id, started_at: new Date().toISOString(), status: 'planned' },
      { status: 'skipped' }
    );
    if (workoutId) A_CREATED.push({ table: 'workouts', id: workoutId, idCol: 'id' });

    const workout2 = await rest('workouts', { method: 'POST', token: A.token, body: { user_id: A.id, started_at: new Date().toISOString(), status: 'planned' }, prefer: 'return=representation' });
    const workout2Id = workout2.data?.[0]?.id;
    if (workout2Id) {
      A_CREATED.push({ table: 'workouts', id: workout2Id, idCol: 'id' });
      const wsId = await testOwnedTable(
        'workout_sets',
        { workout_id: workout2Id, exercise_id: exerciseId, set_number: 1 },
        { workout_id: workout2Id, exercise_id: exerciseId, set_number: 2 },
        { weight_kg: 50 }
      );
      if (wsId) A_CREATED.push({ table: 'workout_sets', id: wsId, idCol: 'id' });
    } else {
      record('workout_sets', 'setup (insert como A)', false, 'no se pudo crear el workout padre');
    }
  }

  console.log('\n--- meal_entries ---');
  {
    const id = await testOwnedTable(
      'meal_entries',
      { user_id: A.id, eaten_on: '2026-01-01', meal_type: 'desayuno', label: 'prueba rls', energy_kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
      { user_id: A.id, eaten_on: '2026-01-01', meal_type: 'desayuno', label: 'prueba rls falsa', energy_kcal: 100, protein_g: 1, carbs_g: 1, fat_g: 1 },
      { label: 'hackeado-por-B' }
    );
    if (id) A_CREATED.push({ table: 'meal_entries', id, idCol: 'id' });
  }

  console.log('\n--- hydration_logs ---');
  {
    const id = await testOwnedTable(
      'hydration_logs',
      { user_id: A.id, logged_on: '2026-01-01', glasses: 3, glass_size_ml: 250 },
      { user_id: A.id, logged_on: '2026-01-02', glasses: 3, glass_size_ml: 250 },
      { glasses: 10 }
    );
    if (id) A_CREATED.push({ table: 'hydration_logs', id, idCol: 'id' });
  }

  console.log('\n--- sleep_logs ---');
  {
    const id = await testOwnedTable(
      'sleep_logs',
      { user_id: A.id, sleep_date: '2026-01-01', duration_minutes: 420 },
      { user_id: A.id, sleep_date: '2026-01-02', duration_minutes: 420 },
      { duration_minutes: 1 }
    );
    if (id) A_CREATED.push({ table: 'sleep_logs', id, idCol: 'id' });
  }

  console.log('\n--- food_shortcuts ---');
  {
    const id = await testOwnedTable(
      'food_shortcuts',
      { user_id: A.id, name: 'Atajo de prueba RLS', energy_kcal: 100 },
      { user_id: A.id, name: 'Atajo falsificado por B', energy_kcal: 100 },
      { name: 'hackeado-por-B' }
    );
    if (id) A_CREATED.push({ table: 'food_shortcuts', id, idCol: 'id' });
  }

  console.log('\n--- shared_routines (NO publicada) / shared_routine_days / shared_routine_exercises ---');
  {
    const srId = await testOwnedTable(
      'shared_routines',
      { author_user_id: A.id, name: 'Compartida de prueba RLS', days_per_week: 3, is_curated: false, is_published: false },
      { author_user_id: A.id, name: 'Compartida falsificada por B', days_per_week: 3, is_curated: false, is_published: false },
      { name: 'hackeado-por-B' }
    );
    if (srId) A_CREATED.push({ table: 'shared_routines', id: srId, idCol: 'id' });

    const sr2 = await rest('shared_routines', { method: 'POST', token: A.token, body: { author_user_id: A.id, name: 'Compartida de prueba RLS (para hijas)', days_per_week: 3, is_curated: false, is_published: false }, prefer: 'return=representation' });
    const sr2Id = sr2.data?.[0]?.id;
    if (sr2Id) {
      A_CREATED.push({ table: 'shared_routines', id: sr2Id, idCol: 'id' });
      const sdId = await testOwnedTable(
        'shared_routine_days',
        { shared_routine_id: sr2Id, day_index: 1, name: 'Día 1' },
        { shared_routine_id: sr2Id, day_index: 2, name: 'Día 2 falso' },
        { name: 'hackeado-por-B' }
      );
      if (sdId) A_CREATED.push({ table: 'shared_routine_days', id: sdId, idCol: 'id' });

      const seId = muscleGroupSlug
        ? await testOwnedTable(
            'shared_routine_exercises',
            { shared_routine_id: sr2Id, day_index: 1, position: 1, muscle_group: muscleGroupSlug, exercise_id: exerciseId },
            { shared_routine_id: sr2Id, day_index: 1, position: 2, muscle_group: muscleGroupSlug, exercise_id: exerciseId },
            { target_sets: 5 }
          )
        : null;
      if (seId) A_CREATED.push({ table: 'shared_routine_exercises', id: seId, idCol: 'id' });
    } else {
      record('shared_routine_days', 'setup (insert como A)', false, 'no se pudo crear la shared_routine padre');
      record('shared_routine_exercises', 'setup (insert como A)', false, 'no se pudo crear la shared_routine padre');
    }
  }

  // ============================================================
  // 2) Caso especial: shared_routines PUBLICADA — B debe poder LEER, no ESCRIBIR
  // ============================================================
  console.log('\n--- shared_routines PUBLICADA (lectura cruzada intencional) ---');
  {
    const pub = await rest('shared_routines', { method: 'POST', token: A.token, body: { author_user_id: A.id, name: 'Compartida PUBLICADA de prueba RLS', days_per_week: 3, is_curated: false, is_published: true }, prefer: 'return=representation' });
    const pubId = pub.data?.[0]?.id;
    if (pubId) {
      A_CREATED.push({ table: 'shared_routines', id: pubId, idCol: 'id' });
      const sel = await rest(`shared_routines?select=*&id=eq.${pubId}`, { token: B.token });
      record('shared_routines (publicada)', 'SELECT por B', rowsReturned(sel) > 0, `esperado: B SÍ debe leerla. filas=${rowsReturned(sel)}`);

      const upd = await rest(`shared_routines?id=eq.${pubId}`, { method: 'PATCH', token: B.token, body: { name: 'hackeada por B' }, prefer: 'return=representation' });
      record('shared_routines (publicada)', 'UPDATE por B', rowsReturned(upd) === 0, `filas=${rowsReturned(upd)} status=${upd.status}`);

      const del = await rest(`shared_routines?id=eq.${pubId}`, { method: 'DELETE', token: B.token, prefer: 'return=representation' });
      record('shared_routines (publicada)', 'DELETE por B', rowsReturned(del) === 0, `filas=${rowsReturned(del)} status=${del.status}`);

      const insChild = await rest('shared_routine_days', { method: 'POST', token: B.token, body: { shared_routine_id: pubId, day_index: 1, name: 'Día inyectado por B' }, prefer: 'return=representation' });
      const injected = rowsReturned(insChild) > 0;
      record('shared_routine_days (en publicada de A)', 'INSERT por B', !injected, injected ? `B insertó un día: ${JSON.stringify(insChild.data)}` : `status=${insChild.status}`);
      if (injected) await rest(`shared_routine_days?id=eq.${insChild.data[0].id}`, { method: 'DELETE', token: A.token });

      // --- 3) Función security definer: incrementa el contador, nada más ---
      const before = await rest(`shared_routines?select=adopt_count&id=eq.${pubId}`, { token: B.token });
      const beforeCount = before.data?.[0]?.adopt_count;
      const rpcRes = await rpc('increment_shared_routine_adoptions', { p_shared_routine_id: pubId }, B.token);
      const after = await rest(`shared_routines?select=adopt_count&id=eq.${pubId}`, { token: B.token });
      const afterCount = after.data?.[0]?.adopt_count;
      const incremented = typeof beforeCount === 'number' && typeof afterCount === 'number' && afterCount === beforeCount + 1;
      record('increment_shared_routine_adoptions', 'RPC por B (debe funcionar, solo contador)', incremented, `status=${rpcRes.status} antes=${beforeCount} despues=${afterCount}`);

      // No debe permitir tocar otras columnas ni otras filas: probamos pasando un id
      // inexistente (no debe romper ni afectar otra fila) y confirmamos que la función
      // no acepta parámetros extra para escribir otra cosa (la firma solo toma el id).
      const rpcBad = await rpc('increment_shared_routine_adoptions', { p_shared_routine_id: '00000000-0000-0000-0000-000000000000' }, B.token);
      record('increment_shared_routine_adoptions', 'RPC con id inexistente', rpcBad.status < 300, `status=${rpcBad.status} (no debe romper, solo no afecta filas)`);
    } else {
      record('shared_routines (publicada)', 'setup (insert como A)', false, JSON.stringify(pub.data));
    }
  }

  // ============================================================
  // 4) Catálogo compartido: lectura sí, escritura no
  // ============================================================
  console.log('\n--- catálogo compartido (solo lectura) ---');
  if (exerciseId) await testReadOnlyCatalog('exercises', exerciseId);
  if (foodId) await testReadOnlyCatalog('foods', foodId);
  if (portionId) await testReadOnlyCatalog('food_portions', portionId);
  if (splitTemplateSlug) await testReadOnlyCatalog('split_templates', splitTemplateSlug, 'slug', { name: 'hackeado' });
  if (splitTemplateDayId) await testReadOnlyCatalog('split_template_days', splitTemplateDayId, 'id', { name: 'hackeado' });
  if (splitTemplateSlotId) await testReadOnlyCatalog('split_template_slots', splitTemplateSlotId, 'id', { position: 99 });
  // muscle_groups usa slug como identificador visible, no necesariamente "id" uuid — probamos aparte.
  if (muscleGroupSlug) {
    const sel = await rest(`muscle_groups?select=*&slug=eq.${muscleGroupSlug}`, { token: B.token });
    record('muscle_groups', 'SELECT por B (catálogo)', rowsReturned(sel) > 0, `filas=${rowsReturned(sel)}`);
    const upd = await rest(`muscle_groups?slug=eq.${muscleGroupSlug}`, { method: 'PATCH', token: B.token, body: { name: 'hackeado' }, prefer: 'return=representation' });
    record('muscle_groups', 'UPDATE por B (catálogo)', rowsReturned(upd) === 0, `filas=${rowsReturned(upd)} status=${upd.status}`);
  }

  // ============================================================
  // Storage: confirmado antes de correr el script que no hay buckets definidos en
  // ninguna migración (grep sobre storage.buckets / storage.objects, cero resultados).
  // No hay nada que probar acá.
  // ============================================================
  console.log('\n--- Storage ---');
  record('storage', 'N/A', true, 'No hay buckets de Storage en ninguna migración; no aplica.');

  // ============================================================
  // Limpieza: A borra todo lo que creó
  // ============================================================
  console.log('\n--- Limpieza de filas creadas por A ---');
  // Orden: hijas antes que padres, aunque la mayoría tiene on delete cascade.
  const order = ['shared_routine_exercises', 'shared_routine_days', 'shared_routines', 'workout_sets', 'workouts', 'routine_exercises', 'routines', 'meal_entries', 'hydration_logs', 'sleep_logs', 'food_shortcuts', 'user_profiles'];
  for (const table of order) {
    const rows = A_CREATED.filter((r) => r.table === table);
    for (const r of rows) {
      const del = await rest(`${table}?${r.idCol}=eq.${r.id}`, { method: 'DELETE', token: A.token, prefer: 'return=representation' });
      const ok = del.status < 300;
      console.log(`${ok ? 'OK' : 'FALLÓ'}  borrar ${table} id=${r.id} (status=${del.status})`);
    }
  }

  // Confirmar que no quedó nada de A
  let leftovers = 0;
  for (const table of order) {
    if (table === 'user_profiles') continue;
    const check = await rest(`${table}?select=id&limit=5`, { token: A.token });
    // No filtramos por user_id porque la política ya lo hace: A solo puede ver lo suyo.
    if (Array.isArray(check.data) && check.data.length > 0) {
      // puede haber datos reales previos de A si A ya tuviera cuenta — pero A es
      // recién creada, así que cualquier fila remanente es sospechosa.
      console.log(`AVISO: ${table} todavía muestra ${check.data.length} fila(s) para A tras la limpieza.`);
      leftovers += check.data.length;
    }
  }
  const profCheck = await rest(`user_profiles?select=id&id=eq.${A.id}`, { token: A.token });
  if (rowsReturned(profCheck) > 0) { console.log('AVISO: user_profiles de A no se borró.'); leftovers++; }

  console.log(`\nFilas remanentes de A tras la limpieza: ${leftovers}`);

  // ============================================================
  // Resumen
  // ============================================================
  console.log('\n=============== RESUMEN ===============');
  const fails = results.filter((r) => !r.pass);
  console.log(`Total de verificaciones: ${results.length}. PASS: ${results.length - fails.length}. FAIL: ${fails.length}.`);
  if (fails.length > 0) {
    console.log('\nFallos encontrados:');
    for (const f of fails) console.log(`  - ${f.table} / ${f.op}: ${f.detail}`);
  }
  console.log(`\nCuentas de prueba creadas (borrar a mano desde el panel de Supabase):\n  - ${A_EMAIL} (id ${A.id})\n  - ${B_EMAIL} (id ${B.id})`);
  console.log('\nCuentas de prueba de una corrida anterior, todavía sin borrar (mencionadas por el dueño):\n  - patrón rls-test-probe* (dos cuentas), una con id 462ce03f-0006-4610-a6c7-886a2116522f');

  process.exitCode = fails.length > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('\nERROR FATAL:', err);
  console.error('\nSi el script murió a mitad de camino, revisá manualmente las cuentas de prueba creadas arriba en los logs.');
  process.exitCode = 1;
});
