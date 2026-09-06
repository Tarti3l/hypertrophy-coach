# Estado del trabajo

`docs/plan.md` dice **qué hay que hacer**. Este archivo dice **qué está hecho**.

Es la única fuente de verdad sobre el avance. Cualquier agente que termine un
item lo actualiza acá, en el mismo commit que el trabajo. Cualquier agente que
empiece una sesión lo lee primero.

## Avance

| Item | Estado | PR | Nota |
| --- | --- | --- | --- |
| [1] Alinear la documentación con el producto del gimnasio | hecho | #2 | También corrigió una mención suelta a "prueba automatizada" en `docs/progression.md` |
| [2] Definir el recorrido mínimo y registrar su estado actual | hecho | | Claude Code, branch `item-2-recorrido`. Lista completa en `docs/recorrido-minimo.md`; 4/6 casos OK, 2/6 con falla (cerrar/reabrir y sin conexión) |
| [3] Convertir la ruta inicial en «Hoy» | pendiente | | El más grande (M). Candidato a revisión de Codex |
| [4] Priorizar elegir una rutina existente | pendiente | | Hay rutinas cargadas; confirmar que alguna sirva para alguien que arranca de cero |
| [5] Prellenar la siguiente serie y confirmarla | pendiente | | |
| [6] Iniciar el descanso al confirmar una serie | pendiente | | |
| [7] Presentar la recomendación de la próxima serie | pendiente | | Solo presentación: `services/progression.ts` ya existe y no se toca |
| [8] Acercar los atajos de comida al registro diario | pendiente | | |
| [9] Mostrar un único resumen de descanso | pendiente | | |
| [10] Verificar el recorrido completo y documentar los límites offline | pendiente | | |

Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.

Un item `en curso` tiene dueño: anotá cuál agente lo tomó y en qué worktree,
para que el otro no lo agarre en paralelo.

**Ventana de paralelismo.** Los items [4], [8] y [9] dependen solo del [3] y
tocan módulos distintos (`training/`, `nutrition/`, `recovery/`). Una vez
mergeado el [3], son los tres que se pueden repartir entre agentes a la vez.
Todo lo demás es cadena: [2] → [3] → [4] → [5] → [6] → [7], y el [10] cierra.
El protocolo está en `AGENTS.md`, sección "Trabajo en paralelo".

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

- Items [1] y [2] hechos.
- Item [2] encontró un bug real de pérdida de datos: las series de una sesión
  activa no sobreviven a cerrar y reabrir la app (no se guardan de forma
  recuperable hasta tanto no se sabe qué las persiste — ver Hallazgos). El
  item [3] ("Convierte la ruta inicial en «Hoy»") depende del [2] y va a
  mostrar "la siguiente acción de entrenamiento" en la pantalla inicial — si
  arranca sobre una sesión con series que se pueden perder en cualquier
  recarga, esa pantalla puede terminar mostrando o prometiendo progreso que no
  existe. Recomendación: intercalar un item de diagnóstico/arreglo de
  persistencia de sesión activa antes de [3], o al menos antes de [5]
  ("Prellena la siguiente serie y confírmala"), que asume que el estado de la
  sesión es confiable. No se investigó la causa (fuera de alcance de [2]: es
  diagnóstico, no arreglo).
- También sin conexión, iniciar un entrenamiento rompe la UI (dos mensajes de
  error duplicados, pantalla en blanco) en vez de degradar con un mensaje
  único como Inicio y Recuperación — menor prioridad que la pérdida de datos,
  pero relevante para el item [10] ("documentar los límites offline").
