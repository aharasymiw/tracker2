import { randomBytes, toUtf8Bytes } from '@/lib/encoding';

interface EstimateIterationsOptions {
  probeIterations: number;
  durationMs: number;
  targetMs?: number;
  minIterations?: number;
  maxIterations?: number;
}

export function estimateIterationsFromProbe({
  probeIterations,
  durationMs,
  targetMs = 250,
  minIterations = 250_000,
  maxIterations = 900_000,
}: EstimateIterationsOptions) {
  const safeDuration = Math.max(durationMs, 1);
  const projected = Math.round((targetMs / safeDuration) * probeIterations);

  return Math.min(Math.max(projected, minIterations), maxIterations);
}

async function importPasswordKey(password: string) {
  return crypto.subtle.importKey(
    'raw',
    new Uint8Array(toUtf8Bytes(password)),
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits'],
  );
}

export async function calibratePbkdf2Iterations(password: string) {
  const probeIterations = 150_000;
  const salt = randomBytes(16);
  const passwordKey = await importPasswordKey(password);
  const start = performance.now();

  await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      iterations: probeIterations,
    },
    passwordKey,
    256,
  );

  const elapsed = performance.now() - start;

  return estimateIterationsFromProbe({
    probeIterations,
    durationMs: elapsed,
  });
}

export async function derivePasswordWrappingKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
) {
  const passwordKey = await importPasswordKey(password);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: new Uint8Array(salt),
      iterations,
    },
    passwordKey,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  );
}
