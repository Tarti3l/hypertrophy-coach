-- Splits de 3, 4 y 5 días, con los días de pierna separados de los de torso.
--
-- La 00010 proponía cuerpo completo a 2 y 3 días, que mezcla pierna con torso en la
-- misma sesión. Aquí se quitan esas opciones: el rango pasa a ser 3-5 días y cada día
-- queda marcado como torso o como pierna, sin sesiones mixtas.
--
-- Nota honesta que la app sigue mostrando: separar pierna de torso NO produce más
-- músculo que mezclarlos a igual volumen semanal (Ramos-Campo et al. 2024, JSCR
-- 38(7):1330-1340, no encontró diferencias entre split y cuerpo completo). Se separa
-- porque las sesiones quedan más cortas y porque una pierna a fondo no deja energía
-- para hacer bien el torso después. Ver docs/rutinas.md §3.

create type public.day_kind as enum ('torso', 'pierna');

alter table public.split_template_days
  add column if not exists day_kind public.day_kind not null default 'torso';

comment on column public.split_template_days.day_kind is
  'Torso o pierna. No hay días mixtos: es la separación que pidió el usuario, y evita que una sentadilla pesada se coma la sesión de espalda.';

-- ---------------------------------------------------------------------------
-- 1. Renombrar el slug del split de 3 días
--
-- 'full-body-3' deja de describir lo que contiene. El slug es la PK y tiene dos FK
-- apuntándole, y ninguna se declaró con on update cascade: hay que soltarlas, renombrar
-- en las tres tablas y volver a ponerlas. Se hace antes que nada para que el resto de
-- la migración trabaje ya con el nombre nuevo.
-- ---------------------------------------------------------------------------

alter table public.split_template_days drop constraint if exists split_template_days_template_slug_fkey;
alter table public.routines drop constraint if exists routines_split_template_slug_fkey;

update public.split_templates set slug = 'empuje-pierna-tiron-3' where slug = 'full-body-3';
update public.split_template_days set template_slug = 'empuje-pierna-tiron-3' where template_slug = 'full-body-3';
update public.routines set split_template_slug = 'empuje-pierna-tiron-3' where split_template_slug = 'full-body-3';

alter table public.split_template_days
  add constraint split_template_days_template_slug_fkey
  foreign key (template_slug) references public.split_templates(slug) on delete cascade;

-- Con on delete set null, borrar una plantilla ya no bloquea: la rutina del usuario
-- sobrevive y solo pierde la referencia a la plantilla que la originó.
alter table public.routines
  add constraint routines_split_template_slug_fkey
  foreign key (split_template_slug) references public.split_templates(slug) on delete set null;

-- ---------------------------------------------------------------------------
-- 2. Fuera las opciones que mezclan pierna y torso o se salen del rango 3-5
-- ---------------------------------------------------------------------------

delete from public.split_templates where slug in ('full-body-2', 'ppl-6');

-- ---------------------------------------------------------------------------
-- 3. Tres días: Empuje · Pierna · Tirón
-- ---------------------------------------------------------------------------

update public.split_templates set
  name = 'Empuje · Pierna · Tirón',
  summary = 'Un día de empuje, uno de pierna y uno de tirón. Nada mezclado.',
  rationale =
    'Con tres días, la pierna se lleva un día entero para ella y el torso se parte en dos: '
    || 'lo que empujas (pecho, hombro, tríceps) y lo que jalas (espalda, bíceps). Así ninguna '
    || 'sesión pasa de una hora y no llegas a la espalda con las piernas destrozadas. '
    || 'La parte honesta: a tres días cada músculo se entrena una vez por semana, así que esa '
    || 'sesión carga con todo el volumen semanal. Eso funciona — con el mismo volumen semanal, '
    || 'repartirlo en más días no da más músculo — pero significa sesiones más largas y '
    || 'exigentes que a cinco días.',
  evidence_source = 'Schoenfeld, Grgic & Krieger (2019), Journal of Sports Sciences 37(11):1286-1295; ACSM (2009) Position Stand',
  display_order = 10
where slug = 'empuje-pierna-tiron-3';

-- Se rearman sus días desde cero: el contenido anterior era de cuerpo completo.
delete from public.split_template_days where template_slug = 'empuje-pierna-tiron-3';

insert into public.split_template_days (template_slug, day_index, name, day_kind, focus_groups, pairing_rationale) values

