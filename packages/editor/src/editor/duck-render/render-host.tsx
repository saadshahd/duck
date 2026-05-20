import { memo, useMemo } from "react";
import type { Config, Data, Metadata } from "@puckeditor/core";
import { Render } from "@puckeditor/core";
import type { DuckMeta } from "@duckeditor/spec";
import { injectSlotPlaceholders } from "./inject-slot-placeholders.js";
import { withSlotPlaceholder } from "./slot-placeholder-component.js";

type Props = {
  config: Config;
  data: Data;
  metadata?: Metadata;
  meta?: DuckMeta;
};

export const RenderHost = memo(function RenderHost({
  config,
  data,
  metadata,
  meta,
}: Props) {
  const transformedData = useMemo(
    () => injectSlotPlaceholders(data, meta),
    [data, meta],
  );
  const transformedConfig = useMemo(() => withSlotPlaceholder(config), [config]);
  return (
    <Render
      config={transformedConfig}
      data={transformedData}
      metadata={metadata}
    />
  );
});
