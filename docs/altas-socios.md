# Dar de alta a un socio

El registro de la app es **cerrado**: nadie se crea una cuenta solo. La app solo ofrece
iniciar sesión, y las altas las hace el dueño, una por una, con este script.

## Cómo se da un alta

```bash
SUPABASE_SERVICE_ROLE_KEY=... pnpm invite-member socio@correo.com
```

Devuelve algo así:

```
✓ Cuenta creada y activa

  Correo:      socio@correo.com
  Contraseña:  Kp7mQr4tXw9bNh

  Pasale las dos cosas al socio por WhatsApp o en persona.
  Con eso ya puede iniciar sesión en la app; no hay ningún correo que confirmar.
```

Se le pasan el correo y la contraseña **directo, por WhatsApp o en persona**. No se manda
ningún correo a propósito: así el alta no depende de que el mensaje llegue, de que no
caiga en spam, ni de que el socio revise su bandeja estando en el gimnasio. La cuenta
queda activa en el momento (`email_confirm: true`).

Si preferís no escribir la clave en cada comando, poné un archivo `.env.admin` en la raíz
del repo con `SUPABASE_SERVICE_ROLE_KEY=...`. **`git` ya lo ignora** por el patrón
`.env.*` del `.gitignore`.

## La clave service_role

Está en Supabase Dashboard → Project Settings → API → `service_role`. En este proyecto
empieza con `sb_secret_`; la pública que usa la app empieza con `sb_publishable_`. Si
pegás la pública por error, el script lo detecta y se detiene antes de llamar a Supabase.

**Se salta todas las políticas RLS.** Con esa clave, cualquiera lee y escribe los datos
de cualquier socio: entrenamientos, comidas, peso, todo. Es lo contrario de la clave
`anon` que usa la app, que sí queda limitada por RLS a los datos de quien inicia sesión.

Por eso:

- **Nunca va en `apps/mobile/`.** Ni en su `.env`, ni en el código. Expo empaqueta en la
  app todo lo que empiece con `EXPO_PUBLIC_`, así que una variable llamada
  `EXPO_PUBLIC_SERVICE_ROLE_...` terminaría dentro del APK, donde cualquiera la puede
  leer. Este script usa `SUPABASE_SERVICE_ROLE_KEY`, sin ese prefijo y fuera de la app.
- **Nunca se commitea.** El script no la imprime nunca, ni siquiera cuando falla.
- Si se filtra, se rota desde esa misma pantalla del dashboard. Rotar la invalida al
  instante: las altas viejas siguen funcionando, solo hay que actualizar la clave local.

## Errores que vas a ver

| Qué pasó | Qué hacer |
|---|---|
| `Ya existe una cuenta con ...` | Ese correo ya está dado de alta. No se creó nada ni se cambió la contraseña de la cuenta que ya estaba. Si el socio la perdió, hay que resetearla desde el dashboard |
| `La clave que pasaste es la publishable...` | Pegaste la clave pública de la app (`sb_publishable_...`). La que sirve empieza con `sb_secret_`. El script lo detecta antes de llamar a Supabase |
| `Supabase rechazó la clave (401/403)` | La clave está mal o se rotó. Copiala de nuevo del dashboard |
| `Falta SUPABASE_SERVICE_ROLE_KEY` | No está en el entorno ni en `.env.admin` |

## Lo que este script no hace

- **No cambia contraseñas** de cuentas que ya existen. Correrlo dos veces con el mismo
  correo falla a propósito, para no pisar el acceso de alguien que ya está entrenando.
- **No borra cuentas.** Eso sigue siendo del dashboard.
- **No toca RLS ni el esquema.** Solo crea el usuario en `auth.users`; el perfil lo llena
  el propio socio en el onboarding la primera vez que entra.
