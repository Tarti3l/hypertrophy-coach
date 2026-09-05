-- Series de calentamiento
--
-- Hasta ahora todas las series pesaban igual en el historial. Una serie de calentamiento
-- con 20 kg guardada junto a las efectivas contamina tres cosas:
--   1. "Anterior: 20 kg x 12" en el SetTracker, que es la referencia con la que el
--      usuario decide cuanto cargar hoy.
--   2. El grafico de fuerza (ahi toma el maximo, asi que aguanta).
--   3. La sugerencia de progresion, que promedia series.
--
-- Marcarlas permite excluirlas de esas lecturas sin perder el dato: saber con que
-- calentaste la ultima vez es util justo al empezar el ejercicio.
--
-- El modelo que sigue la app: la rutina guarda `target_sets` = series EFECTIVAS (al fallo).
-- El calentamiento va encima y se puede saltar. Por eso `volume.ts` puede seguir sumando
-- target_sets como volumen efectivo sin corregir nada.

alter table public.workout_sets
  add column if not exists is_warmup boolean not null default false;

comment on column public.workout_sets.is_warmup is
  'true = serie de aproximacion, no cuenta como volumen efectivo ni como referencia de progresion.';

-- Las consultas de referencia e historial filtran por ejercicio y piden solo las
-- efectivas. Un indice parcial las sirve sin arrastrar los calentamientos.
create index if not exists workout_sets_effective_idx
  on public.workout_sets (exercise_id, completed_at desc)
  where not is_warmup;

-- El RPC se recrea para aceptar la marca. `coalesce(..., false)` es deliberado: un
-- cliente viejo (o un entrenamiento encolado antes de esta migracion) manda el payload
-- sin `is_warmup` y se guarda como efectiva, que es como se comportaba hasta hoy.
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
    raise exception 'No hay una sesion activa.' using errcode = '28000';
  end if;

  if p_client_id is null then
    raise exception 'Se requiere client_id para guardar el entrenamiento.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Se requiere al menos una serie completada.' using errcode = '22023';
  end if;

  select id into v_workout_id
  from public.workouts
  where user_id = v_user_id and client_id = p_client_id;

  if v_workout_id is not null then
    return v_workout_id;
  end if;

  insert into public.workouts (user_id, client_id, started_at, ended_at, duration_minutes, notes, status)
  values (v_user_id, p_client_id, p_started_at, p_ended_at, p_duration_minutes, p_notes, 'completed')
  returning id into v_workout_id;

  insert into public.workout_sets (workout_id, exercise_id, set_number, completed_reps, weight_kg, completed_at, is_warmup)
  select
    v_workout_id,
    (item->>'exercise_id')::uuid,
    (item->>'set_number')::smallint,
    (item->>'completed_reps')::smallint,
    (item->>'weight_kg')::numeric,
    coalesce((item->>'completed_at')::timestamptz, p_ended_at),
    coalesce((item->>'is_warmup')::boolean, false)
  from jsonb_array_elements(p_sets) as item;

  return v_workout_id;

exception
  when unique_violation then
    select id into v_workout_id
    from public.workouts
    where user_id = v_user_id and client_id = p_client_id;
    return v_workout_id;
end;
$$;

revoke all on function public.save_workout_with_sets(uuid, timestamptz, timestamptz, smallint, text, jsonb) from public;
grant execute on function public.save_workout_with_sets(uuid, timestamptz, timestamptz, smallint, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
