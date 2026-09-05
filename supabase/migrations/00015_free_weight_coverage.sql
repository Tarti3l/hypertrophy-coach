-- Cobertura de máquina y peso libre en todos los grupos.
--
-- El usuario quiere poder elegir entre máquina y peso libre en cada grupo muscular.
-- Al revisar la cobertura del catálogo, once de los doce grupos ya tenían ambas
-- opciones. El que no: PANTORRILLA, con tres ejercicios de máquina y uno de peso
-- corporal, ninguno con mancuerna o barra.
--
-- Se añade eso y unas cuantas variantes con barra olímpica para pierna, que es donde
-- el usuario señaló que hacen falta.
--
-- Recordatorio que la app sigue mostrando: elegir máquina no cuesta nada en resultados.
-- Haugen et al. (2023), BMC Sports Sci Med Rehabil 15:103, meta-análisis de máquinas
-- contra peso libre: hipertrofia sin diferencia significativa (SMD -0.055, p=0.751).
-- La elección es de comodidad, disponibilidad y confianza técnica, no de eficacia.

insert into public.exercises (
  slug, name, muscle_group, primary_muscles, secondary_muscles, equipment, difficulty,
  movement_pattern, is_compound, evidence_level, evidence_note, evidence_source,
  beginner_friendly, group_rank, default_reps_low, default_reps_high,
  default_rest_seconds, default_transition_seconds, grip_options,
  instructions, is_published, display_order
) values

-- ===== PANTORRILLA: el hueco real =====
('dumbbell-calf-raise', 'Elevación de talón con mancuernas', 'pantorrilla',
 array['Gemelos'], array['Sóleo'], 'dumbbell', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Misma posición de rodilla estirada que la versión en máquina, que es la que hizo crecer el gemelo. Sirve si no hay máquina libre: solo necesitas mancuernas y un escalón.',
 'Kinoshita, Maeo et al. (2023), Frontiers in Physiology 14:1272106', true, 5, 10, 20, 90, 120, '[]'::jsonb,
 '["Punta de los pies en un escalón, mancuernas a los lados.","Rodillas estiradas: si las doblas, dejas de trabajar el gemelo.","Baja el talón hasta el estiramiento y sube hasta la punta."]'::jsonb, true, 940),

('barbell-calf-raise', 'Elevación de talón con barra', 'pantorrilla',
 array['Gemelos'], array['Sóleo'], 'barbell', 'intermediate',
 'aislamiento', false, 'consenso',
 'Permite cargar bastante más que con mancuernas. Va en multipower o en un rack, porque equilibrar la barra de puntillas es incómodo.',
 null, false, 6, 10, 20, 90, 120, '[]'::jsonb,
 '["Barra sobre los trapecios, puntas en un escalón.","Rodillas estiradas todo el recorrido.","Sube despacio, sin rebotar abajo."]'::jsonb, true, 950),

-- ===== PIERNA CON BARRA OLÍMPICA =====
('front-squat', 'Sentadilla frontal', 'cuadriceps',
 array['Cuádriceps'], array['Glúteos','Core'], 'barbell', 'advanced',
 'rodilla', true, 'consenso',
 'La barra por delante obliga a mantener el torso más vertical, así que carga más el cuádriceps y menos la espalda baja que la sentadilla trasera. Exige movilidad de muñeca y hombro.',
 null, false, 7, 6, 10, 90, 180, '[]'::jsonb,
 '["Barra apoyada sobre los deltoides frontales, codos altos.","Baja manteniendo el torso vertical.","Si los codos caen, la barra se va hacia adelante: para la serie."]'::jsonb, true, 435),

('barbell-lunge', 'Zancada con barra', 'cuadriceps',
 array['Cuádriceps'], array['Glúteos'], 'barbell', 'advanced',
 'rodilla', true, 'consenso',
 'Una pierna a la vez con carga sobre la espalda. Pide bastante equilibrio; con mancuernas es más fácil de controlar.',
 null, false, 8, 8, 12, 90, 180, '[]'::jsonb,
 '["Barra en los trapecios, paso largo al frente.","Baja hasta que la rodilla de atrás casi toque.","Empuja con el talón de adelante para volver."]'::jsonb, true, 450),

