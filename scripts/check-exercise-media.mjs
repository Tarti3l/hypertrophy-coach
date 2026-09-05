import { access, readFile, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'media/exercise-media/manifest.json');
const stagedDirectory = path.join(root, 'media/exercise-media/staged');
const strict = process.argv.includes('--strict');
const execFileAsync = promisify(execFile);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const errors = [];
const warnings = [];

if (manifest.version !== 1) errors.push('El manifiesto debe usar version 1.');
if (manifest.delivery?.provider !== 'cloudflare-r2') errors.push('El proveedor debe ser cloudflare-r2.');
if (!manifest.delivery?.publicBaseUrl?.startsWith('https://')) {
  errors.push('delivery.publicBaseUrl debe usar HTTPS.');
}
if (manifest.delivery?.publicBaseUrl === 'https://media.example.com') {
  warnings.push('Aún falta reemplazar media.example.com por el subdominio de producción.');
}

const priorities = new Set();
const slugs = new Set();
const { video, poster } = manifest.assetContract ?? {};

for (const exercise of manifest.exercises ?? []) {
  if (!Number.isInteger(exercise.priority) || exercise.priority < 1 || priorities.has(exercise.priority)) {
    errors.push(`Prioridad inválida o repetida: ${exercise.slug ?? '(sin slug)'}.`);
  }
  priorities.add(exercise.priority);

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(exercise.slug ?? '') || slugs.has(exercise.slug)) {
    errors.push(`Slug inválido o repetido: ${exercise.slug ?? '(vacío)'}.`);
  }
  slugs.add(exercise.slug);

  await checkAsset(exercise.slug, `v1.${video?.extension}`, video?.maxBytes, 'vídeo', true);
  await checkAsset(exercise.slug, `v1.${poster?.extension}`, poster?.maxBytes, 'póster');
}

if (manifest.exercises?.length !== 24) {
  errors.push(`El lote inicial debe contener 24 ejercicios; hay ${manifest.exercises?.length ?? 0}.`);
}

if (errors.length > 0) {
  console.error(`Media: ${errors.length} error(es).`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log(`Media: manifiesto válido para ${manifest.exercises.length} ejercicios.`);
}

for (const warning of warnings) console.warn(`Aviso: ${warning}`);

async function checkAsset(slug, fileName, maxBytes, label, isVideo = false) {
  const filePath = path.join(stagedDirectory, slug, fileName);
  try {
    await access(filePath);
  } catch {
    const message = `${slug}: falta ${label} (${path.relative(root, filePath)}).`;
    if (strict) errors.push(message);
    else warnings.push(message);
    return;
  }

  const details = await stat(filePath);
  if (details.size > maxBytes) {
    errors.push(`${slug}: ${label} pesa ${details.size} bytes; el máximo es ${maxBytes}.`);
  }

  if (isVideo) await checkVideoSpec(slug, filePath);
}

async function checkVideoSpec(slug, filePath) {
  let metadata;

  try {
    const { stdout } = await execFileAsync('ffprobe', [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=codec_name,width,height:format=duration',
      '-of', 'json',
      filePath
    ]);
    metadata = JSON.parse(stdout);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      warnings.push('No se pudo revisar códec, duración y resolución: instala FFmpeg para disponer de ffprobe.');
      return;
    }
    errors.push(`${slug}: ffprobe no pudo leer el vídeo.`);
    return;
  }

  const stream = metadata.streams?.[0];
  const durationSeconds = Number(metadata.format?.duration);

  if (stream?.codec_name !== video.codec) {
    errors.push(`${slug}: el códec es ${stream?.codec_name ?? 'desconocido'}; se requiere ${video.codec}.`);
  }
  if (stream?.width !== video.width || stream?.height !== video.height) {
    errors.push(`${slug}: resolución ${stream?.width ?? '?'}×${stream?.height ?? '?'}; se requiere ${video.width}×${video.height}.`);
  }
  if (!Number.isFinite(durationSeconds) || durationSeconds < video.durationSeconds.min || durationSeconds > video.durationSeconds.max) {
    errors.push(`${slug}: duración ${Number.isFinite(durationSeconds) ? durationSeconds.toFixed(2) : 'desconocida'} s; se requieren ${video.durationSeconds.min}–${video.durationSeconds.max} s.`);
  }
}
