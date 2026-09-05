-- gymC · TODAS las migraciones en un solo script.
-- Solo para pegar manualmente en el SQL Editor si no usas la CLI.
-- Si corres 'supabase db push', IGNORA este archivo (la CLI ya hace todo esto).

create extension if not exists "pgcrypto";

create type public.knowledge_level as enum ('none', 'basic', 'experienced');
create type public.biological_sex as enum ('female', 'male', 'unspecified');
create type public.exercise_equipment as enum ('barbell', 'dumbbell', 'machine', 'bodyweight', 'cable', 'other');
create type public.exercise_difficulty as enum ('beginner', 'intermediate', 'advanced');
create type public.workout_status as enum ('planned', 'in_progress', 'completed', 'skipped');

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  age smallint not null check (age between 14 and 100),
  height_cm numeric(5, 1) not null check (height_cm between 120 and 230),
  weight_kg numeric(5, 1) not null check (weight_kg between 35 and 300),
  biological_sex public.biological_sex not null default 'unspecified',
  knowledge_level public.knowledge_level not null,
  training_days_per_week smallint not null check (training_days_per_week between 1 and 7),
  short_term_goal text not null check (char_length(short_term_goal) <= 500),
  long_term_goal text not null check (char_length(long_term_goal) <= 500),
  macro_targets jsonb not null check (jsonb_typeof(macro_targets) = 'object'),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  primary_muscles text[] not null,
  secondary_muscles text[] not null default '{}',
  equipment public.exercise_equipment not null,
  difficulty public.exercise_difficulty not null default 'beginner',
  instructions jsonb not null default '[]'::jsonb,
  media_gif_url text,
  media_video_url text,
  media_poster_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_minutes smallint check (duration_minutes between 1 and 360),
  notes text check (char_length(notes) <= 2000),
  status public.workout_status not null default 'planned',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or ended_at >= started_at)
);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  set_number smallint not null check (set_number > 0),
  target_reps smallint check (target_reps between 1 and 100),
  completed_reps smallint check (completed_reps between 0 and 100),
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  rpe smallint check (rpe between 1 and 10),
  completed_at timestamptz,
  unique (workout_id, exercise_id, set_number)
);

create table public.sleep_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sleep_date date not null,
  duration_minutes smallint not null check (duration_minutes between 0 and 1440),
  quality smallint check (quality between 1 and 5),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, sleep_date)
);

create index workouts_user_started_at_idx on public.workouts (user_id, started_at desc);
create index workout_sets_exercise_idx on public.workout_sets (exercise_id, completed_at desc);
create index sleep_logs_user_date_idx on public.sleep_logs (user_id, sleep_date desc);

alter table public.user_profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_sets enable row level security;
alter table public.sleep_logs enable row level security;
alter table public.exercises enable row level security;

create policy "users manage their profile" on public.user_profiles for all using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "users manage their workouts" on public.workouts for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "users manage their workout sets" on public.workout_sets for all using (
  exists (select 1 from public.workouts where workouts.id = workout_sets.workout_id and workouts.user_id = (select auth.uid()))
) with check (
  exists (select 1 from public.workouts where workouts.id = workout_sets.workout_id and workouts.user_id = (select auth.uid()))
);
create policy "users manage their sleep logs" on public.sleep_logs for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "published exercises are readable" on public.exercises for select using (is_published = true);
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
-- Guardar un entrenamiento son dos inserts (workouts + workout_sets). Vía REST son dos
-- requests sin transacción: si el segundo falla queda un workout huérfano que infla la racha.
-- Esta función los mete en una sola transacción y, al ser security invoker, sigue pasando por RLS.

