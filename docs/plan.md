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

### [1] Alinea la documentación con el producto del gimnasio

- **Objetivo:** dejar una definición vigente de tres apartados, sin monetización y
  con prioridad de uso sencillo.
- **Por qué ahora:** evita que los agentes ejecuten hitos comerciales que ya no
  corresponden.
- **Toca:** `PRODUCT.md`, `README.md`, y la sección "Verificación" de
  `docs/progression.md` (ver nota 2 arriba).
- **No toca:** código, estructura del repositorio, `AGENTS.md` ni funcionalidades
  implementadas.
- **Criterio de aceptación:** revisión manual confirma que suscripción, freemium y
  entitlements dejan de figurar como trabajo previsto; que distribución,
  entrenadores, escala y fecha siguen explícitamente sin definir; y que
  `docs/progression.md` ya no afirma tener pruebas automatizadas.
- **Depende de:** nada.
- **Esfuerzo:** S.
- **Riesgo:** eliminar contexto histórico útil; conservarlo marcado como
  desactualizado cuando sea necesario.

### [2] Define el recorrido mínimo y registra su estado actual

- **Objetivo:** fijar casos manuales reproducibles para evaluar la adaptación sin
  rehacer lo que ya funciona.
- **Por qué ahora:** permite distinguir cambios necesarios de capacidades
  existentes.
- **Toca:** `docs/`.
- **No toca:** implementación, librerías, CI ni funcionalidades nuevas.
- **Criterio de aceptación:** existe una lista manual con pasos y resultado
  observado para elegir rutina, registrar dos series, consultar descanso, repetir
  comida, cerrar y reabrir la app, y abrirla sin conexión; cada fallo incluye
  plataforma y condiciones de reproducción.
- **Depende de:** [1].
- **Esfuerzo:** S.
- **Riesgo:** confundir un problema del entorno con una carencia del producto;
  registrar ambos por separado.

### [3] Convierte la ruta inicial en «Hoy»

- **Objetivo:** mostrar la siguiente acción de entrenamiento, el resumen
  nutricional existente y el último dato de descanso en la pantalla inicial.
- **Por qué ahora:** reúne lo necesario para el día sin exigir visitar tres
  dashboards.
- **Toca:** `apps/mobile/app/`, `features/training/`, `features/nutrition/`,
  `features/recovery/`.
- **No toca:** nuevas rutas, un módulo `today/`, cálculos nutricionales ni reglas
  de entrenamiento.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cómo empezar su entrenamiento y consulta alimentación y descanso en la misma
  pantalla; los datos ausentes muestran «Sin registrar» y los antiguos indican su
  fecha; siguen existiendo solo tres apartados.
- **Depende de:** [2].
- **Esfuerzo:** M — toca tres módulos y es el item más grande del plan, no S.
- **Riesgo:** duplicar estado o presentar datos antiguos como actuales.

### [4] Prioriza elegir una rutina existente

- **Objetivo:** usar la selección de un programa ya armado como entrada al
  entrenamiento.
- **Por qué ahora:** evita que el principiante tenga que diseñar una rutina para
  empezar.
- **Toca:** `apps/mobile/app/`, `features/training/`.
- **No toca:** lógica interna de `routine-builder`, `routine-editor`, rutinas
  compartidas ni creación de programas.
- **Criterio de aceptación:** `pnpm typecheck` pasa; con una rutina existente
  disponible, un socio la elige y empieza sin abrir el constructor; «Crear o
  editar rutina» queda como acceso secundario, sin interruptor de modo avanzado
  ni pantalla adicional.
- **Depende de:** [3].
- **Esfuerzo:** S.
- **Riesgo:** ocultar funciones necesarias a usuarios actuales; conservar sus
  accesos secundarios y rutas.

### [5] Prellena la siguiente serie y permite confirmarla

- **Objetivo:** reducir el registro a revisar peso y repeticiones y confirmar una
  vez cuando no haya cambios.
- **Por qué ahora:** es la interacción que más se repite durante el entrenamiento.
- **Toca:** `features/progress/`, `features/training/`, `apps/mobile/app/`.
- **No toca:** RPC de guardado, gráficos, rachas, nuevas métricas ni el algoritmo
  de progresión.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio confirma con un toque
  una serie prellenada y puede editarla antes; se usa el último registro del mismo
  ejercicio y variante, identificado como anterior; sin historial no aparece un
  peso inventado; dos toques rápidos no generan dos series.
- **Depende de:** [4].
- **Esfuerzo:** S.
- **Riesgo:** reutilizar valores de otra variante, o guardar el prellenado antes
  de confirmarlo.

### [6] Inicia el descanso al confirmar una serie

