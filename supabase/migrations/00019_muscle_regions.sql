-- Porciones musculares: que cada músculo se trabaje completo.
--
-- El usuario lo detectó viendo su rutina: un día con pecho, hombros y tríceps donde el
-- pecho solo tenía dos press y el hombro no tenía nada para la porción posterior.
--
-- No es un detalle estético. Está medido, y en varios músculos la diferencia es grande:
--
--   * PECHO. El press inclinado a 30° hizo crecer la porción clavicular
--     significativamente más que el plano (Chaves et al. 2020, Int J Exerc Sci
--     13(6):859-872). Dos press planos no cubren el pecho.
--   * HOMBRO. Press 33.3% del máximo en la porción anterior; elevación lateral 30.3% en
--     la media y 24.0% en la posterior, donde el press solo llega al 11.4%
--     (Campos et al. 2020, J Hum Kinet 75:5-14). Sin pájaro, la porción posterior no se
--     entrena.
--   * TRÍCEPS. La extensión por encima de la cabeza hizo crecer la cabeza larga 1.5
--     veces más que el pushdown, medido por resonancia (Maeo et al. 2023, Eur J Sport
--     Sci 23(7)).
--   * CUÁDRICEPS. La sentadilla NO aumentó el recto femoral en ninguna zona; la
--     extensión de rodilla sí en las tres (Zabaleta-Korta et al. 2021, J Sports Sci
--     39(20):2298-2304).
--   * ISQUIOTIBIALES. Los movimientos de cadera favorecen la cabeza larga del bíceps
--     femoral; los curls, la cabeza corta (Maeo et al. 2024, MSSE 56(10):1893-1905).
--   * PANTORRILLA. De pie: gastrocnemio +12.4%. Sentado: +1.7%. Son dos ejercicios
--     distintos para dos músculos distintos (Kinoshita et al. 2023, Front Physiol
--     14:1272106).
--
-- DE AQUÍ SALE LA REGLA DE 2 GRUPOS POR DÍA. Si un músculo grande necesita 3 ejercicios
-- para quedar cubierto, tres músculos grandes son nueve ejercicios y una sesión de hora
-- y media. El tercer grupo solo puede ser uno pequeño. La restricción no era arbitraria:
-- es la consecuencia de trabajar los músculos completos.
--
-- HONESTIDAD SOBRE LAS PORCIONES: se definen solo donde hay evidencia de que responden
-- distinto. Del pecho se separan clavicular y esternocostal, que es lo que la literatura
-- distingue; NO se inventa un "pecho inferior" como región aparte, porque esa separación
-- no tiene el mismo respaldo. En espalda y abdomen las porciones son consenso anatómico,
-- no hallazgos medidos, y así están etiquetadas en `region_evidence`.

-- La primera versión de esta migración falló, así que el tipo puede existir ya o no
-- según hasta dónde llegara el rollback. Se crea solo si falta.
do $$ begin
  create type public.muscle_region as enum (
  'clavicular', 'esternocostal',
  'deltoide-anterior', 'deltoide-lateral', 'deltoide-posterior',
  'dorsal', 'espalda-alta',
  'triceps-cabeza-larga', 'triceps-lateral-medial',
  'biceps-proximal', 'biceps-distal', 'braquiorradial',
  'recto-femoral', 'vastos',
  'isquios-cadera', 'isquios-rodilla',
  'gluteo-mayor', 'gluteo-medio',
  'gastrocnemio', 'soleo',
    'recto-abdominal', 'oblicuos',
    'antebrazo-flexores', 'antebrazo-extensores'
  );
exception when duplicate_object then null;
end $$;

alter table public.exercises
  add column if not exists muscle_region public.muscle_region;

comment on column public.exercises.muscle_region is
  'Qué porción del músculo trabaja de forma preferente. Null en cardio y en los que no tienen una porción clara.';

alter table public.muscle_groups
  add column if not exists regions public.muscle_region[] not null default '{}',
  /** Ejercicios mínimos para considerar el músculo cubierto en un día. */
  add column if not exists min_exercises smallint not null default 2
    check (min_exercises between 1 and 5),
  /** Qué respaldo tiene la división en porciones de ESTE grupo. */
  add column if not exists region_evidence public.evidence_level not null default 'consenso';

