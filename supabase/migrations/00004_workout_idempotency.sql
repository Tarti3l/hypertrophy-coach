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