('empuje-pierna-tiron-3', 1, 'Torso · Empuje', 'torso', array['pecho','hombros','triceps']::public.muscle_group[],
 'Pecho, hombro y tríceps van juntos porque comparten el mismo movimiento: el press ya '
 || 'trabaja los tres a la vez. Eso importa de verdad para contar tu volumen — en el mejor '
 || 'análisis disponible, una serie de press aporta aproximadamente media serie al tríceps. '
 || 'Si separas pecho un día y tríceps otro, ese cálculo se te escapa y el tríceps acaba con '
 || 'más trabajo del que planeaste. Dicho esto: no hay ningún estudio que demuestre que '
 || 'agrupar así dé más músculo que repartirlo. Es orden, no magia.'),

('empuje-pierna-tiron-3', 2, 'Pierna', 'pierna', array['cuadriceps','femorales','gluteos','pantorrilla']::public.muscle_group[],
 'La pierna entera en su propio día, sin nada de torso. No es que separarla haga crecer más '
 || '— a igual volumen semanal da lo mismo — es que una prensa o una sentadilla a fondo te deja '
 || 'sin energía para hacer bien un jalón después. Detalle medido que conviene saber: el recto '
 || 'femoral casi no crece con la sentadilla, así que la extensión de rodilla no es relleno.'),

('empuje-pierna-tiron-3', 3, 'Torso · Tirón', 'torso', array['espalda','biceps','abs']::public.muscle_group[],
 'Espalda y bíceps van juntos por la misma lógica que el empuje, al revés: todo jalón y todo '
 || 'remo ya hacen trabajar al bíceps, así que agruparlos evita darle volumen sin darte cuenta. '
 || 'El abdomen se cierra al final, cuando ya no necesitas fuerza para nada más. '
 || 'Aviso honesto sobre este día: no existe ni un solo ensayo de hipertrofia que compare jalón '
 || 'contra remo. El orden de estos ejercicios es criterio práctico, no evidencia.');

insert into public.split_template_slots (day_id, position, muscle_group, default_exercise_slug, target_sets, is_optional)
select d.id, v.position, v.muscle_group::public.muscle_group, v.slug, v.sets, v.optional
from (values
  -- Día 1 · Empuje
  (1, 1, 'pecho',       'chest-press-machine-v2',     4, false),
  (1, 2, 'pecho',       'incline-dumbbell-press',     3, false),
  (1, 3, 'hombros',     'machine-shoulder-press',     3, false),
  (1, 4, 'hombros',     'dumbbell-lateral-raise',     3, false),
  (1, 5, 'triceps',     'overhead-triceps-extension', 3, false),
  (1, 6, 'triceps',     'triceps-pushdown',           2, true),
  -- Día 2 · Pierna
  (2, 1, 'cuadriceps',  'leg-press',                  4, false),
  (2, 2, 'femorales',   'seated-leg-curl',            4, false),
  (2, 3, 'cuadriceps',  'leg-extension',              3, false),
  (2, 4, 'gluteos',     'hip-thrust',                 3, false),
  (2, 5, 'pantorrilla', 'standing-calf-raise',        4, false),
  (2, 6, 'femorales',   'back-extension-45',          2, true),
  -- Día 3 · Tirón
  (3, 1, 'espalda',     'lat-pulldown',               4, false),
  (3, 2, 'espalda',     'chest-supported-row',        4, false),
  (3, 3, 'hombros',     'reverse-pec-deck',           3, false),
  (3, 4, 'biceps',      'preacher-curl',              3, false),
  (3, 5, 'biceps',      'incline-dumbbell-curl',      2, true),
  (3, 6, 'abs',         'cable-crunch',               3, false),
  (3, 7, 'antebrazo',   'wrist-curl',                 2, true)
) as v(day_index, position, muscle_group, slug, sets, optional)
join public.split_template_days d
  on d.template_slug = 'empuje-pierna-tiron-3' and d.day_index = v.day_index;

-- ---------------------------------------------------------------------------
-- 4. Cuatro días: Torso · Pierna · Torso · Pierna
--    Los ejercicios de la 00010 ya estaban separados; aquí solo se ajustan los
--    nombres, la etiqueta torso/pierna y los textos.
-- ---------------------------------------------------------------------------

update public.split_templates set
  name = 'Torso · Pierna ×2',
  summary = 'Dos días de torso y dos de pierna, alternados.',
  rationale =
    'Es la distribución que el ACSM recomienda explícitamente para cuatro días. Alternar '
    || 'torso y pierna significa que cada uno descansa mientras trabaja el otro, y cada músculo '
    || 'llega a dos sesiones por semana sin que ninguna se haga eterna.',
  display_order = 20
where slug = 'upper-lower-4';

