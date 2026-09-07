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
  comportamiento previo; se documentan causa y arreglo. El borrador de una sesión
  sin finalizar vence a las **6 horas** de iniciada (mismo tope que ya usa
  `durationMinutes` para un entrenamiento finalizado, en
  `useWorkoutSession.ts`): pasado ese límite se ignora y se borra en vez de
  restaurarse, para no mostrar series de un día anterior como si fueran de ahora.
  Incluye diagnóstico y corrección localizada; si exige un cambio estructural, se
  presenta para aprobación sin ejecutarlo.
- **Depende de:** [2], completado.
- **Esfuerzo:** S.
- **Riesgo:** recuperar una sesión equivocada, duplicar series, alterar agregados
  que sí persisten, o restaurar una sesión abandonada como si fuera la de hoy.

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

- **Objetivo:** reunir la acción de entrenamiento, el consumo nutricional real y el
  último dato de descanso en la pantalla inicial.
- **Toca:** `apps/mobile/app/`, `features/training/`, `features/progress/`,
  `features/nutrition/`, `features/recovery/`.
- **No toca:** nuevas rutas, un cuarto apartado, una tarjeta de peso corporal ni
  reglas nuevas de cálculo.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cómo empezar o continuar; sin historial llega al tratamiento del [13]; sin
  conexión puede usar una rutina disponible y continuar una sesión guardada; una
  sesión finalizada pendiente de envío no aparece como entrenamiento sin terminar;
  alimentación y descanso distinguen datos actuales, antiguos e indisponibles; no
  se agregan pantallas.
- **Depende de:** [15], [19]; [4] y [5], completados.
- **Esfuerzo:** M — cinco módulos. Si se vuelve inmanejable, partirlo por apartado.
- **Riesgo:** confundir estado de sincronización con estado del entrenamiento, o
  duplicar las fuentes de datos.

### [7] Prioriza elegir una rutina existente

- **Objetivo:** usar la selección de un programa armado como entrada al
  entrenamiento.
- **Toca:** `apps/mobile/app/`, `features/training/`.
- **No toca:** capacidades del constructor, editor, rutinas compartidas ni creación
  de programas.
- **Criterio de aceptación:** `pnpm typecheck` pasa; con una rutina existente apta
  para principiantes, un socio la elige y empieza sin abrir el constructor; crear o
  editar queda como acceso secundario, sin otra pantalla ni modo avanzado.
- **Depende de:** [6], y confirmación de qué rutinas cargadas son aptas para
  principiantes.
- **Esfuerzo:** S.
- **Riesgo:** dificultar el acceso al constructor a usuarios actuales, o presentar
  programas no aprobados.

### [8] Prellena la siguiente serie respetando el esquema del [12]

- **Objetivo:** confirmar una serie con un toque cuando sus valores ya son
  adecuados, conservando el tratamiento explícito de primera vez.
- **Toca:** `features/progress/`, `features/training/`, `apps/mobile/app/`.
- **No toca:** la estructura acordada en el [12], la lógica del timer, el RPC ni
  reglas nuevas de progresión.
- **Criterio de aceptación:** `pnpm typecheck` pasa; con historial del mismo
  ejercicio y variante, un socio revisa y confirma con un toque; puede editar antes
  de guardar; el rango objetivo y las repeticiones realizadas se distinguen; sin
  historial se aplica el [13]; dos toques rápidos no duplican la serie y el
  descanso sigue iniciándose automáticamente.
- **Depende de:** [7], [12], [13], [15], [19].
- **Esfuerzo:** S.
- **Riesgo:** guardar el rango objetivo como resultado realizado, o reutilizar datos
  incompatibles con el esquema nuevo.

### [9] Muestra la próxima serie durante el descanso

- **Objetivo:** usar la superficie del timer para comunicar el ejercicio, la carga
  de referencia o sugerida y el objetivo de repeticiones siguiente.
- **Por qué:** entre serie y serie el socio ya está mirando la pantalla esperando el
  timer. Es la única atención disponible de toda la sesión y hoy está vacía.
