import { describe, it, expect } from 'vitest';
import {
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  andThen,
  unwrap,
  unwrapOr,
  type Result,
} from '../result';

describe('Result', () => {
  it('ok() produces an Ok variant', () => {
    const r = ok(42);
    expect(r.ok).toBe(true);
    expect(isOk(r)).toBe(true);
    expect(isErr(r)).toBe(false);
    if (r.ok) expect(r.value).toBe(42);
  });

  it('err() produces an Err variant', () => {
    const r = err('boom');
    expect(r.ok).toBe(false);
    expect(isErr(r)).toBe(true);
    expect(isOk(r)).toBe(false);
    if (!r.ok) expect(r.error).toBe('boom');
  });

  it('map transforms Ok and leaves Err alone', () => {
    const good: Result<number, string> = ok(2);
    const bad: Result<number, string> = err('nope');
    expect(map(good, (n) => n * 10)).toEqual(ok(20));
    expect(map(bad, (n) => n * 10)).toEqual(err('nope'));
  });

  it('mapErr transforms Err and leaves Ok alone', () => {
    const good: Result<number, string> = ok(2);
    const bad: Result<number, string> = err('nope');
    expect(mapErr(good, (e) => `wrapped(${e})`)).toEqual(ok(2));
    expect(mapErr(bad, (e) => `wrapped(${e})`)).toEqual(err('wrapped(nope)'));
  });

  it('andThen chains Results, short-circuiting on Err', () => {
    const parse = (s: string): Result<number, string> => {
      const n = Number(s);
      return Number.isNaN(n) ? err(`not a number: ${s}`) : ok(n);
    };
    const double = (n: number): Result<number, string> => ok(n * 2);
    expect(andThen(parse('5'), double)).toEqual(ok(10));
    expect(andThen(parse('xx'), double)).toEqual(err('not a number: xx'));
  });

  it('unwrap returns the value on Ok and throws on Err', () => {
    expect(unwrap(ok('hello'))).toBe('hello');
    expect(() => unwrap(err('boom'))).toThrow(/boom/);
  });

  it('unwrapOr returns the value on Ok and the fallback on Err', () => {
    expect(unwrapOr(ok(1), 99)).toBe(1);
    expect(unwrapOr(err('x') as Result<number, string>, 99)).toBe(99);
  });
});
