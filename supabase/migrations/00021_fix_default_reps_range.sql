-- Corrige el rango de repeticiones por defecto de 9 ejercicios a 8-12.
--
-- Decisión de producto (no un hallazgo a medias): esta app entrena siempre al fallo
-- en el rango de 8 a 12 repeticiones, para que un principiante aprenda una sola regla
-- en vez de un rango distinto por ejercicio. Rangos más altos para trabajo de
-- aislamiento son válidos en la literatura en general, pero programarlos queda fuera
-- de alcance a propósito — ver docs/progression.md.
--
-- Esta migración corrige solo los casos que rompen esa regla y que NO son aislamiento
-- (donde "rango más alto, fuera de alcance" ya los cubre sin tocar nada):
--
--   1. 'pec-deck' (10-15): el caso puntual que expuso el problema — bloqueaba el
--      item [12] de docs/plan.md, mostrando "Apunta a 15 reps" mientras el chequeo de
--      dificultad en sesión (SetTracker.tsx, rango 8-12 fijo) avisaba de subir peso
--      tres repeticiones antes de ese objetivo.
--   2. Seis compuestos pesados con rango de fuerza clásico (6-10): 'barbell-bench-press',
--      'overhead-press', 'barbell-row', 'back-squat', 'front-squat', 'deep-squat-glute'.
--      No son aislamiento — son los básicos de cualquier rutina para principiantes — así
--      que la excepción de "rango más alto para aislamiento" no los cubre.
--   3. Dos variantes de peso corporal con piso bajo (4-8 y 5-10): 'nordic-curl' y
--      'assisted-pull-up'.
--
-- Deliberadamente NO toca los ~54 ejercicios de aislamiento con techo alto (curls,
-- extensiones, elevaciones, pantorrilla, abdominales, etc. — 10-20 típico), que quedan
-- fuera de alcance por la misma decisión de producto, ni 'farmers-walk' / 'plank', que
-- no se miden en repeticiones al fallo (tiempo/distancia).

update public.exercises
set default_reps_low = 8, default_reps_high = 12
where slug in (
  'pec-deck',
  'barbell-bench-press', 'overhead-press', 'barbell-row',
  'back-squat', 'front-squat', 'deep-squat-glute',
  'nordic-curl', 'assisted-pull-up'
);