('barbell-glute-bridge', 'Puente de glúteo con barra', 'gluteos',
 array['Glúteo mayor'], array['Isquiotibiales'], 'barbell', 'beginner',
 'cadera', true, 'consenso',
 'Como el hip thrust pero desde el suelo, sin necesidad de banco. Recorrido algo más corto; útil cuando el banco está ocupado o estás empezando.',
 null, true, 7, 8, 15, 90, 180, '[]'::jsonb,
 '["Tumbado, barra sobre la cadera con una almohadilla.","Empuja con los talones hasta alinear cadera y torso.","Aprieta el glúteo arriba sin arquear la espalda baja."]'::jsonb, true, 660),

('dumbbell-hip-thrust', 'Hip thrust con mancuerna', 'gluteos',
 array['Glúteo mayor'], array['Isquiotibiales'], 'dumbbell', 'beginner',
 'cadera', true, 'hipertrofia',
 'La misma mecánica que la versión con barra, que produce crecimiento del glúteo similar a la sentadilla, pero mucho más fácil de montar.',
 'Plotkin et al. (2023), Frontiers in Physiology 14:1279170', true, 4, 10, 15, 90, 180, '[]'::jsonb,
 '["Espalda apoyada en un banco, mancuerna sobre la cadera.","Empuja con los talones hasta alinear el cuerpo.","Aguanta arriba un segundo."]'::jsonb, true, 615),

-- ===== ANTEBRAZO: le faltaba una segunda opción de máquina =====
('reverse-cable-wrist-curl', 'Extensión de muñeca en polea', 'antebrazo',
 array['Extensores del antebrazo'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Tensión constante en un recorrido muy corto. Recuerda que no existe ningún estudio sobre hipertrofia de antebrazo, ni de ejercicio ni de volumen.',
 null, true, 6, 15, 20, 60, 90, '[]'::jsonb,
 '["Antebrazos apoyados, palmas hacia abajo.","Sube la muñeca sin mover el antebrazo.","Peso ligero y recorrido completo."]'::jsonb, true, 1150),

-- ===== ABDOMEN: una opción con peso libre =====
('dumbbell-side-bend', 'Inclinación lateral con mancuerna', 'abs',
 array['Oblicuo externo'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Trabaja los oblicuos con carga. Sin evidencia comparativa: no existe ningún ensayo de hipertrofia que compare ejercicios de abdomen.',
 null, true, 6, 12, 20, 60, 90, '[]'::jsonb,
 '["Una mancuerna a un lado, la otra mano en la nuca.","Inclínate solo hacia el lado, sin rotar.","Vuelve al centro con control."]'::jsonb, true, 1040)

on conflict (slug) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group,
  primary_muscles = excluded.primary_muscles,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  difficulty = excluded.difficulty,
  movement_pattern = excluded.movement_pattern,
  is_compound = excluded.is_compound,
  evidence_level = excluded.evidence_level,
  evidence_note = excluded.evidence_note,
  evidence_source = excluded.evidence_source,
  beginner_friendly = excluded.beginner_friendly,
  group_rank = excluded.group_rank,
  default_reps_low = excluded.default_reps_low,
  default_reps_high = excluded.default_reps_high,
  default_rest_seconds = excluded.default_rest_seconds,
  default_transition_seconds = excluded.default_transition_seconds,
  instructions = excluded.instructions,
  is_published = excluded.is_published,
  display_order = excluded.display_order,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- Comprobación: ningún grupo debe quedarse sin máquina o sin peso libre.
--
-- Si esta migración falla aquí, es que se añadió un grupo sin cubrir las dos vías y
-- el selector de "Libre / Máquina" dejaría al usuario con una pestaña vacía.
-- ---------------------------------------------------------------------------

do $$
declare
  faltantes text;
begin
  select string_agg(muscle_group::text || ' (' || falta || ')', ', ')
  into faltantes
  from (
    select
      muscle_group,
      case
        when count(*) filter (where equipment in ('machine', 'cable')) = 0 then 'sin máquina'
        when count(*) filter (where equipment in ('barbell', 'dumbbell')) = 0 then 'sin peso libre'
      end as falta
    from public.exercises
    where is_published = true and muscle_group is not null and muscle_group <> 'cardio'
    group by muscle_group
  ) resumen
  where falta is not null;

  if faltantes is not null then
    raise exception 'Grupos sin cobertura completa de equipamiento: %', faltantes;
  end if;
end $$;

notify pgrst, 'reload schema';
