import { applySetValue, reconcileSets } from '../../src/features/progress/hooks/setDrafts';
import { WorkoutSetDraft } from '../../src/features/progress/types/workoutSession';

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + name); return; }
  failures += 1;
  console.log('  FAIL ' + name + '\n       esperado ' + e + '\n       obtenido ' + a);
}
const shape = (sets: WorkoutSetDraft[]) => sets.map((s) => `${s.setNumber}:${s.kind}`);
const w = (sets: WorkoutSetDraft[]) => sets.map((s) => s.weightKg);
const r = (sets: WorkoutSetDraft[]) => sets.map((s) => s.repetitions);

console.log('\n1. Forma por defecto: 1 calentamiento + 3 al fallo');
let sets = reconcileSets('e1', undefined, 3, true);
check('forma', shape(sets), ['1:warmup', '2:effective', '3:effective', '4:effective']);

console.log('\n2. Saltar el calentamiento deja 3 al fallo renumeradas desde 1');
const skipped = reconcileSets('e1', sets, 3, false);
check('forma', shape(skipped), ['1:effective', '2:effective', '3:effective']);

console.log('\n3. Devolver el calentamiento vuelve a la forma original');
check('forma', shape(reconcileSets('e1', skipped, 3, true)), ['1:warmup', '2:effective', '3:effective', '4:effective']);

console.log('\n4. Un calentamiento YA HECHO no se borra al pulsar saltar');
sets = reconcileSets('e1', undefined, 3, true);
sets = sets.map((s) => (s.setNumber === 1 ? { ...s, completed: true, weightKg: '20', repetitions: '12' } : s));
check('forma', shape(reconcileSets('e1', sets, 3, false)), ['1:warmup', '2:effective', '3:effective', '4:effective']);

console.log('\n5. Autocompletado al teclear "40" digito a digito');
sets = reconcileSets('e1', undefined, 3, true);
sets = applySetValue(sets, 2, 'weightKg', '4');
check('tras "4"', w(sets), ['', '4', '4', '4']);
sets = applySetValue(sets, 2, 'weightKg', '40');
check('tras "40"', w(sets), ['', '40', '40', '40']);

console.log('\n6. El calentamiento NO recibe el peso de las efectivas');
check('serie 1 sigue vacia', sets[0].weightKg, '');

console.log('\n7. Lo que el usuario escribe a mano no se pisa');
sets = applySetValue(sets, 3, 'weightKg', '45');
sets = applySetValue(sets, 2, 'weightKg', '50');
check('serie 3 conserva 45', w(sets), ['', '50', '45', '50']);

console.log('\n8. Una serie ya completada nunca se toca');
sets = reconcileSets('e2', undefined, 3, true);
sets = sets.map((s) => (s.setNumber === 3 ? { ...s, completed: true, weightKg: '30' } : s));
sets = applySetValue(sets, 2, 'weightKg', '60');
check('serie 3 intacta', w(sets), ['', '60', '30', '60']);

console.log('\n9. El peso del calentamiento no se propaga hacia abajo');
sets = reconcileSets('e3', undefined, 3, true);
sets = applySetValue(sets, 1, 'weightKg', '20');
check('solo la serie 1', w(sets), ['20', '', '', '']);

console.log('\n10. Reps: se arrastran igual que el peso');
sets = applySetValue(sets, 2, 'repetitions', '10');
check('reps', r(sets), ['', '10', '10', '10']);

console.log('\n11. Borrar la primera limpia las autocompletadas');
sets = applySetValue(sets, 2, 'repetitions', '');
check('reps', r(sets), ['', '', '', '']);

console.log('\n12. La rutina manda: 4 series efectivas -> 1 + 4');
check('forma', shape(reconcileSets('e4', undefined, 4, true)), ['1:warmup', '2:effective', '3:effective', '4:effective', '5:effective']);

console.log('\n13. Recortar no borra una efectiva ya completada');
sets = reconcileSets('e5', undefined, 4, true);
sets = sets.map((s) => (s.setNumber === 5 ? { ...s, completed: true } : s));
check('forma', shape(reconcileSets('e5', sets, 2, true)), ['1:warmup', '2:effective', '3:effective', '4:effective', '5:effective']);

console.log('\n14. Sin cambios devuelve LA MISMA referencia (evita bucle de render)');
sets = reconcileSets('e6', undefined, 3, true);
check('misma referencia', reconcileSets('e6', sets, 3, true) === sets, true);

console.log(failures === 0 ? '\nTODO OK\n' : `\n${failures} FALLOS\n`);
process.exit(failures === 0 ? 0 : 1);
