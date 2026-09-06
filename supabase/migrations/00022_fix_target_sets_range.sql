-- Fija target_sets en 3 series efectivas por ejercicio, siempre.
--
-- Decisión de producto, documentada con su costo en docs/rutinas.md (§1.1): antes
-- target_sets variaba de 2 a 4 según el rol del ejercicio (compuesto principal vs.
-- accesorio). Se fija a 3 en todos los casos, misma lógica que el rango de
-- repeticiones fijo de 8-12 (docs/progression.md, migración 00021): una sola regla
-- que un principiante pueda memorizar, aceptando que algunos ejercicios pierden
-- volumen semanal frente al esquema anterior.
--
-- Toca dos tablas:
--   1. split_template_slots: datos de referencia compartidos que usa cualquier
--      rutina nueva armada desde un template. Si esto se dejara en 4, cada rutina
--      nueva volvería a nacer con el problema.
--   2. routine_exercises, pero SOLO para la rutina personal del dueño del repo
--      ("La rutina para estar como cbum", routine_id de abajo) — es su propia
--      rutina ya armada, no una migración masiva sobre rutinas de otros usuarios.
--
-- El default de la columna (3, fijado en 00007_routines.sql) y el fallback de la
-- app para sesiones sin rutina (EFFECTIVE_SETS_PER_EXERCISE en setDrafts.ts) ya
-- eran 3; esta migración corrige los datos que no coincidían con ese default.

update public.split_template_slots
set target_sets = 3
where target_sets <> 3;

update public.routine_exercises
set target_sets = 3
where routine_id = '2a5375fb-9a62-482f-9a52-8508141ca7c8'
  and target_sets <> 3;
