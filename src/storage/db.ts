import { openDB, type DBSchema } from 'idb';

import { type EncryptedRecordEnvelope, type VaultMeta } from '@/types/models';

const DB_NAME = 'kindred-vault';
const DB_VERSION = 1;
const META_STORE = 'metadata';
const RECORD_STORE = 'records';
const VAULT_META_KEY = 'vault-meta';

interface KindredDbSchema extends DBSchema {
  metadata: {
    key: string;
    value: VaultMeta;
  };
  records: {
    key: string;
    value: EncryptedRecordEnvelope;
  };
}

async function openKindredDb() {
  return openDB<KindredDbSchema>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(META_STORE)) {
        database.createObjectStore(META_STORE);
      }

      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        database.createObjectStore(RECORD_STORE, { keyPath: 'id' });
      }
    },
  });
}

export async function getVaultMeta() {
  const database = await openKindredDb();
  return database.get(META_STORE, VAULT_META_KEY);
}

export async function setVaultMeta(vaultMeta: VaultMeta) {
  const database = await openKindredDb();
  return database.put(META_STORE, vaultMeta, VAULT_META_KEY);
}

export async function listEncryptedRecords() {
  const database = await openKindredDb();
  return database.getAll(RECORD_STORE);
}

export async function putEncryptedRecord(record: EncryptedRecordEnvelope) {
  const database = await openKindredDb();
  return database.put(RECORD_STORE, record);
}

export async function putEncryptedRecords(records: EncryptedRecordEnvelope[]) {
  const database = await openKindredDb();
  const tx = database.transaction(RECORD_STORE, 'readwrite');

  for (const record of records) {
    await tx.store.put(record);
  }

  await tx.done;
}

export async function deleteEncryptedRecord(id: string) {
  const database = await openKindredDb();
  return database.delete(RECORD_STORE, id);
}

export async function clearVault() {
  const database = await openKindredDb();
  const tx = database.transaction([META_STORE, RECORD_STORE], 'readwrite');
  await tx.objectStore(META_STORE).clear();
  await tx.objectStore(RECORD_STORE).clear();
  await tx.done;
}
