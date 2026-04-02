import {
  appPreferencesSchema,
  backupEnvelopeSchema,
  encryptedRecordEnvelopeSchema,
  entryRecordSchema,
  goalPlanSchema,
  intentionPlanSchema,
  vaultMetaSchema,
} from '@/schemas/models';
import {
  clearVault,
  deleteEncryptedRecord,
  getVaultMeta,
  listEncryptedRecords,
  putEncryptedRecord,
  putEncryptedRecords,
  setVaultMeta,
} from '@/storage/db';
import { generateId } from '@/lib/encoding';
import { nowIso } from '@/lib/time';
import { calibratePbkdf2Iterations } from '@/crypto/pbkdf2';
import {
  decryptRecord,
  encryptRecord,
  generateDataKey,
  unwrapDataKeyWithPassword,
  unwrapDataKeyWithSecret,
  wrapDataKeyWithPassword,
  wrapDataKeyWithSecret,
} from '@/crypto/encryption';
import { createPasskeyBinding, unlockWithPasskey } from '@/crypto/passkey';
import {
  CURRENT_SCHEMA_VERSION,
  type AppPreferences,
  type BackupEnvelope,
  type EntryRecord,
  type GoalPlan,
  type IntentionPlan,
  type VaultMeta,
  type VaultSnapshot,
} from '@/types/models';

const GOAL_RECORD_ID = 'goal:current';
const INTENTION_RECORD_ID = 'intention:current';
const PREFERENCES_RECORD_ID = 'preferences:current';

const defaultPreferences = (): AppPreferences => ({
  theme: 'system',
  reducedMotion: false,
  updatedAt: nowIso(),
});

function createSnapshotDefaults(): VaultSnapshot {
  return {
    entries: [],
    goalPlan: null,
    intentionPlan: null,
    preferences: defaultPreferences(),
  };
}

export async function loadVaultMeta() {
  const meta = await getVaultMeta();

  return meta ? vaultMetaSchema.parse(meta) : null;
}

export async function createPasswordVault(password: string) {
  const rawKeyBytes = await generateDataKey();
  const iterations = await calibratePbkdf2Iterations(password);
  const wrappedKey = await wrapDataKeyWithPassword(rawKeyBytes, password, iterations);

  const meta: VaultMeta = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: nowIso(),
    unlockMethod: 'password',
    wrappedKey,
  };

  await setVaultMeta(meta);
  await navigator.storage.persist().catch(() => false);

  return { meta, rawKeyBytes };
}

export async function createPasskeyVault(label: string) {
  const rawKeyBytes = await generateDataKey();
  const { config, secret } = await createPasskeyBinding(label);
  const wrappedKey = await wrapDataKeyWithSecret(rawKeyBytes, secret);

  const meta: VaultMeta = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: nowIso(),
    unlockMethod: 'passkey',
    wrappedKey,
    passkey: config,
  };

  await setVaultMeta(meta);
  await navigator.storage.persist().catch(() => false);

  return { meta, rawKeyBytes };
}

export async function unlockVault(meta: VaultMeta, secret: string) {
  if (meta.unlockMethod !== 'password') {
    throw new Error('This vault expects device unlock instead of a password.');
  }

  return unwrapDataKeyWithPassword(meta.wrappedKey, secret);
}

export async function unlockVaultWithDevice(meta: VaultMeta) {
  if (!meta.passkey) {
    throw new Error('Device unlock is not configured for this vault.');
  }

  const secret = await unlockWithPasskey(meta.passkey);
  return unwrapDataKeyWithSecret(meta.wrappedKey, secret);
}