- **Toca:** `features/training/`, `features/progress/`, `docs/progression.md`.
- **No toca:** avisos aparte, pantallas nuevas, duración del descanso, consejos
  rotativos ni algoritmos de progresión no confirmados.
- **Criterio de aceptación:** `pnpm typecheck` pasa; durante el descanso, un socio
  identifica sin ayuda qué serie sigue y su objetivo sin abandonar el timer; la
  carga distingue «Referencia anterior» de «Sugerida»; sin historial aparece el
  tratamiento del [13]; tras la última serie se muestra el siguiente ejercicio o la
  finalización, nunca una serie inexistente.
- **Depende de:** [8].
- **Esfuerzo:** S.
- **Riesgo:** mostrar objetivos de otra serie, o presentar una referencia como
  recomendación calculada.

### [10] Muestra un único resumen de descanso

- **Objetivo:** presentar las horas de sueño registradas como dato principal.
- **Toca:** `features/recovery/`, `apps/mobile/app/`.
- **No toca:** modelo de sueño, contenido educativo, sensores, deuda de sueño ni
  prescripciones de entrenamiento.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cuántas horas registró y a qué noche corresponden; sin registro encuentra la
  entrada desde esa misma pantalla; «Hoy» reutiliza el mismo resumen y, sin
  conexión, no reemplaza el último dato conocido por cero.
- **Depende de:** [5], [6].
- **Esfuerzo:** S.
- **Riesgo:** interpretar las horas como diagnóstico de recuperación, o mostrar una
  noche antigua como actual.

### [11] Verifica el recorrido integrado en web y en iPhone

- **Objetivo:** confirmar que las capacidades nuevas funcionan juntas y mantienen
  los arreglos ya comprobados.
- **Toca:** `docs/`.
- **No toca:** incorporación de test runner, recreación del CI del [T2],
  infraestructura ni funcionalidades nuevas.
- **Criterio de aceptación:** `pnpm typecheck` y el CI pasan; en Expo Web y en un
  iPhone con Expo Go, un socio inicia un ejercicio sin historial, completa una
  sesión preparada en modo avión, consulta la próxima serie durante el descanso,
  cierra y reabre sin pérdidas y sincroniza una sola vez al recuperar conexión;
  registra un alimento oficial y una porción medida cuando esté disponible,
  comprueba sus totales y registra peso sin alterar metas. Se documentan resultados
  por plataforma y todo item aún bloqueado queda explícitamente pendiente.
- **Depende de:** [6]–[10], [15], [16], [18], [19]; y [17] cuando existan las
  mediciones.
- **Esfuerzo:** S.
- **Riesgo:** dar por validado todo el modo offline a partir del arreglo de
  persistencia, o declarar completo un recorrido con dependencias pendientes.

### [12] Ajusta el rango de series efectivas y el aviso de subir peso — HECHO

Rango fijo 8-12, tres series efectivas por ejercicio, y el aviso de dificultad una
sola vez por ejercicio. Migraciones 00021 y 00022. Ver `docs/progression.md` y
`docs/rutinas.md` §1.1.

### [19] Parte la pantalla de entrenamiento en dos modos

**Va primero de la fila.** Reestructura `ActiveWorkoutScreen`, que es la pantalla
que después tocan el [13], el [8] y el [9]. Hacerlo después obliga a rehacerlos.

- **Objetivo:** dejar de mostrar todo a la vez durante el entrenamiento, y resolver
  la decisión de por dónde empezar.
- **Por qué ahora:** hoy conviven en una sola pantalla la lista de grupos, los
  ejercicios del grupo abierto, el video, una línea con cinco metadatos y el
  registro de series. Para alguien que nunca entrenó es un muro.
- **Toca:** `features/training/screens/ActiveWorkoutScreen.tsx`,
  `features/training/components/`, `features/training/screens/RoutineBuilderScreen.tsx`.
