-- Catálogo de alimentos: actualización a la TPCA edición 11 (2023, INS/CENAN).
--
-- Reemplaza en el sitio los valores de la edición 2017 (884 alimentos) y agrega el
-- resto de la tabla completa: 1125 alimentos simples (grupos A-U) y 1103 preparaciones
-- (hoja "S- Alimentos Preparados"), guardando las 21 columnas nutricionales de la
-- fuente en vez de solo las 4 que ya teníamos (energy_kcal, protein_g, carbs_g, fat_g).
--
-- Generado a partir de docs/fuentes/TPCA-Edicion-11-2023-INS-CENAN.xlsx con
-- scripts/generate-tpca-2023-migration.mjs. Ver ese script para el detalle de cómo se
-- leyó el archivo; este comentario cubre las decisiones que no están en el código.
--
-- NO ROMPE EL HISTORIAL. De los 884 códigos TPCA de la edición 2017, los 884 (100%)
-- siguen existiendo en la edición 2023 con el mismo código (letra de grupo + número) y
-- nombre igual o equivalente — verificado comparando programáticamente las dos
-- ediciones antes de escribir esta migración. Por eso el insert de abajo usa
-- `on conflict (slug) do update`, reutilizando el MISMO slug (y por lo tanto el mismo
-- id) que ya tenían esos 884 alimentos en vez de borrarlos y recrearlos: cualquier fila
-- de meal_entries.food_id que ya apunte a uno de ellos sigue apuntando a un alimento
-- válido, con los valores actualizados de 2023. 830 de esos 884 no cambiaron su valor
-- de energía; 54 sí (la edición 2023 corrigió el dato), y se tratan como una
-- actualización del mismo alimento, no como uno nuevo.
--
-- No se pudo confirmar cuántas filas de meal_entries en total (todas las cuentas, no
-- solo la del dueño del repo) referencian un food_id existente: la CLI de Supabase no
-- tenía sesión iniciada en el entorno donde se escribió esta migración
-- (`pnpm db:status` falla con LegacyPlatformAuthRequiredError). No hizo falta resolverlo
-- para seguir, porque el plan de arriba no borra ningún id existente de todos modos.
--
-- LA HOJA MAESTRA DEL EXCEL DUPLICA LA HOJA DE PREPARADOS. "TPCA EDICIÓN 11 2023" no
-- son solo los alimentos simples: a partir de la fila 1197 (0-indexed) repite completa
-- la sección "S - ALIMENTOS PREPARADOS", así que un conteo ingenuo de toda la hoja da
-- 2228 filas, no 1125. El script solo lee de la maestra las filas 8-1196 (los grupos
-- A a U) y toma las preparaciones de su propia hoja aparte, para no cargar cada
-- preparación dos veces.
--
-- ESTRATO. Las preparaciones repetidas con el mismo código (ej. "SE1 Aguadito de
-- pollo" aparece 5 veces) no son datos duplicados: son la misma receta medida en
-- distintos estratos socioeconómicos, según una nota de la propia fuente (encuesta
-- INS/CENAN-INEI en restaurantes de Lima y Callao). Se guardan las 5, cada una con su
-- `estrato`, sin promediar nunca sus valores. Para no confundir a un socio de gimnasio
-- con un concepto que no le sirve ("estrato socioeconómico"), el buscador solo debe
-- mostrar la fila con `is_default_variant = true` por código: la de mediana de
-- calorías entre las variantes (con número par de variantes, la menor de las dos del
-- medio). Las demás quedan en la base, consultables por tpca_code, pero fuera del
-- buscador. El rango real (mínimo-máximo de kcal entre variantes) se calcula al
-- consultar por tpca_code, no se guarda como columna aparte.
--
-- PREPARATION. Se deriva únicamente del nombre del alimento (crudo/cocido/tostado/
-- frito/seco/fresco), nunca de las calorías ni de ningún otro dato: inventar un dato
-- nutricional es peor que admitir que falta. El resultado real (888 de 1125 alimentos
-- simples, 78.9%) confirma la medición del dueño de que la mayoría no declara su
-- estado y va a quedar en 'no_especificado' — es lo esperado, no un error del patrón.
-- Las 1103 preparaciones van directo a 'preparado': son platos listos, no alimentos
-- crudos o cocidos por separado.

-- Los 2017 macros de energy_kcal/protein_g/carbs_g/fat_g se cargaron como not null
-- (00005_nutrition_log.sql), pero la fuente 2023 sí deja nutrientes sin medir (marcados
-- '•' en el Excel) y esa falta es un dato real, no un cero: rellenar con 0 le diría a un
-- socio que un alimento tiene 0 g de proteína cuando en realidad la fuente no la midió.
-- Se relaja el not null de las cuatro columnas; los check (>= 0) quedan igual, porque un
-- check no se viola con null. meal_entries no se toca: ahí los macros se guardan ya
-- calculados al momento de comer y tienen que seguir siendo not null (es historial de la
-- persona, no catálogo).
alter table public.foods
  alter column energy_kcal drop not null,
  alter column protein_g drop not null,
  alter column carbs_g drop not null,
  alter column fat_g drop not null;

create type public.food_preparation as enum (
  'crudo', 'cocido', 'tostado', 'frito', 'seco', 'fresco', 'preparado', 'no_especificado'
);

alter table public.foods
  add column if not exists energy_kj numeric(7, 1),
  add column if not exists water_g numeric(5, 1),
  add column if not exists carbs_available_g numeric(5, 1),
  add column if not exists fiber_g numeric(5, 1),
  add column if not exists ash_g numeric(5, 1),
  add column if not exists calcium_mg numeric(7, 1),
  add column if not exists phosphorus_mg numeric(7, 1),
  add column if not exists zinc_mg numeric(6, 2),
  add column if not exists iron_mg numeric(6, 2),
  add column if not exists sodium_mg numeric(7, 1),
  add column if not exists potassium_mg numeric(7, 1),
  add column if not exists betacarotene_ug numeric(8, 2),
  add column if not exists vitamin_a_ug numeric(8, 2),
  add column if not exists thiamine_mg numeric(6, 2),
  add column if not exists riboflavin_mg numeric(6, 2),
  add column if not exists niacin_mg numeric(6, 2),
  add column if not exists vitamin_c_mg numeric(7, 2),
  add column if not exists folic_acid_ug numeric(8, 2),
  add column if not exists tpca_code text,
  add column if not exists tpca_edition text,
  add column if not exists is_preparation boolean not null default false,
  add column if not exists estrato text,
  add column if not exists is_default_variant boolean not null default true,
  add column if not exists preparation public.food_preparation not null default 'no_especificado';

comment on column public.foods.energy_kcal is 'kcal por 100 g de porción comestible.';
comment on column public.foods.energy_kj is 'kJ por 100 g de porción comestible.';
comment on column public.foods.water_g is 'Agua, g por 100 g.';
comment on column public.foods.protein_g is 'Proteínas, g por 100 g.';
comment on column public.foods.fat_g is 'Grasa total, g por 100 g.';
comment on column public.foods.carbs_g is 'Carbohidratos totales, g por 100 g.';
comment on column public.foods.carbs_available_g is 'Carbohidratos disponibles, g por 100 g.';
comment on column public.foods.fiber_g is 'Fibra dietaria, g por 100 g.';
comment on column public.foods.ash_g is 'Cenizas, g por 100 g.';
comment on column public.foods.calcium_mg is 'Calcio, mg por 100 g.';
comment on column public.foods.phosphorus_mg is 'Fósforo, mg por 100 g.';
comment on column public.foods.zinc_mg is 'Zinc, mg por 100 g.';
comment on column public.foods.iron_mg is 'Hierro, mg por 100 g.';
comment on column public.foods.sodium_mg is 'Sodio, mg por 100 g.';
comment on column public.foods.potassium_mg is 'Potasio, mg por 100 g.';
comment on column public.foods.betacarotene_ug is
  'Betacaroteno equivalente total, µg por 100 g. Null en todas las preparaciones (is_preparation = true): esa hoja de la fuente no reporta esta columna.';
comment on column public.foods.vitamin_a_ug is 'Vitamina A equivalente total, µg por 100 g.';
comment on column public.foods.thiamine_mg is 'Tiamina, mg por 100 g.';
comment on column public.foods.riboflavin_mg is 'Riboflavina, mg por 100 g.';
comment on column public.foods.niacin_mg is 'Niacina, mg por 100 g.';
comment on column public.foods.vitamin_c_mg is 'Vitamina C, mg por 100 g.';
comment on column public.foods.folic_acid_ug is 'Ácido fólico, µg por 100 g.';
comment on column public.foods.tpca_code is
  'Código TPCA (letra de grupo + número secuencial, ej. "A1", "SE1"). Estable entre la edición 2017 y la 2023 para los alimentos que ya existían.';
comment on column public.foods.tpca_edition is 'Edición de la TPCA de la que salió el valor vigente de esta fila: 2017 o 2023.';
comment on column public.foods.is_preparation is
  'true para las filas de la hoja "S- Alimentos Preparados" (platos listos para comer, no alimentos simples).';
comment on column public.foods.estrato is
  'Estrato socioeconómico (A-E) de la encuesta INS/CENAN-INEI, solo para preparaciones con más de una variante del mismo tpca_code. Null en todo lo demás. No mostrar este concepto en la interfaz: un socio de gimnasio no sabe qué es.';
comment on column public.foods.is_default_variant is
  'true en la variante que se muestra en el buscador cuando un tpca_code tiene varias filas (por estrato): la de mediana de energy_kcal entre ellas. Las demás quedan en la base pero fuera del buscador principal.';
comment on column public.foods.preparation is
  'Estado del alimento, derivado solo del nombre de la fuente (nunca de las calorías ni de otro dato). "no_especificado" es el valor esperado para la mayoría: la fuente no declara el estado en la mayoría de los nombres.';

-- Postgres no compara NULL como igual a NULL, así que esto no molesta a los alimentos
-- sin estrato (la inmensa mayoría): cada tpca_code sigue siendo único entre ellos.
alter table public.foods add constraint foods_tpca_code_estrato_key unique (tpca_code, estrato);

alter table public.meal_entries
  add column if not exists preparation public.food_preparation;

comment on column public.meal_entries.preparation is
  'Qué preparación tenía el alimento elegido al registrar la comida. Null cuando food_id es null (registro manual o atajo).';
