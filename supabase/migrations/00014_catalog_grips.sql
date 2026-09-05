-- Catálogo ampliado, dificultad de ejecución y agarres.
--
-- Tres cosas:
--   1. Más ejercicios por grupo (se pasa de 4-7 a 8-11 en los principales).
--   2. `difficulty` puesta en serio, para poder recomendar según el nivel del usuario.
--   3. `grip_options`: los agarres y accesorios, con su nota.
--
-- ADVERTENCIA SOBRE LOS AGARRES, que la app repite tal cual al usuario:
--
--   No existe NINGÚN estudio revisado por pares que compare la barra Z con la barra
--   recta en el curl — ni en activación, ni en biomecánica, ni en hipertrofia, ni en
--   molestia articular. Tampoco hay nada que mida el estrés en muñeca o codo por la
--   supinación forzada de la barra recta. La preferencia por la Z es real y muy
--   extendida, pero es CONFORT, no evidencia.
--
--   Con los accesorios de tríceps pasa lo mismo. El único dato es Boehler (2011), una
--   tesis de máster que ni siquiera comparó cuerda contra barra estadísticamente
--   (74% ± 22.6 contra 67% ± 20.5: la desviación es mayor que la diferencia).
--
--   Lo que sí está medido, en los cuatro casos donde hay hipertrofia por MRI comparando
--   variantes del mismo ejercicio (Maeo 2023 tríceps, Maeo 2021 isquios, Kinoshita 2023
--   gemelos, Kassiano 2025 bíceps), es que lo determinante fue siempre la LONGITUD
--   MUSCULAR — el ángulo de la articulación de al lado — nunca el implemento ni el
--   accesorio ni la anchura del agarre.
--
-- SOBRE LA DIFICULTAD:
--   No existe ninguna clasificación publicada de dificultad técnica de ejercicios. Ni
--   ACSM, ni NSCA, ni en revistas. Las etiquetas de esta migración son criterio
--   editorial, anclado en el número de articulaciones, la demanda de equilibrio y la
--   necesidad de que alguien te asegure.
--
--   Lo que sí está respaldado, y es lo que sostiene recomendar máquinas a un
--   principiante: Haugen et al. (2023), meta-análisis en BMC Sports Sci Med Rehabil
--   15:103, no encontró diferencia de hipertrofia entre máquinas y peso libre
--   (SMD -0.055, p=0.751). Empezar en máquina no cuesta nada en resultados.

-- ---------------------------------------------------------------------------
-- 1. Agarres
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column if not exists grip_options jsonb not null default '[]'::jsonb
    check (jsonb_typeof(grip_options) = 'array');

comment on column public.exercises.grip_options is
  'Agarres o accesorios: [{name, note, evidence}]. evidence es "emg" o "consenso"; ninguno llega a "hipertrofia" porque no existe ningún estudio de crecimiento que compare accesorios.';

-- ---------------------------------------------------------------------------
-- 2. Ejercicios nuevos
-- ---------------------------------------------------------------------------

insert into public.exercises (
  slug, name, muscle_group, primary_muscles, secondary_muscles, equipment, difficulty,
  movement_pattern, is_compound, evidence_level, evidence_note, evidence_source,
  beginner_friendly, group_rank, default_reps_low, default_reps_high,
  default_rest_seconds, default_transition_seconds, grip_options,
  instructions, is_published, display_order
) values

