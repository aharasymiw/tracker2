import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../auth/passwords.js';

const PEPPER = 'test-pepper-do-not-use-in-prod';

describe('passwords', () => {
  it('hashes and verifies a correct password', async () => {
    const hashValue = await hashPassword('correct horse battery staple', PEPPER);
    expect(hashValue).toContain('$argon2');
    const result = await verifyPassword(
      hashValue,
      'correct horse battery staple',
      PEPPER,
    );
    expect(result).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const hashValue = await hashPassword('hunter2', PEPPER);
    const result = await verifyPassword(hashValue, 'hunter3', PEPPER);
    expect(result).toBe(false);
  });

  it('rejects with wrong pepper', async () => {
    const hashValue = await hashPassword('secure', PEPPER);
    const result = await verifyPassword(hashValue, 'secure', 'different-pepper');
    expect(result).toBe(false);
  });

  it('returns false on a tampered hash rather than throwing', async () => {
    const result = await verifyPassword('not-a-valid-hash', 'anything', PEPPER);
    expect(result).toBe(false);
  });

  it('produces different hashes for the same password (random salt)', async () => {
    const a = await hashPassword('same', PEPPER);
    const b = await hashPassword('same', PEPPER);
    expect(a).not.toBe(b);
  });
});
