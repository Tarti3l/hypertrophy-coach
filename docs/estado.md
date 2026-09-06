# Estado del trabajo

`docs/plan.md` dice **qué hay que hacer**. Este archivo dice **qué está hecho**.

Es la única fuente de verdad sobre el avance. Cualquier agente que termine un
item lo actualiza acá, en el mismo commit que el trabajo. Cualquier agente que
empiece una sesión lo lee primero.

## Avance

| Item | Estado | PR | Nota |
| --- | --- | --- | --- |
| [1] Alinear la documentación con el producto del gimnasio | hecho | #2 | También corrigió una mención suelta a "prueba automatizada" en `docs/progression.md` |
| [2] Definir el recorrido mínimo y registrar su estado actual | en curso | | Claude Code, branch `item-2-recorrido` |
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

## Preguntas abiertas

- **Objetivos nutricionales adaptativos:** ¿hay historial de peso corporal e
  ingesta utilizable? ¿Quién aprueba las reglas y los límites del ajuste?
  Fuera del plan hasta resolverlo.
- Distribución, participación de entrenadores, cantidad de usuarios y fecha
  objetivo. El plan no depende de ninguna.

## Para el próximo reporte a GPT-6

GPT-6 no ve el repo: se entera de lo que pasa solo por lo que le peguen acá.
Acumulá en esta sección lo que haya que contarle, y vaciala después de reportar.

- Items [1] hecho. El plan resistió el contacto con el código salvo por lo
  anotado en Hallazgos.
