-- Guardar un entrenamiento son dos inserts (workouts + workout_sets). Vía REST son dos
-- requests sin transacción: si el segundo falla queda un workout huérfano que infla la racha.
-- Esta función los mete en una sola transacción y, al ser security invoker, sigue pasando por RLS.

create or replace function public.save_workout_with_sets(
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
  v_workout_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No hay una sesión activa.' using errcode = '28000';
  end if;

  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) = 0 then
    raise exception 'Se requiere al menos una serie completada.' using errcode = '22023';
  end if;

  insert into public.workouts (user_id, started_at, ended_at, duration_minutes, notes, status)
  values (auth.uid(), p_started_at, p_ended_at, p_duration_minutes, p_notes, 'completed')
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
end;
$$;

revoke all on function public.save_workout_with_sets(timestamptz, timestamptz, smallint, text, jsonb) from public;
grant execute on function public.save_workout_with_sets(timestamptz, timestamptz, smallint, text, jsonb) to authenticated;