-- ---------------------------------------------------------------------------
-- Porciones y mínimos por grupo
-- ---------------------------------------------------------------------------

update public.muscle_groups set
  regions = array['clavicular','esternocostal']::public.muscle_region[],
  min_exercises = 3, region_evidence = 'hipertrofia'
where slug = 'pecho';

update public.muscle_groups set
  regions = array['deltoide-anterior','deltoide-lateral','deltoide-posterior']::public.muscle_region[],
  min_exercises = 3, region_evidence = 'emg'
where slug = 'hombros';

update public.muscle_groups set
  regions = array['dorsal','espalda-alta']::public.muscle_region[],
  min_exercises = 3, region_evidence = 'consenso'
where slug = 'espalda';

update public.muscle_groups set
  regions = array['recto-femoral','vastos']::public.muscle_region[],
  min_exercises = 3, region_evidence = 'hipertrofia'
where slug = 'cuadriceps';

update public.muscle_groups set
  regions = array['triceps-cabeza-larga','triceps-lateral-medial']::public.muscle_region[],
  min_exercises = 2, region_evidence = 'hipertrofia'
where slug = 'triceps';

update public.muscle_groups set
  regions = array['biceps-proximal','biceps-distal']::public.muscle_region[],
  min_exercises = 2, region_evidence = 'hipertrofia'
where slug = 'biceps';

update public.muscle_groups set
  regions = array['isquios-cadera','isquios-rodilla']::public.muscle_region[],
  min_exercises = 2, region_evidence = 'hipertrofia'
where slug = 'femorales';

update public.muscle_groups set
  regions = array['gluteo-mayor','gluteo-medio']::public.muscle_region[],
  min_exercises = 2, region_evidence = 'hipertrofia'
where slug = 'gluteos';

update public.muscle_groups set
  regions = array['gastrocnemio','soleo']::public.muscle_region[],
  min_exercises = 1, region_evidence = 'hipertrofia'
where slug = 'pantorrilla';

update public.muscle_groups set
  regions = array['recto-abdominal','oblicuos']::public.muscle_region[],
  min_exercises = 1, region_evidence = 'emg'
where slug = 'abs';

-- El braquiorradial vive aquí: es un músculo del antebrazo, no una porción del bíceps.
update public.muscle_groups set
  regions = array['antebrazo-flexores','antebrazo-extensores','braquiorradial']::public.muscle_region[],
  min_exercises = 1, region_evidence = 'consenso'
where slug = 'antebrazo';

-- ---------------------------------------------------------------------------
-- Porción de cada ejercicio
-- ---------------------------------------------------------------------------

update public.exercises set muscle_region = 'clavicular' where slug in ('incline-dumbbell-press');
update public.exercises set muscle_region = 'esternocostal' where slug in (
  'chest-press-machine-v2', 'chest-press-machine', 'barbell-bench-press', 'pec-deck',
  'cable-fly', 'converging-chest-press', 'flat-dumbbell-press', 'dumbbell-bench-press', 'push-up'
);

update public.exercises set muscle_region = 'deltoide-anterior' where slug in (
  'machine-shoulder-press', 'overhead-press', 'seated-dumbbell-press', 'front-raise'
);
update public.exercises set muscle_region = 'deltoide-lateral' where slug in (
  'machine-lateral-raise', 'dumbbell-lateral-raise', 'cable-lateral-raise'
);
update public.exercises set muscle_region = 'deltoide-posterior' where slug in (
  'reverse-pec-deck', 'face-pull', 'dumbbell-rear-fly'
);

update public.exercises set muscle_region = 'dorsal' where slug in (
  'lat-pulldown', 'neutral-grip-pulldown', 'assisted-pull-up', 'straight-arm-pulldown', 'cable-pullover'
);
update public.exercises set muscle_region = 'espalda-alta' where slug in (
  'chest-supported-row', 'seated-cable-row', 'barbell-row', 'one-arm-dumbbell-row', 'dumbbell-shrug'
);

