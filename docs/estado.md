# Estado del trabajo

`docs/plan.md` dice **qué hay que hacer**. Este archivo dice **qué está hecho**.

Es la única fuente de verdad sobre el avance. Cualquier agente que termine un
item lo actualiza acá, en el mismo commit que el trabajo. Cualquier agente que
empiece una sesión lo lee primero.

## Avance

| Item | Estado | PR | Nota |
| --- | --- | --- | --- |
| [1] Alinear la documentación con el producto del gimnasio | hecho | #2 | |
| [2] Definir el recorrido mínimo y registrar su estado actual | hecho | #4 | `docs/recorrido-minimo.md`; 4/6 casos OK |
| [3] Corregir la pérdida de series de la sesión activa | hecho | #6 | Verificado en iPhone real: funciona en nativo |
| [4] Sustituir los consumos ficticios por los registros reales | hecho | #8 | Verificado en vivo (Expo Web): día vacío muestra "0 kcal registradas" y "Todavía no registraste nada" (ya no hay consumos de ejemplo hardcodeados). Registrar una comida actualiza los totales correctamente; recargar la página (reload real) los conserva, confirmando persistencia en Supabase y no solo estado de cliente. Quitar un registro también persiste tras recargar. Registrar dos comidas seguidas suma bien los totales (178.5 + 75 = 253.5 kcal exacto). Sin errores de consola en todo el recorrido. |
| [5] Corregir los estados de desconexión | hecho | #7 | |
| [T1] Dejar `pnpm typecheck` en verde | hecho | #9 | Era un typo: `'abdomen'` por `'abs'` |
| [T2] CI mínimo | hecho | #11 | Corre typecheck en cada PR. No bloquea el merge: los rulesets no se aplican en repos privados del plan gratuito |
| [12] Rango de series efectivas y aviso de subir peso | hecho | #12 | 8-12 fijo, 3 series efectivas, aviso una vez por ejercicio. Migraciones 00021 y 00022 |
| [19] Partir la pantalla de entrenamiento en dos modos | en revisión | #14 | Los tres puntos de la revisión en el teléfono, más el bloqueo de ejercicio duplicado (constructor y "Cambiar por otro") y el campo de nombre de rutina vacío, están implementados y verificados en Expo Web. Falta la verificación en el teléfono del dueño del repo. Un hallazgo queda abierto sin corregir, no bloquea el merge: sospecha de carrera en el borrador del [3] solo bajo Fast Refresh reiterado (ver "Hallazgos que cambian el plan") |
| [13] Resolver la primera sesión sin historial | pendiente | | Punto de abandono más probable de la app |
| [14] Entrenar entero sin conexión | pendiente | | El más grande (M) |
| [15] Cerrar la sincronización de sesiones offline | pendiente | | |
| [6] Convertir la ruta inicial en «Hoy» | pendiente | | M: cinco módulos |
| [7] Priorizar elegir una rutina existente | pendiente | | Confirmar qué rutinas cargadas sirven para principiantes |
| [8] Prellenar la siguiente serie | pendiente | | |
| [9] Mostrar la próxima serie durante el descanso | pendiente | | Reemplaza la presentación que preveía el antiguo [9] |
| [10] Mostrar un único resumen de descanso | pendiente | | |
| [16] Reemplazar el catálogo por la TPCA 2023 | en revisión | #22 | Migración 00023 aplicada al remoto (`pnpm db:status`: 00001-00023 sincronizadas local/remoto). Verificado en vivo (Expo Web): el pill "PREPARACIÓN NO ESPECIFICADA" aparece en "Arroz blanco corriente" (cód. A3), y buscando "arroz pilado" aparece "Arroz pilado o pulido cocido" (cód. A2) con pill "COCIDO" — ambas variantes distintas, sin colisión de nombre. Ciclo completo probado: elegir → confirmar 150 g (1 taza) → 173 kcal calculados correctamente → aparece en "Registros de hoy" con fuente "TPCA 2023 (INS/CENAN), cód. A2" → totales del día se actualizan → quitar funciona. Sin errores de consola. Hallazgo de esa verificación (buscar "arroz" a secas no encontraba "Arroz pilado o pulido cocido") ya corregido, ver "Hallazgos que cambian el plan". Falta la verificación del dueño del repo en su propio dispositivo. |
| [17] Incorporar porciones medidas | bloqueado | | **Bloqueado por el dueño**: hay que pesar porciones reales con balanza. Ningún agente puede producir ese dato |
| [18] Seguimiento de peso corporal | hecho | #29 | Migración 00024 (`body_weight_logs`, una fila por día con `unique (user_id, measured_on)`) aplicada al remoto; `pnpm db:status`: 00001-00024 sincronizadas. Pantalla «Mi peso» desde Alimentación, evolución con el mismo `LineChart` que ya usa Progreso, sin librerías nuevas. Verificado en vivo por el dueño (Expo Web): "Hoy" viene preseleccionado con la fecha correcta; guardar dos veces el mismo día **corrige** el registro en vez de duplicarlo, avisando antes ("Ya tienes X kg anotados ese día"); "Corregir" carga peso y fecha en el formulario; dos pesos (hoy y ayer) aparecen en "Tus registros" y en la evolución; recargar (reload real) conserva todo; "Quitar" funciona. **Las metas quedaron idénticas antes y después de registrar peso** (2888 kcal, 126P/470C/56G): no se recalculan, y nada escribe en `user_profiles`. El peso del onboarding (70 kg, 4 set.) se muestra aparte y aclarado como declarado, fuera de la evolución. Sin errores de consola. RLS verificado contra la API: un `POST` anónimo al historial de otro usuario da 42501 |
| [20] Dar de alta socios sin el dashboard | en revisión | #31 | Pedido directo del dueño, fuera del orden de la fila. `scripts/invite-member.mjs` (raíz, fuera de `apps/mobile/` para que Expo no lo empaquete) crea la cuenta con `email_confirm: true` vía la API de admin y muestra una contraseña temporal de 14 caracteres generada con `crypto.randomInt` (~82 bits, sin caracteres ambiguos). Sin dependencias nuevas: `fetch` plano, igual que `verify-rls-isolation.mjs`. La app ya no ofrece "Crear cuenta"; el login explica que el acceso lo da el encargado. `pnpm typecheck` verde. Verificado sin la clave privilegiada: sin correo, correo inválido, sin clave y **clave pública pegada por error** (se detecta por el prefijo `sb_publishable_` y corta antes de llamar a Supabase); una clave con formato válido pero inexistente devuelve el 401 con mensaje claro. `.env.admin` confirmado ignorado por `.gitignore`, y ninguna clave literal en lo commiteado. **Falta la verificación del dueño**: crear una cuenta real e iniciar sesión con ella exige la service_role key, que no tengo ni debo tener |
| [11] Verificar el recorrido integrado en web y en iPhone | pendiente | | Cierra la tanda |

