-- Operación de medios para el primer lote de vídeos de técnica.
-- Las URLs siguen en public.exercises: cada ejercicio tiene un solo clip canónico.

alter table public.exercises
  add column if not exists media_status text not null default 'pending'
    check (media_status in ('pending', 'ready', 'rejected')),
  add column if not exists media_priority smallint
    check (media_priority between 1 and 99),
  add column if not exists media_version text
    check (char_length(media_version) between 1 and 40),
  add column if not exists media_license text
    check (char_length(media_license) between 1 and 120),
  add column if not exists media_attribution text
    check (char_length(media_attribution) between 1 and 500),
  add column if not exists media_source_url text
    check (media_source_url is null or media_source_url ~ '^https://');

-- Un clip listo debe poder reproducirse sin pantalla vacía y tener crédito verificable.
alter table public.exercises
  drop constraint if exists exercises_ready_media_is_complete;

alter table public.exercises
  add constraint exercises_ready_media_is_complete check (
    media_status <> 'ready'
    or (
      media_video_url is not null
      and media_poster_url is not null
      and media_license is not null
      and media_attribution is not null
    )
  );

comment on column public.exercises.media_status is
  'pending: seleccionado pero sin aprobar; ready: clip, póster y atribución verificados; rejected: no usar.';
comment on column public.exercises.media_priority is
  'Orden operativo del lote de medios; 1 es la primera demostración que se debe producir.';
comment on column public.exercises.media_version is
  'Versión inmutable del recurso, por ejemplo v1. Cambiarla al sustituir un archivo cacheado.';
comment on column public.exercises.media_license is
  'Licencia verificable del vídeo y su póster, por ejemplo CC-BY-SA-4.0 o Todos los derechos reservados.';
comment on column public.exercises.media_attribution is
  'Texto de crédito que se muestra en la pantalla de fuentes de la aplicación.';
comment on column public.exercises.media_source_url is
  'URL de origen o de la licencia. Es obligatoria editorialmente para material de terceros.';

-- Lote 1: preferencias del fundador primero y, después, los patrones que más necesitan
-- una referencia visual para quien recién empieza.
with priority(slug, media_priority) as (
  values
    ('incline-dumbbell-press', 1),
    ('cable-fly', 2),
    ('pec-deck', 3),
    ('barbell-bench-press', 4),
    ('dumbbell-lateral-raise', 5),
    ('front-raise', 6),
    ('reverse-pec-deck', 7),
    ('overhead-press', 8),
    ('lat-pulldown', 9),
    ('chest-supported-row', 10),
    ('one-arm-dumbbell-row', 11),
    ('leg-press', 12),
    ('leg-extension', 13),
    ('hack-squat', 14),
    ('seated-leg-curl', 15),
    ('dumbbell-rdl', 16),
    ('hip-thrust', 17),
    ('overhead-triceps-extension', 18),
    ('rope-pushdown', 19),
    ('preacher-curl', 20),
    ('hammer-curl', 21),
    ('cable-crunch', 22),
    ('plank', 23),
    ('standing-calf-raise', 24)
)
update public.exercises as exercise
set
  media_priority = priority.media_priority,
  media_status = 'pending',
  media_is_placeholder = true,
  updated_at = now()
from priority
where exercise.slug = priority.slug;
