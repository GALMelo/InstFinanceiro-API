// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Result<T, E = any> = Ok<T> | Err<E>;

export class Ok<T> {
  readonly ok = true as const;
  constructor(readonly value: T) {}
  isOk(): this is Ok<T> { return true; }
  isErr(): this is Err<never> { return false; }
}

export class Err<E> {
  readonly ok = false as const;
  constructor(readonly error: E) {}
  isOk(): this is Ok<never> { return false; }
  isErr(): this is Err<E> { return true; }
}

export const ok = <T>(value: T): Ok<T> => new Ok(value);
export const err = <E>(error: E): Err<E> => new Err(error);
