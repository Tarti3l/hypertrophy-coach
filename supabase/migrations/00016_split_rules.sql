-- Distribuciones rehechas con reglas explícitas.
--
-- Problemas que arregla, todos detectados por el usuario viendo la app:
--
--   1. HOMBROS SALÍA DOS VECES. El pájaro (deltoides posterior) estaba en el día de
--      espalda. Cuando toca hombro se trabajan sus TRES porciones el mismo día:
--      anterior (press), lateral (elevación) y posterior (pájaro).
--   2. HABÍA DÍAS CON 4 GRUPOS. Ahora el máximo son 3, y el tercero solo se permite si
--      cumple una de dos condiciones (ver más abajo).
--   3. NADA DE REPETIR MÚSCULOS, salvo los de prioridad estética alta.
--
-- ---------------------------------------------------------------------------
-- LAS REGLAS
-- ---------------------------------------------------------------------------
--
-- R1. Dos grupos musculares por día. Se admite un tercero solo si:
--     (a) es un grupo pequeño —antebrazo, pantorrilla, abdomen—, que necesita poco
--         volumen y apenas suma fatiga; o
--     (b) ya lo trabajan los compuestos de ese día: el tríceps en un día de empuje,
--         el bíceps en uno de tirón. Ahí el trabajo directo solo lo remata.
--
-- R2. Ningún músculo se repite en la semana, salvo los de prioridad estética alta.
--
-- R3. Los días de pierna llevan al menos 2 días de descanso entre ellos.
--
-- R4. Se alterna torso y pierna siempre que el número de días lo permita.
--
-- ---------------------------------------------------------------------------
-- PRIORIDAD ESTÉTICA: qué es y qué NO es
-- ---------------------------------------------------------------------------
--
-- La app apunta a físicos estéticos, así que algunos músculos reciben algo más de
-- volumen y son los únicos que pueden repetirse en la semana.
--
-- ESTO ES UN CRITERIO DE APARIENCIA, NO UN HALLAZGO CIENTÍFICO. No existe ningún
-- estudio que diga qué músculos "hay que priorizar": la literatura habla de respuesta
-- al volumen, no de qué se ve bien. La jerarquía sale de una convención muy extendida
-- —hombro ancho y espalda ancha con cintura estrecha— y la app la etiqueta como tal
-- para que el usuario sepa que puede no compartirla y cambiarla.
--
-- Lo único con respaldo aquí es el rango de volumen en sí: 6-10 series semanales para
-- quien empieza y 12-20 para entrenados (Iversen et al. 2021, Sports Medicine
-- 51(10):2079-2095; Baz-Valle et al. 2022, Journal of Human Kinetics 81:199-210).
-- Priorizar significa moverse dentro de ese rango, no salirse de él.

alter table public.muscle_groups
  add column if not exists is_small boolean not null default false,
  add column if not exists aesthetic_priority smallint not null default 2
    check (aesthetic_priority between 1 and 3);

comment on column public.muscle_groups.is_small is
  'Grupos que necesitan poco volumen y suman poca fatiga: pueden ser el tercer grupo de un día.';

comment on column public.muscle_groups.aesthetic_priority is
  '1 alta, 2 media, 3 baja. Criterio de apariencia, no científico. Solo los de prioridad 1 pueden repetirse en la semana.';

-- Prioridad alta: los que definen la silueta.
update public.muscle_groups set aesthetic_priority = 1, beginner_sets_min = 8, beginner_sets_max = 12
where slug in ('hombros', 'espalda', 'pecho', 'gluteos');

-- Prioridad media.
update public.muscle_groups set aesthetic_priority = 2, beginner_sets_min = 6, beginner_sets_max = 10
where slug in ('biceps', 'triceps', 'cuadriceps', 'femorales');

-- Grupos pequeños: poco volumen, poca fatiga, pueden ir de tercer grupo.
update public.muscle_groups set is_small = true, aesthetic_priority = 3, beginner_sets_min = 2, beginner_sets_max = 6
where slug in ('antebrazo', 'pantorrilla');

update public.muscle_groups set is_small = true, aesthetic_priority = 2, beginner_sets_min = 4, beginner_sets_max = 8
where slug = 'abs';

