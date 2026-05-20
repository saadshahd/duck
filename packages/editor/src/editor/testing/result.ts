import { expect } from "bun:test";
import type { Result } from "neverthrow";

export const expectOk = <T, E>(result: Result<T, E>): T => {
  expect(result.isOk()).toBe(true);
  return result._unsafeUnwrap();
};

export const expectErr = <T, E>(result: Result<T, E>): E => {
  expect(result.isErr()).toBe(true);
  return result._unsafeUnwrapErr();
};