update public.exercises set muscle_region = 'triceps-cabeza-larga' where slug in (
  'overhead-triceps-extension', 'overhead-dumbbell-extension', 'skull-crusher'
);
update public.exercises set muscle_region = 'triceps-lateral-medial' where slug in (
  'triceps-pushdown', 'rope-pushdown', 'close-grip-bench', 'assisted-dip', 'triceps-kickback'
);

update public.exercises set muscle_region = 'biceps-proximal' where slug in ('incline-dumbbell-curl', 'high-cable-curl');
update public.exercises set muscle_region = 'biceps-distal' where slug in ('preacher-curl', 'concentration-curl', 'ez-bar-curl', 'cable-curl');
update public.exercises set muscle_region = 'braquiorradial' where slug in ('hammer-curl', 'reverse-curl');

update public.exercises set muscle_region = 'recto-femoral' where slug in ('leg-extension');
update public.exercises set muscle_region = 'vastos' where slug in (
  'leg-press', 'goblet-squat', 'back-squat', 'front-squat', 'hack-squat', 'smith-squat',
  'bulgarian-split-squat', 'walking-lunge', 'barbell-lunge'
);

update public.exercises set muscle_region = 'isquios-rodilla' where slug in ('seated-leg-curl', 'lying-leg-curl', 'nordic-curl');
update public.exercises set muscle_region = 'isquios-cadera' where slug in ('romanian-deadlift', 'dumbbell-rdl', 'back-extension-45');

update public.exercises set muscle_region = 'gluteo-mayor' where slug in (
  'hip-thrust', 'dumbbell-hip-thrust', 'barbell-glute-bridge', 'deep-squat-glute',
  'cable-kickback', 'step-up', 'reverse-lunge'
);
update public.exercises set muscle_region = 'gluteo-medio' where slug in ('hip-abduction-machine');

update public.exercises set muscle_region = 'gastrocnemio' where slug in (
  'standing-calf-raise', 'calf-press-leg-press', 'single-leg-calf-raise',
  'dumbbell-calf-raise', 'barbell-calf-raise'
);
update public.exercises set muscle_region = 'soleo' where slug in ('seated-calf-raise');

update public.exercises set muscle_region = 'recto-abdominal' where slug in (
  'cable-crunch', 'decline-reverse-crunch', 'plank', 'ab-wheel'
);
update public.exercises set muscle_region = 'oblicuos' where slug in (
  'captains-chair-knee-raise', 'hanging-knee-raise', 'dumbbell-side-bend'
);

update public.exercises set muscle_region = 'antebrazo-flexores' where slug in ('wrist-curl', 'cable-wrist-curl', 'farmers-walk');
update public.exercises set muscle_region = 'antebrazo-extensores' where slug in ('reverse-wrist-curl', 'reverse-cable-wrist-curl');

-- ---------------------------------------------------------------------------
-- Plantilla de 5 días: cada músculo principal, completo
-- ---------------------------------------------------------------------------

delete from public.split_template_days where template_slug = 'ppl-ul-5';

update public.split_templates set
  rationale =
    'Dos músculos por día, cada uno trabajado completo: al menos tres ejercicios que cubran '
    || 'todas sus porciones. El tercer grupo, cuando lo hay, siempre es pequeño. '
    || 'Esa restricción no es un capricho: si un músculo grande necesita tres ejercicios para '
    || 'quedar cubierto, tres músculos grandes serían nueve ejercicios y hora y media de sesión. '
    || 'La pierna tiene dos días con dos días completos de descanso entre ellos, y ningún músculo '
    || 'se repite salvo los glúteos.'
where slug = 'ppl-ul-5';

insert into public.split_template_days (template_slug, day_index, name, day_kind, focus_groups, pairing_rationale) values
('ppl-ul-5', 1, 'Torso · Pecho y hombros', 'torso', array['pecho','hombros']::public.muscle_group[],
 'Dos grupos, los dos completos. El pecho lleva press plano, press inclinado —que hace crecer la porción de arriba más que el plano— y una apertura. El hombro lleva sus tres porciones: press para la anterior, elevación lateral para la media y pájaro para la posterior, que con solo press apenas se entrena.'),
