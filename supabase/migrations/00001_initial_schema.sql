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
