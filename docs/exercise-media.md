# Medios de referencia para ejercicios

El primer lote contiene 24 demostraciones, priorizadas en
[`media/exercise-media/manifest.json`](../media/exercise-media/manifest.json). No se
publica un vídeo hasta que la técnica, el origen y la licencia hayan sido revisados.

## Contrato de cada ejercicio

Cada slug requiere exactamente dos archivos, fuera de Git:

```text
media/exercise-media/staged/<slug>/v1.mp4
media/exercise-media/staged/<slug>/v1.webp
```

El MP4 es vertical (720 × 960), H.264, sin audio, dura 3–5 segundos y pesa como máximo
900 KB. El póster WebP tiene el mismo encuadre y pesa como máximo 120 KB. El primer
fotograma útil debe mostrar la postura de inicio: evita carteles, logos y transiciones.

El nombre contiene la versión porque los recursos se sirven con caché de un año. Si se
corrige técnica, se publica `v2.mp4` y `v2.webp`; nunca se sobrescribe `v1`.

## Revisión editorial y de licencia

Antes de marcar el recurso como `ready` en Supabase hay que guardar:

- `media_license`: licencia exacta o `Todos los derechos reservados` para producción propia.
- `media_attribution`: crédito que irá a la pantalla de fuentes.
- `media_source_url`: URL de la fuente o de la página de licencia para material de terceros.
- `media_version`: `v1`, `v2`, etc.

Para contenido de terceros, aceptar únicamente una licencia que permita el uso previsto
y conservar su atribución. No copiar ni descargar vídeos de YouTube, Instagram u otras
apps sin permiso expreso. Las imágenes generadas con IA pueden servir como arte de apoyo,
pero no como demostración técnica.

## Validación y publicación

Mientras se graba o licencia el material, ejecuta:

```bash
pnpm media:check
```

El comando valida el manifiesto y avisa por cada archivo pendiente. Justo antes de subir:

```bash
pnpm media:check --strict
```

Este segundo comando falla si falta un MP4/póster o excede el peso acordado. Si está
instalado FFmpeg, también verifica códec H.264, resolución y duración del video.

En Cloudflare R2 crea un bucket privado llamado, por ejemplo, `gym-exercise-media`; conecta
el subdominio propio `media.tudominio.com`, habilita lectura pública solo a través de ese
dominio y configura el `Cache-Control` indicado en el manifiesto. No usar `r2.dev` fuera de
pruebas. Después de subir, actualiza la fila de `public.exercises` con las dos URLs, la
versión y los datos de licencia; recién entonces cambia `media_status` a `ready` y
`media_is_placeholder` a `false`.

La migración `00017_exercise_media_pipeline.sql` contiene el orden de producción del lote;
aplíquela con `pnpm db:push` cuando la base de datos esté vinculada al proyecto de Supabase.
