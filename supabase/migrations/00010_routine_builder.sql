-- Constructor de rutinas: grupos musculares, catálogo ampliado y plantillas de split.
--
-- Hasta ahora `exercises` tenía 3 filas, todas de pecho, y `routine_exercises` era
-- una lista plana sin noción de "día". Eso hace imposible armar una rutina semanal.
--
-- Todo lo que se siembra aquí está respaldado en docs/rutinas.md, con la cita en
-- `evidence_source`. La columna `evidence_level` distingue lo medido por hipertrofia
-- de lo que solo tiene EMG (predictor débil) y de lo que es consenso sin estudio.
-- La app muestra ese nivel al usuario: no presentamos costumbre como si fuera dato.

-- ---------------------------------------------------------------------------
-- 1. Grupos musculares
-- ---------------------------------------------------------------------------

create type public.muscle_group as enum (
  'pecho', 'hombros', 'biceps', 'triceps', 'antebrazo', 'espalda',
  'abs', 'cuadriceps', 'gluteos', 'femorales', 'pantorrilla', 'cardio'
);

create type public.evidence_level as enum ('hipertrofia', 'emg', 'consenso');

create type public.movement_pattern as enum (
  'empuje-horizontal', 'empuje-vertical', 'traccion-vertical', 'traccion-horizontal',
  'rodilla', 'cadera', 'aislamiento', 'core', 'cardio'
);

create table public.muscle_groups (
  slug public.muscle_group primary key,
  name text not null,
  display_order smallint not null,
  /** Series semanales directas recomendadas para alguien que empieza. Ver docs/rutinas.md §1. */
  beginner_sets_min smallint not null,
  beginner_sets_max smallint not null,
  /** Rango para entrenados (Baz-Valle 2022: 12-20 series/semana). */
  trained_sets_min smallint not null,
  trained_sets_max smallint not null,
  /** Cuánta evidencia hay para ELEGIR entre ejercicios de este grupo (no cuánta para entrenarlo). */
  selection_evidence public.evidence_level not null,
  /** Frase honesta que la UI muestra sobre el estado de la evidencia de este grupo. */
  evidence_note text not null,
  check (beginner_sets_min <= beginner_sets_max),
  check (trained_sets_min <= trained_sets_max)
);

insert into public.muscle_groups (slug, name, display_order, beginner_sets_min, beginner_sets_max, trained_sets_min, trained_sets_max, selection_evidence, evidence_note) values
  ('pecho',       'Pecho',        10, 6, 10, 12, 20, 'consenso',    'No existe ningún ensayo de hipertrofia que compare aperturas con press, ni mancuerna con barra. El orden de esta lista es criterio práctico.'),
  ('espalda',     'Espalda',      20, 6, 10, 12, 20, 'consenso',    'No existe ningún ensayo de hipertrofia que compare jalón con remo. Es una de las lagunas más grandes de la literatura: solo hay EMG.'),
  ('hombros',     'Hombros',      30, 6, 10, 12, 20, 'hipertrofia', 'Hay un ensayo con medición directa para el deltoides lateral (mancuerna y polea dan lo mismo). Para el anterior y el posterior, la evidencia es más floja.'),
  ('cuadriceps',  'Cuádriceps',   40, 6, 10, 12, 20, 'hipertrofia', 'Buena evidencia. El hallazgo importante: el recto femoral casi no crece con sentadilla, necesita extensión de rodilla.'),
  ('femorales',   'Femorales',    50, 6, 10, 12, 20, 'hipertrofia', 'Evidencia fuerte y muy específica del ejercicio: el curl sentado supera claramente al tumbado.'),
  ('gluteos',     'Glúteos',      60, 6, 10, 12, 20, 'hipertrofia', 'Buena evidencia, con una sorpresa: el hip thrust no supera a la sentadilla profunda.'),
  ('triceps',     'Tríceps',      70, 4,  8, 12, 20, 'hipertrofia', 'La evidencia más clara del catálogo: la extensión por encima de la cabeza gana por bastante.'),
  ('biceps',      'Bíceps',       80, 4,  8, 12, 20, 'hipertrofia', 'Buena evidencia, con resultados en su mayoría nulos: el ángulo del hombro no cambia el resultado.'),
  ('pantorrilla', 'Pantorrilla',  90, 4,  8, 10, 20, 'hipertrofia', 'Evidencia fuerte: de pie supera a sentado para el gemelo por un margen enorme.'),
  ('abs',         'Abdominales', 100, 4,  8,  8, 16, 'emg',         'No hay ni un solo ensayo comparativo de hipertrofia para abdominales. Todo lo que existe es activación muscular, que predice mal el crecimiento.'),
  ('antebrazo',   'Antebrazo',   110, 0,  6,  6, 12, 'consenso',    'No existe ningún estudio sobre hipertrofia de antebrazo, ni de ejercicio ni de volumen. Esta lista es anatomía, no datos.'),
  ('cardio',      'Cardio',      120, 0,  0,  0,  0, 'consenso',    'El cardio suave está aquí por salud cardiovascular, no por hipertrofia.');

-- ---------------------------------------------------------------------------
-- 2. Catálogo de ejercicios: metadatos nuevos
-- ---------------------------------------------------------------------------

alter table public.exercises
  add column if not exists muscle_group public.muscle_group,
  add column if not exists movement_pattern public.movement_pattern,
  add column if not exists is_compound boolean not null default false,
  add column if not exists evidence_level public.evidence_level not null default 'consenso',
  /** Por qué recomendamos este ejercicio, en castellano llano. Se muestra en la UI. */
  add column if not exists evidence_note text,
  /** Cita concreta. Vacío cuando evidence_level = 'consenso'. */
  add column if not exists evidence_source text,
  add column if not exists beginner_friendly boolean not null default true,
  /** Orden dentro del grupo muscular: 1 es el que la app propone primero. */
  add column if not exists group_rank smallint not null default 50,
  add column if not exists default_reps_low smallint check (default_reps_low between 1 and 100),
  add column if not exists default_reps_high smallint check (default_reps_high between 1 and 100),
  add column if not exists default_rest_seconds smallint check (default_rest_seconds between 15 and 600);

comment on column public.exercises.evidence_level is
  'hipertrofia = ensayo con medición directa; emg = solo activación aguda (predictor débil); consenso = sin estudio comparativo. La UI lo muestra tal cual.';

create index if not exists exercises_group_rank_idx
  on public.exercises (muscle_group, group_rank, name)
  where is_published = true;

-- Los 3 ejercicios sembrados en 00002 no tenían grupo muscular. Se lo damos aquí
-- para que no queden fuera del constructor.
update public.exercises set
  muscle_group = 'pecho',
  movement_pattern = 'empuje-horizontal',
  is_compound = true
where slug in ('dumbbell-bench-press', 'chest-press-machine', 'push-up')
  and muscle_group is null;

-- ---------------------------------------------------------------------------
-- 3. Siembra del catálogo (11 grupos + cardio)
-- ---------------------------------------------------------------------------

insert into public.exercises (
  slug, name, muscle_group, primary_muscles, secondary_muscles, equipment, difficulty,
  movement_pattern, is_compound, evidence_level, evidence_note, evidence_source,
  beginner_friendly, group_rank, default_reps_low, default_reps_high, default_rest_seconds,
  instructions, is_published, display_order
) values

-- ---------- PECHO ----------
('chest-press-machine-v2', 'Press de pecho en máquina', 'pecho', array['Pecho'], array['Tríceps','Hombro anterior'], 'machine', 'beginner',
 'empuje-horizontal', true, 'consenso',
 'El punto de partida más seguro: te deja acercarte al fallo sin depender de nadie que te asegure.',
 null, true, 1, 8, 12, 120,
 '["Ajusta el asiento para que las manijas queden a la altura media del pecho.","Empuja sin bloquear los codos de golpe.","Vuelve al inicio con la misma velocidad con la que empujaste."]'::jsonb, true, 100),