update public.split_template_days set name = 'Torso A · empuje y tirón', day_kind = 'torso',
  pairing_rationale =
    'Todo el torso en una sesión, alternando lo que empujas con lo que jalas. Van juntos porque '
    || 'no compiten entre sí: mientras el pecho empuja, la espalda descansa. En un estudio, '
    || 'emparejar así músculos que no compiten acortó las sesiones un 36% sin perder resultado.'
where template_slug = 'upper-lower-4' and day_index = 1;

update public.split_template_days set name = 'Pierna A', day_kind = 'pierna',
  pairing_rationale =
    'La pierna entera en su propio día, sin torso de por medio. No es que separarla haga crecer '
    || 'más — a igual volumen semanal da lo mismo — es que una sentadilla o una prensa a fondo te '
    || 'deja sin energía para hacer bien un jalón después. Ojo con un detalle medido: el recto '
    || 'femoral casi no crece con la sentadilla, así que la extensión de rodilla no es relleno.'
where template_slug = 'upper-lower-4' and day_index = 2;

update public.split_template_days set name = 'Torso B · empuje y tirón', day_kind = 'torso',
  pairing_rationale =
    'Mismo torso, pero empezando por el tirón. Lo que va primero es lo que más gana en fuerza, '
    || 'así que alternar el orden entre las dos sesiones reparte esa ventaja.'
where template_slug = 'upper-lower-4' and day_index = 3;

update public.split_template_days set name = 'Pierna B', day_kind = 'pierna',
  pairing_rationale =
    'Segunda de pierna, esta vez empezando por la cadena posterior para que reciba el trabajo '
    || 'con energía. El abdomen se cierra al final.'
where template_slug = 'upper-lower-4' and day_index = 4;

-- ---------------------------------------------------------------------------
-- 5. Cinco días: Empuje · Tirón · Pierna · Torso · Pierna
-- ---------------------------------------------------------------------------

update public.split_templates set
  name = 'Empuje · Tirón · Pierna · Torso · Pierna',
  summary = 'Tres días de torso y dos de pierna. Ninguna sesión mezcla las dos cosas.',
  rationale =
    'Cinco días es donde mejor se cruzan el volumen que quieres acumular y la duración de cada '
    || 'sesión: llegas a entre 10 y 16 series por músculo sin pasar de una hora, y con cada '
    || 'músculo entrenado dos veces por semana. La pierna tiene dos días propios y el torso tres, '
    || 'sin mezclarse nunca. '
    || 'Ahora la parte honesta: no existe ningún ensayo que compare esta distribución con otra a '
    || 'cinco días. Lo que sí está medido es que, con el mismo volumen semanal, el split que '
    || 'elijas no cambia el resultado. Esto es una forma ordenada de repartir, no una fórmula superior.',
  display_order = 30
where slug = 'ppl-ul-5';

update public.split_template_days set name = 'Torso · Empuje', day_kind = 'torso'
where template_slug = 'ppl-ul-5' and day_index = 1;

update public.split_template_days set name = 'Torso · Tirón', day_kind = 'torso'
where template_slug = 'ppl-ul-5' and day_index = 2;

update public.split_template_days set name = 'Pierna A', day_kind = 'pierna'
where template_slug = 'ppl-ul-5' and day_index = 3;

update public.split_template_days set
  name = 'Torso completo',
  day_kind = 'torso',
  focus_groups = array['espalda','pecho','hombros','triceps','biceps','abs']::public.muscle_group[],
  pairing_rationale =
    'Segunda vuelta del torso en una sola sesión, mezclando empuje y tirón. Con esto cada músculo '
    || 'del torso llega a dos veces por semana. El abdomen se cierra al final.'
where template_slug = 'ppl-ul-5' and day_index = 4;

update public.split_template_days set
  name = 'Pierna B',
  day_kind = 'pierna',
  focus_groups = array['femorales','gluteos','cuadriceps','pantorrilla']::public.muscle_group[],
  pairing_rationale =
    'Segunda de pierna, empezando por la cadena posterior para que reciba el trabajo con energía. '
    || 'Nada de torso aquí: la pierna a fondo no deja fuerza para hacer bien un press.'
where template_slug = 'ppl-ul-5' and day_index = 5;

-- El abdomen estaba en Pierna B; pasa a Torso completo, que es la sesión más corta.
delete from public.split_template_slots s
using public.split_template_days d
where s.day_id = d.id and d.template_slug = 'ppl-ul-5' and d.day_index = 5 and s.muscle_group = 'abs';

insert into public.split_template_slots (day_id, position, muscle_group, default_exercise_slug, target_sets, is_optional)
select d.id, 7, 'abs'::public.muscle_group, 'cable-crunch', 3, false
from public.split_template_days d
where d.template_slug = 'ppl-ul-5' and d.day_index = 4
on conflict (day_id, position) do nothing;
