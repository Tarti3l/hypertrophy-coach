# Plan del rediseño visual — Hypertrophy Coach

## Estado

| Item | Estado | PR | Nota |
| --- | --- | --- | --- |
| [D1] Reemplaza el sistema de tokens por «vino sobre negro» | hecho | #15 | |
| [D2] Empaqueta Archivo | pendiente | | Depende de que el [D1] mergee |
| [D3] Barrido de radios y sombras escritos a mano | pendiente | | |
| [D4] Pantalla de inicio con foto a sangre | en revisión | #17 | Quedaron fuera de alcance las filas de descanso y alimentación: no hay datos disponibles en esa pantalla |
| [D5] Tarjetas de grupo muscular con foto | en revisión | #17 | |
| [D6] Modo ejercicio | en revisión | #17 | Quedó fuera de alcance el estado sin video: `ExerciseMediaPreview` ya muestra los pasos de técnica reales, que es mejor que un estado dibujado |
| [D7] Descanso entre series | en revisión | #17 | |

Los cuatro (D4-D7) van en un solo PR, `#17`, contra `main`. Falta la
verificación en el teléfono del dueño del repo.

Cuando el PR #14 (`docs/plan.md`/`docs/estado.md`) mergee, se decide si se
agrega acá un puntero hacia ese archivo o se fusionan los dos.

### Ajustes fuera de la cadena D1-D7

