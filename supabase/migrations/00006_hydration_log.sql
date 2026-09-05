-- Registro diario de hidratación.
--
-- Guardamos vasos + tamaño del vaso en vez del total en mililitros: si mañana
-- cambiamos el tamaño estándar del vaso, los días ya registrados siguen valiendo
-- lo que valían. También guardamos el objetivo del día, porque depende del peso
-- de la persona y ese peso cambia con el tiempo.

create table public.hydration_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  logged_on date not null,
  glasses smallint not null default 0 check (glasses between 0 and 40),
  glass_size_ml smallint not null check (glass_size_ml between 50 and 1000),
  target_ml numeric(6, 1) check (target_ml > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, logged_on)
);

create index hydration_logs_user_date_idx on public.hydration_logs (user_id, logged_on desc);

alter table public.hydration_logs enable row level security;

create policy "users manage their hydration logs" on public.hydration_logs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
