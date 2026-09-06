# Recorrido mínimo — estado actual

Casos manuales del item [2] de `docs/plan.md`. Cada uno se probó a mano, sin
tests automatizados (no existen, ver `docs/progression.md`).

**Entorno de prueba:** Expo Web (`pnpm --filter @hypertrophy/mobile web`,
`expo start --web`), Chrome vía automatización de navegador, `localhost:8081`,
contra el Supabase real del proyecto (no un mock). No se probó en simulador ni
dispositivo iOS/Android nativo — donde se anota una falla, puede ser específica
de la capa web y no del producto nativo.

## 1. Elegir rutina

**Pasos:** Inicio → "Empezar entrenamiento" → pantalla "Tus rutinas" → elegir
día → "Empezar".

**Resultado observado:** OK. Muestra la rutina cargada ("La rutina para estar
como cbum", 5 días, 27 ejercicios), permite elegir el día y arranca la sesión
con los 6 ejercicios de ese día.

## 2. Registrar dos series

**Pasos:** durante una sesión activa, completar peso/reps de una serie y
marcarla "Hecha"; repetir para una segunda serie del mismo ejercicio.

**Resultado observado:** OK. El contador de series avanza (0/5 → 1/5 → 2/5) y
al confirmar cada serie arranca automáticamente el temporizador de descanso.

**Hallazgo incidental:** esto ya cubre buena parte del criterio de aceptación
del item [6] (iniciar el descanso al confirmar una serie) — ver Hallazgos en
`docs/estado.md`.

## 3. Consultar descanso

**Pasos:** con el temporizador de descanso corriendo (disparado por el paso
anterior), revisar la pantalla de descanso y su opción de saltar.

**Resultado observado:** OK. Muestra la cuenta regresiva y un botón "Saltar"
funcional.

## 4. Repetir comida

**Pasos:** Alimentación → usar un atajo de comida ya guardado para registrarlo
de nuevo.

**Resultado observado:** OK, en dos toques. Confirma que la infraestructura de
`food_shortcuts` (migración `00009_food_shortcuts.sql` +
`foodShortcutRepository.ts`) ya cubre gran parte del criterio de aceptación del
item [8].

**Hallazgo aparte (no es una falla del flujo probado):** el panel "Tu
referencia de hoy" en Alimentación etiqueta explícitamente sus consumos como
"de ejemplo" ("Los consumos son de ejemplo por ahora"). No refleja lo
registrado; solo la meta usa el cálculo real. No es parte del criterio de este
item, pero condiciona cualquier trabajo futuro sobre ese dashboard.

## 5. Cerrar y reabrir la app — CORREGIDO (item [3])

**Estado:** corregido y reverificado a mano en Expo Web contra Supabase real
(2026-09-06). Repro original abajo, seguido de causa y arreglo.

**Pasos:**
1. Empezar sesión con "La rutina para estar como cbum", día 1.
2. En "Apertura en máquina (pec deck)", registrar y confirmar ("Hecha") dos
   series (20 kg × 15 y 22,5 kg × 12). El contador pasa a 2/5.
3. Cerrar la pestaña / recargar por completo (equivalente a cerrar y reabrir la
   app), volver a Inicio y volver a entrar a la misma rutina y mismo día.

**Resultado observado:** el contador de "Apertura en máquina (pec deck)"
vuelve a 0/5. Las dos series marcadas no aparecen.

**Qué sobrevive y qué no (verificado en `/progress` y en la racha de
Inicio):**
- Sobrevive: la racha semanal (esta semana pasó de 0 a 1 sesión, día marcado) y
  al menos un registro de PR de esa misma sesión para otro ejercicio ("Press de
  pecho en máquina" aparece en Progreso con "Ya tienes tu primer registro").
- No sobrevive / no se resume: las series del ejercicio "Apertura en máquina
  (pec deck)". No aparece en la lista de ejercicios con registro en Progreso —
  no es solo que la sesión no se retome visualmente, el dato no quedó en un
  lugar recuperable.

**Plataforma y condiciones:** Expo Web / Chrome, `localhost:8081`, contra
Supabase real (se confirmó que el backend seguía arriba y respondía). No se
probó en nativo — puede ser un artefacto de cómo se persiste el estado de
sesión en la capa web, o un problema real de la capa de datos que también
afecta nativo. Se registra como hallazgo, no se diagnosticó la causa (fuera de
alcance de este item; ver `docs/estado.md`).

### Causa (item [3])

`useWorkoutSession` (`apps/mobile/src/features/progress/hooks/useWorkoutSession.ts`)
guardaba las series confirmadas solo en estado de React (`setSetsByExercise`).
Nada se escribía en disco ni en Supabase hasta tocar "Finalizar entrenamiento"
(`finishWorkout` → `saveCompletedWorkout` / `enqueueWorkout`). Un recargo
completo destruye ese estado en memoria sin haber llegado nunca a ese punto,
así que las series confirmadas antes de finalizar no tenían dónde sobrevivir.
No era un bug puntual: el diseño nunca contempló una sesión que sobreviviera
a un cierre de la app, y por eso ninguna prueba lo cubría.

Lo que sí sobrevivía (racha semanal, PR de otro ejercicio) venía de una sesión
**ya finalizada** en una prueba anterior, no de la sesión interrumpida del
caso 5 — esa sí llegó a Supabase por el camino normal.

### Arreglo (item [3])

Se agregó un borrador local de la sesión activa, con el mismo mecanismo
(AsyncStorage) que ya usa `offlineWorkoutQueue.ts` para la cola de
sincronización — no es una librería nueva ni un rediseño de la persistencia
existente:

- `apps/mobile/src/features/progress/services/workoutSessionDraft.ts` (nuevo):
  `loadWorkoutSessionDraft` / `saveWorkoutSessionDraft` /
  `clearWorkoutSessionDraft`, con clave `usuario + rutina + día`.
- `useWorkoutSession` restaura el borrador al montar (antes de que el usuario
  pueda tocar nada), lo actualiza en cada cambio de series, y lo borra al
  finalizar con éxito (guardado o encolado offline). Reutiliza
  `reconcileSets` (ya existente) para ajustar el borrador restaurado a la
  forma vigente sin perder series ya completadas.
- `ActiveWorkoutScreen` le pasa la clave `routineId:day` a `useWorkoutSession`.

**Límite conocido, aceptado por alcance:** las sustituciones de ejercicio
(`swaps`) y los ejercicios saltados no se restauran tras recargar — vuelven a
su estado original de la rutina, igual que el resto del estado de pantalla
que no forma parte de este item. Solo se restauran las series y el
calentamiento.

**Reverificado (2026-09-06):** confirmar dos series de "Apertura en máquina
(pec deck)" (20 kg × 15, 22,5 kg × 12), recargar completo → conserva 2/5 con
los mismos valores; una segunda recarga no duplica nada; "Finalizar
entrenamiento" guarda normalmente, el ejercicio aparece en Progreso ("Ya
tienes tu primer registro") y la racha/semana de Inicio suben igual que
antes.

### Vencimiento del borrador (revisión de PR, 2026-09-06)

El primer arreglo no le ponía límite de antigüedad al borrador: una sesión
abandonada sin finalizar se restauraba entera al volver a la misma rutina y
día, aunque fuera días después, con su `startedAt` original — mostraba series
viejas como si fueran de la sesión de ahora.

Se agregó `MAX_WORKOUT_SESSION_HOURS = 6` en `workoutSessionDraft.ts`:
`loadWorkoutSessionDraft` descarta y borra cualquier borrador cuyo `startedAt`
tenga más de 6 horas, en vez de restaurarlo. Es el mismo tope que
`useWorkoutSession.ts` ya usaba para acotar `durationMinutes` de un
entrenamiento finalizado (nadie entrena 6+ horas seguidas); se unificó en una
sola constante en vez de tener el mismo número de gimnasio repetido dos veces.

**Verificado a mano** inyectando un borrador falso en `localStorage` (misma
clave que usa AsyncStorage en Expo Web): con `startedAt` de hace 10 h, la
sesión arranca en blanco y el borrador viejo se sobreescribe; con `startedAt`
de hace 2 h, se restaura igual que antes del cambio.

## 6. Abrir sin conexión — FALLA (parcial)

**Cómo se simuló:** no hay forma de cortar la conectividad real del
dispositivo desde esta herramienta de prueba. Se interceptó `window.fetch` en
la página para que toda request a `*.supabase.co` rechace con
`TypeError: Failed to fetch`, dejando intactas las requests al bundle servido
por Metro en `localhost`. Esto aproxima el caso real de una app ya instalada
que abre sin datos (no necesita red para arrancar, sí para traer datos), pero
es una simulación a nivel de página, no un corte de red del sistema operativo.

**Resultado observado, por pantalla:**
- **Inicio:** la racha y "esta semana" quedan cargando (spinner) unos segundos
  y después caen a un estado de error claro: "No pudimos cargar tu historial.
  Revisa tu conexión e inténtalo de nuevo." con botón "Reintentar". Correcto,
  aunque de fondo los contadores se resetean a 0 en vez de mantener el último
  valor conocido.
- **Recuperación:** mismo patrón — "Sueño de anoche" carga, después muestra
  "No pudimos cargar tu registro de sueño..." con "Reintentar". Correcto.
- **Entrenamiento:** contenido educativo estático, no depende de red. Sin
  problema.
- **Alimentación:** el dashboard usa datos "de ejemplo" (ver hallazgo del
  punto 4), así que no dispara ningún error visible sin conexión — no es que
  maneje bien el caso offline, es que no llega a necesitar red para esa
  pantalla.
- **Empezar entrenamiento (`training/active`) — FALLA:** al iniciar una sesión
  sin conexión, la pantalla queda en blanco (sin título ni contenido) y
  muestra **dos** mensajes duplicados "No pudimos conectar con el servidor.
  Revisa tu conexión e inténtalo otra vez." con dos botones "Reintentar"
  independientes, uno debajo del otro. No hay manera de ver o continuar nada
  de la rutina sin conexión.

**Plataforma y condiciones:** Expo Web / Chrome, `localhost:8081`,
interceptando `fetch` a nivel de página como se describe arriba. No probado en
nativo.