-- ---------------------------------------------------------------------------
-- Se rearman los tres splits desde cero.
-- ---------------------------------------------------------------------------

delete from public.split_template_days
where template_slug in ('empuje-pierna-tiron-3', 'upper-lower-4', 'ppl-ul-5');

update public.split_templates set
  name = 'Torso · Pierna · Torso',
  summary = 'Dos días de torso y uno de pierna completa.',
  rationale =
    'Con tres días la pierna va entera en un día y el torso se parte en empuje y tirón. '
    || 'Aviso honesto: a tres días no se puede respetar el máximo de tres grupos por sesión. '
    || 'Once grupos musculares no caben en tres días de dos o tres grupos, así que el día de '
    || 'pierna lleva cuatro y el de tirón también. Si quieres sesiones más cortas y ordenadas, '
    || 'cuatro o cinco días es lo que lo permite.'
where slug = 'empuje-pierna-tiron-3';

update public.split_templates set
  name = 'Pierna · Torso · Torso · Pierna',
  summary = 'Dos días de pierna en los extremos y dos de torso en medio.',
  rationale =
    'La pierna va el primer y el último día para dejar dos días completos de descanso entre '
    || 'ambas sesiones. Entre medias, torso partido en empuje y tirón. Los glúteos son el único '
    || 'músculo que se repite: aparecen los dos días de pierna.'
where slug = 'upper-lower-4';

update public.split_templates set
  name = 'Torso · Pierna · Torso · Torso · Pierna',
  summary = 'Tres días de torso y dos de pierna, con dos grupos musculares por día.',
  rationale =
    'Cinco días es donde las reglas encajan sin forzar nada: dos grupos por día (tres solo si '
    || 'el tercero es pequeño o ya lo trabajan los compuestos del día), ningún músculo repetido '
    || 'salvo los glúteos, y dos días completos de descanso entre las dos sesiones de pierna. '
    || 'El hombro lleva sus tres porciones el mismo día en vez de repartirse por la semana.'
where slug = 'ppl-ul-5';

-- ---------------------------------------------------------------------------
-- 3 días
-- ---------------------------------------------------------------------------

insert into public.split_template_days (template_slug, day_index, name, day_kind, focus_groups, pairing_rationale) values
('empuje-pierna-tiron-3', 1, 'Torso · Empuje', 'torso', array['pecho','hombros','triceps']::public.muscle_group[],
 'Pecho y hombros son los dos grupos del día; el tríceps entra de tercero porque el press ya lo trabaja y aquí solo se remata. El hombro lleva sus tres porciones: press para la anterior, elevación lateral para la media y pájaro para la posterior.'),
('empuje-pierna-tiron-3', 2, 'Pierna completa', 'pierna', array['cuadriceps','femorales','gluteos','pantorrilla']::public.muscle_group[],
 'A tres días la pierna entera cabe en un solo día, y eso obliga a meter cuatro grupos. Es la excepción a la regla de tres, y el motivo es aritmético: no hay más días donde repartirla.'),
('empuje-pierna-tiron-3', 3, 'Torso · Tirón', 'torso', array['espalda','biceps','antebrazo','abs']::public.muscle_group[],
 'Espalda y bíceps son el par del día; antebrazo y abdomen entran porque son grupos pequeños que apenas suman fatiga. El bíceps va después de los remos, no antes, para no llegar a ellos con el brazo cansado.');

-- ---------------------------------------------------------------------------
-- 4 días
-- ---------------------------------------------------------------------------

insert into public.split_template_days (template_slug, day_index, name, day_kind, focus_groups, pairing_rationale) values
('upper-lower-4', 1, 'Pierna A · Cuádriceps', 'pierna', array['cuadriceps','gluteos','pantorrilla']::public.muscle_group[],
 'Cuádriceps y glúteos son el par del día; la pantorrilla entra de tercera porque es un grupo pequeño. Va el primer día para que queden dos días completos hasta la otra sesión de pierna.'),
('upper-lower-4', 2, 'Torso · Empuje', 'torso', array['pecho','hombros','triceps']::public.muscle_group[],
 'Pecho y hombros, con el tríceps de remate porque los press ya lo trabajan. El hombro lleva sus tres porciones el mismo día.'),
