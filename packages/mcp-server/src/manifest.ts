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
        slots: def.slots ?? [],
        props: def.props.toJSONSchema(),
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

const iterationRules = [
  "SPEC FORMAT: A Spec is { root: string, elements: Record<string, UIElement> } — a FLAT map. root is an element ID. Each UIElement is { type, props, children?: string[] } where children are IDs referencing other elements in the flat map.",
  "BUILD ITERATIVELY: One logical section per apply call. Verify the outline between sections before building the next.",
  "DISCOVER FIRST: Fetch the component list with full schemas, then query individual types as needed before using them.",
  "ONE SECTION AT A TIME: Build hero, verify. Build services, verify. Build footer, verify. Never dump an entire page in one call.",
];

const prompt = (catalog: Catalog) =>
  Effect.succeed({
    prompt: catalog.prompt({ customRules: iterationRules, mode: "inline" }),
  });

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