-- ================= PECHO =================
('cable-fly', 'Aperturas en polea (cruces)', 'pecho', array['Pecho'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Tensión constante en todo el recorrido, cosa que la mancuerna no da abajo. Nadie ha comparado aperturas contra press midiendo crecimiento.',
 null, true, 5, 10, 15, 90, 120, '[]'::jsonb,
 '["Poleas a la altura del pecho o algo por encima.","Junta las manos delante con los codos casi fijos.","Abre hasta sentir el estiramiento, sin forzar el hombro."]'::jsonb, true, 140),

('converging-chest-press', 'Press de pecho convergente', 'pecho', array['Pecho'], array['Tríceps','Hombro anterior'], 'machine', 'beginner',
 'empuje-horizontal', true, 'hipertrofia',
 'Las manos se juntan al empujar, como en una apertura, pero puedes cargar como en un press. Máquina y peso libre dan la misma hipertrofia.',
 'Haugen et al. (2023), BMC Sports Sci Med Rehabil 15:103', true, 3, 8, 12, 90, 180, '[]'::jsonb,
 '["Asiento a la altura del pecho medio.","Empuja juntando las manos al final.","No bloquees los codos de golpe."]'::jsonb, true, 145),

('flat-dumbbell-press', 'Press plano con mancuernas', 'pecho', array['Pecho'], array['Tríceps','Hombro anterior'], 'dumbbell', 'intermediate',
 'empuje-horizontal', true, 'emg',
 'Cada brazo trabaja por su cuenta y bajas más que con barra. El pectoral se activa igual que con barra o máquina; lo que cambia es el bíceps y el tríceps.',
 'Saeterbakken, van den Tillaar & Fimland (2011), J Sports Sci 29(5):533-538', true, 6, 8, 12, 90, 180, '[]'::jsonb,
 '["Baja hasta que los codos queden a la altura del torso.","Muñecas alineadas sobre los codos.","Aprieta arriba sin chocar las mancuernas."]'::jsonb, true, 150),

-- ================= HOMBROS =================
('cable-lateral-raise', 'Elevación lateral en polea', 'hombros', array['Deltoides lateral'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'El mismo ensayo que midió la elevación con mancuerna probó también la polea: dieron exactamente lo mismo. Elige la que te resulte más cómoda.',
 'Larsen, Wolf, Schoenfeld et al. (2025), Frontiers in Physiology 16:1611468', true, 3, 12, 20, 90, 120, '[]'::jsonb,
 '["Polea baja, por detrás o al lado del cuerpo.","Sube hasta la altura del hombro con el codo algo flexionado.","Baja despacio, sin dejar que la polea te tire."]'::jsonb, true, 315),

('front-raise', 'Elevación frontal', 'hombros', array['Deltoides anterior'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Honestamente: es el ejercicio menos necesario del catálogo de hombro. Nadie ha comparado la elevación frontal con el press, y el deltoides anterior ya trabaja mucho en cualquier press. Añádela solo si te sobra volumen.',
 null, true, 8, 12, 20, 90, 120, '[]'::jsonb,
 '["Sube el brazo al frente hasta la altura del hombro.","No arquees la espalda para llegar más arriba.","Peso ligero: es un recorrido corto."]'::jsonb, true, 355),

('seated-dumbbell-press', 'Press de hombro con mancuernas sentado', 'hombros', array['Deltoides anterior'], array['Tríceps','Deltoides lateral'], 'dumbbell', 'intermediate',
 'empuje-vertical', true, 'emg',
 'El press de hombro es el que más activa el deltoides anterior de los ejercicios medidos (33.3% de la contracción máxima).',
 'Campos et al. (2020), Journal of Human Kinetics 75:5-14', true, 4, 8, 12, 90, 180, '[]'::jsonb,
 '["Respaldo casi vertical, espalda apoyada.","Empuja arriba sin arquear la zona lumbar.","Baja hasta que los codos queden a la altura de los hombros."]'::jsonb, true, 325),

('dumbbell-rear-fly', 'Pájaro con mancuernas', 'hombros', array['Deltoides posterior'], array['Trapecio medio'], 'dumbbell', 'intermediate',
 'aislamiento', false, 'emg',
 'Con el agarre neutro se activan más el deltoides posterior y el infraespinoso. No hay ningún estudio longitudinal que compare ejercicios de deltoides posterior entre sí.',
 'Schoenfeld et al. (2013), JSCR 27(10):2644-2649', true, 5, 12, 20, 90, 120, '[]'::jsonb,
 '["Torso inclinado hacia adelante, espalda recta.","Abre los brazos hacia atrás casi rectos.","No uses impulso con la espalda."]'::jsonb, true, 335),

-- ================= ESPALDA =================
('straight-arm-pulldown', 'Jalón con brazos rectos', 'espalda', array['Dorsal ancho'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'emg',
 'Supera al pullover con barra para el dorsal: el pullover trabaja más el pectoral que la espalda.',
 'Muyor, López-Miñarro & Alacid (2022), Applied Sciences 12(21):11138', true, 5, 12, 15, 90, 120, '[]'::jsonb,
 '["De pie frente a la polea alta, brazos casi rectos.","Baja la barra hasta los muslos usando solo el hombro.","Inclina un poco el torso y mantenlo quieto."]'::jsonb, true, 245),

('neutral-grip-pulldown', 'Jalón con agarre neutro', 'espalda', array['Dorsal ancho'], array['Bíceps'], 'cable', 'beginner',
 'traccion-vertical', true, 'consenso',
 'Las palmas enfrentadas suelen ser más cómodas para el hombro. La anchura y el tipo de agarre casi no cambian la activación del dorsal.',
 'Andersen et al. (2014), JSCR 28(4):1135-1142', true, 3, 8, 12, 90, 180, '[]'::jsonb,
 '["Agarre en V o manijas paralelas.","Lleva los codos hacia abajo y atrás.","Estira del todo arriba."]'::jsonb, true, 215),

('one-arm-dumbbell-row', 'Remo con mancuerna a una mano', 'espalda', array['Dorsal ancho'], array['Bíceps','Trapecio medio'], 'dumbbell', 'intermediate',
 'traccion-horizontal', true, 'consenso',
 'Con una mano apoyada, la espalda baja sufre mucho menos que en el remo con barra. Sin evidencia comparativa.',
 null, true, 4, 8, 12, 90, 180, '[]'::jsonb,
 '["Una mano y una rodilla en el banco, espalda plana.","Tira la mancuerna hacia la cadera, no hacia el hombro.","No rotes el torso para subir más."]'::jsonb, true, 235),

-- ================= BÍCEPS =================
('concentration-curl', 'Curl concentrado', 'biceps', array['Bíceps'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'El codo apoyado en el muslo elimina cualquier balanceo. Sin evidencia de que supere a otros curls.',
 null, true, 6, 10, 15, 90, 120, '[]'::jsonb,
 '["Sentado, codo apoyado en la cara interna del muslo.","Sube sin despegar el codo.","Baja hasta estirar del todo."]'::jsonb, true, 850),

('high-cable-curl', 'Curl en polea alta', 'biceps', array['Bíceps'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Trabaja el bíceps con el hombro abierto. Ojo: dos ensayos de 2025 y 2026 probaron manipular el ángulo del hombro en el curl y no encontraron diferencias de crecimiento.',
 'Larsen et al. (2026), Frontiers in Physiology 17:1750722', true, 7, 10, 15, 90, 120, '[]'::jsonb,
 '["Poleas a la altura de la cabeza, un brazo a cada lado.","Flexiona sin mover el codo de sitio.","Aguanta un instante arriba."]'::jsonb, true, 860),

-- ================= TRÍCEPS =================
('rope-pushdown', 'Extensión de tríceps con cuerda', 'triceps', array['Tríceps'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'La cuerda deja separar las manos al final del recorrido y suele ser más cómoda para la muñeca. No hay ningún estudio que demuestre que dé más músculo que la barra.',
 null, true, 3, 10, 15, 90, 120, '[]'::jsonb,
 '["Codos pegados al costado y quietos.","Separa las manos al llegar abajo.","Sube despacio, sin dejar que la polea te tire."]'::jsonb, true, 715),

('overhead-dumbbell-extension', 'Extensión de tríceps con mancuerna sobre la cabeza', 'triceps', array['Tríceps'], array[]::text[], 'dumbbell', 'intermediate',
 'aislamiento', false, 'hipertrofia',
 'Misma posición que la versión en polea, que es la que ganó por bastante en el estudio con resonancia: 1,4 veces más crecimiento del tríceps que el pushdown.',
 'Maeo et al. (2023), European Journal of Sport Science 23(7)', true, 2, 10, 15, 90, 120, '[]'::jsonb,
 '["Una mancuerna a dos manos, por detrás de la cabeza.","Codos apuntando adelante y quietos.","Baja hasta sentir el estiramiento detrás del brazo."]'::jsonb, true, 705),

('skull-crusher', 'Press francés', 'triceps', array['Tríceps'], array[]::text[], 'barbell', 'intermediate',
 'aislamiento', false, 'consenso',
 'Con los codos algo por detrás también estira la cabeza larga. Sin ensayo comparativo propio.',
 null, false, 5, 8, 12, 90, 120, '[]'::jsonb,
 '["Tumbado, barra Z sobre la frente o algo por detrás.","Baja doblando solo el codo.","Si te molesta el codo, cambia al de polea."]'::jsonb, true, 725),

('triceps-kickback', 'Patada de tríceps', 'triceps', array['Tríceps'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Fácil de aprender, pero la resistencia desaparece en la parte estirada, que es justo donde más interesa. Como complemento.',
 null, true, 6, 12, 20, 90, 120, '[]'::jsonb,
 '["Torso inclinado, brazo pegado al costado.","Estira el codo hacia atrás sin mover el hombro.","Aguanta un instante al final."]'::jsonb, true, 735),

-- ================= ABDOMINALES =================
('hanging-knee-raise', 'Elevación de rodillas colgado', 'abs', array['Recto abdominal','Oblicuo externo'], array[]::text[], 'bodyweight', 'intermediate',
 'aislamiento', false, 'emg',
 'De los que más activan el recto abdominal y el oblicuo externo del estudio comparativo. Es EMG: nadie ha comparado ejercicios de abdomen midiendo crecimiento.',
 'Escamilla et al. (2006), Physical Therapy 86(5):656-671', false, 3, 10, 20, 60, 120, '[]'::jsonb,
 '["Cuelga de la barra, hombros activos.","Sube las rodillas curvando la pelvis, no solo doblando la cadera.","Baja controlando, sin balancearte."]'::jsonb, true, 1015),

('decline-reverse-crunch', 'Crunch inverso en banco inclinado', 'abs', array['Recto abdominal'], array[]::text[], 'bodyweight', 'beginner',
 'aislamiento', false, 'emg',
 'De los más altos en recto abdominal del mismo estudio, y mucho más fácil de hacer bien que la versión colgado.',
 'Escamilla et al. (2006), Physical Therapy 86(5):656-671', true, 2, 12, 20, 60, 120, '[]'::jsonb,
 '["Banco a unos 30 grados, agárrate por detrás de la cabeza.","Lleva las rodillas al pecho curvando la pelvis.","Baja despacio sin arquear la espalda."]'::jsonb, true, 1025),

-- ================= CUÁDRICEPS =================
('hack-squat', 'Sentadilla hack', 'cuadriceps', array['Cuádriceps'], array['Glúteos'], 'machine', 'beginner',
 'rodilla', true, 'hipertrofia',
 'La máquina te marca el recorrido, así que puedes bajar a fondo sin preocuparte del equilibrio. Máquina y peso libre dan la misma hipertrofia.',
 'Haugen et al. (2023), BMC Sports Sci Med Rehabil 15:103', true, 3, 8, 12, 90, 180, '[]'::jsonb,
 '["Espalda pegada al respaldo todo el recorrido.","Baja al menos hasta que el muslo pase de la paralela.","Sube empujando con todo el pie."]'::jsonb, true, 415),

('smith-squat', 'Sentadilla en multipower', 'cuadriceps', array['Cuádriceps'], array['Glúteos'], 'machine', 'beginner',
 'rodilla', true, 'hipertrofia',
 'La barra guiada quita la parte del equilibrio, que es lo que más cuesta al empezar. En el estudio con resonancia produjo crecimiento del cuádriceps con patrón proximal.',
 'Earp et al. (2023), Frontiers in Physiology 14:1074705', true, 4, 8, 12, 90, 180, '[]'::jsonb,
 '["Pies algo adelantados respecto a la barra.","Baja controlando hasta pasar la paralela.","No bloquees las rodillas de golpe arriba."]'::jsonb, true, 425),

('walking-lunge', 'Zancadas caminando', 'cuadriceps', array['Cuádriceps'], array['Glúteos'], 'dumbbell', 'intermediate',
 'rodilla', true, 'consenso',
 'Una pierna a la vez, y exige bastante equilibrio. Sin ensayo comparativo.',
 null, false, 6, 10, 20, 90, 180, '[]'::jsonb,
 '["Paso largo, baja hasta que la rodilla de atrás casi toque.","Torso erguido.","Empuja con el talón de la pierna de adelante."]'::jsonb, true, 445),

-- ================= FEMORALES =================
('dumbbell-rdl', 'Peso muerto rumano con mancuernas', 'femorales', array['Isquiotibiales'], array['Glúteos'], 'dumbbell', 'intermediate',
 'cadera', true, 'hipertrofia',
 'Cubre el patrón de cadera, que el curl femoral no cubre, y con mancuernas es más fácil de aprender que con barra.',
 'Recopilado en Stronger by Science, selección de ejercicios para isquiotibiales', true, 3, 8, 12, 90, 180, '[]'::jsonb,
 '["Rodillas casi rectas, lleva la cadera hacia atrás.","Baja hasta sentir el estiramiento detrás del muslo.","Si la espalda se redondea, no bajes más."]'::jsonb, true, 515),

-- ================= GLÚTEOS =================
('hip-abduction-machine', 'Abducción de cadera en máquina', 'gluteos', array['Glúteo medio'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'consenso',
 'Ni el hip thrust ni la sentadilla hicieron crecer el glúteo medio en el ensayo que lo midió, así que si lo quieres necesitas algo específico. Pero no hay ensayo que valide este ejercicio.',
 'Plotkin et al. (2023), Frontiers in Physiology 14:1279170', true, 5, 12, 20, 90, 120, '[]'::jsonb,
 '["Espalda apoyada, torso quieto.","Abre las piernas usando solo la cadera.","Vuelve despacio, sin dejar caer el peso."]'::jsonb, true, 640),

('reverse-lunge', 'Zancada inversa', 'gluteos', array['Glúteo mayor'], array['Cuádriceps'], 'dumbbell', 'beginner',
 'rodilla', true, 'consenso',
 'Más fácil de equilibrar que la zancada hacia adelante y menos exigente para la rodilla. Sin evidencia comparativa.',
 null, true, 6, 10, 15, 90, 180, '[]'::jsonb,
 '["Da un paso largo hacia atrás.","Baja hasta que la rodilla de atrás casi toque el suelo.","Empuja con el talón de adelante para volver."]'::jsonb, true, 650),

-- ================= PANTORRILLA =================
('single-leg-calf-raise', 'Elevación de talón a una pierna', 'pantorrilla', array['Gemelos'], array['Sóleo'], 'bodyweight', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Misma posición de rodilla estirada que la versión de pie, que es la que hizo crecer el gemelo. Con tu propio peso ya hay carga suficiente para empezar.',
 'Kinoshita, Maeo et al. (2023), Frontiers in Physiology 14:1272106', true, 4, 10, 20, 90, 120, '[]'::jsonb,
 '["Punta del pie en un escalón, rodilla estirada.","Baja el talón hasta el estiramiento completo.","Sube hasta la punta y aguanta un instante."]'::jsonb, true, 930),

-- ================= ANTEBRAZO =================
('cable-wrist-curl', 'Curl de muñeca en polea', 'antebrazo', array['Flexores del antebrazo'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Tensión constante en un recorrido que es muy corto. Recuerda: no existe ningún estudio sobre hipertrofia de antebrazo, ni de ejercicio ni de volumen.',
 null, true, 5, 15, 20, 60, 90, '[]'::jsonb,
 '["Antebrazos apoyados, polea baja.","Cierra la muñeca sin mover el antebrazo.","Recorrido completo, despacio."]'::jsonb, true, 1140)

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
-- 3. Dificultad de los ejercicios que ya existían
--
-- Criterio editorial, no evidencia. En orden: cuántas articulaciones intervienen,
-- cuánto equilibrio exige, y si necesitas que alguien te asegure.
-- ---------------------------------------------------------------------------

-- Difícil: barra libre con carga sobre el cuerpo, o mucha demanda excéntrica.
update public.exercises set difficulty = 'advanced', beginner_friendly = false, updated_at = now()
where slug in ('back-squat', 'deep-squat-glute', 'romanian-deadlift', 'nordic-curl', 'barbell-row', 'ab-wheel');

-- Media: peso libre sin carga sobre la columna, o algo de equilibrio.
update public.exercises set difficulty = 'intermediate', updated_at = now()
where slug in (
  'barbell-bench-press', 'overhead-press', 'close-grip-bench', 'bulgarian-split-squat',
  'incline-dumbbell-press', 'incline-dumbbell-curl', 'dumbbell-lateral-raise',
  'one-arm-dumbbell-row', 'seated-dumbbell-press', 'dumbbell-rear-fly',
  'flat-dumbbell-press', 'dumbbell-rdl', 'walking-lunge', 'skull-crusher',
  'overhead-dumbbell-extension', 'hanging-knee-raise'
);

-- Fácil: máquinas y poleas guiadas. Recomendar máquina a un principiante no cuesta
-- nada en hipertrofia (Haugen 2023), así que este es el grupo por defecto para novatos.
update public.exercises set difficulty = 'beginner', beginner_friendly = true, updated_at = now()
where equipment in ('machine', 'cable')
  and muscle_group is not null
  and muscle_group <> 'cardio'
  and slug not in ('assisted-pull-up', 'assisted-dip');

update public.exercises set difficulty = 'beginner', beginner_friendly = true, updated_at = now()
where muscle_group = 'cardio';

-- ---------------------------------------------------------------------------
-- 4. Agarres y accesorios
--
-- Todos van etiquetados como "consenso" salvo donde hay EMG, porque NO EXISTE ningún
-- estudio de hipertrofia que compare accesorios de polea ni tipos de barra.
-- ---------------------------------------------------------------------------

update public.exercises set grip_options = '[
  {"name":"Cuerda","note":"Deja separar las manos al final y suele ser la más cómoda para la muñeca.","evidence":"consenso"},
  {"name":"Barra en V","note":"Posición semi-neutra. Con ella y con la barra recta se suele poder cargar más peso que con la cuerda.","evidence":"consenso"},
  {"name":"Barra recta","note":"La más estable de las tres para cargar.","evidence":"consenso"},
  {"name":"Nota honesta","note":"Ningún estudio ha comparado estos accesorios midiendo crecimiento muscular. El único dato es una tesis de 2011 que ni siquiera los comparó entre sí. Elige el que te resulte cómodo y con el que puedas progresar.","evidence":"consenso"}
]'::jsonb, updated_at = now()
where slug in ('triceps-pushdown', 'rope-pushdown');

update public.exercises set grip_options = '[
  {"name":"Barra Z","note":"La forma de la barra deja las muñecas en semi-supinación. Mucha gente la encuentra más cómoda que la recta.","evidence":"consenso"},
  {"name":"Barra recta","note":"Obliga a supinación completa. Permite cargar bien y es la más común.","evidence":"consenso"},
  {"name":"Agarre supinado","note":"Palmas hacia arriba: activa más el bíceps que el neutro (+12%) y que el pronado (+19%).","evidence":"emg"},
  {"name":"Nota honesta","note":"No existe ningún estudio que compare la barra Z con la recta, ni en activación ni en molestia de muñeca. Que la Z sea más cómoda es preferencia, no un dato. Si la recta no te molesta, no la cambies.","evidence":"consenso"}
]'::jsonb, updated_at = now()
where slug in ('ez-bar-curl', 'preacher-curl', 'reverse-curl');

update public.exercises set grip_options = '[
  {"name":"Pronado (palmas al frente)","note":"Alrededor de un 9% más de activación del dorsal que el supinado.","evidence":"emg"},
  {"name":"Neutro (palmas enfrentadas)","note":"Suele ser el más cómodo para el hombro.","evidence":"consenso"},
  {"name":"Anchura","note":"Entre una y dos veces la anchura de tus hombros da la misma activación del dorsal; los autores esperan una hipertrofia parecida. No te compliques.","evidence":"emg"}
]'::jsonb, updated_at = now()
where slug in ('lat-pulldown', 'neutral-grip-pulldown', 'assisted-pull-up');

update public.exercises set grip_options = '[
  {"name":"Anchura media","note":"Entre 1,5 y 2 veces la distancia entre tus hombros. Es la que permite más carga.","evidence":"emg"},
  {"name":"Anchura cerrada","note":"Carga un 7-8% menos y desplaza trabajo al tríceps.","evidence":"emg"},
  {"name":"Nota","note":"El pectoral se activa igual con las tres anchuras. Lo que cambia es el reparto entre hombro y tríceps, y cuánto peso puedes mover.","evidence":"emg"}
]'::jsonb, updated_at = now()
where slug in ('barbell-bench-press', 'close-grip-bench');

update public.exercises set grip_options = '[
  {"name":"Curl martillo (neutro)","note":"Aviso: la idea de que el martillo es el ejercicio del braquiorradial no está respaldada. En el estudio que lo midió, el agarre supinado activó MÁS el braquiorradial que el neutro. Úsalo por comodidad y variedad, no por esa razón.","evidence":"emg"}
]'::jsonb, updated_at = now()
where slug = 'hammer-curl';

notify pgrst, 'reload schema';
