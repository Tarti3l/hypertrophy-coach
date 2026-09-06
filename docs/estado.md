# Estado del trabajo

`docs/plan.md` dice **qué hay que hacer**. Este archivo dice **qué está hecho**.

Es la única fuente de verdad sobre el avance. Cualquier agente que termine un
item lo actualiza acá, en el mismo commit que el trabajo. Cualquier agente que
empiece una sesión lo lee primero.

## Avance

| Item | Estado | PR | Nota |
| --- | --- | --- | --- |
| [1] Alinear la documentación con el producto del gimnasio | hecho | #2 | También corrigió una mención suelta a "prueba automatizada" en `docs/progression.md` |
| [2] Definir el recorrido mínimo y registrar su estado actual | hecho | #4 | Lista completa en `docs/recorrido-minimo.md`; 4/6 casos OK, 2/6 con falla |
| [3] Diagnosticar y corregir la pérdida de series de la sesión activa | pendiente | | Sale del hallazgo del [2]. Diagnóstico + arreglo localizado; un cambio estructural se presenta para aprobación, no se ejecuta |
| [4] Sustituir los consumos ficticios por los registros reales | pendiente | | Sale del hallazgo incidental del [2]: el dashboard de Alimentación está hardcodeado |
| [5] Corregir los estados de desconexión | pendiente | | |
| [6] Convertir la ruta inicial en «Hoy» | pendiente | | El más grande (M): cinco módulos. Candidato a revisión de Codex |
| [7] Priorizar elegir una rutina existente | pendiente | | Hay rutinas cargadas; confirmar cuáles sirven para alguien que arranca de cero |
| [8] Prellenar la siguiente serie y confirmarla | pendiente | | Absorbe el auto-inicio del descanso, que ya funciona: solo hay que no romperlo |
| [9] Presentar la recomendación de la próxima serie | pendiente | | Solo presentación: `services/progression.ts` ya existe y no se toca |
| [10] Mostrar un único resumen de descanso | pendiente | | |
| [11] Verificar el recorrido completo y documentar lo existente | pendiente | | Documenta el timer y el atajo de comida, que ya funcionan |

**Retirados del plan.** Los antiguos [6] (auto-inicio del descanso) y [8] (atajo
de comida en dos toques) ya están implementados. No son trabajo de desarrollo:
sobreviven solo como verificación dentro del [11].

Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.

Un item `en curso` tiene dueño: anotá cuál agente lo tomó y en qué worktree,
para que el otro no lo agarre en paralelo.

**Ventana de paralelismo — abierta ahora.** Los items [3] y [4] dependen solo
del [2], que está hecho, y tocan módulos distintos: el [3] va a
`features/progress/` y `features/training/`; el [4] a `features/nutrition/`.
Son los dos que se pueden repartir entre dos agentes en este momento, cada uno
en su worktree.

Después de eso el plan vuelve a ser cadena: [5] → [6] → [7] → [8] → [9], con el
[10] colgando de [5] y [6], y el [11] cerrando. El protocolo de worktrees está
en `AGENTS.md`, sección "Trabajo en paralelo".

## Hallazgos que cambian el plan

Lo que se descubre al ejecutar y contradice o modifica lo planificado. Cada
entrada con fecha y de qué item salió.

- **2026-09-06, item [1]:** el repo no tiene tests ni test runner, pese a que
  `docs/progression.md` afirmaba tener 10 pruebas pasando. Corregido en el
  documento. Ningún criterio de aceptación puede apoyarse en tests existentes.
- **2026-09-06, item [2]:** las series registradas durante una sesión activa no
  sobreviven a cerrar y reabrir la app. Repro: empezar sesión, confirmar
  ("Hecha") dos series de un ejercicio, cerrar/recargar por completo, volver a
  entrar a la misma rutina y día → el ejercicio vuelve a 0/5 y no aparece en
  Progreso. Lo que sí persiste: la racha semanal y al menos un PR de otro
  ejercicio de esa misma sesión. Probado en Expo Web / Chrome contra Supabase
  real; no probado en nativo. Detalle completo en `docs/recorrido-minimo.md`
  (caso 5). Esto probablemente exige un item nuevo antes del [3] — ver nota
  para GPT-6.
- **2026-09-06, item [2]:** sin conexión, "Empezar entrenamiento" muestra una
  pantalla en blanco con dos mensajes de error duplicados ("No pudimos
  conectar con el servidor...") en vez de un único estado de error claro.
  Inicio y Recuperación sí manejan bien la falta de red (spinner → error único
  con "Reintentar"), pero reinician sus contadores a 0 en vez de mostrar el
  último valor conocido. Simulado interceptando `fetch` hacia Supabase a nivel
  de página (no hay corte real de red disponible en el entorno de prueba).
  Detalle en `docs/recorrido-minimo.md` (caso 6).
- **2026-09-06, item [2]:** hallazgos incidentales que no son fallas: el
  auto-inicio del descanso al confirmar una serie (item [6]) y el atajo de
  comida en dos toques (item [8]) ya funcionan tal como estos items los
  necesitan. El dashboard de Alimentación muestra consumos "de ejemplo"
  (hardcodeados), no lo realmente registrado — la meta sí usa el cálculo real.

## Preguntas abiertas

- **Objetivos nutricionales adaptativos:** ¿hay historial de peso corporal e
  ingesta utilizable? ¿Quién aprueba las reglas y los límites del ajuste?
  Fuera del plan hasta resolverlo.
- Distribución, participación de entrenadores, cantidad de usuarios y fecha
  objetivo. El plan no depende de ninguna.

## Para el próximo reporte a GPT-6

GPT-6 no ve el repo: se entera de lo que pasa solo por lo que le peguen acá.
Acumulá en esta sección lo que haya que contarle, y vaciala después de reportar.

- Reporte #1 entregado el 2026-09-06 (items [1] y [2], los dos bugs y los
  hallazgos incidentales). Devolvió el replan de los items [3] a [11], ya
  aplicado en `docs/plan.md`. Nada pendiente de reportar por ahora.
