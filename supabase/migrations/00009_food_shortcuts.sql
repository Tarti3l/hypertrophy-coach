-- Atajos de comida: lo que alguien consume a diario y siempre igual.
--
-- El caso que lo motiva es el batido de proteína, pero la tabla es genérica: cada
-- suplemento y cada marca aportan cosas distintas, así que los valores los pone
-- la persona copiando la etiqueta de su envase. No sembramos valores por defecto
-- porque no existe "el scoop promedio".

create table public.food_shortcuts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  /** Nombre del icono en components/ui/Icon.tsx */
  icon text not null default 'shaker' check (char_length(icon) <= 30),
  /** Cómo se mide una unidad del atajo: "1 scoop (30 g)". Solo para mostrar. */
  serving_label text check (char_length(serving_label) <= 60),
  energy_kcal numeric(6, 1) not null check (energy_kcal >= 0),
  protein_g numeric(5, 1) not null default 0 check (protein_g >= 0),
  carbs_g numeric(5, 1) not null default 0 check (carbs_g >= 0),
  fat_g numeric(5, 1) not null default 0 check (fat_g >= 0),
  position smallint not null default 1 check (position > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index food_shortcuts_user_idx on public.food_shortcuts (user_id, position);

alter table public.food_shortcuts enable row level security;

create policy "users manage their food shortcuts" on public.food_shortcuts for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
