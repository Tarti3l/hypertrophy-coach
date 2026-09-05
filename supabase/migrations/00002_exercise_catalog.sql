-- Catálogo de ejercicios.
-- workout_sets.exercise_id tiene FK a public.exercises(id), así que la app necesita
-- estas filas antes de poder guardar una sola serie. El front resuelve slug -> uuid
-- leyendo de aquí; se elimina mockExercises.ts como fuente de verdad.

alter table public.exercises
  add column if not exists display_order smallint not null default 100,
  add column if not exists media_duration_seconds smallint check (media_duration_seconds between 1 and 60),
  add column if not exists media_is_placeholder boolean not null default true;

comment on column public.exercises.media_is_placeholder is
  'true mientras el clip no esté validado en el CDN; la UI muestra el estado "demo pendiente".';

create index if not exists exercises_published_order_idx
  on public.exercises (display_order, name)
  where is_published = true;

insert into public.exercises (
  slug, name, primary_muscles, secondary_muscles, equipment, difficulty, instructions,
  media_gif_url, media_video_url, media_poster_url,
  media_duration_seconds, media_is_placeholder, display_order, is_published
)
values
  (
    'dumbbell-bench-press',
    'Press de banca con mancuernas',
    array['Pecho'],
    array['Tríceps', 'Hombro anterior'],
    'dumbbell',
    'beginner',
    '["Baja con control y empuja sin perder el apoyo de los pies.","Mantén las muñecas alineadas con los codos.","Detén el descenso cuando los codos lleguen a la altura del torso."]'::jsonb,
    null,
    'https://cdn.hypertrophy-coach.app/mocks/dumbbell-bench-press.mp4',
    null,
    4,
    true,
    10,
    true
  ),
  (
    'chest-press-machine',
    'Máquina de pecho',
    array['Pecho'],
    array['Tríceps'],
    'machine',
    'beginner',
    '["Ajusta el asiento para que las manijas queden a la altura del pecho.","Empuja sin bloquear los codos de golpe.","Vuelve al inicio con la misma velocidad con la que empujaste."]'::jsonb,
    null,
    'https://cdn.hypertrophy-coach.app/mocks/chest-press-machine.mp4',
    null,
    3,
    true,
    20,
    true
  ),
  (
    'push-up',
    'Flexiones',
    array['Pecho'],
    array['Tríceps', 'Core'],
    'bodyweight',
    'beginner',
    '["Mantén el cuerpo alineado y acerca el pecho al suelo con control.","Aprieta glúteos y abdomen para no arquear la espalda.","Si es muy difícil, apoya las manos en una superficie elevada."]'::jsonb,
    'https://cdn.hypertrophy-coach.app/mocks/push-up.gif',
    null,
    null,
    4,
    true,
    30,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  difficulty = excluded.difficulty,
  instructions = excluded.instructions,
  media_gif_url = excluded.media_gif_url,
  media_video_url = excluded.media_video_url,
  media_poster_url = excluded.media_poster_url,
  media_duration_seconds = excluded.media_duration_seconds,
  media_is_placeholder = excluded.media_is_placeholder,
  display_order = excluded.display_order,
  is_published = excluded.is_published,
  updated_at = now();
