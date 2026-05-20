import type { ComponentData, Config, Data, Metadata } from "@puckeditor/core";
import { preOrder } from "@duckeditor/spec";

type PuckComponentConfig = NonNullable<Config["components"][string]>;

export type Resolver = NonNullable<PuckComponentConfig["resolveData"]>;
export type ResolveDataResult = Awaited<ReturnType<Resolver>>;

type ComponentConfig = PuckComponentConfig & {
  metadata?: Metadata;
};

const componentConfigFor = (
  config: Config,
  type: string,
): ComponentConfig | null =>
  (config.components[type] as ComponentConfig | undefined) ?? null;

export const resolverFor = (config: Config, type: string): Resolver | null => {
  const resolver = componentConfigFor(config, type)?.resolveData;
  return typeof resolver === "function" ? resolver : null;
};

export const componentMetadataFor = (
  config: Config,
  type: string,
): Metadata => componentConfigFor(config, type)?.metadata ?? {};

export const hasResolver = (config: Config, node: ComponentData): boolean =>
  resolverFor(config, node.type) !== null;

export const resolverIds = ({
  data,
  config,
}: {
  data: Data;
  config: Config;
}): string[] =>
  Array.from(preOrder(data), ({ component }) => component)
    .filter((component) => hasResolver(config, component))
    .map((component) => component.props.id);
