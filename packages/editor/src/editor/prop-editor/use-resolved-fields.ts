import { useEffect, useRef, useState } from "react";
import type { ComponentData, Config } from "@puckeditor/core";
import type { ResolvedFields } from "./find-editable-prop.js";

const EMPTY_FIELDS: ResolvedFields = {};

const componentEntry = (
  component: ComponentData | null,
  config: Config,
): Config["components"][string] | null => {
  if (!component) return null;
  return config.components[component.type] ?? null;
};

const staticFieldsOf = (
  entry: Config["components"][string] | null,
): ResolvedFields =>
  (entry?.fields as ResolvedFields | undefined) ?? EMPTY_FIELDS;

const diffChanged = (
  prev: Record<string, unknown> | null,
  next: Record<string, unknown>,
): Record<string, boolean> => {
  const changed: Record<string, boolean> = {};
  if (prev === null) {
    for (const key of Object.keys(next)) changed[key] = true;
    return changed;
  }
  const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
  for (const key of keys) {
    if (prev[key] !== next[key]) changed[key] = true;
  }
  return changed;
};

/**
 * Resolve fields for a component, lazily invoking `resolveFields` when present.
 *
 * Returns `pending: true` while a `resolveFields` promise is in flight; static
 * fields are shown until the first resolution completes. `lastFields` and
 * `lastData` are cached so resolvers can short-circuit on unchanged inputs.
 */
export function useResolvedFields(
  component: ComponentData | null,
  config: Config,
): { fields: ResolvedFields; pending: boolean } {
  const entry = componentEntry(component, config);
  const staticFields = staticFieldsOf(entry);

  const [fields, setFields] = useState<ResolvedFields>(staticFields);
  const [pending, setPending] = useState(false);

  const lastFieldsRef = useRef<ResolvedFields>(staticFields);
  const lastDataRef = useRef<ComponentData | null>(null);
  const lastIdRef = useRef<string | null>(null);
  const tokenRef = useRef(0);

  const id = (component?.props as { id?: string } | undefined)?.id ?? null;

  useEffect(
    function resolve() {
      if (!component || !entry) {
        lastFieldsRef.current = EMPTY_FIELDS;
        lastDataRef.current = null;
        lastIdRef.current = null;
        setFields(EMPTY_FIELDS);
        setPending(false);
        return;
      }

      const resolver = entry.resolveFields;
      if (!resolver) {
        lastFieldsRef.current = staticFields;
        lastDataRef.current = component;
        lastIdRef.current = id;
        setFields(staticFields);
        setPending(false);
        return;
      }

      const prevId = lastIdRef.current;
      const prevData = lastDataRef.current;
      const prevProps =
        prevId === id && prevData
          ? (prevData.props as Record<string, unknown>)
          : null;
      const nextProps = component.props as Record<string, unknown>;
      const propChanges = diffChanged(prevProps, nextProps);
      const changed = {
        ...propChanges,
        ...(id !== null ? { id } : {}),
      } as unknown as Parameters<NonNullable<typeof resolver>>[1]["changed"];

      const params: Parameters<NonNullable<typeof resolver>>[1] = {
        changed,
        fields: staticFields as Parameters<
          NonNullable<typeof resolver>
        >[1]["fields"],
        lastFields: lastFieldsRef.current as Parameters<
          NonNullable<typeof resolver>
        >[1]["lastFields"],
        lastData: prevData as Parameters<
          NonNullable<typeof resolver>
        >[1]["lastData"],
        metadata: {},
        appState: {} as Parameters<NonNullable<typeof resolver>>[1]["appState"],
        parent: null,
      };

      const result = resolver(
        component as Parameters<NonNullable<typeof resolver>>[0],
        params,
      );

      if (result instanceof Promise) {
        const token = ++tokenRef.current;
        setPending(true);
        result
          .then((next) => {
            if (token !== tokenRef.current) return;
            lastFieldsRef.current = next as ResolvedFields;
            lastDataRef.current = component;
            lastIdRef.current = id;
            setFields(next as ResolvedFields);
            setPending(false);
          })
          .catch(() => {
            if (token !== tokenRef.current) return;
            setPending(false);
          });
        return;
      }

      tokenRef.current++;
      lastFieldsRef.current = result as ResolvedFields;
      lastDataRef.current = component;
      lastIdRef.current = id;
      setFields(result as ResolvedFields);
      setPending(false);
    },
    [component, entry, staticFields, id],
  );

  return { fields, pending };
}
