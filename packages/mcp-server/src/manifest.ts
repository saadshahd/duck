import { Effect } from "effect";
import type { Catalog } from "@json-render/core";
import { NotFound, QueryError } from "./errors.js";

type ManifestArgs = {
  readonly what: string;
  readonly componentType?: string;
};

const components = (catalog: Catalog) =>
  Effect.succeed({
    components: catalog.componentNames.map((name) => {
      const def = (catalog.data as any).components[name];
      return {
        name,
        description: def.description ?? "",
        hasSlots: Array.isArray(def.slots) && def.slots.length > 0,
      };
    }),
    actions: catalog.actionNames,
  });

const component = (catalog: Catalog, componentType: string) => {
  const def = (catalog.data as any).components[componentType];
  if (!def)
    return Effect.fail(
      new NotFound({ entity: "component", key: componentType }),
    );

  return Effect.succeed({
    name: componentType,
    description: def.description ?? "",
    slots: def.slots ?? [],
    props: def.props.toJSONSchema(),
  });
};

const prompt = (catalog: Catalog) =>
  Effect.succeed({ prompt: catalog.prompt() });

const requireParam = (
  value: string | undefined,
  name: string,
): Effect.Effect<string, QueryError> =>
  value
    ? Effect.succeed(value)
    : Effect.fail(
        new QueryError({ message: `${name} is required for this query mode` }),
      );

type Handler = (
  catalog: Catalog,
  args: ManifestArgs,
) => Effect.Effect<unknown, NotFound | QueryError>;

const modes: Record<string, Handler> = {
  components: (catalog) => components(catalog),
  component: (catalog, args) =>
    requireParam(args.componentType, "componentType").pipe(
      Effect.andThen((t) => component(catalog, t)),
    ),
  prompt: (catalog) => prompt(catalog),
};

export const dispatchManifest = (
  catalog: Catalog,
  args: ManifestArgs,
): Effect.Effect<unknown, NotFound | QueryError> =>
  (
    modes[args.what] ??
    (() =>
      Effect.fail(
        new QueryError({ message: `Unknown manifest mode: ${args.what}` }),
      ))
  )(catalog, args);
