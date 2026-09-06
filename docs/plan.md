# Plan de adaptación — app del gimnasio

Plan producido por GPT-6 a partir de `docs/prompt-planificador.md`.
GPT-6 no tiene acceso al repositorio: planificó sobre la descripción, no sobre el
código. Las correcciones de abajo salen de verificar el plan contra los archivos
reales y **mandan sobre el texto del plan** donde se contradigan.

---

## Nota de verificación contra el repo

**1. La progresión ya está implementada.** El item [7] y su pregunta bloqueante
parten de que hay que definir las reglas. No hace falta:

- `apps/mobile/src/features/training/services/progression.ts` existe
- `apps/mobile/src/features/training/hooks/useProgression.ts` existe
- `apps/mobile/src/features/training/screens/ActiveWorkoutScreen.tsx` ya lo usa
- Las reglas están documentadas en `docs/progression.md`: regla 2-por-2 de la NSCA
  sobre la última serie de dos sesiones consecutivas, incrementos de 2.5 kg arriba
  y 5 kg abajo topados al 10 % del peso actual, piso de 0.5 kg, y una escalera de
  sugerencias para historial insuficiente

El item [7] se reduce entonces a: verificar qué muestra hoy `ActiveWorkoutScreen`,
y ajustar la **presentación** para que el socio distinga la sugerencia del último
registro. No hay algoritmo que escribir ni pregunta que responder.

**2. No existen tests, pese a lo que dice la documentación.**
`docs/progression.md` afirma que `progression.ts` "tiene 10 pruebas" y que "todas
pasan". En el repo no hay ningún archivo de test ni runner configurado:
`apps/mobile/package.json` solo define `start`, `web`, `export:web`, `android`,
`ios` y `typecheck`.

Consecuencias:

- Ningún criterio de aceptación puede apoyarse en tests existentes.
- La lógica de progresión no está verificada, aunque el documento diga que sí.
  Antes de cambiar cómo se presenta, conviene comprobar a mano los casos límite
  que `docs/progression.md` enumera.
- Corregir esa afirmación en `docs/progression.md` corresponde al item [1].

**3. Las preguntas bloqueantes 1 y 4 se responden con archivos del repo.**
`docs/progression.md` y `docs/nutrition-data.md` existen y están versionados. No
hace falta decidir nada: se le pasan a GPT-6 cuando haga falta.

---

## 1. Lectura de la situación

La adaptación cambia la prioridad del producto: ayudar a un socio principiante a
saber qué hacer y registrarlo con pocos pasos. No requiere cambiar el stack,
reorganizar el monorepo ni reconstruir los módulos existentes.

Se mantienen entrenamiento, alimentación y descanso como los tres apartados. La
ruta `(tabs)/index` puede convertirse en «Hoy», reutilizando información de esos
módulos, sin crear un cuarto apartado ni otra pantalla. El constructor de rutinas
sigue disponible, pero deja de ser el camino inicial.

La prioridad es cerrar el recorrido de entrenamiento: elegir un programa
existente, empezar, conocer la siguiente serie, confirmarla y descansar. Después,
reducir el trabajo de registrar comida y consultar descanso.

Los objetivos nutricionales adaptativos quedan pendientes de una política
aprobada y de comprobar qué registros están disponibles. No corresponde inventar
un algoritmo con la información suministrada.

## 2. Qué se queda como está

- **Stack, monorepo y despliegue:** Expo/React Native, TypeScript, Expo Router,
  Supabase, PostgreSQL, pnpm y configuración de Vercel.
- **`onboarding/`:** flujo existente, estimación inicial de macros y persistencia
  local del JSON versionado.
- **`training/`:** teoría, calentamiento, variantes y diccionario visual.
- **`progress/`:** registro, historial local, rachas y gráficos. Solo se adapta la
  interacción de registro indicada en el plan.