('incline-dumbbell-press', 'Press inclinado con mancuernas (30°)', 'pecho', array['Pecho'], array['Hombro anterior','Tríceps'], 'dumbbell', 'beginner',
 'empuje-horizontal', true, 'hipertrofia',
 'El único ensayo que comparó ángulos de banco encontró más crecimiento del pecho superior con el inclinado. Ojo: es un solo estudio y no se ha replicado.',
 'Chaves et al. (2020), International Journal of Exercise Science 13(6):859-872', true, 2, 8, 12, 120,
 '["Pon el banco a unos 30 grados: más inclinado trabaja el hombro, no el pecho.","Baja hasta sentir estiramiento en el pecho, sin rebotar.","Mantén los omóplatos apoyados en el banco todo el recorrido."]'::jsonb, true, 110),

('barbell-bench-press', 'Press de banca con barra', 'pecho', array['Pecho'], array['Tríceps','Hombro anterior'], 'barbell', 'intermediate',
 'empuje-horizontal', true, 'emg',
 'Es donde más peso vas a poder progresar. La evidencia que lo respalda es de activación muscular, que predice mal el crecimiento.',
 'López-Vivancos et al. (2023), Applied Sciences 13(8):5203', false, 3, 6, 10, 150,
 '["Agarre algo más ancho que los hombros.","Baja la barra a la altura del pecho medio, tocando sin rebotar.","Los pies firmes en el suelo, sin despegar la cadera del banco."]'::jsonb, true, 120),