export async function loadVaultSnapshot(rawKeyBytes: Uint8Array): Promise<VaultSnapshot> {
  const records = (await listEncryptedRecords()).map((record) =>
    encryptedRecordEnvelopeSchema.parse(record),
  );

  const snapshot = createSnapshotDefaults();

  for (const record of records) {
    if (record.kind === 'entry') {
      snapshot.entries.push(await decryptRecord(record, rawKeyBytes, entryRecordSchema));
      continue;
    }

    if (record.kind === 'goal') {
      snapshot.goalPlan = await decryptRecord(record, rawKeyBytes, goalPlanSchema);
      continue;
    }

    if (record.kind === 'intention') {
      snapshot.intentionPlan = await decryptRecord(record, rawKeyBytes, intentionPlanSchema);
      continue;
    }

    snapshot.preferences = await decryptRecord(record, rawKeyBytes, appPreferencesSchema);
  }

  snapshot.entries.sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );

  return snapshot;
}

export async function saveEntry(rawKeyBytes: Uint8Array, entry: EntryRecord) {
  const parsedEntry = entryRecordSchema.parse(entry);
  const envelope = await encryptRecord(
    `entry:${parsedEntry.id}`,
    'entry',
    parsedEntry,
    rawKeyBytes,
  );

  await putEncryptedRecord(envelope);
}

export async function deleteEntry(id: string) {
  await deleteEncryptedRecord(`entry:${id}`);
}

export async function saveGoalPlan(rawKeyBytes: Uint8Array, goalPlan: GoalPlan | null) {
  if (!goalPlan) {
    await deleteEncryptedRecord(GOAL_RECORD_ID);
    return;
  }

  const envelope = await encryptRecord(
    GOAL_RECORD_ID,
    'goal',
    goalPlanSchema.parse(goalPlan),
    rawKeyBytes,
  );

  await putEncryptedRecord(envelope);
}

export async function saveIntentionPlan(rawKeyBytes: Uint8Array, intentionPlan: IntentionPlan) {
  const envelope = await encryptRecord(
    INTENTION_RECORD_ID,
    'intention',
    intentionPlanSchema.parse(intentionPlan),
    rawKeyBytes,
  );

  await putEncryptedRecord(envelope);
}

export async function savePreferences(rawKeyBytes: Uint8Array, preferences: AppPreferences) {
  const envelope = await encryptRecord(
    PREFERENCES_RECORD_ID,
    'preferences',
    appPreferencesSchema.parse(preferences),
    rawKeyBytes,
  );

  await putEncryptedRecord(envelope);
}

export async function exportBackupEnvelope() {
  const meta = await loadVaultMeta();

  if (!meta) {
    throw new Error('There is no vault to export.');
  }

  const records = await listEncryptedRecords();

  return backupEnvelopeSchema.parse({
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: nowIso(),
    vaultMeta: meta,
    records,
  } satisfies BackupEnvelope);
}

export async function importBackupEnvelope(backup: BackupEnvelope) {
  const parsedBackup = backupEnvelopeSchema.parse(backup);
  await clearVault();
  await setVaultMeta(parsedBackup.vaultMeta);
  await putEncryptedRecords(parsedBackup.records);
}

export async function resetStoredVault() {
  await clearVault();
}

export async function seedInitialVaultState(
  rawKeyBytes: Uint8Array,
  options: {
    intentionStatement: string;
    intentionMotivation?: string;
    weeklyTargetHits: number;
    baselineDays: number;
    theme: AppPreferences['theme'];
  },
) {
  const now = nowIso();
  const intentionPlan: IntentionPlan = {
    id: generateId('intention'),
    statement: options.intentionStatement,
    motivation: options.intentionMotivation,
    createdAt: now,
    updatedAt: now,
  };
  const goalPlan: GoalPlan = {
    id: generateId('goal'),
    baselineDays: options.baselineDays,
    weeklyTargetHits: options.weeklyTargetHits,
    createdAt: now,
    updatedAt: now,
  };
  const preferences: AppPreferences = {
    theme: options.theme,
    reducedMotion: false,
    updatedAt: now,
  };

  await saveIntentionPlan(rawKeyBytes, intentionPlan);
  await saveGoalPlan(rawKeyBytes, goalPlan);
  await savePreferences(rawKeyBytes, preferences);

  return {
    entries: [],
    goalPlan,
    intentionPlan,
    preferences,
  } satisfies VaultSnapshot;
}