('upper-lower-4', 3, 'Torso · Tirón', 'torso', array['espalda','biceps','antebrazo']::public.muscle_group[],
 'Espalda y bíceps, con antebrazo de tercero por ser pequeño. Los remos van primero: con el bíceps fresco puedes tirar más.'),
('upper-lower-4', 4, 'Pierna B · Femorales', 'pierna', array['femorales','gluteos','abs']::public.muscle_group[],
 'Femorales y glúteos, con abdomen de tercero. Los glúteos repiten desde el día 1 porque son de los que más definen la silueta; entre ambas sesiones hay dos días de descanso.');

-- ---------------------------------------------------------------------------
-- 5 días
-- ---------------------------------------------------------------------------

insert into public.split_template_days (template_slug, day_index, name, day_kind, focus_groups, pairing_rationale) values
('ppl-ul-5', 1, 'Torso · Pecho y hombros', 'torso', array['pecho','hombros']::public.muscle_group[],
 'Dos grupos, los dos de prioridad alta. El hombro lleva sus tres porciones aquí y no vuelve a aparecer en la semana: press para la anterior, elevación lateral para la media y pájaro para la posterior.'),
('ppl-ul-5', 2, 'Pierna A · Cuádriceps y glúteos', 'pierna', array['cuadriceps','gluteos','pantorrilla']::public.muscle_group[],
 'Cuádriceps y glúteos son el par; la pantorrilla entra de tercera por ser un grupo pequeño. Detalle medido: el recto femoral casi no crece con la sentadilla, así que la extensión de rodilla no es relleno.'),
('ppl-ul-5', 3, 'Torso · Espalda', 'torso', array['espalda','abs']::public.muscle_group[],
 'La espalda tiene el día casi para ella, con el abdomen de acompañante por ser pequeño. Va antes que el día de brazos a propósito: si haces bíceps la víspera, llegas a los remos con el brazo cansado y tiras menos.'),
('ppl-ul-5', 4, 'Torso · Brazos', 'torso', array['biceps','triceps','antebrazo']::public.muscle_group[],
 'Bíceps y tríceps son el par; el antebrazo entra de tercero por ser pequeño. Ya vienen calientes: el press del día 1 trabajó el tríceps y los remos del día 3 el bíceps, así que aquí basta con rematar.'),
('ppl-ul-5', 5, 'Pierna B · Femorales y glúteos', 'pierna', array['femorales','gluteos']::public.muscle_group[],
 'Femorales y glúteos. Los glúteos repiten desde el día 2 —son el único músculo que lo hace— porque están entre los que más definen la silueta. Entre las dos sesiones de pierna hay dos días completos de descanso.');

-- ---------------------------------------------------------------------------
-- Ejercicios de cada día
-- ---------------------------------------------------------------------------

