import { RoutineBuilderScreen } from './RoutineBuilderScreen';

/**
 * El editor y el constructor son la misma pantalla desde que las rutinas tienen días.
 * Mantener dos listas de ejercicios editables, una plana y otra por día, garantizaba
 * que se desincronizaran. Esta ruta sigue existiendo porque hay enlaces guardados
 * apuntando a /routine-editor?routineId=...
 */
export function RoutineEditorScreen() {
  return <RoutineBuilderScreen />;
}