- **`nutrition/`:** educación, hidratación y dashboard de macros.
- **`recovery/`:** registro de sueño y educación sobre señales de alarma.
- **Rutinas:** constructor, editor y rutinas compartidas conservan sus
  capacidades y rutas.
- **Base de datos:** las 20 migraciones aplicadas, RPC idempotente y estructuras
  existentes. No se propone otra migración sin necesidad comprobada.
- **Infraestructura:** remoto privado, hook que bloquea commits en `main`, reglas
  de `AGENTS.md`.
- **Reservados:** `apps/api/`, `packages/ui/` y `packages/config/` no se
  desarrollan en esta adaptación.
- **Fuera de alcance:** `subscription/`, RevenueCat, notificaciones inteligentes,
  Sentry/PostHog, nuevas capacidades de media y el módulo obsoleto `red-flags/`.

## 3. Plan de trabajo

**Replanificado tras el reporte #1 (2026-09-06).** Los items [1] y [2] están
hechos. Del [3] en adelante la numeración es nueva: el hallazgo de pérdida de
series reordenó todo, y los items [6] y [8] originales (auto-inicio del descanso
y atajo de comida) se retiraron como trabajo de desarrollo porque ya funcionan —
sobreviven solo como verificación en el [11].

### [3] Diagnostica y corrige la pérdida de series de la sesión activa

- **Objetivo:** conservar las series confirmadas al cerrar y reabrir la app,
  recuperando la misma sesión, rutina y día.
- **Por qué ahora:** «Hoy» y el prellenado necesitan un estado de sesión confiable.
- **Toca:** `features/progress/`, `features/training/`, `docs/`.
- **No toca:** rediseño de persistencia, sincronización de producción, rachas, PR
  ni cambios de esquema.
- **Criterio de aceptación:** `pnpm typecheck` pasa; en Expo Web contra Supabase
  real, confirmar dos series, recargar por completo y volver a la misma rutina y
  día conserva ambas y muestra 2/5; una segunda recarga no duplica registros; al
  finalizar, la sesión aparece en el historial existente; rachas y PR mantienen su
  comportamiento previo; se documentan causa y arreglo. Incluye diagnóstico y
  corrección localizada; si exige un cambio estructural, se presenta para
  aprobación sin ejecutarlo.
- **Depende de:** [2], completado.
- **Esfuerzo:** S.
- **Riesgo:** recuperar una sesión equivocada, duplicar series o alterar agregados
  que sí persisten.

### [4] Sustituye los consumos ficticios por los registros reales

- **Objetivo:** mostrar en Alimentación los consumos diarios calculados desde los
  registros del usuario.
- **Por qué ahora:** los valores hardcodeados informan incorrectamente y no deben
  trasladarse a «Hoy».
- **Toca:** `features/nutrition/`, `apps/mobile/app/`, `docs/`.
- **No toca:** cálculo de la meta diaria, atajos existentes, catálogo, objetivos
  adaptativos ni esquema de datos.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un día vacío muestra consumos
  cero solo cuando la lectura confirma que no hay registros; registrar una comida
  y luego otra actualiza los totales según sus cantidades, y recargar los
  conserva; un fallo de lectura muestra indisponibilidad, no ceros ficticios; un
  socio distingue sin ayuda lo consumido de su meta.
- **Depende de:** [2], completado.
- **Esfuerzo:** S.
- **Riesgo:** sumar registros duplicados, mezclar días o confundir ausencia de
  datos con fallo de carga.

### [5] Corrige los estados de desconexión en las pantallas existentes

- **Objetivo:** mantener una interfaz utilizable sin conexión y conservar el
  último valor conocido cuando esté disponible.
- **Por qué ahora:** la pantalla en blanco y los ceros incorrectos son fallos
  propios, y deben resolverse antes de componer «Hoy».
- **Toca:** `apps/mobile/app/`, `features/training/`, `features/recovery/`, `docs/`.
- **No toca:** garantía de entrenamiento completo offline, nueva infraestructura de
  caché, sincronización de producción ni notificaciones.
