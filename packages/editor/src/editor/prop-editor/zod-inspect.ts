import type { ZodTypeAny } from "zod";
import {
  ZodString,
  ZodNumber,
  ZodBoolean,
  ZodEnum,
  ZodObject,
  ZodRecord,
  ZodArray,
  ZodOptional,
  ZodDefault,
  ZodNullable,
} from "zod";

// --- Thin helpers over Zod v4 public API ---
// Uses instanceof, .unwrap(), .shape, .options — no _def access.

/** Peel off optional / default / nullable wrappers to get the core type. */
export const unwrap = (schema: ZodTypeAny): ZodTypeAny =>
  schema instanceof ZodOptional ||
  schema instanceof ZodDefault ||
  schema instanceof ZodNullable
    ? unwrap((schema as ZodOptional<ZodTypeAny>).unwrap())
    : schema;

export const isString = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodString;
export const isEnum = (s: ZodTypeAny): boolean => unwrap(s) instanceof ZodEnum;
export const isNumber = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodNumber;
export const isBoolean = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodBoolean;
export const isObject = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodObject;
export const isRecord = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodRecord;
export const isArray = (s: ZodTypeAny): boolean =>
  unwrap(s) instanceof ZodArray;

export const isOptional = (s: ZodTypeAny): boolean =>
  s instanceof ZodOptional || s instanceof ZodDefault;

/** Enum option values (unwraps wrappers first). */
export const enumValues = (s: ZodTypeAny): string[] => {
  const inner = unwrap(s);
  return inner instanceof ZodEnum ? [...(inner.options as string[])] : [];
};

/** Property entries from a ZodObject (unwraps wrappers first). */
export const shapeEntries = (s: ZodTypeAny): [string, ZodTypeAny][] => {
  const inner = unwrap(s);
  return inner instanceof ZodObject
    ? Object.entries((inner as ZodObject).shape as Record<string, ZodTypeAny>)
    : [];
};