**Retirados del plan.** Los antiguos [6] (auto-inicio del descanso) y [8] (atajo de
comida en dos toques) ya están implementados. Sobreviven solo como verificación
dentro del [11].

**Orden de ejecución.** La cadena principal es
[19] → [13] → [14] → [15] → [6] → [7] → [8] → [9], con [10] colgando de [5] y [6],
y el [11] cerrando. Los items **[16]** y **[18]** dependen solo del [4] y son
independientes de toda esa cadena.

Estados: `pendiente` · `en curso` · `en revisión` · `hecho` · `bloqueado`.

Un item `en curso` tiene dueño: anotá cuál agente lo tomó y en qué worktree,
para que el otro no lo agarre en paralelo.

**Ventana de paralelismo — abierta ahora.** El **[16]** (catálogo TPCA) y el
**[18]** (peso corporal) dependen solo del [4] y tocan `features/nutrition/`. La
cadena de entrenamiento ([19] → [13] → [14] → [15] → [6]…) toca `features/training/`
y `features/progress/`. Son dos frentes que no se pisan: uno para cada agente, cada
uno en su worktree. El protocolo está en `AGENTS.md`, sección "Trabajo en paralelo".

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
- **2026-09-06, item [3]:** causa de la pérdida de series confirmada: nada se
  persistía hasta "Finalizar entrenamiento" (todo vivía en estado de React de
  `useWorkoutSession`). Arreglo localizado con un borrador en AsyncStorage
  (mismo mecanismo que ya usa `offlineWorkoutQueue.ts`), sin tocar esquema ni
  sincronización. Límite aceptado: las sustituciones de ejercicio y los
  ejercicios saltados en la sesión no se restauran tras recargar, solo las
  series y el calentamiento — no estaba en el repro del hallazgo original.
  Detalle completo (causa, arreglo, reverificación manual) en
  `docs/recorrido-minimo.md`, caso 5.
