import { memo } from "react";
import type { Config, Data, Metadata } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

type Props = { config: Config; data: Data; metadata?: Metadata };

export const RenderHost = memo(function RenderHost({
  config,
  data,
  metadata,
}: Props) {
  return <Render config={config} data={data} metadata={metadata} />;
});
