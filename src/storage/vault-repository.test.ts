import { beforeEach, describe, expect, it, vi } from 'vitest';

import { nowIso } from '@/lib/time';
import type { EncryptedRecordEnvelope, VaultMeta } from '@/types/models';

const state: {
  meta: VaultMeta | null;
  records: Map<string, EncryptedRecordEnvelope>;
} = {
  meta: null,
  records: new Map(),
};

vi.mock('@/storage/db', () => ({
  getVaultMeta: vi.fn(async () => state.meta),
  setVaultMeta: vi.fn(async (meta: VaultMeta) => {
    state.meta = meta;
  }),
  listEncryptedRecords: vi.fn(async () => [...state.records.values()]),
  putEncryptedRecord: vi.fn(async (record: EncryptedRecordEnvelope) => {
    state.records.set(record.id, record);
  }),
  putEncryptedRecords: vi.fn(async (records: EncryptedRecordEnvelope[]) => {
    for (const record of records) {
      state.records.set(record.id, record);
    }
  }),
  deleteEncryptedRecord: vi.fn(async (id: string) => {
    state.records.delete(id);
  }),
  clearVault: vi.fn(async () => {
    state.meta = null;
    state.records.clear();
  }),
}));

describe('vault repository', () => {
  beforeEach(() => {
    state.meta = null;
    state.records.clear();

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          persist: vi.fn(async () => true),
        },
      },
      configurable: true,
    });
  });

  it('creates, unlocks, exports, and re-imports a password vault', async () => {
    const repository = await import('@/storage/vault-repository');
    const password = 'correct horse battery staple';
    const created = await repository.createPasswordVault(password);
    const seeded = await repository.seedInitialVaultState(created.rawKeyBytes, {
      intentionStatement: 'Take a beat before I light up.',
      intentionMotivation: 'I want calmer evenings.',
      weeklyTargetHits: 12,
      baselineDays: 7,
      theme: 'dark',
    });

    await repository.saveEntry(created.rawKeyBytes, {
      id: 'entry-1',
      occurredAt: nowIso(),
      type: 'flower',
      alone: true,
      amountHits: 2,
      note: 'Evening reset',
      intentionId: seeded.intentionPlan?.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const unlocked = await repository.unlockVault(created.meta, password);
    const snapshot = await repository.loadVaultSnapshot(unlocked);

    expect(snapshot.entries).toHaveLength(1);
    expect(snapshot.preferences.theme).toBe('dark');

    const backup = await repository.exportBackupEnvelope();

    await repository.resetStoredVault();
    expect(await repository.loadVaultMeta()).toBeNull();

    await repository.importBackupEnvelope(backup);

    const restoredMeta = await repository.loadVaultMeta();
    expect(restoredMeta).not.toBeNull();

    const restoredKey = await repository.unlockVault(restoredMeta!, password);
    const restoredSnapshot = await repository.loadVaultSnapshot(restoredKey);

    expect(restoredSnapshot.entries[0]?.note).toBe('Evening reset');
    expect(restoredSnapshot.goalPlan?.weeklyTargetHits).toBe(12);
  });
});
