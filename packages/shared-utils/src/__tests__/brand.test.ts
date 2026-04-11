import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  brand,
  toUserId,
  toCharacterId,
  toSeed,
  toTickNumber,
  type UserId,
  type CharacterId,
  type Seed,
  type TickNumber,
} from '../brand';

describe('brand', () => {
  it('brand<B>() is an identity function at runtime', () => {
    const id = toUserId('user-123');
    expect(id).toBe('user-123');
  });

  it('different brand factories are distinct at the type level', () => {
    const u: UserId = toUserId('u1');
    const c: CharacterId = toCharacterId('c1');
    expectTypeOf(u).toMatchTypeOf<UserId>();
    expectTypeOf(c).toMatchTypeOf<CharacterId>();
    // These should NOT be assignable to each other at the type level.
    // @ts-expect-error - UserId is not assignable to CharacterId
    const _x: CharacterId = u;
    // @ts-expect-error - CharacterId is not assignable to UserId
    const _y: UserId = c;
    void _x;
    void _y;
  });

  it('numeric brands (Seed, TickNumber) wrap numbers', () => {
    const s: Seed = toSeed(12345);
    const t: TickNumber = toTickNumber(0);
    expect(s).toBe(12345);
    expect(t).toBe(0);
    expectTypeOf(s).toMatchTypeOf<number>();
    expectTypeOf(t).toMatchTypeOf<number>();
  });

  it('generic brand<B>() helper can brand ad-hoc values', () => {
    type FooId = string & { readonly __foo: 'FooId' };
    const toFoo = brand<FooId>();
    const v = toFoo('foo-1');
    expect(v).toBe('foo-1');
  });
});