- **Objetivo:** arrancar el timer existente automáticamente después de guardar una
  serie.
- **Por qué ahora:** elimina una acción repetitiva del recorrido recién definido.
- **Toca:** `features/training/`, `features/progress/`, `apps/mobile/app/`.
- **No toca:** defaults de descanso, notificaciones, servicios en segundo plano ni
  librerías.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio confirma una serie y
  ve el descanso comenzar sin otra acción; puede omitirlo desde la misma pantalla;
  editar una serie anterior no reinicia el timer.
- **Depende de:** [5].
- **Esfuerzo:** S.
- **Riesgo:** disparar varios timers o reiniciarlos al corregir registros.

### [7] Presenta la recomendación de la próxima serie

**Reformulado — ver nota 1.** La lógica ya existe; esto es solo presentación.

- **Objetivo:** que el socio distinga claramente la sugerencia de `progression.ts`
  del último registro, y pueda modificarla antes de confirmar.
- **Por qué ahora:** resuelve la decisión principal del principiante una vez que
  registrar y descansar funciona.
- **Toca:** `features/training/screens/ActiveWorkoutScreen.tsx`,
  `features/training/hooks/useProgression.ts`.
- **No toca:** `services/progression.ts` — las reglas no se cambian. Tampoco
  mesociclos ni ajustes automáticos por sueño.
- **Criterio de aceptación:** `pnpm typecheck` pasa; comprobados a mano los casos
  de `docs/progression.md` (sin historial, por debajo del objetivo, objetivo
  alcanzado sin superarlo por 2, regla 2-por-2 cumplida, tope del 10 % en cargas
  ligeras); un socio distingue la sugerencia del último registro, puede
  modificarla y confirmarla en la misma pantalla.
- **Depende de:** [5], [6].
- **Esfuerzo:** S.
- **Riesgo:** presentar como recomendación un valor que en realidad es el registro
  anterior. Si falta información, mostrar el registro anterior sin llamarlo
  recomendación.

### [8] Acerca los atajos de comida al registro diario

- **Objetivo:** registrar alimentos habituales usando `food_shortcuts`.
- **Por qué ahora:** reduce escritura sin ampliar el catálogo ni sumar pantallas.
- **Toca:** `features/nutrition/`, `apps/mobile/app/`.
- **No toca:** esquema de `food_shortcuts`, códigos de barras, micronutrientes ni
  objetivos adaptativos.
- **Criterio de aceptación:** `pnpm typecheck` pasa; con un atajo disponible, un
  socio registra su comida en un máximo de dos toques, sin buscar ingredientes;
  puede revisar la cantidad antes de confirmar; sin atajos, el registro habitual
  sigue accesible.
- **Depende de:** [3].
- **Esfuerzo:** S.
- **Riesgo:** registrar porciones equivocadas o duplicadas.

### [9] Muestra un único resumen de descanso

- **Objetivo:** presentar las horas de sueño registradas como dato principal.
- **Por qué ahora:** hace consultable el apartado sin introducir un score ni otra
  pregunta diaria.
- **Toca:** `features/recovery/`, `apps/mobile/app/`.
- **No toca:** modelo de sueño, contenido educativo, sensores, deuda de sueño ni
  prescripciones de entrenamiento.
- **Criterio de aceptación:** `pnpm typecheck` pasa; un socio identifica sin ayuda
  cuántas horas registró y a qué noche corresponden; si no hay registro, encuentra
  la entrada desde esa misma pantalla; «Hoy» reutiliza ese resumen.
- **Depende de:** [3].
- **Esfuerzo:** S.
- **Riesgo:** interpretar horas como diagnóstico de recuperación; etiquetar el dato
  como «Sueño registrado».

### [10] Verifica el recorrido completo y documenta los límites offline

- **Objetivo:** comprobar que la adaptación mantiene los datos y permite completar
  los recorridos acordados.
- **Por qué ahora:** valida el uso real antes de ampliar funcionalidades.
- **Toca:** `docs/`.
- **No toca:** sincronización de producción, despliegue, autenticación ni promesas
  nuevas de disponibilidad offline.
- **Criterio de aceptación:** `pnpm typecheck` pasa y se repiten los casos de [2];
  un socio sin ayuda elige una rutina existente, registra dos series, consulta
  descanso y registra una comida habitual; cerrar y reabrir conserva los registros
  locales previstos; se documenta qué funciona sin conexión, diferenciando
  contenido previamente cargado y primer acceso.
- **Depende de:** [4], [5], [6], [7], [8], [9].
- **Esfuerzo:** S.
- **Riesgo:** extrapolar resultados entre plataformas.

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
