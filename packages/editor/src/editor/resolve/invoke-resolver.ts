import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { deepEqual } from "fast-equals";
import { fromAsyncThrowable, okAsync, ResultAsync } from "neverthrow";
import {
  componentMetadataFor,
  resolverFor,
  type ResolveDataResult,
} from "../resolve-config.js";
import type { ResolveError, ResolveTrigger } from "./types.js";

const cloneInputs = (input: {
  id: string;
  node: ComponentData;
  parent: ComponentData | null;
  lastData: ComponentData | null;
}) =>
  ResultAsync.fromThrowable(
    async () => ({
      node: structuredClone(input.node),
      parent: structuredClone(input.parent),
      lastData: structuredClone(input.lastData),
    }),
    (cause): ResolveError => ({
      kind: "unserializable-input",
      id: input.id,
      cause,
    }),
  )();

const changedProps = (
  node: ComponentData,
  lastData: ComponentData | null,
): Record<string, boolean> =>
  Object.fromEntries(
    Object.keys(node.props).map((key) => [
      key,
      !deepEqual(lastData?.props?.[key], node.props[key]),
    ]),
  );

const mergeResolved = (
  node: ComponentData,
  resolved: ResolveDataResult | null | undefined,
): ComponentData => {
  const readOnly = resolved?.readOnly ?? {};
  const next = {
    ...node,
    props: {
      ...node.props,
      ...(resolved?.props ?? {}),
    },
  } as ComponentData;

  return Object.keys(readOnly).length > 0 ? { ...next, readOnly } : next;
};

export const invokeResolver = (input: {
  config: Config;
  node: ComponentData;
  parent: ComponentData | null;
  lastData: ComponentData | null;
  metadata: Metadata;
  trigger: ResolveTrigger;
  root: Data["root"];
}) => {
  const resolver = resolverFor(input.config, input.node.type);
  if (!resolver) return okAsync<ComponentData, ResolveError>(input.node);

  const id = input.node.props.id as string;
  return cloneInputs({ ...input, id }).andThen((cloned) =>
    fromAsyncThrowable(
      async () => {
        const resolved = await resolver(cloned.node, {
          changed: changedProps(cloned.node, cloned.lastData),
          lastData: cloned.lastData,
          metadata: {
            ...(input.metadata ?? {}),
            ...componentMetadataFor(input.config, input.node.type),
          },
          trigger: input.trigger,
          parent: cloned.parent,
          root: input.root,
        });
        return mergeResolved(cloned.node, resolved);
      },
      (cause): ResolveError => ({ kind: "resolver-failed", id, cause }),
    )(),
  );
};