('pec-deck', 'Apertura en máquina (pec deck)', 'pecho', array['Pecho'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'consenso',
 'Carga el pecho en posición estirada sin que el tríceps sea el limitante. No hay ningún estudio que lo compare con el press.',
 null, true, 4, 10, 15, 90,
 '["Ajusta el asiento para que los brazos queden a la altura del pecho.","Junta los brazos sin doblar más los codos.","Abre hasta sentir estiramiento, sin forzar el hombro."]'::jsonb, true, 130),

-- ---------- ESPALDA ----------
('lat-pulldown', 'Jalón al pecho', 'espalda', array['Dorsal ancho'], array['Bíceps','Trapecio medio'], 'cable', 'beginner',
 'traccion-vertical', true, 'consenso',
 'El mejor primer ejercicio de espalda: te deja aprender el patrón sin cargar la zona lumbar. La anchura del agarre no cambia nada relevante.',
 'Andersen et al. (2014), Journal of Strength and Conditioning Research', true, 1, 8, 12, 120,
 '["Ajusta el rodillo para que las piernas queden fijas.","Lleva la barra al pecho, no detrás de la nuca.","Piensa en bajar los codos, no en tirar con las manos."]'::jsonb, true, 200),

('chest-supported-row', 'Remo con apoyo de pecho', 'espalda', array['Dorsal ancho','Trapecio medio'], array['Bíceps','Hombro posterior'], 'machine', 'beginner',
 'traccion-horizontal', true, 'consenso',
 'El apoyo quita toda la demanda de la zona lumbar, así que la espalda alta trabaja sin que la baja te limite.',
 null, true, 2, 8, 12, 120,
 '["Apoya el pecho firme y no lo despegues.","Tira llevando los codos hacia atrás, no hacia arriba.","Estira del todo al final de cada repetición."]'::jsonb, true, 210),

('seated-cable-row', 'Remo sentado en polea', 'espalda', array['Dorsal ancho','Trapecio medio'], array['Bíceps'], 'cable', 'beginner',
 'traccion-horizontal', true, 'emg',
 'Dejar que los omóplatos se separen al estirar dio la mayor activación del dorsal del estudio. Es EMG, no crecimiento medido.',
 'Lehman et al. (2004), Dynamic Medicine 3:4', true, 3, 8, 12, 120,
 '["Deja que los omóplatos se separen al estirar el brazo.","Tira hasta el abdomen, no hasta el pecho.","No uses impulso con la espalda baja."]'::jsonb, true, 220),

('assisted-pull-up', 'Dominada asistida', 'espalda', array['Dorsal ancho'], array['Bíceps'], 'machine', 'beginner',
 'traccion-vertical', true, 'consenso',
 'La versión asistida te deja construir hacia la dominada libre. No hay evidencia de que sea mejor que el jalón.',
 null, true, 4, 5, 10, 150,
 '["Elige una asistencia que te deje hacer al menos 5 repeticiones limpias.","Sube hasta que la barbilla pase la barra.","Baja controlando, sin dejarte caer."]'::jsonb, true, 230),

('barbell-row', 'Remo con barra', 'espalda', array['Dorsal ancho','Trapecio medio'], array['Bíceps','Lumbar'], 'barbell', 'intermediate',
 'traccion-horizontal', true, 'consenso',
 'Mucha carga posible, pero exige aguantar la posición con la espalda baja. No es para empezar.',
 null, false, 5, 6, 10, 150,
 '["Bisagra de cadera con la espalda recta, torso a unos 45 grados.","Tira la barra hacia el ombligo.","Si la espalda baja se redondea, baja el peso."]'::jsonb, true, 240),

('cable-pullover', 'Pullover en polea', 'espalda', array['Dorsal ancho'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Aísla el dorsal sin que el bíceps sea el limitante. Sin estudios comparativos.',
 null, true, 6, 10, 15, 90,
 '["Brazos casi rectos todo el recorrido.","Lleva la barra hasta los muslos usando solo el hombro.","Vuelve arriba sintiendo el estiramiento del dorsal."]'::jsonb, true, 250),

('dumbbell-shrug', 'Encogimientos con mancuernas', 'espalda', array['Trapecio superior'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'emg',
 'Fue el ejercicio con más activación del trapecio superior del estudio comparativo. Es EMG, no crecimiento medido.',
 'Ekstrom, Donatelli & Soderberg (2003), JOSPT 33(5):247-258', true, 7, 10, 15, 90,
 '["Sube los hombros hacia las orejas, sin rotarlos.","Aguanta arriba un instante.","No uses impulso con las piernas."]'::jsonb, true, 260),

-- ---------- HOMBROS ----------
('machine-lateral-raise', 'Elevación lateral en máquina', 'hombros', array['Deltoides lateral'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'consenso',
 'La más fácil de hacer bien: la máquina te marca el recorrido. No hay estudio que la compare con mancuerna o polea.',
 null, true, 1, 12, 20, 90,
 '["Sube hasta que los brazos queden a la altura de los hombros.","No encojas el cuello al subir.","Baja despacio, sin soltar la tensión."]'::jsonb, true, 300),

('dumbbell-lateral-raise', 'Elevación lateral con mancuernas', 'hombros', array['Deltoides lateral'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Un ensayo de 8 semanas midió +3,3 a 4,6% de grosor del deltoides lateral. Y encontró que mancuerna y polea dan exactamente lo mismo: elige la que prefieras.',
 'Larsen, Wolf, Schoenfeld et al. (2025), Frontiers in Physiology 16:1611468', true, 2, 12, 20, 90,
 '["Sube con el codo ligeramente flexionado hasta la altura del hombro.","No lances el peso con impulso: si necesitas balanceo, pesa demasiado.","Baja en unos 2 segundos."]'::jsonb, true, 310),

('machine-shoulder-press', 'Press de hombro en máquina', 'hombros', array['Deltoides anterior'], array['Tríceps'], 'machine', 'beginner',
 'empuje-vertical', true, 'consenso',
 'Es el único movimiento compuesto que lleva el hombro por encima de la cabeza. En máquina no necesitas estabilizar.',
 null, true, 3, 8, 12, 120,
 '["Ajusta el asiento para que las manijas queden a la altura de los hombros.","Empuja arriba sin bloquear los codos de golpe.","Baja hasta que los codos queden a la altura de los hombros."]'::jsonb, true, 320),

('reverse-pec-deck', 'Pájaro en máquina (deltoides posterior)', 'hombros', array['Deltoides posterior'], array['Trapecio medio'], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Un ensayo de 10 semanas midió aumentos del deltoides posterior de entre 12,8 y 26%. Es un preprint, sin revisión por pares todavía.',
 'Jones et al. (2025), preprint SportRxiv', true, 4, 12, 20, 90,
 '["Abre los brazos hacia atrás manteniéndolos casi rectos.","Piensa en juntar los omóplatos.","No arquees la espalda para llegar más lejos."]'::jsonb, true, 330),

('overhead-press', 'Press militar de pie', 'hombros', array['Deltoides anterior'], array['Tríceps','Core'], 'barbell', 'intermediate',
 'empuje-vertical', true, 'consenso',
 'Permite la mayor carga del grupo, pero exige controlar el tronco. Mejor cuando ya tengas base.',
 null, false, 5, 6, 10, 150,
 '["Barra a la altura de las clavículas, codos algo por delante.","Empuja hacia arriba y mete la cabeza al pasar la barra.","Aprieta glúteos y abdomen para no arquear la espalda."]'::jsonb, true, 340),

('face-pull', 'Face pull en polea', 'hombros', array['Deltoides posterior'], array['Trapecio medio'], 'cable', 'beginner',
 'aislamiento', false, 'consenso',
 'Muy recomendado para la salud del hombro, pero eso viene de EMG y de la práctica: no hay datos de crecimiento comparativo.',
 null, true, 6, 12, 20, 90,
 '["Polea a la altura de la cara.","Tira separando las manos, llevando los codos altos.","Termina con las manos a los lados de la cabeza."]'::jsonb, true, 350),

-- ---------- CUÁDRICEPS ----------
('leg-extension', 'Extensión de rodilla', 'cuadriceps', array['Cuádriceps','Recto femoral'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Hallazgo importante: en un ensayo controlado la sentadilla NO hizo crecer el recto femoral en ninguna zona, y la extensión sí en las tres. Este ejercicio no es opcional si quieres ese músculo.',
 'Zabaleta-Korta et al. (2021), Journal of Sports Sciences 39(20):2298-2304', true, 1, 10, 15, 90,
 '["Ajusta el respaldo para que la rodilla coincida con el eje de la máquina.","Sube hasta estirar del todo y aguanta un instante.","Baja despacio, sin dejar caer el peso."]'::jsonb, true, 400),

('leg-press', 'Prensa de piernas 45°', 'cuadriceps', array['Cuádriceps'], array['Glúteos','Aductores'], 'machine', 'beginner',
 'rodilla', true, 'hipertrofia',
 'Alternativa segura a la sentadilla con crecimiento comparable, y sin necesidad de aguantar la barra encima.',
 'Krause Neto et al. (2025), Frontiers in Physiology 16:1542334', true, 2, 8, 15, 150,
 '["Pies a la anchura de los hombros en el centro de la plataforma.","Baja hasta que las rodillas lleguen cerca del pecho, sin despegar la cadera.","No bloquees las rodillas de golpe arriba."]'::jsonb, true, 410),

('goblet-squat', 'Sentadilla goblet', 'cuadriceps', array['Cuádriceps'], array['Glúteos','Core'], 'dumbbell', 'beginner',
 'rodilla', true, 'consenso',
 'La forma más fácil de aprender a sentarte bien: la mancuerna delante te obliga a mantener el torso recto.',
 null, true, 3, 8, 12, 120,
 '["Mancuerna pegada al pecho, codos hacia abajo.","Baja como si te sentaras, rodillas hacia afuera.","Llega al menos a que el muslo quede paralelo al suelo."]'::jsonb, true, 420),

('back-squat', 'Sentadilla con barra', 'cuadriceps', array['Cuádriceps'], array['Glúteos','Aductores','Core'], 'barbell', 'intermediate',
 'rodilla', true, 'hipertrofia',
 'Bajar profundo (unos 120° de rodilla) dio 4-7% más sección del muslo que quedarse a media altura, con el mismo volumen. La profundidad importa más que el peso.',
 'Bloomquist et al. (2013), Eur J Appl Physiol 113(8):2133-2142', false, 4, 6, 10, 180,
 '["Barra apoyada en los trapecios, no en el cuello.","Baja al menos hasta que el muslo pase de la paralela.","Sube empujando el suelo, sin adelantar la cadera antes que el pecho."]'::jsonb, true, 430),

('bulgarian-split-squat', 'Sentadilla búlgara', 'cuadriceps', array['Cuádriceps'], array['Glúteos'], 'dumbbell', 'intermediate',
 'rodilla', true, 'consenso',
 'Trabaja una pierna a la vez. Sin estudios comparativos; exige bastante equilibrio.',
 null, false, 5, 8, 12, 120,
 '["Pie de atrás sobre un banco, a un paso largo de distancia.","Baja recto, no hacia adelante.","La pierna de adelante hace el trabajo."]'::jsonb, true, 440),

-- ---------- FEMORALES ----------
('seated-leg-curl', 'Curl femoral sentado', 'femorales', array['Isquiotibiales'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Medido con resonancia: +14,1% sentado contra +9,3% tumbado, y en la cabeza larga del bíceps femoral +14,4% contra +6,5%, más del doble. Con la cadera flexionada el músculo trabaja estirado.',
 'Maeo et al. (2021), Medicine & Science in Sports & Exercise 53(4):825-837', true, 1, 10, 15, 90,
 '["Ajusta el respaldo para que la rodilla coincida con el eje.","Flexiona hasta el tope y aguanta un instante.","Vuelve despacio, sin soltar la tensión."]'::jsonb, true, 500),

('romanian-deadlift', 'Peso muerto rumano', 'femorales', array['Isquiotibiales'], array['Glúteos','Lumbar'], 'barbell', 'intermediate',
 'cadera', true, 'hipertrofia',
 'Cubre el patrón de cadera, que el curl no cubre. En comparaciones directas produce más crecimiento del semimembranoso que el nórdico.',
 'Maeo, Balshaw, Nin et al. (2024), MSSE 56(10):1893-1905; recopilado en Stronger by Science', false, 2, 8, 12, 150,
 '["Rodillas casi rectas, lleva la cadera hacia atrás.","Baja hasta sentir el estiramiento en la parte de atrás del muslo.","La espalda recta todo el recorrido: si se redondea, no bajes más."]'::jsonb, true, 510),

('back-extension-45', 'Extensión de cadera a 45°', 'femorales', array['Isquiotibiales'], array['Glúteos','Lumbar'], 'bodyweight', 'beginner',
 'cadera', true, 'hipertrofia',
 'Superó al curl nórdico para la cabeza larga del bíceps femoral y el semimembranoso, y no necesita carga para empezar.',
 'Bourne et al., recopilado en Stronger by Science', true, 3, 10, 15, 90,
 '["Almohadilla justo debajo de la cadera.","Baja doblando solo por la cadera, no por la espalda.","Sube hasta alinear el cuerpo, sin pasarte."]'::jsonb, true, 520),

('lying-leg-curl', 'Curl femoral tumbado', 'femorales', array['Isquiotibiales'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Funciona, pero en la comparación directa fue la peor variante de curl. Sirve como volumen extra, no como base.',
 'Maeo et al. (2021), MSSE 53(4):825-837', true, 4, 10, 15, 90,
 '["Cadera pegada al banco todo el recorrido.","Flexiona hasta el tope sin levantar la pelvis.","Baja despacio."]'::jsonb, true, 530),

('nordic-curl', 'Curl nórdico', 'femorales', array['Isquiotibiales'], array[]::text[], 'bodyweight', 'advanced',
 'aislamiento', false, 'hipertrofia',
 'Hace crecer, pero de forma selectiva: solo las porciones que no cruzan la cadera. Es muy exigente en la fase de bajada.',
 'Maeo, Balshaw, Nin et al. (2024), MSSE 56(10):1893-1905', false, 5, 4, 8, 150,
 '["Alguien te sujeta los tobillos, o usa un soporte firme.","Baja lo más despacio que puedas, cuerpo recto.","Amortigua con las manos al final."]'::jsonb, true, 540),

-- ---------- GLÚTEOS ----------
('hip-thrust', 'Hip thrust con barra', 'gluteos', array['Glúteo mayor'], array['Isquiotibiales'], 'barbell', 'beginner',
 'cadera', true, 'hipertrofia',
 'Produce crecimiento del glúteo similar a la sentadilla, con la ventaja de ser específico y muy fácil de aprender. El rango completo supera al parcial.',
 'Plotkin et al. (2023), Frontiers in Physiology 14:1279170; Krause Neto et al. (2025), Frontiers in Physiology 16:1542334', true, 1, 8, 15, 120,
 '["Espalda apoyada en un banco a la altura de los omóplatos.","Empuja con los talones hasta alinear el cuerpo.","Aprieta el glúteo arriba un segundo; no arquees la espalda baja."]'::jsonb, true, 600),

('deep-squat-glute', 'Sentadilla profunda', 'gluteos', array['Glúteo mayor'], array['Cuádriceps','Aductores'], 'barbell', 'intermediate',
 'rodilla', true, 'hipertrofia',
 'Bajar del todo dio +6,7% de volumen del glúteo contra +2,2% quedándose a media altura. Y además, a diferencia del hip thrust, te construye el cuádriceps.',
 'Kubo, Ikebukuro & Yata (2019), Eur J Appl Physiol 119:1933-1942; Plotkin et al. (2023)', false, 2, 6, 10, 180,
 '["Baja tanto como te permita la movilidad, sin redondear la espalda baja.","Rodillas hacia afuera, en línea con los pies.","Sube empujando el suelo."]'::jsonb, true, 610),

('cable-kickback', 'Patada de glúteo en polea', 'gluteos', array['Glúteo mayor'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'La extensión de cadera aislada aumentó el grosor de la parte alta del glúteo. Efecto moderado, buen complemento.',
 'Krause Neto et al. (2025), Frontiers in Physiology 16:1542334', true, 3, 12, 20, 90,
 '["Apoya las manos y mantén el torso quieto.","Lleva la pierna atrás usando solo la cadera.","No arquees la espalda para llegar más lejos."]'::jsonb, true, 620),

('step-up', 'Step-up al cajón', 'gluteos', array['Glúteo mayor'], array['Cuádriceps'], 'dumbbell', 'beginner',
 'rodilla', true, 'emg',
 'Fue el ejercicio con más activación del glúteo de la revisión, pero nadie ha comprobado todavía que eso se traduzca en más crecimiento que el hip thrust.',
 'Krause Neto et al. (2020), J Sports Sci Med 19(1):195-203', true, 4, 10, 15, 90,
 '["Cajón a la altura de la rodilla o algo menos.","Sube empujando con el pie de arriba, sin impulsarte con el de abajo.","Baja controlando."]'::jsonb, true, 630),

-- ---------- TRÍCEPS ----------
('overhead-triceps-extension', 'Extensión de tríceps por encima de la cabeza', 'triceps', array['Tríceps'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'El resultado más claro de todo el catálogo. Medido con resonancia y con el mismo volumen: la cabeza larga creció +28,5% contra +19,6% del pushdown. Si haces un solo ejercicio de tríceps, que sea este.',
 'Maeo et al. (2023), European Journal of Sport Science 23(7)', true, 1, 10, 15, 90,
 '["Los codos apuntando adelante y quietos todo el recorrido.","Baja hasta sentir el estiramiento detrás del brazo.","Estira del todo arriba sin mover los codos."]'::jsonb, true, 700),

('triceps-pushdown', 'Extensión de tríceps en polea (pushdown)', 'triceps', array['Tríceps'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Funciona (+19,6% en la cabeza larga), solo que menos que la versión por encima de la cabeza. Buen segundo ejercicio y el más fácil de todos.',
 'Maeo et al. (2023), European Journal of Sport Science 23(7)', true, 2, 10, 15, 90,
 '["Codos pegados al costado y quietos.","Estira del todo abajo.","Sube despacio, sin dejar que la polea te tire."]'::jsonb, true, 710),

('close-grip-bench', 'Press de banca con agarre cerrado', 'triceps', array['Tríceps'], array['Pecho'], 'barbell', 'intermediate',
 'empuje-horizontal', true, 'consenso',
 'Permite mucha carga, pero no hay ningún ensayo que lo compare con los aislamientos para crecimiento del tríceps.',
 null, false, 3, 8, 12, 120,
 '["Agarre a la anchura de los hombros, no más cerrado.","Codos cerca del cuerpo al bajar.","Baja a la parte baja del pecho."]'::jsonb, true, 720),

('assisted-dip', 'Fondos en máquina asistida', 'triceps', array['Tríceps'], array['Pecho','Hombro anterior'], 'machine', 'beginner',
 'empuje-vertical', true, 'consenso',
 'Sin evidencia comparativa. La versión asistida hace accesible un movimiento que de otra forma es duro al empezar.',
 null, true, 4, 8, 12, 120,
 '["Torso lo más vertical posible para cargar el tríceps.","Baja hasta que el codo forme 90 grados.","Sube sin bloquear de golpe."]'::jsonb, true, 730),

-- ---------- BÍCEPS ----------
('preacher-curl', 'Curl predicador', 'biceps', array['Bíceps'], array['Braquial'], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Produjo más desarrollo en la parte baja del brazo, cerca del codo. La diferencia con otras variantes es real pero modesta.',
 'Kassiano et al. (2025), International Journal of Sports Medicine 46(5):334-343', true, 1, 8, 12, 90,
 '["Axilas apoyadas en el respaldo, sin despegarlas.","Baja hasta estirar casi del todo, con control.","No uses impulso con el torso."]'::jsonb, true, 800),

('incline-dumbbell-curl', 'Curl inclinado con mancuernas', 'biceps', array['Bíceps'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Produjo más crecimiento en la parte alta del brazo, cerca del hombro. Combínalo con el predicador para cubrir ambas zonas.',
 'Kassiano et al. (2025), International Journal of Sports Medicine 46(5):334-343', true, 2, 8, 12, 90,
 '["Banco a unos 45 grados, brazos colgando hacia atrás.","Sube sin mover el codo hacia adelante.","Baja hasta estirar del todo."]'::jsonb, true, 810),

('ez-bar-curl', 'Curl con barra Z', 'biceps', array['Bíceps'], array['Braquial'], 'barbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Donde más peso vas a poder progresar. Sin evidencia de que sea mejor o peor que las otras variantes.',
 null, true, 3, 8, 12, 90,
 '["Codos pegados al costado.","Sube sin balancear el torso.","Baja en unos 2 segundos."]'::jsonb, true, 820),

('cable-curl', 'Curl en polea', 'biceps', array['Bíceps'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Dos ensayos de 2025 y 2026 probaron el famoso truco de llevar el hombro hacia atrás y no cambió nada (7-9% en ambos casos). Elige la posición que te resulte cómoda.',
 'Larsen et al. (2026), Frontiers in Physiology 17:1750722; Attarieh et al. (2025), EJSS 25(4):e12279', true, 4, 10, 15, 90,
 '["Tensión constante: la polea no descansa arriba ni abajo.","Codos quietos.","Estira del todo al bajar."]'::jsonb, true, 830),

('hammer-curl', 'Curl martillo', 'biceps', array['Braquial','Braquiorradial'], array['Bíceps'], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Trabaja el braquial y el braquiorradial, que están debajo y al lado del bíceps. Sin evidencia comparativa.',
 null, true, 5, 10, 15, 90,
 '["Palmas mirándose entre sí todo el recorrido.","Codos quietos al costado.","Sube y baja con control."]'::jsonb, true, 840),

-- ---------- PANTORRILLA ----------
('standing-calf-raise', 'Elevación de talón de pie', 'pantorrilla', array['Gemelos'], array['Sóleo'], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'La diferencia más grande de todo el catálogo. Medido con resonancia: el gemelo creció +12,4% de pie contra +1,7% sentado. Sentado prácticamente no le hace nada al gemelo.',
 'Kinoshita, Maeo et al. (2023), Frontiers in Physiology 14:1272106', true, 1, 10, 20, 90,
 '["Rodillas rectas: si las doblas, dejas de trabajar el gemelo.","Baja el talón por debajo del escalón hasta sentir el estiramiento.","Sube hasta la punta y aguanta un instante."]'::jsonb, true, 900),

('calf-press-leg-press', 'Calf press en prensa', 'pantorrilla', array['Gemelos'], array['Sóleo'], 'machine', 'beginner',
 'aislamiento', false, 'consenso',
 'Con la rodilla estirada equivale a la versión de pie, y es más fácil de controlar. Sin ensayo específico que lo compare.',
 null, true, 2, 10, 20, 90,
 '["Solo la punta del pie apoyada en el borde de la plataforma.","Rodillas casi rectas.","Recorrido completo: estira abajo, punta arriba."]'::jsonb, true, 910),

('seated-calf-raise', 'Elevación de talón sentado', 'pantorrilla', array['Sóleo'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'hipertrofia',
 'Para el sóleo dio +2,9% contra +2,1% de pie: sin diferencia significativa. No es superior, pero sirve como volumen extra cuando el gemelo ya está cansado.',
 'Kinoshita, Maeo et al. (2023), Frontiers in Physiology 14:1272106', true, 3, 12, 20, 90,
 '["Rodillas dobladas a 90 grados.","Baja el talón hasta el estiramiento completo.","Sube hasta la punta."]'::jsonb, true, 920),

-- ---------- ABDOMINALES ----------
('cable-crunch', 'Crunch en polea', 'abs', array['Recto abdominal'], array[]::text[], 'cable', 'beginner',
 'aislamiento', false, 'emg',
 'El crunch fue el que más activó el recto abdominal del estudio (68,4%). Es EMG: nadie ha comparado ejercicios de abdomen midiendo crecimiento real.',
 'Stenger et al. (2014), ACE ProSource / Univ. Wisconsin-La Crosse', true, 1, 12, 20, 60,
 '["De rodillas, la cuerda a los lados de la cabeza.","Curva la columna llevando los codos a los muslos.","No tires con los brazos ni con la cadera."]'::jsonb, true, 1000),

('captains-chair-knee-raise', 'Elevación de rodillas en silla romana', 'abs', array['Recto abdominal','Oblicuo externo'], array[]::text[], 'machine', 'beginner',
 'aislamiento', false, 'emg',
 'Superó al crunch en activación del oblicuo externo. Solo EMG.',
 'Stenger et al. (2014), ACE ProSource', true, 2, 10, 20, 60,
 '["Espalda pegada al respaldo.","Sube las rodillas curvando la pelvis, no solo doblando la cadera.","Baja despacio."]'::jsonb, true, 1010),

('ab-wheel', 'Rueda abdominal', 'abs', array['Recto abdominal'], array['Oblicuo externo'], 'other', 'intermediate',
 'aislamiento', false, 'emg',
 'De los que superaron al crunch en oblicuo externo, y además carga el abdomen en posición alargada. Solo EMG.',
 'Stenger et al. (2014), ACE ProSource', false, 3, 8, 15, 90,
 '["Empieza de rodillas, sobre una colchoneta.","Rueda hacia adelante sin dejar que la espalda baja se arquee.","Si sientes la zona lumbar, no vayas tan lejos."]'::jsonb, true, 1020),

('plank', 'Plancha frontal', 'abs', array['Core'], array[]::text[], 'bodyweight', 'beginner',
 'core', false, 'emg',
 'Honestamente: en el estudio quedó por debajo del crunch para el recto abdominal. Es un ejercicio de estabilidad, no la mejor herramienta para hacer crecer el abdomen.',
 'Stenger et al. (2014), ACE ProSource', true, 4, 20, 60, 60,
 '["Codos debajo de los hombros, cuerpo en línea recta.","Aprieta glúteos y abdomen.","No dejes caer la cadera ni la subas."]'::jsonb, true, 1030),

-- ---------- ANTEBRAZO ----------
('wrist-curl', 'Curl de muñeca', 'antebrazo', array['Flexores del antebrazo'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'La parte de adelante del antebrazo tiene bastante más masa que la de atrás, así que es la vía más eficiente para el volumen que se ve. No hay ni un estudio sobre hipertrofia de antebrazo.',
 null, true, 1, 12, 20, 60,
 '["Antebrazos apoyados en el muslo o en un banco.","Deja que la muñeca se abra abajo y cierra arriba.","Recorrido completo, sin prisa."]'::jsonb, true, 1100),

('reverse-wrist-curl', 'Extensión de muñeca', 'antebrazo', array['Extensores del antebrazo'], array[]::text[], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Ocho semanas de este trabajo subieron la fuerza de agarre un 19,2%, pero ese estudio no midió el tamaño del músculo.',
 'Shiomose et al. (2011)', true, 2, 12, 20, 60,
 '["Palmas hacia abajo, antebrazos apoyados.","Sube la muñeca sin mover el antebrazo.","Peso ligero: este movimiento es corto."]'::jsonb, true, 1110),

('reverse-curl', 'Curl inverso con barra Z', 'antebrazo', array['Braquiorradial'], array['Bíceps'], 'barbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Trabaja el braquiorradial, que es el que da grosor al antebrazo por fuera. Sin evidencia comparativa.',
 null, true, 3, 10, 15, 90,
 '["Palmas hacia abajo.","Codos quietos al costado.","Baja controlando."]'::jsonb, true, 1120),

('farmers-walk', 'Farmer''s walk', 'antebrazo', array['Flexores del antebrazo'], array['Trapecio','Core'], 'dumbbell', 'beginner',
 'aislamiento', false, 'consenso',
 'Entrena el agarre de forma isométrica. Para tamaño se considera menos eficaz que el trabajo con recorrido completo, aunque nadie lo ha medido.',
 null, true, 4, 30, 60, 90,
 '["Mancuernas pesadas a los lados.","Camina erguido, hombros atrás.","Cuenta segundos, no repeticiones."]'::jsonb, true, 1130),

-- ---------- CARDIO ----------
('cardio-bike-liss', 'Bicicleta estática suave', 'cardio', array['Sistema cardiovascular'], array[]::text[], 'machine', 'beginner',
 'cardio', false, 'hipertrofia',
 'Intensidad en la que puedes hablar en frases completas. Tener buena capacidad cardiorrespiratoria se asocia a menor mortalidad con una fuerza comparable a la de no fumar.',
 'Mandsager et al. (2018), JAMA Network Open 1(6):e183605', true, 1, null, null, null,
 '["Ritmo en el que puedes mantener una conversación cómoda.","Si te falta el aire para hablar, baja el ritmo.","Constancia por encima de intensidad."]'::jsonb, true, 1200),

('cardio-walk-incline', 'Caminata en cinta con inclinación', 'cardio', array['Sistema cardiovascular'], array[]::text[], 'machine', 'beginner',
 'cardio', false, 'hipertrofia',
 'La opción con menos impacto en las piernas antes o después de entrenarlas. Cualquier actividad, incluso ligera, se asocia a menor mortalidad.',
 'Ekelund et al. (2019), BMJ 366:l4570', true, 2, null, null, null,
 '["Inclinación entre 5 y 10%, ritmo cómodo.","No te agarres a los pasamanos.","Debes poder hablar en frases completas."]'::jsonb, true, 1210),

('cardio-elliptical', 'Elíptica', 'cardio', array['Sistema cardiovascular'], array[]::text[], 'machine', 'beginner',
 'cardio', false, 'consenso',
 'Sin impacto en las articulaciones. Vale igual que las demás: lo que cuenta son los minutos, no la máquina.',
 null, true, 3, null, null, null,
 '["Ritmo constante en el que puedas conversar.","No te apoyes con todo el peso en los brazos."]'::jsonb, true, 1220),

('cardio-rower', 'Remo ergómetro suave', 'cardio', array['Sistema cardiovascular'], array['Espalda','Piernas'], 'machine', 'beginner',
 'cardio', false, 'consenso',
 'Involucra más masa muscular, así que acumula más fatiga que la bici. Mejor al final de la sesión, no antes.',
 null, false, 4, null, null, null,
 '["Empuja con las piernas primero, luego tira con los brazos.","Ritmo bajo y constante.","Espalda recta."]'::jsonb, true, 1230)

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
  instructions = excluded.instructions,
  is_published = excluded.is_published,
  display_order = excluded.display_order,
  updated_at = now();

-- El press de pecho de 00002 queda duplicado con chest-press-machine-v2. Nos quedamos
-- con el nuevo (trae metadatos) y despublicamos el viejo sin borrarlo, porque
-- workout_sets podría referenciarlo.
update public.exercises set is_published = false, updated_at = now()
where slug = 'chest-press-machine';

update public.exercises set
  muscle_group = 'pecho', movement_pattern = 'empuje-horizontal', is_compound = true,
  evidence_level = 'consenso', beginner_friendly = true, group_rank = 5,
  default_reps_low = 8, default_reps_high = 15, default_rest_seconds = 90,
  evidence_note = 'No necesitas gimnasio para hacerlas. Sin estudios que las comparen con el press.',
  updated_at = now()
where slug = 'push-up';

update public.exercises set
  muscle_group = 'pecho', movement_pattern = 'empuje-horizontal', is_compound = true,
  evidence_level = 'consenso', beginner_friendly = true, group_rank = 6,
  default_reps_low = 8, default_reps_high = 12, default_rest_seconds = 120,
  evidence_note = 'Cada brazo trabaja por su cuenta. Sin ensayos que comparen mancuerna con barra para el pecho.',
  updated_at = now()
where slug = 'dumbbell-bench-press';

-- ---------------------------------------------------------------------------
-- 4. Plantillas de split
-- ---------------------------------------------------------------------------

create table public.split_templates (
  slug text primary key,
  name text not null,
  days_per_week smallint not null check (days_per_week between 1 and 7),
  /** Una sola frase: qué es esta rutina. */
  summary text not null,
  /** Por qué la proponemos, incluyendo lo que la evidencia NO dice. Se muestra completo. */
  rationale text not null,
  evidence_level public.evidence_level not null,
  evidence_source text,
  /** true en el split que la app marca como recomendado para su número de días. */
  is_recommended boolean not null default false,
  display_order smallint not null default 50
);

create table public.split_template_days (
  id uuid primary key default gen_random_uuid(),
  template_slug text not null references public.split_templates(slug) on delete cascade,
  day_index smallint not null check (day_index between 1 and 7),
  name text not null,
  /** Los grupos que este día entrena, en orden. */
  focus_groups public.muscle_group[] not null,
  /** Por qué van juntos estos grupos. La UI lo muestra al abrir el día. */
  pairing_rationale text not null,
  unique (template_slug, day_index)
);

create table public.split_template_slots (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.split_template_days(id) on delete cascade,
  position smallint not null check (position > 0),
  muscle_group public.muscle_group not null,
  /** El ejercicio que proponemos por defecto. El usuario puede cambiarlo por cualquier otro del grupo. */
  default_exercise_slug text not null references public.exercises(slug),
  target_sets smallint not null default 3 check (target_sets between 1 and 10),
  /** Los slots opcionales se muestran marcados como "puedes quitarlo". */
  is_optional boolean not null default false,
  unique (day_id, position)
);

alter table public.split_templates enable row level security;
alter table public.split_template_days enable row level security;
alter table public.split_template_slots enable row level security;
alter table public.muscle_groups enable row level security;

-- Catálogo público: lectura para cualquiera autenticado, escritura solo por migración.
create policy "authenticated read split templates" on public.split_templates for select to authenticated using (true);
create policy "authenticated read split days" on public.split_template_days for select to authenticated using (true);
create policy "authenticated read split slots" on public.split_template_slots for select to authenticated using (true);
create policy "authenticated read muscle groups" on public.muscle_groups for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- 5. Rutinas: días y bloque de cardio
-- ---------------------------------------------------------------------------

create type public.cardio_placement as enum ('none', 'start', 'end');

alter table public.routines
  add column if not exists days_per_week smallint check (days_per_week between 1 and 7),
  add column if not exists split_template_slug text references public.split_templates(slug),
  add column if not exists cardio_placement public.cardio_placement not null default 'end',
  add column if not exists cardio_exercise_id uuid references public.exercises(id),
  add column if not exists cardio_minutes smallint check (cardio_minutes between 5 and 60);

comment on column public.routines.cardio_placement is
  'end por defecto: Eddens 2018 midió +6.91% de fuerza dinámica del tren inferior haciendo pesas primero. Ver docs/rutinas.md §7.4.';

-- routine_exercises pasa de lista plana a lista por día.
-- La unicidad vieja era (routine_id, position); ahora la posición se repite en cada día.
alter table public.routine_exercises
  add column if not exists day_index smallint not null default 1 check (day_index between 1 and 7),
  add column if not exists muscle_group public.muscle_group;

alter table public.routine_exercises drop constraint if exists routine_exercises_routine_id_position_key;
alter table public.routine_exercises add constraint routine_exercises_day_position_key unique (routine_id, day_index, position);

drop index if exists routine_exercises_routine_idx;
create index routine_exercises_routine_day_idx on public.routine_exercises (routine_id, day_index, position);

-- ---------------------------------------------------------------------------
-- 6. Siembra de las plantillas
-- ---------------------------------------------------------------------------

insert into public.split_templates (slug, name, days_per_week, summary, rationale, evidence_level, evidence_source, is_recommended, display_order) values

('full-body-2', 'Cuerpo completo · 2 días', 2,
 'Dos sesiones que tocan todo el cuerpo.',
 'Es lo que el ACSM recomienda para quien empieza: cuerpo completo 2 o 3 días por semana. Y no es una versión reducida de nada: en un ensayo con volumen igualado, cuerpo completo 2 días dio los mismos resultados que un split de 4 días.',
 'consenso', 'ACSM (2009) Position Stand, MSSE 41(3):687-708; Pedersen et al. (2022), BMC Sports Sci Med Rehabil 14:87',
 true, 10),

('full-body-3', 'Cuerpo completo · 3 días', 3,
 'Tres sesiones que tocan todo el cuerpo.',
 'La estructura con la que se hicieron muchos de los estudios de hipertrofia que citamos. Cada músculo se entrena 3 veces por semana con sesiones cortas, que es lo más fácil de sostener al empezar.',
 'consenso', 'ACSM (2009) Position Stand; Schoenfeld et al. (2019), MSSE 51(1):94-103',
 true, 20),

('upper-lower-4', 'Superior / Inferior · 4 días', 4,
 'Dos días de tren superior y dos de tren inferior.',
 'Es la recomendación explícita del ACSM para 4 días por semana. Cada músculo se entrena 2 veces, que es suficiente para repartir el volumen sin sesiones largas.',
 'consenso', 'ACSM (2009) Position Stand, MSSE 41(3):687-708',
 true, 30),

('ppl-ul-5', 'Empuje · Tirón · Pierna · Superior · Inferior', 5,
 'Tres días por patrón de movimiento y dos de tren superior e inferior.',
 'Cinco días es donde mejor se cruzan el volumen que quieres acumular y la duración de cada sesión: llegas a 10-16 series por grupo sin pasar de una hora. Ahora la parte honesta: no existe ningún ensayo que compare esta distribución con otra a 5 días. Lo que sí está medido es que, con el mismo volumen semanal, el split que elijas no cambia el resultado. Esta es una forma ordenada de repartir, no una fórmula superior.',
 'consenso', 'ACSM (2009) Position Stand; Ramos-Campo et al. (2024), JSCR 38(7):1330-1340',
 true, 40),

('ppl-6', 'Empuje / Tirón / Pierna ×2', 6,
 'El ciclo empuje, tirón y pierna repetido dos veces.',
 'Seis días permiten sesiones más cortas y cada músculo dos veces. Ojo: en un ensayo con volumen igualado, 6 sesiones por semana dieron lo mismo que 3. Los días de más sirven para repartir, no para sumar.',
 'consenso', 'Saric et al. (2019), JSCR 33(7S):S122-S129',
 true, 50);

-- Días de cada plantilla
insert into public.split_template_days (template_slug, day_index, name, focus_groups, pairing_rationale) values

-- Cuerpo completo x2
('full-body-2', 1, 'Cuerpo completo A', array['cuadriceps','pecho','espalda','hombros','abs']::public.muscle_group[],
 'Una pierna, un empuje y un tirón en cada sesión. Es la estructura mínima que recomienda la literatura para no dejar nada fuera: al menos un ejercicio de tren inferior, uno de empuje y uno de tirón.'),
('full-body-2', 2, 'Cuerpo completo B', array['femorales','gluteos','espalda','pecho','triceps','biceps']::public.muscle_group[],
 'Misma lógica que el día A pero cambiando los ejercicios, para que cada músculo reciba dos estímulos algo distintos en la semana.'),

-- Cuerpo completo x3
('full-body-3', 1, 'Cuerpo completo A', array['cuadriceps','pecho','espalda','abs']::public.muscle_group[],
 'Una pierna, un empuje y un tirón. La estructura mínima que cubre todo el cuerpo en una sesión corta.'),
('full-body-3', 2, 'Cuerpo completo B', array['femorales','gluteos','hombros','espalda']::public.muscle_group[],
 'Toca lo que el día A dejó más ligero: cadena posterior y hombro.'),
('full-body-3', 3, 'Cuerpo completo C', array['cuadriceps','pecho','espalda','triceps','biceps']::public.muscle_group[],
 'Cierra la semana repitiendo los patrones principales y añadiendo el trabajo directo de brazo.'),

-- Upper/Lower x4
('upper-lower-4', 1, 'Tren superior A', array['pecho','espalda','hombros','triceps','biceps']::public.muscle_group[],
 'Todo el tren superior en una sesión. Alternamos empuje y tirón porque son músculos que no compiten entre sí: en un estudio, emparejarlos así acortó las sesiones un 36% sin perder nada de resultado.'),
('upper-lower-4', 2, 'Tren inferior A', array['cuadriceps','femorales','gluteos','pantorrilla']::public.muscle_group[],
 'Toda la pierna junta. Empezamos por el movimiento más pesado, cuando tienes energía.'),
('upper-lower-4', 3, 'Tren superior B', array['espalda','pecho','hombros','biceps','triceps']::public.muscle_group[],
 'Mismo tren superior, pero empezando por el tirón. Lo que va primero es lo que más gana en fuerza, así que alternar el orden reparte esa ventaja.'),
('upper-lower-4', 4, 'Tren inferior B', array['femorales','gluteos','cuadriceps','pantorrilla','abs']::public.muscle_group[],
 'Segunda de pierna, esta vez empezando por la cadena posterior.'),

-- PPL + UL a 5 días
('ppl-ul-5', 1, 'Empuje · pecho, hombros y tríceps', array['pecho','hombros','triceps']::public.muscle_group[],
 'Van juntos porque comparten el mismo patrón: el press ya trabaja los tres a la vez. Eso importa de verdad para contar tu volumen — en el mejor análisis disponible, una serie de press aporta aproximadamente media serie al tríceps. Si separas pecho el lunes y tríceps el jueves, ese cálculo se te escapa y el tríceps acaba con más trabajo del que planeaste. Dicho esto: no hay ningún estudio que demuestre que agrupar así dé más músculo que repartirlo. Es orden, no magia.'),
('ppl-ul-5', 2, 'Tirón · espalda y bíceps', array['espalda','biceps','antebrazo']::public.muscle_group[],
 'Misma lógica que el empuje, al revés: todo jalón y todo remo ya hacen trabajar al bíceps. Agruparlos evita darle volumen sin saberlo. El antebrazo va aquí porque tras los remos ya está caliente.'),
('ppl-ul-5', 3, 'Pierna', array['cuadriceps','femorales','gluteos','pantorrilla']::public.muscle_group[],
 'La pierna entera en un día. Ojo con un detalle medido: el recto femoral casi no crece con la sentadilla, así que la extensión de rodilla no es un ejercicio de relleno, es necesario.'),
('ppl-ul-5', 4, 'Tren superior', array['espalda','pecho','hombros','triceps','biceps']::public.muscle_group[],
 'Segunda vuelta del tren superior, en una sola sesión. Con esto cada músculo del tren superior llega a 2 veces por semana.'),
('ppl-ul-5', 5, 'Tren inferior y abdomen', array['femorales','gluteos','cuadriceps','pantorrilla','abs']::public.muscle_group[],
 'Segunda de pierna, empezando por la cadena posterior para que reciba el trabajo con energía. El abdomen se cierra al final.'),

-- PPL x2 a 6 días
('ppl-6', 1, 'Empuje A', array['pecho','hombros','triceps']::public.muscle_group[],
 'Pecho, hombro y tríceps comparten el patrón de empuje: el press ya trabaja los tres. Agruparlos te permite contar bien cuánto volumen recibe cada uno.'),
('ppl-6', 2, 'Tirón A', array['espalda','biceps']::public.muscle_group[],
 'Todo jalón y todo remo ya trabajan el bíceps. Agruparlos evita duplicar volumen sin darte cuenta.'),
('ppl-6', 3, 'Pierna A', array['cuadriceps','femorales','gluteos','pantorrilla']::public.muscle_group[],
 'Pierna completa, empezando por el movimiento más pesado.'),
('ppl-6', 4, 'Empuje B', array['hombros','pecho','triceps']::public.muscle_group[],
 'Segundo empuje, empezando por el hombro. Lo que va primero es lo que más gana en fuerza, así que alternar reparte esa ventaja.'),
('ppl-6', 5, 'Tirón B', array['espalda','biceps','antebrazo']::public.muscle_group[],
 'Segundo tirón, con el trabajo de antebrazo al final, cuando ya está caliente.'),
('ppl-6', 6, 'Pierna B', array['femorales','gluteos','cuadriceps','pantorrilla','abs']::public.muscle_group[],
 'Segunda de pierna empezando por la cadena posterior, más el abdomen.');

-- Slots: los ejercicios sugeridos de cada día.
insert into public.split_template_slots (day_id, position, muscle_group, default_exercise_slug, target_sets, is_optional)
select d.id, v.position, v.muscle_group::public.muscle_group, v.slug, v.sets, v.optional
from (values
  -- full-body-2 día 1
  ('full-body-2', 1, 1, 'cuadriceps',  'leg-press',                     3, false),
  ('full-body-2', 1, 2, 'pecho',       'chest-press-machine-v2',        3, false),
  ('full-body-2', 1, 3, 'espalda',     'lat-pulldown',                  3, false),
  ('full-body-2', 1, 4, 'hombros',     'machine-lateral-raise',         3, false),
  ('full-body-2', 1, 5, 'abs',         'cable-crunch',                  3, true),
  -- full-body-2 día 2
  ('full-body-2', 2, 1, 'femorales',   'seated-leg-curl',               3, false),
  ('full-body-2', 2, 2, 'gluteos',     'hip-thrust',                    3, false),
  ('full-body-2', 2, 3, 'espalda',     'chest-supported-row',           3, false),
  ('full-body-2', 2, 4, 'pecho',       'incline-dumbbell-press',        3, false),
  ('full-body-2', 2, 5, 'triceps',     'overhead-triceps-extension',    2, false),
  ('full-body-2', 2, 6, 'biceps',      'preacher-curl',                 2, false),

  -- full-body-3
  ('full-body-3', 1, 1, 'cuadriceps',  'leg-press',                     3, false),
  ('full-body-3', 1, 2, 'pecho',       'chest-press-machine-v2',        3, false),
  ('full-body-3', 1, 3, 'espalda',     'lat-pulldown',                  3, false),
  ('full-body-3', 1, 4, 'abs',         'cable-crunch',                  3, true),
  ('full-body-3', 2, 1, 'femorales',   'seated-leg-curl',               3, false),
  ('full-body-3', 2, 2, 'gluteos',     'hip-thrust',                    3, false),
  ('full-body-3', 2, 3, 'hombros',     'machine-shoulder-press',        3, false),
  ('full-body-3', 2, 4, 'espalda',     'chest-supported-row',           3, false),
  ('full-body-3', 3, 1, 'cuadriceps',  'leg-extension',                 3, false),
  ('full-body-3', 3, 2, 'pecho',       'incline-dumbbell-press',        3, false),
  ('full-body-3', 3, 3, 'espalda',     'seated-cable-row',              3, false),
  ('full-body-3', 3, 4, 'triceps',     'overhead-triceps-extension',    2, false),
  ('full-body-3', 3, 5, 'biceps',      'incline-dumbbell-curl',         2, false),

  -- upper-lower-4
  ('upper-lower-4', 1, 1, 'pecho',       'chest-press-machine-v2',      3, false),
  ('upper-lower-4', 1, 2, 'espalda',     'lat-pulldown',                3, false),
  ('upper-lower-4', 1, 3, 'hombros',     'machine-shoulder-press',      3, false),
  ('upper-lower-4', 1, 4, 'espalda',     'chest-supported-row',         3, false),
  ('upper-lower-4', 1, 5, 'triceps',     'overhead-triceps-extension',  3, false),
  ('upper-lower-4', 1, 6, 'biceps',      'preacher-curl',               3, false),
  ('upper-lower-4', 2, 1, 'cuadriceps',  'leg-press',                   4, false),
  ('upper-lower-4', 2, 2, 'femorales',   'seated-leg-curl',             3, false),
  ('upper-lower-4', 2, 3, 'gluteos',     'hip-thrust',                  3, false),
  ('upper-lower-4', 2, 4, 'cuadriceps',  'leg-extension',               3, false),
  ('upper-lower-4', 2, 5, 'pantorrilla', 'standing-calf-raise',         3, false),
  ('upper-lower-4', 3, 1, 'espalda',     'seated-cable-row',            3, false),
  ('upper-lower-4', 3, 2, 'pecho',       'incline-dumbbell-press',      3, false),
  ('upper-lower-4', 3, 3, 'espalda',     'lat-pulldown',                3, false),
  ('upper-lower-4', 3, 4, 'hombros',     'dumbbell-lateral-raise',      3, false),
  ('upper-lower-4', 3, 5, 'hombros',     'reverse-pec-deck',            3, false),
  ('upper-lower-4', 3, 6, 'biceps',      'incline-dumbbell-curl',       3, false),
  ('upper-lower-4', 3, 7, 'triceps',     'triceps-pushdown',            3, false),
  ('upper-lower-4', 4, 1, 'femorales',   'romanian-deadlift',           3, false),
  ('upper-lower-4', 4, 2, 'gluteos',     'hip-thrust',                  3, false),
  ('upper-lower-4', 4, 3, 'cuadriceps',  'goblet-squat',                3, false),
  ('upper-lower-4', 4, 4, 'pantorrilla', 'standing-calf-raise',         3, false),
  ('upper-lower-4', 4, 5, 'abs',         'cable-crunch',                3, true),

  -- ppl-ul-5 (el recomendado)
  ('ppl-ul-5', 1, 1, 'pecho',       'chest-press-machine-v2',       4, false),
  ('ppl-ul-5', 1, 2, 'pecho',       'incline-dumbbell-press',       3, false),
  ('ppl-ul-5', 1, 3, 'hombros',     'machine-shoulder-press',       3, false),
  ('ppl-ul-5', 1, 4, 'hombros',     'dumbbell-lateral-raise',       3, false),
  ('ppl-ul-5', 1, 5, 'triceps',     'overhead-triceps-extension',   3, false),
  ('ppl-ul-5', 1, 6, 'triceps',     'triceps-pushdown',             2, true),
  ('ppl-ul-5', 2, 1, 'espalda',     'lat-pulldown',                 4, false),
  ('ppl-ul-5', 2, 2, 'espalda',     'chest-supported-row',          3, false),
  ('ppl-ul-5', 2, 3, 'hombros',     'reverse-pec-deck',             3, false),
  ('ppl-ul-5', 2, 4, 'biceps',      'preacher-curl',                3, false),
  ('ppl-ul-5', 2, 5, 'biceps',      'incline-dumbbell-curl',        2, true),
  ('ppl-ul-5', 2, 6, 'antebrazo',   'wrist-curl',                   2, true),
  ('ppl-ul-5', 3, 1, 'cuadriceps',  'leg-press',                    4, false),
  ('ppl-ul-5', 3, 2, 'femorales',   'seated-leg-curl',              3, false),
  ('ppl-ul-5', 3, 3, 'cuadriceps',  'leg-extension',                3, false),
  ('ppl-ul-5', 3, 4, 'gluteos',     'hip-thrust',                   3, false),
  ('ppl-ul-5', 3, 5, 'pantorrilla', 'standing-calf-raise',          3, false),
  ('ppl-ul-5', 4, 1, 'espalda',     'seated-cable-row',             3, false),
  ('ppl-ul-5', 4, 2, 'pecho',       'pec-deck',                     3, false),
  ('ppl-ul-5', 4, 3, 'espalda',     'lat-pulldown',                 3, false),
  ('ppl-ul-5', 4, 4, 'hombros',     'machine-lateral-raise',        3, false),
  ('ppl-ul-5', 4, 5, 'triceps',     'triceps-pushdown',             3, false),
  ('ppl-ul-5', 4, 6, 'biceps',      'cable-curl',                   3, false),
  ('ppl-ul-5', 5, 1, 'femorales',   'romanian-deadlift',            3, false),
  ('ppl-ul-5', 5, 2, 'gluteos',     'hip-thrust',                   3, false),
  ('ppl-ul-5', 5, 3, 'cuadriceps',  'goblet-squat',                 3, false),
  ('ppl-ul-5', 5, 4, 'pantorrilla', 'seated-calf-raise',            3, false),
  ('ppl-ul-5', 5, 5, 'abs',         'cable-crunch',                 3, false),

  -- ppl-6
  ('ppl-6', 1, 1, 'pecho',       'chest-press-machine-v2',          4, false),
  ('ppl-6', 1, 2, 'pecho',       'incline-dumbbell-press',          3, false),
  ('ppl-6', 1, 3, 'hombros',     'machine-shoulder-press',          3, false),
  ('ppl-6', 1, 4, 'hombros',     'dumbbell-lateral-raise',          3, false),
  ('ppl-6', 1, 5, 'triceps',     'overhead-triceps-extension',      3, false),
  ('ppl-6', 2, 1, 'espalda',     'lat-pulldown',                    4, false),
  ('ppl-6', 2, 2, 'espalda',     'chest-supported-row',             3, false),
  ('ppl-6', 2, 3, 'hombros',     'reverse-pec-deck',                3, false),
  ('ppl-6', 2, 4, 'biceps',      'preacher-curl',                   3, false),
  ('ppl-6', 3, 1, 'cuadriceps',  'leg-press',                       4, false),
  ('ppl-6', 3, 2, 'femorales',   'seated-leg-curl',                 3, false),
  ('ppl-6', 3, 3, 'cuadriceps',  'leg-extension',                   3, false),
  ('ppl-6', 3, 4, 'pantorrilla', 'standing-calf-raise',             3, false),
  ('ppl-6', 4, 1, 'hombros',     'machine-shoulder-press',          4, false),
  ('ppl-6', 4, 2, 'pecho',       'pec-deck',                        3, false),
  ('ppl-6', 4, 3, 'hombros',     'machine-lateral-raise',           3, false),
  ('ppl-6', 4, 4, 'triceps',     'triceps-pushdown',                3, false),
  ('ppl-6', 5, 1, 'espalda',     'seated-cable-row',                4, false),
  ('ppl-6', 5, 2, 'espalda',     'cable-pullover',                  3, false),
  ('ppl-6', 5, 3, 'biceps',      'incline-dumbbell-curl',           3, false),
  ('ppl-6', 5, 4, 'antebrazo',   'wrist-curl',                      2, true),
  ('ppl-6', 6, 1, 'femorales',   'romanian-deadlift',               3, false),
  ('ppl-6', 6, 2, 'gluteos',     'hip-thrust',                      3, false),
  ('ppl-6', 6, 3, 'cuadriceps',  'goblet-squat',                    3, false),
  ('ppl-6', 6, 4, 'pantorrilla', 'seated-calf-raise',               3, false),
  ('ppl-6', 6, 5, 'abs',         'cable-crunch',                    3, false)
) as v(template_slug, day_index, position, muscle_group, slug, sets, optional)
join public.split_template_days d
  on d.template_slug = v.template_slug and d.day_index = v.day_index;
