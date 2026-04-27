import { Effect } from "effect";
import type { Config } from "@puckeditor/core";
import { NotFound, QueryError } from "./errors.js";

type ManifestArgs = {
  readonly what: string;
  readonly componentType?: string;
};

type ComponentEntry = {
  readonly name: string;
  readonly label?: string;
  readonly fields: Record<string, unknown>;
  readonly defaultProps: Record<string, unknown>;
  readonly slots: string[];
};

const componentDef = (
  config: Config,
  name: string,
):
  | {
      label?: string;
      fields?: Record<string, { type: string }>;
      defaultProps?: Record<string, unknown>;
    }
  | undefined =>
  (
    config.components as Record<
      string,
      {
        label?: string;
        fields?: Record<string, { type: string }>;
        defaultProps?: Record<string, unknown>;
      }
    >
  )[name];

const slotKeys = (
  fields: Record<string, { type: string }> | undefined,
): string[] =>
  fields
    ? Object.entries(fields)
        .filter(([, f]) => f?.type === "slot")
        .map(([k]) => k)
    : [];

const describeComponent = (
  config: Config,
  name: string,
): ComponentEntry | null => {
  const def = componentDef(config, name);
  if (!def) return null;
  return {
    name,
    label: def.label,
    fields: (def.fields ?? {}) as Record<string, unknown>,
    defaultProps: def.defaultProps ?? {},
    slots: slotKeys(def.fields),
  };
};

const components = (config: Config) => {
  const names = Object.keys(config.components ?? {});
  return Effect.succeed({
    components: names
      .map((name) => describeComponent(config, name))
      .filter((c): c is ComponentEntry => c !== null),
  });
};

const component = (config: Config, name: string) => {
  const entry = describeComponent(config, name);
  if (!entry)
    return Effect.fail(new NotFound({ entity: "component", key: name }));
  return Effect.succeed(entry);
};

const requiredOptional = (
  fields: Record<string, { type: string }> | undefined,
) => {
  if (!fields) return { required: [], optional: [] };
  const required: string[] = [];
  const optional: string[] = [];
  for (const [key, f] of Object.entries(fields)) {
    if (f?.type === "slot") continue;
    optional.push(key);
  }
  return { required, optional };
};

const promptText = (config: Config): string => {
  const lines: string[] = [
    "# Component catalog",
    "",
    "Compose pages with editor_apply ops: add / update / remove / move.",
    "",
    "Rules:",
    "- Build one logical section per call. Verify the outline between sections before building the next.",
    "- Discover fields with editor_manifest before adding a component type.",
    '- Slots are field keys of type: "slot". Children live at component.props.<slotKey> as an array.',
    "- Top-level placement: parentId=null, slotKey=null. Nested placement: parentId=<id>, slotKey=<slotName>.",
    "",
    "## Components",
    "",
  ];
  const names = Object.keys(config.components ?? {});
  for (const name of names) {
    const def = componentDef(config, name);
    if (!def) continue;
    const slots = slotKeys(def.fields);
    const { required, optional } = requiredOptional(def.fields);
    lines.push(`### ${name}${def.label ? ` — ${def.label}` : ""}`);
    if (slots.length > 0) lines.push(`Slots: ${slots.join(", ")}`);
    if (required.length > 0)
      lines.push(`Required props: ${required.join(", ")}`);
    if (optional.length > 0)
      lines.push(`Optional props: ${optional.join(", ")}`);
    lines.push("");
  }
  return lines.join("\n");
};

const prompt = (config: Config) =>
  Effect.succeed({ prompt: promptText(config) });

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
  config: Config,
  args: ManifestArgs,
) => Effect.Effect<unknown, NotFound | QueryError>;

const modes: Record<string, Handler> = {
  components: (config) => components(config),
  component: (config, args) =>
    requireParam(args.componentType, "componentType").pipe(
      Effect.andThen((t) => component(config, t)),
    ),
  prompt: (config) => prompt(config),
};

export const dispatchManifest = (
  config: Config,
  args: ManifestArgs,
): Effect.Effect<unknown, NotFound | QueryError> =>
  (
    modes[args.what] ??
    (() =>
      Effect.fail(
        new QueryError({ message: `Unknown manifest mode: ${args.what}` }),
      ))
  )(config, args);
