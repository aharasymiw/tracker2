import { z } from 'zod';

import {
  CURRENT_SCHEMA_VERSION,
  entryTypes,
  themePreferences,
  unlockMethods,
} from '@/types/models';

export const wrappedKeyEnvelopeSchema = z.object({
  algorithm: z.enum(['password-pbkdf2-aes-gcm', 'webauthn-prf-aes-gcm']),
  saltBase64: z.string().min(1),
  ivBase64: z.string().min(1),
  ciphertextBase64: z.string().min(1),
  iterations: z.number().int().positive().optional(),
});

export const passkeyCredentialConfigSchema = z.object({
  credentialIdBase64: z.string().min(1),
  userIdBase64: z.string().min(1),
  prfSaltBase64: z.string().min(1),
  label: z.string().min(1),
  createdAt: z.string().datetime(),
});

export const vaultMetaSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  createdAt: z.string().datetime(),
  unlockMethod: z.enum(unlockMethods),
  wrappedKey: wrappedKeyEnvelopeSchema,
  passkey: passkeyCredentialConfigSchema.optional(),
});

export const encryptedRecordEnvelopeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['entry', 'goal', 'intention', 'preferences']),
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  ivBase64: z.string().min(1),
  ciphertextBase64: z.string().min(1),
  updatedAt: z.string().datetime(),
});

export const entryRecordSchema = z.object({
  id: z.string().min(1),
  occurredAt: z.string().datetime(),
  type: z.enum(entryTypes),
  alone: z.boolean(),
  amountHits: z.number().int().min(1).max(100),
  note: z.string().trim().max(240).optional(),
  intentionId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const goalPlanSchema = z.object({
  id: z.string().min(1),
  baselineDays: z.number().int().min(7).max(90),
  weeklyTargetHits: z.number().int().min(1).max(700),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const intentionPlanSchema = z.object({
  id: z.string().min(1),
  statement: z.string().trim().min(3).max(140),
  motivation: z.string().trim().max(240).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const appPreferencesSchema = z.object({
  theme: z.enum(themePreferences),
  reducedMotion: z.boolean(),
  lastExportAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});

export const backupEnvelopeSchema = z.object({
  schemaVersion: z.literal(CURRENT_SCHEMA_VERSION),
  exportedAt: z.string().datetime(),
  vaultMeta: vaultMetaSchema,
  records: z.array(encryptedRecordEnvelopeSchema),
});
