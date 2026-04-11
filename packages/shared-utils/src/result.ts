/**
 * A minimal Result<T, E> discriminated union for safe error propagation without exceptions.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });

export const isOk = <T, E>(r: Result<T, E>): r is Ok<T> => r.ok;
export const isErr = <T, E>(r: Result<T, E>): r is Err<E> => !r.ok;

export const map = <T, U, E>(r: Result<T, E>, fn: (value: T) => U): Result<U, E> =>
  r.ok ? ok(fn(r.value)) : r;

export const mapErr = <T, E, F>(r: Result<T, E>, fn: (error: E) => F): Result<T, F> =>
  r.ok ? r : err(fn(r.error));

export const andThen = <T, U, E>(
  r: Result<T, E>,
  fn: (value: T) => Result<U, E>,
): Result<U, E> => (r.ok ? fn(r.value) : r);

/**
 * Unwraps an Ok value, throwing if the Result is Err.
 * Intended for tests and top-level bootstraps where a failure is unrecoverable.
 */
export const unwrap = <T, E>(r: Result<T, E>): T => {
  if (r.ok) return r.value;
  throw new Error(
    `unwrap() called on Err: ${typeof r.error === 'string' ? r.error : JSON.stringify(r.error)}`,
  );
};

export const unwrapOr = <T, E>(r: Result<T, E>, fallback: T): T =>
  r.ok ? r.value : fallback;