- **Criterio de aceptación:** `pnpm typecheck` pasa; en Expo Web, cargar Inicio y
  Recuperación con datos, desconectar y volver a consultarlos conserva los valores
  disponibles identificados como últimos datos guardados; sin datos recuperables
  aparece «Sin datos disponibles», no cero; intentar iniciar entrenamiento sin
  conexión no deja la pantalla en blanco, muestra un único aviso y permite volver
  o reintentar; al reconectar, reintentar recupera el flujo sin duplicar sesiones.
- **Depende de:** [3].
- **Esfuerzo:** S.
- **Riesgo:** presentar datos antiguos como actuales, o arrancar sesiones
  duplicadas al reintentar.

### [6] Convierte la ruta inicial en «Hoy»

- **Objetivo:** reunir la siguiente acción de entrenamiento, el consumo
  nutricional real y el último dato de descanso en la pantalla inicial.
- **Por qué ahora:** las fuentes y los estados de error ya deben ser confiables
  antes de reunirlos.
- **Toca:** `apps/mobile/app/`, `features/training/`, `features/progress/`,
  `features/nutrition/`, `features/recovery/`.
- **No toca:** nuevas rutas, un cuarto apartado, un módulo nuevo ni reglas de
  cálculo.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cómo empezar o continuar su entrenamiento y consulta alimentación y descanso en
  la misma pantalla; tras recargar una sesión activa, la acción permite
  continuarla; datos ausentes, antiguos e indisponibles se distinguen; no se
  agregan pantallas.
- **Depende de:** [3], [4], [5].
- **Esfuerzo:** M — toca cinco módulos. Es el item más grande del plan; si se
  vuelve inmanejable, partirlo por apartado.
- **Riesgo:** duplicar estado o mostrar una acción incompatible con la sesión
  recuperada.

### [7] Prioriza elegir una rutina existente

- **Objetivo:** usar la selección de un programa armado como entrada al
  entrenamiento.
- **Por qué ahora:** evita exigirle al principiante construir una rutina, y se
  integra con la entrada de «Hoy».
- **Toca:** `apps/mobile/app/`, `features/training/`.
- **No toca:** capacidades del constructor, editor, rutinas compartidas ni
  creación de programas.
- **Criterio de aceptación:** `pnpm typecheck` pasa; con una rutina existente
  aprobada para principiantes, un socio la elige y empieza sin abrir el
  constructor; crear o editar queda como acceso secundario en la pantalla
  existente, sin otra pantalla ni modo avanzado.
- **Depende de:** [6], y confirmación de qué rutinas disponibles son aptas para
  principiantes.
- **Esfuerzo:** S.
- **Riesgo:** dificultarle a los usuarios actuales el acceso al constructor, o
  presentar programas no aprobados.

### [8] Prellena la siguiente serie y permite confirmarla

- **Objetivo:** revisar peso y repeticiones y confirmar una serie con un toque
  cuando no haya cambios.
- **Por qué ahora:** el estado de la sesión ya se conserva y puede sostener un
  registro mínimo.
- **Toca:** `features/progress/`, `features/training/`, `apps/mobile/app/`.
- **No toca:** implementación del timer existente, RPC de guardado, gráficos,
  rachas ni algoritmo de progresión.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio confirma con un
  toque una serie prellenada y puede editarla antes; el valor anterior corresponde
  al mismo ejercicio y variante; sin historial no aparece un peso inventado; dos
  toques rápidos no duplican la serie; recargar conserva lo confirmado y el
  descanso sigue arrancando automáticamente.
- **Depende de:** [3], [7].
- **Esfuerzo:** S.
- **Riesgo:** usar valores de otra variante, guardar antes de confirmar, o
  interferir con el timer que ya funciona.

### [9] Presenta la recomendación de la próxima serie

- **Objetivo:** mostrar peso y repeticiones sugeridos usando únicamente las reglas
  de progresión confirmadas.
