import { z } from 'zod';

import {
  base64ToBytes,
  bytesToBase64,
  fromUtf8Bytes,
  randomBytes,
  toUtf8Bytes,
} from '@/lib/encoding';
import { derivePasswordWrappingKey } from '@/crypto/pbkdf2';
import { type EncryptedRecordEnvelope, type WrappedKeyEnvelope } from '@/types/models';

interface CipherEnvelope {
  ivBase64: string;
  ciphertextBase64: string;
}

function toSafeBytes(bytes: Uint8Array) {
  return new Uint8Array(bytes);
}

async function importDataKey(rawKeyBytes: Uint8Array) {
  return crypto.subtle.importKey(
    'raw',
    toSafeBytes(rawKeyBytes),
    {
      name: 'AES-GCM',
    },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function generateDataKey() {
  return randomBytes(32);
}

async function encryptBytes(plaintext: Uint8Array, key: CryptoKey): Promise<CipherEnvelope> {
  const iv = randomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: toSafeBytes(iv),
    },
    key,
    toSafeBytes(plaintext),
  );

  return {
    ivBase64: bytesToBase64(iv),
    ciphertextBase64: bytesToBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptBytes(envelope: CipherEnvelope, key: CryptoKey) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: toSafeBytes(base64ToBytes(envelope.ivBase64)),
    },
    key,
    toSafeBytes(base64ToBytes(envelope.ciphertextBase64)),
  );

  return new Uint8Array(plaintext);
}

export async function encryptRecord<T>(
  id: string,
  kind: EncryptedRecordEnvelope['kind'],
  value: T,
  rawKeyBytes: Uint8Array,
): Promise<EncryptedRecordEnvelope> {
  const key = await importDataKey(rawKeyBytes);
  const envelope = await encryptBytes(toUtf8Bytes(JSON.stringify(value)), key);

  return {
    id,
    kind,
    schemaVersion: 1,
    ivBase64: envelope.ivBase64,
    ciphertextBase64: envelope.ciphertextBase64,
    updatedAt: new Date().toISOString(),
  };
}

export async function decryptRecord<T>(
  envelope: EncryptedRecordEnvelope,
  rawKeyBytes: Uint8Array,
  schema: z.ZodType<T>,
) {
  const key = await importDataKey(rawKeyBytes);
  const plaintext = await decryptBytes(envelope, key);
  const parsed = JSON.parse(fromUtf8Bytes(plaintext));

  return schema.parse(parsed);
}

export async function wrapDataKeyWithPassword(
  rawKeyBytes: Uint8Array,
  password: string,
  iterations: number,
) {
  const salt = randomBytes(16);
  const key = await derivePasswordWrappingKey(password, salt, iterations);
  const envelope = await encryptBytes(rawKeyBytes, key);

  return {
    algorithm: 'password-pbkdf2-aes-gcm',
    saltBase64: bytesToBase64(salt),
    ivBase64: envelope.ivBase64,
    ciphertextBase64: envelope.ciphertextBase64,
    iterations,
  } satisfies WrappedKeyEnvelope;
}

export async function unwrapDataKeyWithPassword(envelope: WrappedKeyEnvelope, password: string) {
  if (envelope.algorithm !== 'password-pbkdf2-aes-gcm' || !envelope.iterations) {
    throw new Error('This vault is not configured for password unlock.');
  }

  const key = await derivePasswordWrappingKey(
    password,
    base64ToBytes(envelope.saltBase64),
    envelope.iterations,
  );

  return decryptBytes(envelope, key);
}

export async function wrapDataKeyWithSecret(rawKeyBytes: Uint8Array, secret: Uint8Array) {
  const key = await importDataKey(secret);
  const salt = randomBytes(16);
  const envelope = await encryptBytes(rawKeyBytes, key);

  return {
    algorithm: 'webauthn-prf-aes-gcm',
    saltBase64: bytesToBase64(salt),
    ivBase64: envelope.ivBase64,
    ciphertextBase64: envelope.ciphertextBase64,
  } satisfies WrappedKeyEnvelope;
}

export async function unwrapDataKeyWithSecret(envelope: WrappedKeyEnvelope, secret: Uint8Array) {
  if (envelope.algorithm !== 'webauthn-prf-aes-gcm') {
    throw new Error('This vault is not configured for device unlock.');
  }

  const key = await importDataKey(secret);
  return decryptBytes(envelope, key);
}