- **2026-09-06, item [3]:** `pnpm typecheck` tiene 3 errores preexistentes en
  `scripts/checks/weekPlan.check.ts` (`Type '"abdomen"' is not assignable to
  type 'MuscleGroupSlug'`, líneas 18, 34 y 80), ya presentes en `main` antes de
  este item — confirmado corriendo el mismo comando con `git stash`. No los
  causó ningún trabajo de este plan.
- **2026-09-06, item [3]:** verificado en nativo por el dueño del repo (iPhone
  real, Expo Go contra el servidor de desarrollo): confirmar dos series,
  cerrar la app por completo (fuera del multitarea) y volver a entrar a la
  misma rutina y día conserva 2/5. El arreglo del borrador en AsyncStorage no
  era un artefacto de Expo Web — funciona igual en nativo. Se retira la
  advertencia de "no probado en nativo" para este caso.
- **2026-09-06, item [5]:** dos causas independientes detrás del caso 6 del
  item [2]. En Inicio, un arranque en frío sin conexión (nunca hubo una carga
  exitosa) mostraba racha y "esta semana" en 0, indistinguible de "no
  entrenaste" — corregido con un flag `hasData` que decide entre conservar el
  último valor y mostrar "Sin datos disponibles". Hallazgo incidental en la
  misma pantalla: la tarjeta "Tu próxima sesión" ignoraba el error de
  `useRoutines` y, sin red, ofrecía "Armar mi rutina" como si el socio no
  tuviera ninguna — también corregido. En `training/active`, catálogo y rutina
  fallan a la vez con el mismo mensaje genérico y cada uno dibujaba su propio
  botón "Reintentar", duplicándolo — se unificó en uno solo. Recuperación no
  tenía ninguna falla real (ya mostraba error único y no reseteaba a cero);
  no se tocó. Detalle completo en `docs/recorrido-minimo.md`, caso 6.
- **2026-09-06, item [T1]:** causa confirmada de los 3 errores: un typo de
  slug, no un problema de lógica. `weekPlan.check.ts` usaba `'abdomen'`, que
  nunca existió en el enum `public.muscle_group` (las migraciones y
  `MuscleGroupSlug` siempre usaron `'abs'`). Corregido reemplazando el literal
  en las 3 apariciones; los 9 casos del check siguen en verde.
- **2026-09-06, item [T2]:** protocolo corregido en `AGENTS.md` (regla 8): la
  fila de `docs/estado.md` se cierra al terminar, en un commit que entra a la
  misma branch/PR antes de mergear — marcar `en curso` al empezar es solo para
  evitar que otro agente lo agarre en paralelo, no cierra el item. La regla
  anterior no lo dejaba explícito, y eso fue lo que dejó la fila del item [4]
  huérfana (en revisión, sin PR, con una nota de un bloqueo ya resuelto).
- **2026-09-06, item [12]:** hay DOS mecanismos de progresión en el código,
  documentados de forma desigual, que hoy pueden contradecirse:
  1. **`services/progression.ts`** (documentado en `docs/progression.md`):
     regla 2-por-2 de la NSCA, **entre sesiones**. Compara la última serie de
     las dos sesiones anteriores contra `target_reps` (10 por defecto, o el
     valor que fije la rutina — "ese valor manda", dice el propio documento).
     Produce la sugerencia que se ve ANTES de registrar ("Toca subir peso",
     "Punto de partida", etc.).
  2. **`SetTracker.tsx`** (sin documentar en ningún lado): chequeo **dentro de
     la misma sesión**, con `MIN_REPS = 8` y `REP_CEILING = 12` fijos en el
     código, sin relación con `target_reps`. Al completar una serie efectiva
     con 12+ reps pregunta "¿te costó?" y, si la respuesta es que podía hacer
     más, sugiere subir el peso de las series que faltan de esa misma sesión.
     El piso de 8 cita a Schoenfeld et al. (2021) en un comentario del código,
     nunca en `docs/`.

  **Contradicción concreta, ya observada en vivo:** la rutina cargada fija
  `target_reps = 15` para "Apertura en máquina (pec deck)" (`Apunta a 15
  reps`, visible en pantalla). El mecanismo 1 evaluaría la regla 2-por-2
  contra 15+2=17. Pero el mecanismo 2 ignora ese 15 por completo: en cuanto
  el socio llega a 12 reps —tres antes de su objetivo real— le pregunta si
  "podía hacer más" y, si dice que sí, le dice que suba el peso, contra el
  objetivo de 15 que la propia pantalla le está pidiendo dos líneas más
  arriba. `docs/progression.md` dice "cuando el editor de rutinas permita
  fijar `target_reps`, ese valor manda" — pero en el mecanismo 2 no manda.

  **No corregido:** el dueño del repo pidió no tocar `docs/progression.md`
  por cuenta propia; queda una decisión pendiente (¿el rango 8-12 debe
  respetar `target_reps` cuando la rutina fija uno distinto, o es un techo/
  piso que ninguna rutina debería pisar y entonces el dato de la rutina es el
  que está mal?) antes de implementar el item [12] o de documentar el
  mecanismo 2 en `docs/progression.md`.
