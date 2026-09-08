# Sistema visual — Hypertrophy Coach

Fuente de verdad del diseño. Si algo en la interfaz no coincide con lo que dice
acá, lo que está mal es la interfaz.

Regla dura para cualquier agente: **ningún componente escribe un color, un radio
ni una familia tipográfica a mano.** Todo sale de
`apps/mobile/src/theme/tokens.ts`. Un hex literal dentro de un componente es un
error de revisión, aunque el color sea el correcto.

---

## 1. La idea

**Vino sobre negro.** Tres decisiones la sostienen:

- **Fondo negro real (`#000000`).** No es gris muy oscuro. En pantalla OLED el
  color flota sobre nada, y contra el negro el vino se despega mucho más de lo
  que se despegaba contra un fondo del mismo color.
- **El vino no es papel tapiz.** Aparece en tres lugares, cada uno con una
  función: el degradado del bloque que está **en curso**, el velo que baja sobre
  las fotos hasta fundirse en negro, y el acento de lo que está **activo**. Fuera
  de eso, la pantalla es negra.
- **La fotografía es material, no decoración.** Cada grupo muscular tiene su
  imagen y se reconoce sin leer. Cuando falta una imagen hay un estado dibujado a
  propósito (sección 6), no un hueco.

---

## 2. Color — tema oscuro (el principal)

| Token | Valor | Para qué |
|---|---|---|
| `background` | `#000000` | Negro real. |
| `surface` | `#0E090C` | Tarjetas. Siempre con borde `line`, nunca con sombra. |
| `text` | `#FFFFFF` | Títulos, valores, la fila que estás mirando. |
| `textMuted` | `#A08B96` | Cuerpo, ejercicios que todavía no tocaste. |
| `textLabel` | `#8B7580` | Etiquetas en mayúsculas. |
| `textFaint` | `#6A5A63` | Valores sin cargar, contadores en cero. |
| `line` | `#241C21` | Bordes de tarjeta y separadores. |
| `accent` | `#E8215E` | Texto, íconos y bordes de acento **sobre negro**. |
| `accentFill` | `#C41450` | **Relleno** de bloques con texto blanco encima. |
| `accentDeep` | `#7A0E3C` | Extremo oscuro del degradado; texto sobre píldoras blancas. |
| `onAccent` | `#FFFFFF` | Texto dentro de los bloques de acento. |
| `empty` | `#4A3E45` | Íconos en contorno del estado sin imagen y sin video. |

**`accent` y `accentFill` no son intercambiables.** `#E8215E` brilla como texto
sobre negro pero no llega a contraste como fondo de texto blanco; `#C41450` es el
mismo tono apenas oscurecido y sí llega. Usar el primero como relleno es el error
más fácil de cometer acá.

## 3. Color — tema claro

No está diseñado. Esta dirección es oscura por definición y el negro es la mitad
del efecto: el tema claro no es un ajuste de tokens, es dibujar cada pantalla de
nuevo. Los valores claros en `tokens.ts` existen para que la app no explote si
alguien fuerza el tema, no como diseño aprobado.

---

## 4. Fotografía

Las imágenes llevan todas el mismo revelado, y eso no es opcional: son de
orígenes distintos y sin un tratamiento común se ven como un collage.

- Saturación bajada casi hasta monocromo, contraste apenas arriba, imagen
  oscurecida, y recién ahí una pizca de vino en las sombras.
- **El color lo pone el velo, no la foto.** Una imagen muy teñida se nota y
  envejece rápido.
- Los recortes van cerrados sobre el músculo, sin caras, teléfonos, logos ni
  gente de fondo. A 346 px de ancho una figura entera no se lee; un músculo sí.

El velo (`scrim` en los tokens) arranca transparente y termina en negro con algo
de vino. Es lo que hace que el texto se lea sobre **cualquier** foto sin depender
de que la imagen traiga una zona oscura.

Hay doce grupos y doce imágenes: `pecho`, `espalda`, `hombros`, `biceps`,
`triceps`, `antebrazo`, `abs`, `cuadriceps`, `femorales`, `gluteos`,
`pantorrilla`, `cardio`. Cardio es el único que muestra una actividad y no un
músculo, y está bien que así sea: lo distingue en la grilla en vez de romperla.

---

## 5. Tipografía y forma

**Archivo**, en cinco pesos (400, 500, 600, 700, 800). Hay que empaquetarla: no
viene con el sistema.

| Rol | Tamaño / tracking | Peso |
|---|---|---|
| `hero` | 36 / -1.5 (línea 38) | 800 |
| `screenTitle` | 32 / -1.3 (línea 34) | 800 |
| `sectionTitle` | 24 / -0.9 | 800 |
| `metric` | 56 / -2.6 | 800 |
| `timer` | 96 / -6 | 800 |
| `stat` | 26 / -1 | 800 |
| `cardTitle` | 16 | 700 |
| `rowTitle` | 15 | 600 |
| `body` | 15 (línea 22) | 400 |
| `label` | 11 / +1.6, MAYÚSCULAS | 600 |

Forma: radios generosos (`sm 15` · `md 18` · `lg 22` · `xl 24` · `xxl 28` ·
`pill 999`), sin sombras, gutter de 22 px. **No mezcles esquinas duras y blandas**
— eso fue exactamente lo que se veía roto en el intento anterior.

Toda superficie tocable tiene 44 px de alto como mínimo. La app se usa entre
series, con una mano y a veces sudada.

---

## 6. Las cinco reglas que sostienen esto

1. **Un solo bloque de acento por pantalla.** Marca qué está pasando *ahora*: el
   grupo recomendado, la serie en curso, el contador de descanso. Dos bloques a la
   vez y deja de significar nada.
2. **Lo que falta se escribe `—`, no se deja como campo vacío.** Un guión dice
   «todavía no»; una caja vacía dice «escribí acá» y compite con la serie activa.
3. **Nada se ve roto por falta de un asset.** Sin foto de grupo o sin video: fondo
   `surface`, ícono en contorno en `empty`, leyenda corta y, cuando hay una,
   una salida útil («¿Cómo se hace?»). El nombre va en `textLabel` y no en
   `text`, para que se lea como incompleto y no como error.
4. **Las fotos van a sangre o con radio, nunca con marco.** Nada de bordes ni
   sombras sobre una imagen.
5. **La barra de apartados solo aparece en Inicio.** El modo ejercicio y el
   descanso van sin barra a propósito: son flujos donde no querés que alguien se
   vaya a otra pantalla sin querer.

---

## 7. Lo que este documento cubre y lo que no

Están diseñadas cuatro pantallas: **inicio**, **lista del día**, **modo
ejercicio** y **descanso entre series**, más el set de doce tarjetas de grupo.

No están diseñadas: alimentación, descanso/sueño, perfil, onboarding, auth ni el
armado de rutina. Heredan color, tipografía y radios apenas cambie `tokens.ts`,
pero no los patrones de composición de la sección 6. Hasta que tengan su propio
diseño van a verse coherentes en color y algo dispares en estructura. Es un estado
intermedio aceptado a propósito, no un descuido.
