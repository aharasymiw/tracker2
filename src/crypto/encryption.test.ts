import { describe, expect, it } from 'vitest';

import {
  decryptRecord,
  encryptRecord,
  generateDataKey,
  unwrapDataKeyWithPassword,
  wrapDataKeyWithPassword,
} from '@/crypto/encryption';
import { entryRecordSchema } from '@/schemas/models';
import { nowIso } from '@/lib/time';

describe('encryption helpers', () => {
  it('round-trips encrypted records', async () => {
    const rawKeyBytes = await generateDataKey();
    const now = nowIso();
    const envelope = await encryptRecord(
      'entry:test',
      'entry',
      {
        id: 'entry-test',
        occurredAt: now,
        type: 'flower',
        alone: true,
        amountHits: 2,
        note: 'Evening reset',
        createdAt: now,
        updatedAt: now,
      },
      rawKeyBytes,
    );

    const decrypted = await decryptRecord(envelope, rawKeyBytes, entryRecordSchema);

    expect(decrypted.note).toBe('Evening reset');
    expect(decrypted.amountHits).toBe(2);
  });

  it('wraps and unwraps data keys with a password', async () => {
    const rawKeyBytes = await generateDataKey();
    const envelope = await wrapDataKeyWithPassword(
      rawKeyBytes,
      'correct horse battery staple',
      250_000,
    );
    const unwrapped = await unwrapDataKeyWithPassword(envelope, 'correct horse battery staple');

    expect(Array.from(unwrapped)).toEqual(Array.from(rawKeyBytes));
  });
});
