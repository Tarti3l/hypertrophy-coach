-- Descansos que pidió el usuario: 90 s entre series, 2-3 min al cambiar de ejercicio.
--
-- La 00012 ponía 150-180 s entre series en los compuestos, apoyándose en Schoenfeld
-- et al. (2016), donde descansar 3 min contra 1 min dio más fuerza (sentadilla +15.2%
-- contra +7.6%) y más grosor muscular. Ese estudio sigue siendo válido, pero mide algo
-- que no es el objetivo de esta app.
--
-- Para HIPERTROFIA, que es lo que la app entrena, el meta-análisis bayesiano de
-- Schoenfeld et al. (2024), Frontiers in Sports and Active Living, con 9 estudios,
-- concluye que "no detectamos diferencias apreciables al descansar más de 90 s entre
-- series". Es decir: 90 s ya captura el beneficio, y alargar más solo alarga la sesión.
--
-- Así que 90 s entre series está bien respaldado para este objetivo. El matiz honesto,
-- que la app sigue mostrando en el constructor: en los compuestos pesados, descansos
-- más largos conservan más fuerza, y menos fuerza en las series 3 y 4 significa menos
-- volumen de calidad. Si alguien nota que se le caen mucho las repeticiones de la
-- primera a la última serie, subirlo a 2 min es razonable — por eso es editable.
--
-- Entre EJERCICIOS se mantienen 2-3 min. Ahí no hay literatura propia (nadie ha
-- estudiado el descanso entre ejercicios por separado), y el tiempo se va de todos
-- modos en montar la máquina o cambiar los discos.

-- ---------------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------------

-- 90 s entre series para todo lo que no sea cardio.
update public.exercises set
  default_rest_seconds = 90,
  updated_at = now()
where muscle_group is not null and muscle_group <> 'cardio';

-- 3 min al cambiar, en los compuestos: son los que más tardan en montarse.
update public.exercises set
  default_transition_seconds = 180,
  updated_at = now()
where is_compound = true and muscle_group is not null and muscle_group <> 'cardio';

-- 2 min al cambiar, en los aislamientos.
update public.exercises set
  default_transition_seconds = 120,
  updated_at = now()
where is_compound = false and muscle_group is not null and muscle_group <> 'cardio';

update public.exercises set
  default_rest_seconds = null,
  default_transition_seconds = null,
  updated_at = now()
where muscle_group = 'cardio';

-- ---------------------------------------------------------------------------
-- Rutinas ya guardadas
--
-- routine_exercises copió los valores viejos al crearse, así que sin esto el usuario
-- seguiría viendo 2:30 en su rutina actual aunque el catálogo ya diga otra cosa.
-- Se reescriben solo las filas que tienen exactamente los valores por defecto de la
-- 00012: si alguien ya ajustó un descanso a mano, ese ajuste se respeta.
-- ---------------------------------------------------------------------------

update public.routine_exercises re set
  rest_seconds = 90
from public.exercises e
where re.exercise_id = e.id
  and re.rest_seconds in (150, 180, 60)
  and e.muscle_group is not null
  and e.muscle_group <> 'cardio';

update public.routine_exercises re set
  transition_seconds = case when e.is_compound then 180 else 120 end
from public.exercises e
where re.exercise_id = e.id
  and re.transition_seconds in (90, 120, 180, 210)
  and e.muscle_group is not null
  and e.muscle_group <> 'cardio';

notify pgrst, 'reload schema';
