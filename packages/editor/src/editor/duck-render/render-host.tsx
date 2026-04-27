import { memo } from "react";
import type { Config, Data } from "@puckeditor/core";
import { Render } from "@puckeditor/core";

type Props = { config: Config; data: Data };

export const RenderHost = memo(function RenderHost({ config, data }: Props) {
  return <Render config={config} data={data} />;
});