create or replace function public.save_workout_with_sets(
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_duration_minutes smallint,
  p_notes text,
  p_sets jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_workout_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión activa.' using errcode = '28000';
  end if;

  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Se requiere al menos una serie completada.' using errcode = '22023';
  end if;

  insert into public.workouts (user_id, started_at, ended_at, duration_minutes, notes, status)
  values (auth.uid(), p_started_at, p_ended_at, p_duration_minutes, p_notes, 'completed')
  returning id into v_workout_id;

  insert into public.workout_sets (workout_id, exercise_id, set_number, completed_reps, weight_kg, completed_at)
  select
    v_workout_id,
    (item->>'exercise_id')::uuid,
    (item->>'set_number')::smallint,
    (item->>'completed_reps')::smallint,
    (item->>'weight_kg')::numeric,
    coalesce((item->>'completed_at')::timestamptz, p_ended_at)
  from jsonb_array_elements(p_sets) as item;

  return v_workout_id;
end;
$$;

revoke all on function public.save_workout_with_sets(timestamptz, timestamptz, smallint, text, jsonb) from public;
grant execute on function public.save_workout_with_sets(timestamptz, timestamptz, smallint, text, jsonb) to authenticated;
-- Con una cola offline el mismo entrenamiento se reintenta N veces. Sin una clave de
-- idempotencia, un request que llegó al servidor pero cuya respuesta se perdió (timeout,
-- red que se cae al volver) crearía un duplicado y rompería racha y gráfico.
-- El cliente genera client_id una sola vez, al finalizar la sesión, y lo reusa en cada reintento.

alter table public.workouts add column if not exists client_id uuid;

create unique index if not exists workouts_user_client_id_key
  on public.workouts (user_id, client_id)
  where client_id is not null;

comment on column public.workouts.client_id is
  'Clave de idempotencia generada en el dispositivo. Permite reintentar el guardado sin duplicar.';

drop function if exists public.save_workout_with_sets(timestamptz, timestamptz, smallint, text, jsonb);

create or replace function public.save_workout_with_sets(
  p_client_id uuid,
  p_started_at timestamptz,
  p_ended_at timestamptz,
  p_duration_minutes smallint,
  p_notes text,
  p_sets jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_workout_id uuid;
begin
  if v_user_id is null then
    raise exception 'No hay una sesión activa.' using errcode = '28000';
  end if;

  if p_client_id is null then
    raise exception 'Se requiere client_id para guardar el entrenamiento.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Se requiere al menos una serie completada.' using errcode = '22023';
  end if;

  -- Reintento de un envío que ya había llegado: devolvemos el mismo id sin insertar nada.
  select id into v_workout_id
  from public.workouts
  where user_id = v_user_id and client_id = p_client_id;

  if v_workout_id is not null then
    return v_workout_id;
  end if;

  insert into public.workouts (user_id, client_id, started_at, ended_at, duration_minutes, notes, status)
  values (v_user_id, p_client_id, p_started_at, p_ended_at, p_duration_minutes, p_notes, 'completed')
  returning id into v_workout_id;

  insert into public.workout_sets (workout_id, exercise_id, set_number, completed_reps, weight_kg, completed_at)
  select
    v_workout_id,
    (item->>'exercise_id')::uuid,
    (item->>'set_number')::smallint,
    (item->>'completed_reps')::smallint,
    (item->>'weight_kg')::numeric,
    coalesce((item->>'completed_at')::timestamptz, p_ended_at)
  from jsonb_array_elements(p_sets) as item;

  return v_workout_id;

exception
  -- Dos reintentos en paralelo (foreground + evento de red): gana uno, el otro lee el id.
  when unique_violation then
    select id into v_workout_id
    from public.workouts
    where user_id = v_user_id and client_id = p_client_id;
    return v_workout_id;
end;
$$;

revoke all on function public.save_workout_with_sets(uuid, timestamptz, timestamptz, smallint, text, jsonb) from public;
grant execute on function public.save_workout_with_sets(uuid, timestamptz, timestamptz, smallint, text, jsonb) to authenticated;

-- ============ Registro del historial de migraciones ============
-- Necesario SOLO en la ruta manual: sin esto, un 'supabase db push' futuro
-- intentaria correr 00001-00004 otra vez y fallaria con "type already exists".

create schema if not exists supabase_migrations;

create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);

insert into supabase_migrations.schema_migrations (version, name)
values
  ('00001', 'initial_schema'),
  ('00002', 'exercise_catalog'),
  ('00003', 'save_workout_rpc'),
  ('00004', 'workout_idempotency')
on conflict (version) do nothing;
