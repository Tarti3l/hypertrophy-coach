import { matchesTemplate, validateWeekPlan, WeekPlanDay } from '../../src/features/training/services/weekPlan';
import { MuscleGroupInfo } from '../../src/features/training/types/split';
import { MuscleGroupSlug } from '../../src/features/training/types/training';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + name); return; }
  failures += 1;
  console.log('  FAIL ' + name + '\n       esperado ' + e + '\n       obtenido ' + a);
}

// Espejo de public.muscle_groups tal como lo deja la 00016 + 00019.
const G: [MuscleGroupSlug, boolean, number, number][] = [
  ['pecho', false, 1, 3], ['espalda', false, 1, 3], ['hombros', false, 1, 3], ['gluteos', false, 1, 3],
  ['biceps', false, 2, 2], ['triceps', false, 2, 2], ['cuadriceps', false, 2, 2], ['femorales', false, 2, 2],
  ['abdomen', true, 2, 1], ['antebrazo', true, 3, 1], ['pantorrilla', true, 3, 1]
];
const groups = G.map(([slug, isSmall, aestheticPriority, minExercises]) => ({
  slug, name: slug, displayOrder: 1,
  beginnerSets: { min: 6, max: 10 }, trainedSets: { min: 12, max: 20 },
  isSmall, aestheticPriority, minExercises,
  selectionEvidence: 'consenso', evidenceNote: ''
})) as unknown as MuscleGroupInfo[];

const d = (dayIndex: number, dayKind: 'torso' | 'pierna', focusGroups: MuscleGroupSlug[]): WeekPlanDay =>
  ({ dayIndex, dayKind, focusGroups });

// El split recomendado de 5 días, tal como lo define reglas_split.md
const RECOMENDADO: WeekPlanDay[] = [
  d(1, 'torso', ['pecho', 'hombros']),
  d(2, 'pierna', ['cuadriceps', 'gluteos', 'pantorrilla']),
  d(3, 'torso', ['espalda', 'abdomen']),
  d(4, 'torso', ['biceps', 'triceps', 'antebrazo']),
  d(5, 'pierna', ['femorales', 'gluteos'])
];

const titles = (days: WeekPlanDay[]) => validateWeekPlan(days, groups).map((w) => w.title);

console.log('\n1. El reparto recomendado NO produce ningun aviso');
check('sin avisos', titles(RECOMENDADO), []);

console.log('\n2. matchesTemplate reconoce el recomendado y detecta el cambio');
check('igual', matchesTemplate(RECOMENDADO, RECOMENDADO), true);
check('orden de grupos no importa', matchesTemplate(
  [d(1, 'torso', ['hombros', 'pecho']), ...RECOMENDADO.slice(1)], RECOMENDADO), true);
check('cambiar torso por pierna', matchesTemplate(
  [d(1, 'pierna', ['pecho', 'hombros']), ...RECOMENDADO.slice(1)], RECOMENDADO), false);
check('quitar un musculo', matchesTemplate(
  [d(1, 'torso', ['pecho']), ...RECOMENDADO.slice(1)], RECOMENDADO), false);

console.log('\n3. R1 — tres musculos GRANDES en un dia avisa; con uno pequeño no');
check('pecho+espalda+cuadriceps avisa', titles([d(1, 'torso', ['pecho', 'espalda', 'cuadriceps'])]).length > 0, true);
check('pecho+hombros+antebrazo (pequeño) no avisa por R1',
  titles([d(1, 'torso', ['pecho', 'hombros', 'antebrazo'])]).some((t) => t.includes('músculos grandes')), false);
check('pecho+hombros+triceps (remate) no avisa por R1',
  titles([d(1, 'torso', ['pecho', 'hombros', 'triceps'])]).some((t) => t.includes('músculos grandes')), false);

console.log('\n4. R2 — repetir un musculo de prioridad media avisa; gluteo (prioridad 1) no');
check('biceps en dos dias avisa', titles([
  d(1, 'torso', ['pecho', 'biceps']), d(2, 'pierna', ['cuadriceps']), d(3, 'torso', ['espalda', 'biceps'])
]).some((t) => t.includes('se repite')), true);
check('gluteos en D2 y D5 no avisa', titles(RECOMENDADO).some((t) => t.includes('se repite')), false);

console.log('\n5. Regla extra — el hombro nunca se reparte, aunque tenga prioridad 1');
check('hombros en dos dias avisa', titles([
  d(1, 'torso', ['pecho', 'hombros']), d(2, 'pierna', ['cuadriceps']), d(3, 'torso', ['espalda', 'hombros'])
]).some((t) => t.includes('hombros están repartidos')), true);

console.log('\n6. R3 — dias de pierna pegados');
check('pierna en D1 y D2 avisa', titles([
  d(1, 'pierna', ['cuadriceps']), d(2, 'pierna', ['femorales'])
]).some((t) => t.includes('demasiado juntos')), true);
check('pierna en D2 y D5 no avisa', titles(RECOMENDADO).some((t) => t.includes('demasiado juntos')), false);

console.log('\n7. Cobertura — musculos que se quedan fuera de la semana');
check('quitar pantorrilla se avisa', titles([
  d(1, 'torso', ['pecho', 'hombros']), d(2, 'pierna', ['cuadriceps', 'gluteos']),
  d(3, 'torso', ['espalda', 'abdomen']), d(4, 'torso', ['biceps', 'triceps', 'antebrazo']),
  d(5, 'pierna', ['femorales', 'gluteos'])
]).some((t) => t.includes('sin entrenar')), true);

console.log('\n8. Semana entera de torso avisa que no hay pierna');
check('avisa', titles([d(1, 'torso', ['pecho', 'hombros'])]).some((t) => t.includes('día de pierna')), true);

console.log('\n9. Un dia vacio avisa');
check('avisa', titles([d(1, 'torso', [])]).some((t) => t.includes('está vacío')), true);

console.log(failures === 0 ? '\nTODO OK\n' : `\n${failures} FALLOS\n`);
process.exit(failures === 0 ? 0 : 1);