insert into public.split_template_slots (day_id, position, muscle_group, default_exercise_slug, target_sets, is_optional)
select d.id, v.position, v.muscle_group::public.muscle_group, v.slug, v.sets, v.optional
from (values
  -- ===== 3 días =====
  ('empuje-pierna-tiron-3', 1, 1, 'pecho',       'chest-press-machine-v2',     4, false),
  ('empuje-pierna-tiron-3', 1, 2, 'pecho',       'incline-dumbbell-press',     3, false),
  ('empuje-pierna-tiron-3', 1, 3, 'hombros',     'machine-shoulder-press',     3, false),
  ('empuje-pierna-tiron-3', 1, 4, 'hombros',     'dumbbell-lateral-raise',     4, false),
  ('empuje-pierna-tiron-3', 1, 5, 'hombros',     'reverse-pec-deck',           3, false),
  ('empuje-pierna-tiron-3', 1, 6, 'triceps',     'overhead-triceps-extension', 3, false),

  ('empuje-pierna-tiron-3', 2, 1, 'cuadriceps',  'leg-press',                  4, false),
  ('empuje-pierna-tiron-3', 2, 2, 'cuadriceps',  'leg-extension',              3, false),
  ('empuje-pierna-tiron-3', 2, 3, 'femorales',   'seated-leg-curl',            4, false),
  ('empuje-pierna-tiron-3', 2, 4, 'femorales',   'dumbbell-rdl',               3, false),
  ('empuje-pierna-tiron-3', 2, 5, 'gluteos',     'hip-thrust',                 4, false),
  ('empuje-pierna-tiron-3', 2, 6, 'pantorrilla', 'standing-calf-raise',        4, false),

  ('empuje-pierna-tiron-3', 3, 1, 'espalda',     'lat-pulldown',               4, false),
  ('empuje-pierna-tiron-3', 3, 2, 'espalda',     'chest-supported-row',        4, false),
  ('empuje-pierna-tiron-3', 3, 3, 'biceps',      'preacher-curl',              3, false),
  ('empuje-pierna-tiron-3', 3, 4, 'biceps',      'incline-dumbbell-curl',      3, false),
  ('empuje-pierna-tiron-3', 3, 5, 'antebrazo',   'wrist-curl',                 2, true),
  ('empuje-pierna-tiron-3', 3, 6, 'abs',         'cable-crunch',               3, false),

  -- ===== 4 días =====
  ('upper-lower-4', 1, 1, 'cuadriceps',  'leg-press',                  4, false),
  ('upper-lower-4', 1, 2, 'cuadriceps',  'leg-extension',              3, false),
  ('upper-lower-4', 1, 3, 'cuadriceps',  'hack-squat',                 3, false),
  ('upper-lower-4', 1, 4, 'gluteos',     'hip-thrust',                 4, false),
  ('upper-lower-4', 1, 5, 'pantorrilla', 'standing-calf-raise',        4, false),

  ('upper-lower-4', 2, 1, 'pecho',       'chest-press-machine-v2',     4, false),
  ('upper-lower-4', 2, 2, 'pecho',       'incline-dumbbell-press',     3, false),
  ('upper-lower-4', 2, 3, 'pecho',       'pec-deck',                   3, false),
  ('upper-lower-4', 2, 4, 'hombros',     'machine-shoulder-press',     3, false),
  ('upper-lower-4', 2, 5, 'hombros',     'dumbbell-lateral-raise',     4, false),
  ('upper-lower-4', 2, 6, 'hombros',     'reverse-pec-deck',           3, false),
  ('upper-lower-4', 2, 7, 'triceps',     'overhead-triceps-extension', 3, false),

  ('upper-lower-4', 3, 1, 'espalda',     'lat-pulldown',               4, false),
  ('upper-lower-4', 3, 2, 'espalda',     'chest-supported-row',        4, false),
  ('upper-lower-4', 3, 3, 'espalda',     'straight-arm-pulldown',      3, false),
  ('upper-lower-4', 3, 4, 'biceps',      'preacher-curl',              3, false),
  ('upper-lower-4', 3, 5, 'biceps',      'incline-dumbbell-curl',      3, false),
  ('upper-lower-4', 3, 6, 'antebrazo',   'wrist-curl',                 2, true),

  ('upper-lower-4', 4, 1, 'femorales',   'seated-leg-curl',            4, false),
  ('upper-lower-4', 4, 2, 'femorales',   'dumbbell-rdl',               3, false),
  ('upper-lower-4', 4, 3, 'gluteos',     'barbell-glute-bridge',       3, false),
  ('upper-lower-4', 4, 4, 'gluteos',     'cable-kickback',             3, false),
  ('upper-lower-4', 4, 5, 'abs',         'cable-crunch',               3, false),

  -- ===== 5 días =====
  ('ppl-ul-5', 1, 1, 'pecho',       'chest-press-machine-v2',     4, false),
  ('ppl-ul-5', 1, 2, 'pecho',       'incline-dumbbell-press',     3, false),
  ('ppl-ul-5', 1, 3, 'pecho',       'pec-deck',                   3, false),
  ('ppl-ul-5', 1, 4, 'hombros',     'machine-shoulder-press',     3, false),
  ('ppl-ul-5', 1, 5, 'hombros',     'dumbbell-lateral-raise',     4, false),
  ('ppl-ul-5', 1, 6, 'hombros',     'reverse-pec-deck',           3, false),

  ('ppl-ul-5', 2, 1, 'cuadriceps',  'leg-press',                  4, false),
  ('ppl-ul-5', 2, 2, 'cuadriceps',  'leg-extension',              3, false),
  ('ppl-ul-5', 2, 3, 'cuadriceps',  'hack-squat',                 3, false),
  ('ppl-ul-5', 2, 4, 'gluteos',     'hip-thrust',                 4, false),
  ('ppl-ul-5', 2, 5, 'pantorrilla', 'standing-calf-raise',        4, false),

  ('ppl-ul-5', 3, 1, 'espalda',     'lat-pulldown',               4, false),
  ('ppl-ul-5', 3, 2, 'espalda',     'chest-supported-row',        4, false),
  ('ppl-ul-5', 3, 3, 'espalda',     'straight-arm-pulldown',      3, false),
  ('ppl-ul-5', 3, 4, 'abs',         'cable-crunch',               3, false),
  ('ppl-ul-5', 3, 5, 'abs',         'decline-reverse-crunch',     3, true),

  ('ppl-ul-5', 4, 1, 'triceps',     'overhead-triceps-extension', 4, false),
  ('ppl-ul-5', 4, 2, 'triceps',     'rope-pushdown',              3, false),
  ('ppl-ul-5', 4, 3, 'biceps',      'preacher-curl',              3, false),
  ('ppl-ul-5', 4, 4, 'biceps',      'incline-dumbbell-curl',      3, false),
  ('ppl-ul-5', 4, 5, 'antebrazo',   'wrist-curl',                 2, true),

  ('ppl-ul-5', 5, 1, 'femorales',   'seated-leg-curl',            4, false),
  ('ppl-ul-5', 5, 2, 'femorales',   'dumbbell-rdl',               3, false),
  ('ppl-ul-5', 5, 3, 'femorales',   'back-extension-45',          3, true),
  ('ppl-ul-5', 5, 4, 'gluteos',     'barbell-glute-bridge',       3, false),
  ('ppl-ul-5', 5, 5, 'gluteos',     'cable-kickback',             3, false)
) as v(template_slug, day_index, position, muscle_group, slug, sets, optional)
join public.split_template_days d
  on d.template_slug = v.template_slug and d.day_index = v.day_index;

