# Imágenes del sistema visual

Reglas para que una imagen nueva no desentone con las que ya están. La dirección
está en `docs/diseno.md`, sección 4; esto es la parte operativa.

## Qué hay

- `inicio.jpg` — 780 × 744. Foto a sangre de la pantalla de inicio. Se usa con el
  velo `scrim.hero` de `theme/tokens.ts`.
- `musculos/<slug>.jpg` — 692 × 368. Tarjeta de grupo muscular, con el velo
  `scrim.card`.
- `musculos/thumb/<slug>.jpg` — 224 × 224. Miniatura de fila.

Los `<slug>` son exactamente los valores de `MuscleGroupSlug`
(`features/training/types/training.ts`): `pecho`, `espalda`, `hombros`,
`biceps`, `triceps`, `antebrazo`, `abs`, `cuadriceps`, `femorales`, `gluteos`,
`pantorrilla`, `cardio`. Están los doce. Si algún día se agrega un grupo sin
imagen, la interfaz tiene un estado dibujado para eso — no hace falta inventar
una foto.

## El revelado

Todas llevan el mismo tratamiento, y no es opcional: vienen de orígenes distintos
y sin esto se ven como un collage. Una de las originales estaba en blanco y
negro, y llevar el set casi a monocromo fue la única forma de que no se notara.

1. Saturación al 22 % de la original.
2. Contraste × 1.12.
3. Brillo × 0.82, ajustado por foto cuando el fondo venía muy claro.
4. Mezcla al 42 % con un duotono cuya rampa va de `#1A0810` en las sombras a
   `#601634` en los medios y `#F8F2F4` en las altas.
5. JPEG progresivo, calidad 76-80.

**El color lo pone el velo, no la foto.** Si una imagen se ve teñida de vino por
sí sola, está mal revelada: se nota y envejece rápido.

## Los recortes

Cerrados sobre el músculo. A 346 px de ancho una figura entera no se lee; un
músculo sí. Fuera de cuadro: caras, teléfonos, logos de marca y gente de fondo.

`cardio` es la excepción: muestra la actividad y no un músculo, y el encuadre
incluye la zancada a propósito. Sin movimiento se lee como alguien parado en una
cinta.

## Pendiente

Estos recortes están fijos a dos tamaños. Conviene guardar la versión grande de
cada foto y dejar que la app recorte, o cada cambio de medida vuelve a pasar por
un recorte manual. Está anotado como decisión abierta 2 en `docs/plan-diseno.md`.

## Permisos

**Ninguna de estas trece imágenes es propia.** Sirven para maquetar y para
revisar el diseño; no para una app instalada en el gimnasio. Son doce personas
identificables y una sala ajena. Antes de publicar hay que reemplazarlas por
fotos propias, stock con licencia, o socios que hayan firmado permiso. Está
anotado como decisión abierta 3 en `docs/plan-diseno.md`.