('ppl-ul-5', 2, 'Pierna A · Cuádriceps y glúteos', 'pierna', array['cuadriceps','gluteos','pantorrilla']::public.muscle_group[],
 'El cuádriceps necesita las dos vías: sentadilla o prensa para los vastos, y extensión de rodilla para el recto femoral, que en el ensayo que lo midió no creció nada con sentadilla. Los glúteos llevan hip thrust y abducción. La pantorrilla entra de tercera por ser un grupo pequeño.'),
('ppl-ul-5', 3, 'Torso · Espalda', 'torso', array['espalda','abs']::public.muscle_group[],
 'La espalda con sus dos vectores: jalones para el dorsal y remos para la espalda alta, más un pullover que aísla el dorsal sin que el bíceps limite. Va antes que el día de brazos a propósito: si haces bíceps la víspera, llegas a los remos con el brazo cansado.'),
('ppl-ul-5', 4, 'Torso · Brazos', 'torso', array['triceps','biceps','antebrazo']::public.muscle_group[],
 'El tríceps lleva un ejercicio por encima de la cabeza —que hizo crecer la cabeza larga vez y media más que el pushdown— y uno en polea para las otras dos cabezas. El bíceps, uno con el hombro estirado y otro con el codo apoyado, que crecen zonas distintas del brazo. El antebrazo entra de tercero por ser pequeño.'),
('ppl-ul-5', 5, 'Pierna B · Femorales y glúteos', 'pierna', array['femorales','gluteos']::public.muscle_group[],
 'Los isquiotibiales necesitan las dos vías: el curl trabaja lo que cruza la rodilla y el peso muerto rumano lo que cruza la cadera, y no son intercambiables. Los glúteos repiten desde el día 2 con dos días de descanso entre medias.');

insert into public.split_template_slots (day_id, position, muscle_group, default_exercise_slug, target_sets, is_optional)
select d.id, v.position, v.muscle_group::public.muscle_group, v.slug, v.sets, v.optional
from (values
  -- D1 · Pecho (clavicular + esternocostal) y hombros (las tres porciones)
  ('ppl-ul-5', 1, 1, 'pecho',       'chest-press-machine-v2',     4, false),
  ('ppl-ul-5', 1, 2, 'pecho',       'incline-dumbbell-press',     3, false),
  ('ppl-ul-5', 1, 3, 'pecho',       'pec-deck',                   3, false),
  ('ppl-ul-5', 1, 4, 'hombros',     'machine-shoulder-press',     3, false),
  ('ppl-ul-5', 1, 5, 'hombros',     'dumbbell-lateral-raise',     4, false),
  ('ppl-ul-5', 1, 6, 'hombros',     'reverse-pec-deck',           3, false),

  -- D2 · Cuádriceps (vastos + recto femoral) y glúteos (mayor + medio)
  ('ppl-ul-5', 2, 1, 'cuadriceps',  'leg-press',                  4, false),
  ('ppl-ul-5', 2, 2, 'cuadriceps',  'hack-squat',                 3, false),
  ('ppl-ul-5', 2, 3, 'cuadriceps',  'leg-extension',              3, false),
  ('ppl-ul-5', 2, 4, 'gluteos',     'hip-thrust',                 4, false),
  ('ppl-ul-5', 2, 5, 'gluteos',     'hip-abduction-machine',      3, false),
  ('ppl-ul-5', 2, 6, 'pantorrilla', 'standing-calf-raise',        4, false),

  -- D3 · Espalda (dorsal + espalda alta)
  ('ppl-ul-5', 3, 1, 'espalda',     'lat-pulldown',               4, false),
  ('ppl-ul-5', 3, 2, 'espalda',     'chest-supported-row',        4, false),
  ('ppl-ul-5', 3, 3, 'espalda',     'straight-arm-pulldown',      3, false),
  ('ppl-ul-5', 3, 4, 'abs',         'cable-crunch',               3, false),
  ('ppl-ul-5', 3, 5, 'abs',         'hanging-knee-raise',         3, true),

  -- D4 · Tríceps (cabeza larga + laterales) y bíceps (proximal + distal)
  ('ppl-ul-5', 4, 1, 'triceps',     'overhead-triceps-extension', 4, false),
  ('ppl-ul-5', 4, 2, 'triceps',     'rope-pushdown',              3, false),
  ('ppl-ul-5', 4, 3, 'biceps',      'incline-dumbbell-curl',      3, false),
  ('ppl-ul-5', 4, 4, 'biceps',      'preacher-curl',              3, false),
  ('ppl-ul-5', 4, 5, 'antebrazo',   'wrist-curl',                 2, true),

  -- D5 · Femorales (rodilla + cadera) y glúteos
  ('ppl-ul-5', 5, 1, 'femorales',   'seated-leg-curl',            4, false),
  ('ppl-ul-5', 5, 2, 'femorales',   'dumbbell-rdl',               3, false),
  ('ppl-ul-5', 5, 3, 'gluteos',     'barbell-glute-bridge',       3, false),
  ('ppl-ul-5', 5, 4, 'gluteos',     'cable-kickback',             3, false),
  ('ppl-ul-5', 5, 5, 'pantorrilla', 'seated-calf-raise',          3, true)
) as v(template_slug, day_index, position, muscle_group, slug, sets, optional)
join public.split_template_days d
  on d.template_slug = v.template_slug and d.day_index = v.day_index;