-- ---------------------------------------------------------------------------
-- Comprobaciones: si una regla se rompe, la migración falla.
--
-- Van aquí y no en un comentario porque las reglas se rompen solas en cuanto alguien
-- retoca un día sin mirar el resto, y este error es mucho más barato que descubrirlo
-- en la app.
-- ---------------------------------------------------------------------------

do $$
declare
  problema text;
begin
  -- R2: nada de repetir músculos salvo prioridad alta.
  select string_agg(template_slug || ' repite ' || muscle_group::text, ', ')
  into problema
  from (
    select d.template_slug, s.muscle_group
    from public.split_template_slots s
    join public.split_template_days d on d.id = s.day_id
    join public.muscle_groups g on g.slug = s.muscle_group
    where g.aesthetic_priority > 1
    group by d.template_slug, s.muscle_group
    having count(distinct d.day_index) > 1
  ) repetidos;

  if problema is not null then
    raise exception 'Músculos repetidos sin prioridad alta: %', problema;
  end if;

  -- R3: dos días de descanso entre sesiones de pierna (en plantillas de 4 y 5 días).
  select string_agg(t.slug || ' (días ' || dias || ')', ', ')
  into problema
  from (
    select template_slug, string_agg(day_index::text, ' y ' order by day_index) as dias,
           max(day_index) - min(day_index) as separacion, count(*) as total
    from public.split_template_days
    where day_kind = 'pierna'
    group by template_slug
  ) p
  join public.split_templates t on t.slug = p.template_slug
  where p.total = 2 and p.separacion < 3;

  if problema is not null then
    raise exception 'Días de pierna demasiado juntos (hacen falta 2 días entre medias): %', problema;
  end if;

  -- El hombro no puede repartirse: sus tres porciones el mismo día.
  select string_agg(d.template_slug || ' día ' || d.day_index, ', ')
  into problema
  from public.split_template_days d
  where 'hombros' = any(d.focus_groups)
    and (select count(*) from public.split_template_slots s where s.day_id = d.id and s.muscle_group = 'hombros') < 3;

  if problema is not null then
    raise exception 'Días de hombro sin las tres porciones (anterior, lateral y posterior): %', problema;
  end if;
end $$;

notify pgrst, 'reload schema';