- **2026-09-06, item [12] — resuelto:** dos correcciones al hallazgo anterior
  y la decisión tomada.
  - **Corrección:** el "15" no salía de `routine_exercises.target_reps` — esa
    columna está en `null` en **todas** las filas de la base real, se
    confirmó por consulta directa. Salía de `exercises.default_reps_high`
    (nivel catálogo, no rutina), que `ActiveWorkoutScreen` usa como
    respaldo cuando la rutina no fija nada — que es siempre, hoy.
  - **Alcance real, no un solo ejercicio:** consultando el catálogo completo,
    **62 de 91 ejercicios** tienen `default_reps` fuera de 8-12. La
    inmensa mayoría (~54) es aislamiento con techo alto (curls, elevaciones,
    pantorrilla, abdominales — 10-20 típico): decisión del dueño, quedan
    sin tocar. Ocho no eran aislamiento y sí se corrigieron: seis compuestos
    con rango de fuerza clásico (press de banca, militar, remo con barra,
    sentadilla con barra, sentadilla frontal, sentadilla profunda — 6-10) y
    dos variantes de peso corporal (curl nórdico 4-8, dominada asistida
    5-10). Dos quedan aparte por naturaleza: `farmers-walk` y `plank` no se
    miden en repeticiones al fallo.
  - **Decisión:** (b) — el rango 8-12 es fijo, el dato que no encaja es el
    que está mal. Corregidos `pec-deck` + los ocho de arriba a 8-12 en la
    migración `00021_fix_default_reps_range.sql`, aplicada al remoto.
    Documentado como decisión de producto (no hallazgo a medias) en
    `docs/progression.md`.
  - **Series por ejercicio, mismo criterio:** `target_sets` variaba de 2 a 4
    según el rol del ejercicio. Consultando `split_template_slots` (68 filas:
    25 en 4, 3 en 2, 40 ya en 3) y la rutina personal del dueño del repo (27
    filas: 12 en 4, 1 en 2, 14 ya en 3), se decidió fijar **3 series efectivas
    siempre**, misma lógica que el rango de reps. Corregido en la migración
    `00022_fix_target_sets_range.sql` (templates compartidos completos + la
    rutina personal del dueño, no rutinas de otros usuarios) y verificado por
    consulta directa: los 68 slots y las 27 filas ya están en 3. Documentado
    con su costo conocido (menos volumen semanal, priorizado por adherencia,
    no como si fuera gratis) en `docs/rutinas.md` §1.1.
  - **Ojo, dato real:** "La rutina para estar como cbum" es la rutina real del
    dueño del repo, con la que viene entrenando — no un fixture de prueba
    armado para QA. La migración le tocó datos reales de uso, a pedido
    explícito, con el routine_id acotado en el `where`.
  - **Pregunta abierta, sin resolver:** ¿hay otros usuarios con rutinas
    propias en la base, y cuántos? `routine_exercises`/`routines` están
    protegidas por RLS por usuario — ni con la clave publicable ni
    autenticado como este usuario se puede leer o contar filas de otra
    persona, y así debe ser. No hay una vía para obtener ese número sin
    acceso al panel de Supabase (Table Editor / Auth) o una `service_role`
    key, que el proyecto deliberadamente no expone (`.env.example`: "Nunca
    uses service_role en la app"). Si hace falta el número, lo tiene que
    mirar el dueño del repo directamente, o autorizar puntualmente una
    consulta con esa clave. No se tocó ninguna rutina ajena mientras tanto.

- **2026-09-06, item [19]:** durante las pruebas manuales en Expo Web, con
  Fast Refresh recargando el archivo repetidas veces, el borrador de sesión en
  AsyncStorage (item [3]) apareció una vez con todas las series en
  `completed: false` pese a que `startedAt` seguía siendo el de varias horas
  antes — es decir, se perdieron los datos sin cerrar la app. Probable carrera
  entre los efectos de hidratación y persistencia de `useWorkoutSession.ts` al
  remontar muchas veces seguidas en poco tiempo. No es un escenario real de
  uso (un socio no dispara Fast Refresh), y no se repitió con una carga normal
  de la pantalla; no se investigó más ni se corrigió, queda fuera del alcance
  del [19]. Si se repite reportado por un usuario real, hay que revisar la
  carrera en esos dos efectos.
- **2026-09-08, item [16]:** el conteo de "~2.900 filas" de la fuente TPCA 2023
  citado en el plan era incorrecto. La hoja maestra del Excel ("TPCA EDICIÓN 11
  2023") no contiene solo alimentos simples: a partir de la fila 1197 (0-indexed)
  repite completa la sección "S - ALIMENTOS PREPARADOS", así que un conteo
  ingenuo de toda la hoja da ~2243-2244 filas, contando cada preparación dos
  veces. El número real es **1125 alimentos simples** (grupos A-U, filas 8-1196
  de la maestra) + **1103 preparaciones** (hoja aparte "S- Alimentos
  Preparados", verificado que coincide exactamente con la sección duplicada
  dentro de la maestra) = 2228 filas distintas. El script de generación
  (`scripts/generate-tpca-2023-migration.mjs`) acota la lectura de la maestra a
  las filas 8-1196 para no insertar cada preparación dos veces. Detalle completo
  de conteos por grupo y por `preparation`, y el hallazgo de que 884/884 códigos
  de la edición 2017 siguen existiendo en 2023, en la migración
  `supabase/migrations/00023_food_catalog_tpca_2023.sql` y en la PR #22.
- **2026-09-06, item [19] — resuelto:** causa confirmada del reporte de "el
  mismo ejercicio dos veces" en el modo lista. No es un problema de datos:
  verificado por consulta directa, ni el catálogo `exercises` tiene dos filas
  con el mismo nombre (91 filas, comparadas por nombre normalizado, cero
  grupos con más de una) ni "La rutina para estar como cbum" tiene un
  `exercise_id` repetido dentro de un mismo día (27 filas en 5 días, cero
  duplicados). Reproducido en vivo: dentro de una sesión, "Cambiar por otro"
  en `ActiveWorkoutScreen` no tenía ningún bloqueo (a diferencia del que ya
  usa `RoutineBuilderScreen`) — elegir ahí un ejercicio que ya estaba en otro
  grupo del mismo día ("Prensa de piernas 45°" → "Sentadilla hack", que ya
  estaba en ese día) dejaba el mismo ejercicio dos veces en la lista, ambos
  marcados "Seguí acá". Corregido aplicando el mismo bloqueo por id + nombre
  normalizado a esa pantalla; `normalizeExerciseName` se movió a
  `services/exerciseCatalog.ts` para que las dos pantallas compartan la misma
  regla en vez de cada una con su copia. Reverificado: los mismos ejercicios
  que antes se duplicaban ahora aparecen atenuados con "Ya está en tu rutina
  de hoy" y no se pueden elegir.

- **2026-09-11, item [16]:** buscar "arroz" a secas en el registro de
  comidas no encuentra "Arroz pilado o pulido cocido" (cód. A2). Causa:
  `searchFoods()` ordena por `name` alfabético y corta en `limit=25`, y hay
  más de 25 alimentos cuyo nombre empieza con o contiene "arroz" antes de
  llegar alfabéticamente a esa fila (la fila 25 es "Arroz chaufa con pollo
  chijaukay"). Confirmado que el alimento existe y funciona bien: buscando el
  término más específico "arroz pilado" aparece solo, con el pill "COCIDO"
  correcto, los macros correctos y la fuente "TPCA 2023 (INS/CENAN), cód.
  A2". No es un defecto de la migración ni del catálogo, y no bloquea el
  [16] — el alimento se puede registrar con el término correcto — pero sí
  afecta a cualquier alimento cuyo nombre quede fuera de las primeras 25
  coincidencias alfabéticas, y choca con la prioridad uno de "fácil y
  sencilla de usar". Vale la pena un item de búsqueda por relevancia (no
  solo alfabética) antes de abrir el catálogo completo a los usuarios.
  **Corregido en el PR #26**, pero la causa supuesta acá no era la de fondo:
  ver la entrada siguiente.

- **2026-09-11, buscador de alimentos (pedido del dueño, PR #26):** subir el
  límite de 25 no habría arreglado nada. El problema no es cuántas filas se
  muestran sino que el orden era alfabético sobre un catálogo que mezcla los
  1103 platos preparados con los alimentos simples: de las 317 coincidencias
  de "arroz", **310 son platos** que solo lo llevan de acompañamiento ("Adobo
  de cerdo con arroz"), y el ingrediente caía recién en la posición 42. Con
  cualquier límite razonable, el socio veía guisos. Corregido ordenando por
  relevancia (`services/foodSearchRanking.ts`): primero los alimentos simples
  y después los platos, y dentro de cada grupo, nombre exacto → empieza con el
  término → alguna palabra empieza con el término → lo contiene. Verificado
  contra la base remota: "Arroz pilado o pulido cocido" pasa de no aparecer a
  salir 3.º con su cód. A2. Mejora igual "pollo" (antes cinco guisos, ahora
  cortes de pollo), "leche" (antes alfajores, ahora leches) y "pan" (antes
  "Ají panca", que coincidía a mitad de palabra).

- **2026-09-11, buscador de alimentos (hallazgo nuevo, SIN corregir):** buscar
  sin tildes no encuentra nada. "platano" devuelve 0 resultados porque el
  filtro `ilike` de Postgres no ignora las tildes y la tabla dice "Plátano";
  lo mismo con "mais", "cafe", "atun", "limon". Afecta a alimentos muy comunes
  y choca con la prioridad uno (fácil y sencilla). No se corrigió acá porque
  la solución razonable es de base de datos (extensión `unaccent` + índice, o
  una columna normalizada), no de cliente: necesita migración y que el dueño
  la aplique. Vale un item propio.

- **2026-09-11, item [16] — resuelto:** el hallazgo de arriba (buscar "arroz" a
  secas no encontraba "Arroz pilado o pulido cocido" por el corte de
  `searchFoods()` en 25 resultados alfabéticos) quedó corregido: el buscador
  ahora ordena por relevancia en vez de solo alfabético (PR #26,
  `fix(nutrition): ordenar el buscador de alimentos por relevancia`).

## Preguntas abiertas

- **Objetivos nutricionales adaptativos:** ¿hay historial de peso corporal e
  ingesta utilizable? ¿Quién aprueba las reglas y los límites del ajuste?
  Fuera del plan hasta resolverlo.
- Distribución, participación de entrenadores, cantidad de usuarios y fecha
  objetivo. El plan no depende de ninguna.
- ~~Rango 8-12 vs. `target_reps` de la rutina (item [12])~~ — resuelto:
  8-12 es fijo, se corrigen los datos que no encajan. Ver Hallazgos y
  `docs/progression.md`.
- **Cuántos usuarios tienen rutinas propias (item [12]):** al fijar
  `target_sets` en 3 se corrigió la rutina personal del dueño del repo, pero
  no se pudo averiguar si hay otras personas con rutinas armadas ni cuántas
  — `routine_exercises`/`routines` están protegidas por RLS y no hay una vía
  sin panel de Supabase o una `service_role` key para contarlas. Si hay
  otros usuarios con rutinas que quedaron con `target_sets` fuera de 3 (o
  `default_reps` fuera de 8-12, del hallazgo anterior), siguen así hasta que
  el dueño del repo confirme el número y autorice tocarlas.

## Para el próximo reporte a GPT-6

GPT-6 no ve el repo: se entera de lo que pasa solo por lo que le peguen acá.
Acumulá en esta sección lo que haya que contarle, y vaciala después de reportar.

- Reporte #2 entregado el 2026-09-06 (los cinco cambios nuevos del dueño más el
  detalle verificado de la TPCA). Devolvió los items [13] a [18], ya aplicados.
- Pendiente de contarle en el próximo reporte: el item [19], que salió después del
  replan y va primero de la fila.