-- ---------------------------------------------------------------------------
-- Comprobación: los grupos NO pequeños de cada día deben quedar cubiertos.
--
-- Solo se exige en la plantilla de 5 días. En las de 3 y 4 no cabe: con 8 músculos
-- medianos o grandes y solo 4 o 6 huecos, algo tiene que ceder, y el texto de esas
-- plantillas lo dice en vez de fingir que cumplen.
-- ---------------------------------------------------------------------------

do $$
declare
  problema text;
begin
  -- Mínimo de ejercicios por grupo principal, día a día.
  --
  -- El string_agg va sobre una subconsulta: anidar un count() dentro de un string_agg
  -- es un error de PostgreSQL ("aggregate function calls cannot be nested"), y es lo
  -- que hizo fallar la primera versión de esta migración.
  select string_agg(descripcion, ', ')
  into problema
  from (
    select d.day_index || ':' || s.muscle_group::text
           || ' (' || count(*) || ' de ' || g.min_exercises || ')' as descripcion
    from public.split_template_slots s
    join public.split_template_days d on d.id = s.day_id
    join public.muscle_groups g on g.slug = s.muscle_group
    where d.template_slug = 'ppl-ul-5' and g.is_small = false
    group by d.day_index, s.muscle_group, g.min_exercises
    having count(*) < g.min_exercises
  ) faltantes;

  if problema is not null then
    raise exception 'Grupos principales sin los ejercicios mínimos en el split de 5 días: %', problema;
  end if;

  -- Cobertura de porciones, a nivel de SEMANA y no de día.
  --
  -- Exigirlo por día sería demasiado estricto: los glúteos aparecen el día 2 y el 5, y
  -- basta con que entre ambos queden cubiertos el mayor y el medio. Lo que importa es
  -- que el músculo se trabaje completo en la semana.
  select string_agg(grupo || ' sin ' || region, ', ')
  into problema
  from (
    select distinct s.muscle_group::text as grupo, r.region::text as region
    from public.split_template_slots s
    join public.split_template_days d on d.id = s.day_id
    join public.muscle_groups g on g.slug = s.muscle_group
    cross join lateral unnest(g.regions) as r(region)
    where d.template_slug = 'ppl-ul-5' and g.is_small = false
  ) pares
  where not exists (
    select 1
    from public.split_template_slots s2
    join public.split_template_days d2 on d2.id = s2.day_id
    join public.exercises e on e.slug = s2.default_exercise_slug
    where d2.template_slug = 'ppl-ul-5'
      and s2.muscle_group::text = pares.grupo
      and e.muscle_region::text = pares.region
  );

  if problema is not null then
    raise exception 'Porciones musculares sin cubrir en el split de 5 días: %', problema;
  end if;
end $$;

notify pgrst, 'reload schema';
