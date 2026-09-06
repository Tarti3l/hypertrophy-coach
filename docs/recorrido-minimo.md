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

## 5. Cerrar y reabrir la app — FALLA

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
