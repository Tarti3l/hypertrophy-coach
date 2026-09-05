-- Descansos: entre series y al cambiar de ejercicio.
--
-- Hasta ahora la app usaba 90 s fijos para todo. La evidencia dice que eso se queda
-- corto en los compuestos pesados:
--
--   Schoenfeld et al. (2016), JSCR 30(7):1805-1812. 21 hombres entrenados, 8 semanas.
--   Descansar 3 min contra 1 min dio más grosor muscular (tríceps +7.0%, cuádriceps
--   anterior +13.3%) y bastante más fuerza (press banca +12.7%, sentadilla +15.2%
--   contra +7.6% del grupo de 1 min).
--
--   Grgic, Schoenfeld, Skrepnik, Davies & Mikulic (2017), Sports Medicine 47:1803-1817.
--   23 estudios, 491 participantes: en entrenados hacen falta >2 min para maximizar la
--   fuerza; en principiantes, 60-120 s bastan.
--
--   Schoenfeld et al. (2024), Frontiers in Sports and Active Living, meta-análisis
--   bayesiano de 9 estudios: hay un beneficio pequeño de descansar >60 s, pero
--   "no detectamos diferencias apreciables al descansar más de 90 s entre series"
--   para hipertrofia. Es decir: para crecer, 90 s ya sirve; los 2-3 min son sobre todo
--   para no perder fuerza en los compuestos.
--
-- Conclusión que aplicamos: descansos más largos en los compuestos (150-180 s) y
-- 90 s en los aislamientos. Todo editable por el usuario.
--
-- El descanso AL CAMBIAR DE EJERCICIO no tiene literatura propia: nadie lo ha
-- estudiado por separado. Lo tratamos como un descanso entre series algo más largo,
-- porque hay que montar la máquina o cambiar los discos, y así lo etiquetamos en la app.

alter table public.exercises
  add column if not exists default_transition_seconds smallint
    check (default_transition_seconds between 15 and 600);

comment on column public.exercises.default_transition_seconds is
  'Descanso sugerido al pasar al siguiente ejercicio. Sin respaldo experimental propio: nadie ha estudiado el descanso entre ejercicios por separado. Es el de entre series, un poco más largo.';

alter table public.routine_exercises
  add column if not exists transition_seconds smallint
    check (transition_seconds between 15 and 600);

comment on column public.routine_exercises.transition_seconds is
  'Lo que el usuario eligió para el cambio de ejercicio. null usa el valor por defecto del ejercicio.';

-- ---------------------------------------------------------------------------
-- Valores por defecto del catálogo
-- ---------------------------------------------------------------------------

-- Aislamientos: 90 s entre series. Por encima de eso, el meta-análisis de 2024 no
-- encuentra más hipertrofia, y alargar el descanso solo alarga la sesión.
update public.exercises set
  default_rest_seconds = 90,
  default_transition_seconds = 120,
  updated_at = now()
where is_compound = false and muscle_group is not null and muscle_group <> 'cardio';

-- Compuestos: 150 s. Los estudios de fuerza piden más de 2 min en entrenados.
update public.exercises set
  default_rest_seconds = 150,
  default_transition_seconds = 180,
  updated_at = now()
where is_compound = true and muscle_group is not null and muscle_group <> 'cardio';

-- Los compuestos pesados con barra: 180 s. Son los que más pierden con poco descanso
-- (sentadilla -15.2% contra -7.6% de mejora en el estudio de Schoenfeld 2016).
update public.exercises set
  default_rest_seconds = 180,
  default_transition_seconds = 210,
  updated_at = now()
where slug in (
  'back-squat', 'deep-squat-glute', 'barbell-bench-press', 'overhead-press',
  'barbell-row', 'romanian-deadlift', 'hip-thrust'
);

-- El abdomen y la plancha no necesitan tanto: son series cortas y poco sistémicas.
update public.exercises set
  default_rest_seconds = 60,
  default_transition_seconds = 90,
  updated_at = now()
where muscle_group in ('abs', 'antebrazo');

-- El cardio no lleva descanso entre series.
update public.exercises set
  default_rest_seconds = null,
  default_transition_seconds = null,
  updated_at = now()
where muscle_group = 'cardio';

-- ---------------------------------------------------------------------------
-- Refrescar el schema cache de PostgREST.
--
-- Sin esto, la API sigue respondiendo PGRST205 ("Could not find the table ... in the
-- schema cache") durante un rato después de aplicar la migración, y la app muestra un
-- error de carga aunque las tablas ya existan.
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
