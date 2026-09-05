-- Registro de alimentación: catálogo de alimentos + diario de comidas.
--
-- Decisión clave: meal_entries GUARDA los macros ya calculados, no solo una referencia
-- al alimento. Si mañana corregimos un valor del catálogo, el historial de la persona
-- no debe cambiar retroactivamente: lo que comió el martes fue lo que fue.

create type public.meal_type as enum ('desayuno', 'almuerzo', 'cena', 'snack');

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  -- Composición por 100 g de porción comestible, que es como la publican las tablas.
  energy_kcal numeric(6, 1) not null check (energy_kcal >= 0),
  protein_g numeric(5, 1) not null check (protein_g >= 0),
  carbs_g numeric(5, 1) not null check (carbs_g >= 0),
  fat_g numeric(5, 1) not null check (fat_g >= 0),
  -- De dónde salió el dato. Sin fuente, el alimento no debería publicarse.
  source text not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Porciones caseras: el público objetivo no pesa la comida.
create table public.food_portions (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods(id) on delete cascade,
  label text not null,
  grams numeric(6, 1) not null check (grams > 0),
  is_default boolean not null default false,
  sort_order smallint not null default 100,
  unique (food_id, label)
);

create table public.meal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  eaten_on date not null,
  meal_type public.meal_type not null,
  -- null cuando la persona escribió los macros a mano.
  food_id uuid references public.foods(id) on delete set null,
  label text not null check (char_length(label) between 1 and 120),
  quantity_grams numeric(7, 1) check (quantity_grams > 0),
  portion_label text check (char_length(portion_label) <= 60),
  energy_kcal numeric(7, 1) not null check (energy_kcal >= 0),
  protein_g numeric(6, 1) not null check (protein_g >= 0),
  carbs_g numeric(6, 1) not null check (carbs_g >= 0),
  fat_g numeric(6, 1) not null check (fat_g >= 0),
  created_at timestamptz not null default now()
);

create index foods_published_name_idx on public.foods (name) where is_published = true;
create index food_portions_food_idx on public.food_portions (food_id, sort_order);
create index meal_entries_user_date_idx on public.meal_entries (user_id, eaten_on desc, created_at desc);

alter table public.foods enable row level security;
alter table public.food_portions enable row level security;
alter table public.meal_entries enable row level security;

create policy "published foods are readable" on public.foods for select using (is_published = true);
create policy "portions of published foods are readable" on public.food_portions for select using (
  exists (select 1 from public.foods where foods.id = food_portions.food_id and foods.is_published = true)
);
create policy "users manage their meal entries" on public.meal_entries for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Semilla inicial. SOLO alimentos cuyos valores pudimos verificar contra las
-- Tablas Peruanas de Composición de Alimentos (INS/CENAN, 2017). El resto del
-- catálogo se carga aparte; ver docs/nutrition-data.md.
insert into public.foods (slug, name, category, energy_kcal, protein_g, carbs_g, fat_g, source, is_published)
values
  ('arroz-blanco-cocido', 'Arroz blanco cocido', 'Cereales', 115, 2.4, 25.2, 0.1, 'TPCA 2017 (INS/CENAN), cód. A2', true),
  ('quinua', 'Quinua', 'Cereales', 351, 13.6, 66.6, 5.8, 'TPCA 2017 (INS/CENAN), cód. A54', true),
  ('pan-frances', 'Pan francés', 'Cereales', 277, 8.4, 62.9, 0.2, 'TPCA 2017 (INS/CENAN)', true),
  ('fideos', 'Fideos', 'Cereales', 337, 9.4, 77.7, 0.2, 'TPCA 2017 (INS/CENAN)', true),
  ('avena', 'Avena', 'Cereales', 380, 13.7, 71.3, 4.7, 'TPCA 2017 (INS/CENAN)', true)
on conflict (slug) do update set
  name = excluded.name,
  category = excluded.category,
  energy_kcal = excluded.energy_kcal,
  protein_g = excluded.protein_g,
  carbs_g = excluded.carbs_g,
  fat_g = excluded.fat_g,
  source = excluded.source,
  is_published = excluded.is_published,
  updated_at = now();

insert into public.food_portions (food_id, label, grams, is_default, sort_order)
select f.id, p.label, p.grams, p.is_default, p.sort_order
from public.foods f
join (values
  ('arroz-blanco-cocido', '1 taza', 150.0, true, 10),
  ('arroz-blanco-cocido', '1 cucharón', 100.0, false, 20),
  ('quinua', '1 taza cocida', 185.0, true, 10),
  ('pan-frances', '1 unidad', 55.0, true, 10),
  ('fideos', '1 taza cocida', 140.0, true, 10),
  ('avena', '1/2 taza en hojuelas', 40.0, true, 10)
) as p(slug, label, grams, is_default, sort_order) on p.slug = f.slug
on conflict (food_id, label) do update set
  grams = excluded.grams,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order;
