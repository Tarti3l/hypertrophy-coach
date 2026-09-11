-- Seguimiento de peso corporal (item [18] de docs/plan.md).
--
-- ESTA TABLA NO ALIMENTA NINGÚN CÁLCULO DE MACROS. Las metas nutricionales salen de
-- public.user_profiles (weight_kg, macro_targets) y se calculan una sola vez en el
-- onboarding; registrar un peso acá no las recalcula ni toca ese perfil. Son dos datos
-- distintos a propósito: user_profiles.weight_kg es el peso declarado con el que se
-- estimaron las metas vigentes, y body_weight_logs es el historial medido por la
-- persona. Si alguna vez se quieren metas adaptativas, ese es otro item y otra
-- decisión del dueño; no se hace de rebote desde acá.
--
-- El unique (user_id, measured_on) es lo que impide duplicar mediciones: registrar dos
-- veces el mismo día corrige el valor de ese día en vez de crear otra fila. Mismo
-- mecanismo que ya usa public.sleep_logs (00001) con su upsert en sleepLogRepository.
--
-- El peso del onboarding NO se copia acá. No tiene fecha de medición verificable —
-- solo se sabe cuándo se completó el formulario, que es cuándo se declaró, no cuándo
-- se pesó— y darle una fecha inventada (menos aún "hoy") ensuciaría el historial real.
-- La interfaz lo muestra aparte, como referencia declarada.

create table public.body_weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_on date not null,
  -- Mismo rango que user_profiles.weight_kg, para que un valor válido en un lado
  -- también lo sea en el otro.
  weight_kg numeric(5, 1) not null check (weight_kg between 35 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, measured_on)
);

comment on table public.body_weight_logs is
  'Historial de peso corporal medido por la persona. No participa en el cálculo de macros.';
comment on column public.body_weight_logs.measured_on is
  'Fecha de la medición, elegida por la persona (por defecto hoy). Una fila por día y por usuario.';

create index body_weight_logs_user_date_idx on public.body_weight_logs (user_id, measured_on desc);

alter table public.body_weight_logs enable row level security;

create policy "users manage their body weight logs" on public.body_weight_logs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