Dos correcciones sobre `main` después de mergear el [D4]-[D7] (PR #17), ninguna
parte de un item D1-D7:

- **Ejercicio duplicado marcado dos veces como "Seguí acá".** Confirmado en
  "Rutina gou": el mismo ejercicio repetido dentro de Pecho hacía que
  `nextExercise` (comparado solo por `exercise.id`) marcara las dos filas a la
  vez. Corregido comparando por posición en `visibleExercises`, no por id —
  mismo criterio que ya se usó para las keys de React al partir el modo lista.
  Pendiente, sin resolver: confirmar si hay otras rutinas con el mismo
  duplicado. No se puede consultar por RLS más allá de la propia cuenta del
  dueño del repo (misma limitación que la pregunta abierta de `docs/estado.md`
  sobre cuántos usuarios hay en la base).
- **Pestaña "Entrenamiento" oculta de la barra inferior** (`href: null` en
  `(tabs)/_layout.tsx`). La ruta y la pantalla siguen vivas; se llega solo
  desde "Empezar entrenamiento" en Inicio. Antes de ocultarla se confirmó que
  dos pantallas quedan sin ningún enlace en la UI a partir de este cambio —
  `TrainingTheoryScreen` (el índice de la pestaña) y `WarmupScreen`
  (`/training/warmup`), un flujo genérico previo al onboarding y constructor
  de rutinas actuales, que ninguna otra pantalla enlaza. Decisión explícita
  del dueño del repo: no tocarlas todavía, se decide después. Sí se corrigió
  el destino de "Volver sin historial" de `RoutinesScreen` y
  `ActiveWorkoutScreen`, que apuntaba a la pestaña ahora oculta: pasa a
  Inicio (`/(tabs)`).

---

Este plan cubre **solo** el rediseño. El resto de `docs/plan.md` —la cadena
[13] → [14] → [15] → [6] → [7] → [8] → [9], y los items [10], [16], [18] y [11]—
está **pausado por decisión del dueño** hasta que esto termine.

Vive en un archivo aparte a propósito: el PR #14 ya toca `docs/plan.md` y
`docs/estado.md`, y meter estos items ahí generaría un conflicto que no hace
falta. Cuando el #14 mergee, se decide si se fusionan los dos archivos.

La dirección visual está cerrada y documentada en **`docs/diseno.md`**, que manda
sobre este plan donde se contradigan.

---

## Nota de verificación contra el repo

Antes de escribir estos items se auditaron los 93 archivos de
`apps/mobile/src/`. Los números cambian el tamaño del trabajo:

**1. El color está 100 % tokenizado.** Hay exactamente dos hex escritos a mano
fuera de `theme/`, los dos en `components/layout/WebLayoutWrapper.tsx`, más
`rgba()` en `features/training/components/ExerciseSwapSheet.tsx` y
`features/training/screens/SharedRoutinesScreen.tsx`. Cambiar `tokens.ts` repinta
la app entera.

**2. La tipografía también.** 203 usos, todos vía `typography.display` o
`typography.body`. La familia se propaga sola.

**3. Los radios no.** 59 usos salen del token, pero hay **50 números literales
repartidos en 24 archivos** (`borderRadius: 14`, `: 22`, `: 999`…). Ese es el
grueso del trabajo mecánico, y es el item [D3].

**4. No existe `expo-font`** en `apps/mobile/package.json`, ni ningún
`useFonts` en el código. Empaquetar Archivo es instalación, no configuración.

**5. No hay tests ni runner.** Ningún criterio de aceptación puede apoyarse en
tests. Todos se verifican con `pnpm typecheck` más revisión en dispositivo real.

---

## Orden de ejecución

`[D1] → [D2] → [D3] → [D4] → [D5] → [D6] → [D7]`

Es una cadena, no un abanico: cada item deja la app en un estado coherente y el
siguiente construye encima. [D1] y [D2] son globales; [D3] limpia lo que no vamos
a rediseñar; [D4] a [D7] son las cuatro pantallas diseñadas, una por PR.

---

### [D1] Reemplaza el sistema de tokens por «vino sobre negro»

- **Objetivo:** que la app entera cambie de paleta y de forma con un solo archivo.
- **Por qué primero:** por la nota de verificación 1 y 2, es el cambio de mayor
  efecto y menor riesgo del plan. Después de este item ya se ve la dirección,
  aunque falten las pantallas.
- **Toca:** `apps/mobile/src/theme/tokens.ts`, `docs/diseno.md` (nuevo),
  `AGENTS.md` (sección «Sistema visual» y regla 10).
- **No toca:** ningún componente.
- **Alcance:**
  - Paleta oscura completa, incluidos los tokens nuevos: `surface`,
    `textLabel`, `textFaint`, `accentFill`, `accentDeep`, `onAccent`, `empty`.
  - `scrim` (los dos velos sobre foto) y `gradient.activo` como tokens, no como
    valores sueltos en los componentes.
  - `radii` con valores generosos (15 / 18 / 22 / 24 / 28 / pill), `elevation`
    en cero, `gutter` en 22.
  - Escala `type` completa, con `hero`, `metric`, `timer`, `stat` y `pill`
    agregados.
  - La paleta clara se define pero **no se diseña**: existe para que la app no
    explote si alguien fuerza el tema.
- **Criterio de aceptación:** `pnpm typecheck` pasa; la app arranca y todas las
  pantallas se ven negras con acentos vino; ningún componente quedó con un hex
  literal nuevo; abierta en el teléfono, de noche y con el brillo bajo, no
  encandila.
- **Depende de:** nada.
- **Esfuerzo:** S.
- **Riesgo:** que algún componente use un token que se renombró. El typecheck lo
  atrapa.

---

### [D2] Empaqueta Archivo

- **Objetivo:** que la tipografía del diseño sea la que se ve, no la del sistema.
- **Por qué acá:** sin esto el diseño pierde buena parte de lo que lo distingue, y
  cualquier ajuste de tamaños hecho antes hay que rehacerlo con la letra real.
- **Toca:** `apps/mobile/package.json`, `apps/mobile/app/_layout.tsx`,
  `apps/mobile/assets/fonts/`.
- **No toca:** la escala tipográfica, que ya quedó en [D1].
- **Alcance:**
  - Instalar `expo-font` y los cinco pesos de Archivo (400, 500, 600, 700, 800).
    Cinco y no más: cada peso extra es un archivo dentro de la app.
  - Cargar las fuentes en `_layout.tsx` y no renderizar hasta que estén listas,
    para que no haya un salto de tipografía al abrir.
  - Medir cuánto sube el bundle y anotarlo en `docs/estado.md`.
- **Criterio de aceptación:** `pnpm typecheck` pasa; en el teléfono los títulos se
  ven en Archivo y no en la del sistema; no hay parpadeo de fuente al abrir la
  app; el aumento de peso está anotado.
- **Depende de:** [D1].
- **Esfuerzo:** S.
- **Riesgo:** que la app quede en blanco esperando fuentes si la carga falla.
  Tiene que haber un camino de salida que renderice igual con la del sistema.

---

### [D3] Barrido de radios y sombras escritos a mano

- **Objetivo:** que las pantallas que **no** vamos a rediseñar queden coherentes.
- **Por qué acá:** son alimentación, descanso, onboarding y auth. Sin este item se
  quedan con esquinas de otra época y la app se ve a medio hacer, que es
  exactamente lo que pasó en el intento anterior.
- **Toca:** los 24 archivos de la nota de verificación 3.
- **No toca:** composición, textos ni lógica. Es un cambio mecánico.
- **Alcance:**
  - Cada `borderRadius: <número>` pasa al token más cercano de `radii`.
  - Cada `shadowColor` / `elevation` escrito a mano se elimina.
  - Los dos hex y los `rgba()` sueltos pasan a tokens.
  - Si un valor no tiene token equivalente, **no se inventa uno**: se anota en
    `docs/estado.md` y se decide con el dueño.
- **Criterio de aceptación:** `pnpm typecheck` pasa; `grep -rn "borderRadius: [0-9]"`
  sobre `apps/mobile/src` no devuelve nada fuera de `theme/`; recorriendo la app en
  el teléfono no queda ninguna esquina que se note distinta.
- **Depende de:** [D1].
- **Esfuerzo:** M. Son 50 puntos en 24 archivos.
- **Riesgo:** cambiar el radio de algo que dependía de ser un círculo exacto
  (avatares, insignia de racha) y que quede un cuadrado con las puntas mordidas.

---

### [D4] Pantalla de inicio con foto a sangre

- **Objetivo:** que abrir la app diga en un segundo qué toca hoy y ofrezca una
  sola acción.
- **Toca:** `apps/mobile/app/(tabs)/index.tsx` y sus componentes,
  `features/progress/screens/HomeScreen.tsx`, `assets/images/`.
- **No toca:** de dónde salen los datos de racha, semana, descanso y comida.
- **Alcance:**
  - Foto a sangre arriba con el velo `scrim.hero`, y el titular del día encima.
  - Bloque de acción con el degradado `gradient.activo`: ejercicios, series,
    duración estimada y un botón «Empezar entrenamiento».
  - Dos datos y no seis: racha y sesiones de la semana.
  - Dos filas de resumen: descanso y alimentación.
  - Barra de apartados al pie, solo en esta pantalla.
- **Criterio de aceptación:** `pnpm typecheck` pasa; el titular se lee sobre la
  foto sin importar la imagen; hay una sola acción principal visible; los cinco
  datos que muestra salen de los módulos reales y no están escritos a mano; toda
  superficie tocable tiene 44 px.
- **Depende de:** [D2].
- **Esfuerzo:** M.
- **Riesgo:** que los datos de descanso y alimentación no estén disponibles en esa
  pantalla y haya que ir a buscarlos, lo que convierte un item de diseño en uno de
  datos. Si pasa, se muestra menos y se anota.

---

### [D5] Tarjetas de grupo muscular con foto

- **Objetivo:** que en la lista del día se reconozca cada grupo sin leer.
- **Toca:** `features/training/screens/ActiveWorkoutScreen.tsx` (modo lista),
  `features/training/components/`, `assets/images/musculos/`.
- **No toca:** el registro de series ni la navegación entre modos, que resolvió
  el item [19].
- **Alcance:**
  - Doce imágenes, una por cada valor de `MuscleGroupSlug`, con el velo
    `scrim.card` y el nombre del grupo abajo a la izquierda.
  - El grupo recomendado va como tarjeta grande con su botón «Empezar»; los
    demás como fila con miniatura.
  - **Estado sin imagen** para cualquier grupo que se agregue en el futuro:
    fondo `surface`, ícono en contorno en `empty`, nombre en `textLabel`.
  - Los ejercicios de cada grupo mantienen su fila con el contador `0/4`.
- **Criterio de aceptación:** `pnpm typecheck` pasa; los doce grupos tienen imagen
  y ninguna se ve de un origen distinto a las demás; un grupo sin imagen se ve
  incompleto y no roto; las tarjetas mantienen la misma altura aunque el nombre
  del ejercicio ocupe dos líneas.
- **Depende de:** [D2], y el item [19] mergeado.
- **Esfuerzo:** M.
- **Riesgo:** el peso del bundle si las doce imágenes se empaquetan sin comprimir.
  Ver decisión abierta 1.

---

### [D6] Modo ejercicio

- **Objetivo:** que la pantalla que más se mira en una sesión sea la más clara.
- **Toca:** `features/training/screens/ActiveWorkoutScreen.tsx` (modo ejercicio),
  `features/progress/components/SetTracker.tsx`.
- **No toca:** la lógica de progresión ni el aviso del item [12].
- **Alcance:**
  - Serie en curso como bloque con `gradient.activo`: peso y reps en `type.metric`,
    y un botón ancho «Serie lista».
  - Series pendientes como tarjetas planas con los valores en `—`.
  - Metadatos del ejercicio como píldoras: equipo, rango objetivo, referencia
    anterior.
  - **Estado sin video**, que es el que se va a ver mientras los 24 clips no
    existan: ícono en contorno, leyenda corta y la salida «¿Cómo se hace?».
- **Criterio de aceptación:** `pnpm typecheck` pasa; con 4 series (calentamiento
  más tres al fallo) todo entra en pantalla sin scroll en un teléfono de 844 px de
  alto; el estado sin video no se lee como un error; registrar una serie sigue
  funcionando igual que antes.
- **Depende de:** [D5].
- **Esfuerzo:** M.
- **Riesgo:** que con nombres de ejercicio largos y cuatro series el contenido no
  entre y haya que elegir entre scroll o achicar la métrica.

---

### [D7] Descanso entre series

- **Objetivo:** cerrar el recorrido con la pantalla que se mira de reojo.
- **Toca:** `features/training/components/RestTimer.tsx` y la pantalla que lo usa.
- **No toca:** la duración del descanso ni cómo se dispara.
- **Alcance:**
  - Contador en `type.timer` dentro del bloque con `gradient.activo`, centrado en
    el espacio libre.
  - Barra de progreso coherente con el tiempo real: si marca 2:37 sobre 3:00, la
    barra va en 13 %, no en un número decorativo.
  - «+30 s» y «Saltar» como píldoras de 44 px.
  - Al pie, la referencia de la serie siguiente, con la aclaración de que es lo
    que se levantó la vez pasada y no una sugerencia calculada.
- **Criterio de aceptación:** `pnpm typecheck` pasa; la barra refleja el tiempo
  real; el contador se lee desde un metro de distancia; el texto de referencia no
  promete un cálculo que la app no hace.
- **Depende de:** [D6].
- **Esfuerzo:** S.
- **Riesgo:** bajo.

---

## Decisiones abiertas

**1. Dónde viven las trece imágenes.** Empaquetarlas en `assets/` es lo más simple
y funciona sin conexión, que en un gimnasio con mal señal importa; suma alrededor
de 300 KB al bundle. Ponerlas en Supabase Storage mantiene la app liviana y
permite cambiarlas sin publicar una versión, pero necesita caché y un estado de
carga en la pantalla que más se mira. **Recomiendo empaquetarlas**: son pocas,
pesan poco y no van a cambiar seguido. Decisión del dueño.

**2. Los recortes están fijos.** Hoy cada imagen está recortada a mano a dos
tamaños. Conviene guardar la versión grande y dejar que la app recorte, o cada
cambio de medida vuelve a pasar por un recorte manual.

**3. Permisos de las imágenes — esto bloquea el lanzamiento, no el desarrollo.**
Ninguna de las trece es propia. Para maquetar no importa; para una app instalada
en el gimnasio sí, y son doce personas identificables más una sala ajena. La del
gimnasio se resuelve fotografiando el propio. Las de físico necesitan stock con
licencia o socios que firmen permiso. **Ningún item de este plan la desbloquea.**

**4. Los 24 videos de ejercicio siguen sin existir.** El estado sin video de [D6]
hace que dejen de bloquear el lanzamiento, pero la dirección se ve bastante mejor
con ellos.

**5. Tema claro.** No está diseñado y no está en este plan. Si se decide hacerlo,
es dibujar cada pantalla de nuevo, no ajustar tokens.