- **No toca:** el registro de series en sí, el timer, el aviso del [12], la lógica
  de progresión ni el modelo de datos.
- **Alcance:**
  - *Modo lista* — al entrar y al terminar cada ejercicio. Los músculos del día
    ordenados de grande a chico; el primero con la marca «Empezá por acá» y una sola
    línea de explicación (los grandes primero, mientras hay fuerza). Es
    recomendación, no obligación. Cada tarjeta muestra el músculo y su avance. Al
    tocarla se despliegan sus ejercicios, como hoy.
  - *Modo ejercicio* — al tocar un ejercicio, sin botón intermedio: el toque es el
    inicio. Solo el ejercicio actual y su registro de series; la lista no se ve. Una
    vuelta clara a la lista, siempre visible. Al completar todas las series se
    vuelve solo al modo lista, con el siguiente recomendado marcado.
  - El video deja de estar siempre presente: pasa a un botón discreto
    «¿Cómo se hace?» dentro del modo ejercicio.
  - Se elimina la línea de metadatos del ejercicio (equipo, grupo, región,
    compuesto, dificultad). Se conserva el equipo solo si sirve para encontrar la
    máquina en el gimnasio.
  - En `RoutineBuilderScreen`, paso 5, se quita el `placeholder="Mi rutina"` del
    campo de nombre: queda vacío.
  - **Orden dentro de modo ejercicio** (corrección tras revisión en el teléfono):
    el registro de series va pegado al nombre del ejercicio, arriba de todo lo
    demás. La única excepción es la nota de "Punto de partida"/sugerencia de
    progresión, que se queda encima del registro porque es la instrucción de qué
    peso poner, no información extra. «¿Cómo se hace?», «¿Por qué este
    ejercicio?», el agarre y «Cambiar por otro»/«Saltar» bajan debajo del
    registro.
  - **Entrenamiento ya completado hoy** (corrección tras revisión en el
    teléfono): al volver a entrar a la misma rutina y día después de haberlo
    terminado ese mismo día, no arranca una sesión nueva en blanco. Se muestra
    en modo lectura lo que ya se registró, junto con un aviso ("Ya completaste
    este entrenamiento hoy"). Sigue siendo un solo entrenamiento guardado, no
    dos. Hay un acceso secundario y explícito, "Entrenar de nuevo", para quien sí
    quiera una segunda sesión ese día; editar la ya guardada queda fuera de
    alcance. La detección es una lectura nueva sobre `workouts`/`workout_sets`
    (superposición de ejercicios registrados hoy contra los del día actual, ver
    `getTodaysCompletedWorkoutForExercises`), sin tocar el borrador del [3] ni
    cómo se guarda un entrenamiento.
- **Criterio de aceptación:** `pnpm typecheck` pasa; en modo ejercicio no se ve nada
  que no sea el ejercicio actual y sus series; un socio identifica sin ayuda por qué
  músculo empezar y llega a registrar su primera serie sin leer instrucciones; el
  timer, el aviso del [12] y la navegación entre ejercicios siguen funcionando; el
  campo de nombre de rutina aparece vacío.
- **Depende de:** [12], completado.
- **Esfuerzo:** M.
- **Riesgo:** romper el borrador de sesión activa del [3] al cambiar de modo, o
  perder el acceso a un ejercicio que antes se alcanzaba desde la lista.

### [13] Resuelve la primera sesión de cada ejercicio sin historial

- **Objetivo:** dar una acción clara al principiante cuando todavía no existe un
  peso de referencia.
- **Por qué:** es el punto de abandono más probable de toda la app. Sin historial la
  progresión no puede sugerir nada, y la pregunta «¿cuánto peso pongo?» queda sin
  respuesta.
- **Toca:** `features/training/`, `features/progress/`, `docs/progression.md`.
- **No toca:** pesos iniciales universales, pruebas de carga máxima, pantallas
  nuevas ni incrementos automáticos.
- **Criterio de aceptación:** `pnpm typecheck` pasa; sin historial del mismo
  ejercicio y variante, un socio encuentra en la pantalla de la serie la indicación
  de empezar con carga liviana para aprender el movimiento, introduce la carga
  utilizada y confirma; no aparece una recomendación numérica inventada; en la
  sesión siguiente se recupera esa referencia para revisarla, sin aumentarla
  automáticamente por haber completado la primera.
- **Depende de:** [19]; [12] y [3], completados.
- **Esfuerzo:** S.
- **Riesgo:** confundir una carga exploratoria con una validada, o tomar como
  equivalente el historial de otra variante.

### [14] Permite iniciar, continuar y finalizar una sesión sin conexión

- **Objetivo:** completar localmente un entrenamiento con una rutina previamente
  disponible en el dispositivo.
- **Por qué:** los gimnasios tienen mala señal. El [5] corrigió que la UI no se
  rompa, pero no garantiza entrenar entero sin red.
- **Toca:** `features/training/`, `features/progress/`, `apps/mobile/app/`, el
  borrador de sesión en AsyncStorage, `docs/`.
- **No toca:** descarga de todo el catálogo, media remota obligatoria,
  autenticación offline inicial ni sustitución del almacenamiento existente.
- **Criterio de aceptación:** `pnpm typecheck` pasa; tras abrir una rutina
  conectado, activar modo avión permite iniciar, confirmar series, usar descansos,
  recargar, continuar y finalizar, conservando el resultado local; los datos de
  ejercicios y series están disponibles sin depender de imágenes o videos remotos;
  una rutina nunca cargada muestra una explicación única y permite volver; el socio
  completa el recorrido sin configurar ningún modo offline.
- **Depende de:** [13], [19]; [3] y [5], completados.
- **Esfuerzo:** M — es el item más grande del plan. Si se vuelve inmanejable,
  partirlo entre lectura de datos y ciclo de sesión.
- **Riesgo:** depender sin darse cuenta de consultas remotas, o perder el borrador
  durante la finalización local.

### [15] Cierra la sincronización de las sesiones completadas offline

- **Objetivo:** enviar los entrenamientos pendientes al recuperar conexión sin
  perderlos ni duplicarlos.
- **Toca:** `offlineWorkoutQueue.ts` en su ubicación actual, `features/progress/`,
  `features/training/`, `apps/mobile/app/`, `docs/`.
- **No toca:** una cola nueva, un motor de sincronización nuevo, la reescritura del
  RPC idempotente ni la sincronización de otros módulos.
- **Criterio de aceptación:** `pnpm typecheck` pasa; completar una sesión offline,
  cerrar la app, recuperar conexión y reabrir sincroniza exactamente una sesión con
  sus series; interrumpir el envío y reintentar no duplica registros; un fallo
  conserva el pendiente y solo una confirmación de guardado permite retirarlo; el
  socio ve «Guardado en este dispositivo» o «Sincronizado» en una superficie
  existente, sin pasos adicionales.
- **Depende de:** [14].
- **Esfuerzo:** S.
- **Riesgo:** retirar pendientes antes de confirmarlos, duplicar sesiones, o enviar
  un formato incompatible con el [12].

### [16] Reemplaza el catálogo seleccionable por los datos oficiales peruanos

- **Objetivo:** usar la TPCA 2023 del INS/CENAN como fuente del catálogo de
  registro, conservando trazabilidad y registros históricos.
- **Fuente:** `docs/fuentes/TPCA-Edicion-11-2023-INS-CENAN.xlsx` (gitignorado,
  legible en local). Hoja principal con 2.315 alimentos base; hoja
  «S- Alimentos Preparados» con 569 platos peruanos distintos, agrupados en
  entradas, segundos, refrescos, bebidas de desayuno y postres. Columnas útiles:
  energía en kcal, proteínas, grasa total, carbohidratos disponibles, fibra.
  Cada plato aparece hasta cinco veces, una por estrato socioeconómico, con
  diferencias que son ruido (arroz con pollo: 139-145 kcal, 6,8-7,0 g de proteína).
  Todo está expresado por 100 gramos: la tabla no trae tamaños de porción.
- **Toca:** el archivo anterior como entrada de lectura, `docs/nutrition-data.md`,
  `supabase/migrations/` mediante migración nueva si hace falta,
  `features/nutrition/`.
- **No toca:** migraciones aplicadas, macros históricos, metas, pesos de porción ni
  publicación del archivo gitignorado.
- **Criterio de aceptación:** `pnpm typecheck` pasa; la importación es reproducible
  y registra recuentos, exclusiones y correspondencias; los platos se agrupan por
  identidad y preparación, promediando los estratos disponibles sin convertir
  faltantes en cero; se conservan fuente y unidad por 100 g; un socio encuentra un
  plato por su nombre y lo registra sin elegir estrato; repetir la importación no
  duplica alimentos; registros anteriores y atajos conservan sus valores y
  referencias, sin sustituciones por coincidencia de nombre.
- **Depende de:** [4], completado.
- **Esfuerzo:** M — casi 2.900 filas con deduplicación y trazabilidad.
- **Riesgo:** mezclar alimentos distintos, confundir carbohidratos disponibles con
  otra medida, o romper referencias al retirar el catálogo anterior.

### [17] Incorpora porciones medidas para los platos habituales

**Bloqueado por trabajo del mundo físico, no por código.** La TPCA da valores por
100 g y no trae tamaños de porción. Alguien tiene que pesar con balanza un lote de
porciones reales: un plato de arroz servido normal, un cucharón, una presa de pollo,
un pan, una porción de menestra. Sin ese lote el item no se puede cerrar, y ningún
agente puede producirlo.

- **Objetivo:** registrar una porción cotidiana sin exigir que el socio conozca su
  peso en gramos.
- **Toca:** `docs/nutrition-data.md`, `features/nutrition/`,
  `supabase/migrations/` solo si el modelo actual no admite equivalencias.
- **No toca:** pesos inventados, equivalencias universales de «plato», los valores
  por 100 g, ni pantallas nuevas.
- **Criterio de aceptación:** existe un lote documentado de porciones pesadas con
  balanza, indicando alimento, recipiente o tamaño, gramos comestibles y
  procedencia; `pnpm typecheck` pasa; para ese lote, un socio selecciona el alimento
  y confirma una porción rotulada con su equivalencia aproximada en gramos, sin
  escribir el peso; cambiar la cantidad escala los nutrientes correctamente; los
  alimentos sin equivalencia siguen admitiendo gramos, sin mostrar porciones
  ficticias.
- **Depende de:** [16] y la entrega de las mediciones por el dueño.
- **Esfuerzo:** S, una vez que existan las mediciones.
- **Riesgo:** presentar una porción local como universal, o incluir huesos y otras
  partes no comestibles en la equivalencia.

### [18] Agrega seguimiento de peso corporal sin recalcular las metas

- **Objetivo:** registrar peso con fecha y consultar su evolución desde
  Alimentación.
- **Toca:** `features/nutrition/`, `apps/mobile/app/`, `packages/contracts/`,
  `supabase/migrations/` si corresponde, `docs/nutrition-data.md`.
- **No toca:** el cálculo del onboarding, las metas vigentes, objetivos adaptativos,
  recordatorios ni una frecuencia obligatoria.
- **Criterio de aceptación:** `pnpm typecheck` pasa; desde Alimentación, un socio
  abre «Mi peso», introduce el valor y guarda en la misma pantalla con la fecha
  actual preseleccionada; puede corregir fecha y valor; los registros aparecen
  ordenados en una evolución visible que reutiliza recursos gráficos existentes;
  recargar conserva los datos y las metas nutricionales no cambian; un peso inicial
  sin fecha verificable no se presenta como medición de hoy.
- **Depende de:** [4], completado.
- **Esfuerzo:** S.
- **Riesgo:** duplicar mediciones, atribuir una fecha falsa al onboarding, o
  modificar el perfil usado para calcular macros.

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