- **Por qué ahora:** con persistencia y registro resueltos, se puede abordar la
  decisión de qué hacer en la siguiente serie.
- **Toca:** `docs/progression.md`, `features/training/`, `features/progress/`.
- **No toca:** `services/progression.ts` — las reglas no se cambian. Tampoco
  algoritmos nuevos, mesociclos, cambios de rutina ni ajustes por sueño.
- **Criterio de aceptación:** `pnpm typecheck` pasa; se verifican a mano los casos
  de historial suficiente, insuficiente y cambio de variante contra las reglas
  documentadas; un socio distingue sugerencia de registro anterior, puede
  modificar la propuesta y confirmarla en la misma pantalla; sin respaldo
  suficiente no se presenta el último registro como recomendación.
- **Depende de:** [8].
- **Esfuerzo:** S.
- **Riesgo:** recomendar una carga sin respaldo, o confundir una propuesta con una
  serie realizada.

### [10] Muestra un único resumen de descanso

- **Objetivo:** presentar las horas de sueño registradas como dato principal.
- **Por qué ahora:** hace consultable el apartado aprovechando los estados de
  desconexión ya corregidos.
- **Toca:** `features/recovery/`, `apps/mobile/app/`.
- **No toca:** modelo de sueño, contenido educativo, sensores, deuda de sueño ni
  prescripciones de entrenamiento.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cuántas horas registró y a qué noche corresponden; sin registro encuentra la
  entrada desde esa misma pantalla; «Hoy» reutiliza el mismo resumen y, sin
  conexión, no reemplaza el último dato conocido por cero.
- **Depende de:** [5], [6].
- **Esfuerzo:** S.
- **Riesgo:** interpretar las horas como diagnóstico de recuperación, o mostrar
  una noche antigua como actual.

### [11] Verifica el recorrido completo y documenta las capacidades existentes

- **Objetivo:** comprobar en conjunto las correcciones y dejar evidencia de las
  funciones que ya estaban implementadas.
- **Por qué ahora:** cierra la adaptación sin reconstruir el timer ni los atajos
  de comida.
- **Toca:** `docs/`.
- **No toca:** la implementación del antiguo [6] ni del antiguo [8], retirados como
  trabajo de desarrollo; tampoco agrega tests, test runner, CI ni funcionalidades
  offline.
- **Criterio de aceptación:** `pnpm typecheck` pasa; se documenta una ejecución
  manual donde un socio elige una rutina, confirma dos series, ve iniciar el
  descanso automáticamente, recarga y continúa sin pérdida ni duplicación;
  registra una comida habitual en dos toques y ve consumos reales; consulta
  descanso; y se reproducen los casos offline del [5] sin pantalla en blanco ni
  ceros falsos. Se identifica plataforma y entorno, manteniendo nativo como no
  verificado.
- **Depende de:** [4], [5], [7], [8], [10]; también [9] si quedó desbloqueado.
- **Esfuerzo:** S.
- **Riesgo:** extrapolar resultados de Expo Web a nativo, o dar por corregido un
  fallo solo porque quedó documentado.

## 4. Preguntas abiertas

Resueltas por la nota de verificación:

- ~~Progresión~~ — las reglas están en `docs/progression.md` y la lógica en
  `services/progression.ts`.
- ~~Catálogo nutricional~~ — `docs/nutrition-data.md` está en el repo.

Siguen abiertas:

- **Programas iniciales (afecta validar [4] con contenido real):** ¿qué rutinas
  están cargadas y cuáles son apropiadas para principiantes?
- **Objetivos nutricionales adaptativos (fuera del plan):** ¿hay historial de peso
  corporal e ingesta utilizable? ¿Quién aprueba las reglas y los límites del
  ajuste?
- Distribución, participación de entrenadores, cantidad de usuarios y fecha
  objetivo. El plan no depende de ninguna.

## 5. Decisiones que requieren aprobación del dueño

Ninguna. No hay evidencia que justifique un cambio grande de arquitectura, stack o
estructura.
