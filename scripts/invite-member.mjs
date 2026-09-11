#!/usr/bin/env node
// Da de alta un socio nuevo: crea su cuenta ya activa y muestra una contraseña temporal
// para que el dueño se la pase por WhatsApp o en persona.
//
// Uso:  pnpm invite-member socio@correo.com
//
// LA SERVICE_ROLE KEY NO VA EN LA APP NI EN EL REPO. Se salta TODAS las políticas RLS:
// con ella cualquiera lee y escribe los datos de cualquier socio. Por eso:
//   - este script vive fuera de apps/mobile/, así Expo nunca lo empaqueta;
//   - la clave se lee de SUPABASE_SERVICE_ROLE_KEY (del entorno, o de un .env.admin en
//     la raíz que .gitignore ya excluye por el patrón `.env.*`);
//   - el nombre NO lleva el prefijo EXPO_PUBLIC_, que es justo lo que Expo mete en el
//     bundle. Si alguna vez aparece una EXPO_PUBLIC_SERVICE_ROLE..., está mal;
//   - el script no la imprime nunca, ni siquiera en los errores.
//
// Cómo conseguirla: Supabase Dashboard -> Project Settings -> API -> service_role.
// Si se filtra, se rota desde ahí mismo.
//
// No usa @supabase/supabase-js a propósito: esa dependencia vive en apps/mobile y acá
// alcanza con fetch contra la API de admin, igual que scripts/verify-rls-isolation.mjs.

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

// El entorno manda sobre el archivo: permite `SUPABASE_SERVICE_ROLE_KEY=... pnpm invite-member ...`
// sin dejar la clave escrita en ningún lado.
const fileEnv = { ...loadEnvFile(path.join(ROOT, 'apps/mobile/.env')), ...loadEnvFile(path.join(ROOT, '.env.admin')) };
const readEnv = (name) => process.env[name] || fileEnv[name];

const SUPABASE_URL = readEnv('SUPABASE_URL') || readEnv('EXPO_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = readEnv('SUPABASE_SERVICE_ROLE_KEY');

/** Longitud cómoda de dictar por teléfono y muy por encima del mínimo de 6 de la app. */
const PASSWORD_LENGTH = 14;
// Sin caracteres ambiguos (O/0, l/I/1) porque esta contraseña se dicta o se copia a mano.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function fail(message) {
  console.error(`\n✗ ${message}\n`);
  process.exit(1);
}

/**
 * Contraseña con crypto, no con Math.random: Math.random es predecible y esto es la
 * única credencial del socio hasta que la cambie.
 */
function generatePassword() {
  let password = '';
  for (let i = 0; i < PASSWORD_LENGTH; i += 1) password += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return password;
}

/**
 * Detecta si la clave es la pública en vez de la secreta, que es el error más fácil de
 * cometer. Devuelve el nombre del rol si lo puede saber, o null si no.
 *
 * Hay dos formatos en circulación y este proyecto usa el nuevo: las claves nuevas se
 * reconocen por el prefijo (`sb_publishable_` / `sb_secret_`), y las viejas son JWT que
 * llevan el rol en el payload. Se contemplan los dos porque un proyecto puede tener aún
 * las viejas. Solo se lee el rol; la clave no se imprime ni se registra en ningún lado.
 */
function describeKeyRole(key) {
  if (key.startsWith('sb_publishable_')) return 'publishable (la pública de la app)';
  if (key.startsWith('sb_secret_')) return null; // es la correcta

  const parts = key.split('.');
  if (parts.length !== 3) return null;
  try {
    const role = JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role ?? null;
    return role === 'service_role' ? null : role;
  } catch {
    return null;
  }
}

async function main() {
  const email = (process.argv[2] ?? '').trim().toLowerCase();

  if (!email) fail('Falta el correo.\n  Uso: pnpm invite-member socio@correo.com');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(`"${email}" no parece un correo válido.`);
  if (!SUPABASE_URL) fail('Falta SUPABASE_URL (o EXPO_PUBLIC_SUPABASE_URL en apps/mobile/.env).');
  if (!SERVICE_ROLE_KEY) {
    fail(
      'Falta SUPABASE_SERVICE_ROLE_KEY.\n'
      + '  Está en Supabase Dashboard -> Project Settings -> API -> service_role.\n'
      + '  Pasala solo por entorno o por un .env.admin en la raíz (que git ignora):\n'
      + '    SUPABASE_SERVICE_ROLE_KEY=... pnpm invite-member socio@correo.com'
    );
  }

  const wrongRole = describeKeyRole(SERVICE_ROLE_KEY);
  if (wrongRole) {
    fail(`La clave que pasaste es la ${wrongRole}, no la service_role. Con esa no se pueden crear cuentas.\n  La correcta está en Project Settings -> API -> service_role (empieza con "sb_secret_").`);
  }

  const password = generatePassword();

  // email_confirm: true deja la cuenta activa al instante. Es deliberado: la contraseña
  // se entrega en mano, así que no hay ningún correo de confirmación que esperar.
  const response = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password, email_confirm: true })
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const code = body.error_code ?? body.code ?? '';
    if (response.status === 422 || String(code).includes('exists')) {
      fail(`Ya existe una cuenta con ${email}. No se creó nada ni se cambió la contraseña de la cuenta que ya estaba.`);
    }
    if (response.status === 401 || response.status === 403) {
      fail('Supabase rechazó la clave (401/403). Revisá que sea la service_role vigente y que no se haya rotado.');
    }
    fail(`Supabase respondió ${response.status}: ${body.msg ?? body.message ?? 'error desconocido'}`);
  }

  console.log(`
✓ Cuenta creada y activa

  Correo:      ${email}
  Contraseña:  ${password}

  Pasale las dos cosas al socio por WhatsApp o en persona.
  Con eso ya puede iniciar sesión en la app; no hay ningún correo que confirmar.
`);
}

main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
