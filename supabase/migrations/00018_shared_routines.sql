-- NOTA DE NUMERACIÓN
-- Este archivo era 00017. Se renumeró a 00018 porque otra migración llegó con el mismo
-- número (00017_exercise_media_pipeline.sql) y la versión es la clave primaria de
-- supabase_migrations.schema_migrations: el segundo push falla con duplicate key aunque
-- el SQL sea correcto. La versión sale del prefijo del nombre, así que dos archivos
-- 00017 nunca pueden convivir.

-- Rutinas compartidas: plantillas que se pueden copiar entera o por grupo muscular.
--
-- Dos orígenes:
--   1. CURADAS. Las sube el equipo. Aquí van las rutinas atribuidas a gente conocida.
--   2. DE USUARIOS. Cualquiera puede publicar la suya para que otros la vean.
--
-- ---------------------------------------------------------------------------
-- SOBRE ATRIBUIR UNA RUTINA A UNA PERSONA REAL
-- ---------------------------------------------------------------------------
--
-- Decir "la rutina de <deportista famoso>" es una afirmación de hecho sobre una persona
-- real. Casi siempre viene de una revista, un vídeo o una entrevista, y muchas veces no
-- es verificable ni sigue vigente.
--
-- Por eso `attributed_to` NO puede ir sin `source_note`: hay un check que lo impide. Y
-- la app nunca escribe "La rutina de X", escribe "Atribuida a X · según <fuente>". La
-- diferencia no es cosmética: una afirma un hecho que no podemos comprobar y la otra
-- dice de dónde salió y deja que el usuario juzgue.

