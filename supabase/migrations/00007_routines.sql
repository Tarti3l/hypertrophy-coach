-- Rutinas guardadas: "mi rutina de empuje" con sus ejercicios y series objetivo.
--
-- Sin esto cada sesión empieza de cero eligiendo ejercicios sueltos, que es la
-- diferencia entre un cuaderno y un programa.

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  notes text check (char_length(notes) <= 500),
  -- Se archiva en vez de borrarse: los workouts pasados la referencian.
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id),
  position smallint not null check (position > 0),
  target_sets smallint not null default 3 check (target_sets between 1 and 10),
  target_reps smallint check (target_reps between 1 and 100),
  /** Segundos de descanso entre series. null usa el valor por defecto de la app. */
  rest_seconds smallint check (rest_seconds between 15 and 600),
  unique (routine_id, position)
);

-- Enlaza la sesión con la rutina que la originó, para poder comparar sesión a sesión.
alter table public.workouts add column if not exists routine_id uuid references public.routines(id) on delete set null;

create index routines_user_idx on public.routines (user_id, updated_at desc) where archived_at is null;
create index routine_exercises_routine_idx on public.routine_exercises (routine_id, position);

alter table public.routines enable row level security;
alter table public.routine_exercises enable row level security;

create policy "users manage their routines" on public.routines for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "users manage their routine exercises" on public.routine_exercises for all
  using (exists (select 1 from public.routines where routines.id = routine_exercises.routine_id and routines.user_id = (select auth.uid())))
  with check (exists (select 1 from public.routines where routines.id = routine_exercises.routine_id and routines.user_id = (select auth.uid())));