create table if not exists public.shared_routines (
  id uuid primary key default gen_random_uuid(),
  /** null en las curadas por el equipo. */
  author_user_id uuid references auth.users(id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  summary text check (char_length(summary) <= 400),

  /** A quién se atribuye. Nunca se muestra como un hecho, siempre con su fuente. */
  attributed_to text check (char_length(attributed_to) <= 80),
  source_url text check (char_length(source_url) <= 500),
  /** De dónde salió: "entrevista en Men's Health, 2019". Obligatorio si hay atribución. */
  source_note text check (char_length(source_note) <= 300),

  days_per_week smallint not null check (days_per_week between 1 and 7),
  is_curated boolean not null default false,
  is_published boolean not null default false,
  /** Cuántas veces se ha copiado. Sirve para ordenar por lo que la gente usa. */
  adopt_count integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Sin fuente no hay atribución. Es la regla que impide convertir un rumor en un dato.
  constraint attribution_needs_a_source
    check (attributed_to is null or source_note is not null),
  -- Una rutina de usuario siempre tiene autor; una curada, nunca.
  constraint curated_has_no_author
    check ((is_curated and author_user_id is null) or (not is_curated and author_user_id is not null))
);

create table if not exists public.shared_routine_days (
  id uuid primary key default gen_random_uuid(),
  shared_routine_id uuid not null references public.shared_routines(id) on delete cascade,
  day_index smallint not null check (day_index between 1 and 7),
  name text not null check (char_length(name) between 1 and 60),
  day_kind public.day_kind not null default 'torso',
  unique (shared_routine_id, day_index)
);

create table if not exists public.shared_routine_exercises (
  id uuid primary key default gen_random_uuid(),
  shared_routine_id uuid not null references public.shared_routines(id) on delete cascade,
  day_index smallint not null check (day_index between 1 and 7),
  position smallint not null check (position > 0),
  muscle_group public.muscle_group not null,
  exercise_id uuid not null references public.exercises(id),
  target_sets smallint not null default 3 check (target_sets between 1 and 10),
  target_reps smallint check (target_reps between 1 and 100),
  rest_seconds smallint check (rest_seconds between 15 and 600),
  transition_seconds smallint check (transition_seconds between 15 and 600),
  unique (shared_routine_id, day_index, position)
);

create index if not exists shared_routines_published_idx
  on public.shared_routines (is_curated desc, adopt_count desc, updated_at desc)
  where is_published = true;

create index if not exists shared_routine_days_idx on public.shared_routine_days (shared_routine_id, day_index);
create index if not exists shared_routine_exercises_idx on public.shared_routine_exercises (shared_routine_id, day_index, position);

-- ---------------------------------------------------------------------------
-- RLS
--
-- Leer: cualquiera autenticado ve las publicadas, y siempre las suyas.
-- Escribir: solo sobre las propias. Las curadas se insertan por migración o desde el
-- panel, nunca desde la app: sin esto, cualquiera podría publicar una rutina como si
-- viniera del equipo.
-- ---------------------------------------------------------------------------

drop policy if exists "read published shared routines" on public.shared_routines;
drop policy if exists "authors insert their shared routines" on public.shared_routines;
drop policy if exists "authors update their shared routines" on public.shared_routines;
drop policy if exists "authors delete their shared routines" on public.shared_routines;
drop policy if exists "read shared routine days" on public.shared_routine_days;
drop policy if exists "authors write shared routine days" on public.shared_routine_days;
drop policy if exists "read shared routine exercises" on public.shared_routine_exercises;
drop policy if exists "authors write shared routine exercises" on public.shared_routine_exercises;

alter table public.shared_routines enable row level security;
alter table public.shared_routine_days enable row level security;
alter table public.shared_routine_exercises enable row level security;

create policy "read published shared routines" on public.shared_routines for select to authenticated
  using (is_published or author_user_id = (select auth.uid()));

create policy "authors insert their shared routines" on public.shared_routines for insert to authenticated
  with check (author_user_id = (select auth.uid()) and is_curated = false);

create policy "authors update their shared routines" on public.shared_routines for update to authenticated
  using (author_user_id = (select auth.uid()))
  with check (author_user_id = (select auth.uid()) and is_curated = false);

create policy "authors delete their shared routines" on public.shared_routines for delete to authenticated
  using (author_user_id = (select auth.uid()));

create policy "read shared routine days" on public.shared_routine_days for select to authenticated
  using (exists (
    select 1 from public.shared_routines r
    where r.id = shared_routine_days.shared_routine_id
      and (r.is_published or r.author_user_id = (select auth.uid()))
  ));

create policy "authors write shared routine days" on public.shared_routine_days for all to authenticated
  using (exists (select 1 from public.shared_routines r where r.id = shared_routine_days.shared_routine_id and r.author_user_id = (select auth.uid())))
  with check (exists (select 1 from public.shared_routines r where r.id = shared_routine_days.shared_routine_id and r.author_user_id = (select auth.uid())));

create policy "read shared routine exercises" on public.shared_routine_exercises for select to authenticated
  using (exists (
    select 1 from public.shared_routines r
    where r.id = shared_routine_exercises.shared_routine_id
      and (r.is_published or r.author_user_id = (select auth.uid()))
  ));

create policy "authors write shared routine exercises" on public.shared_routine_exercises for all to authenticated
  using (exists (select 1 from public.shared_routines r where r.id = shared_routine_exercises.shared_routine_id and r.author_user_id = (select auth.uid())))
  with check (exists (select 1 from public.shared_routines r where r.id = shared_routine_exercises.shared_routine_id and r.author_user_id = (select auth.uid())));

-- ---------------------------------------------------------------------------
-- Contador de copias
--
-- security definer porque el usuario que copia no es el autor y no puede escribir en
-- esa fila. Solo incrementa un contador: no toca ninguna otra columna.
-- ---------------------------------------------------------------------------

create or replace function public.increment_shared_routine_adoptions(p_shared_routine_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.shared_routines
  set adopt_count = adopt_count + 1
  where id = p_shared_routine_id and is_published = true;
$$;

grant execute on function public.increment_shared_routine_adoptions(uuid) to authenticated;

notify pgrst, 'reload schema';
