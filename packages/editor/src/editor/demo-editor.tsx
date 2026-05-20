import type { Config } from "@puckeditor/core";
import { Editor, useEditorInternals, type EditorProps } from "./editor.js";
import { useBridge } from "./bridge/use-bridge.js";
import { ConnectionDot } from "./bridge/connection-dot.js";
import { ReconnectPrompt } from "./bridge/reconnect-prompt.js";
import { useState } from "react";

type BridgeConfig = { url: string; page: string };

export type DemoEditorProps<UserConfig extends Config = Config> =
  EditorProps<UserConfig> & {
    bridge?: BridgeConfig;
  };

export function DemoEditor<UserConfig extends Config = Config>({
  bridge,
  ...editorProps
}: DemoEditorProps<UserConfig>) {
  return (
    <Editor {...editorProps}>
      {bridge && (
        <BridgeConnector bridge={bridge} config={editorProps.config} />
      )}
    </Editor>
  );
}

function BridgeConnector({
  bridge,
  config,
}: {
  bridge: BridgeConfig;
  config: Config;
}) {
  const [url, setUrl] = useState(bridge.url);
  const { currentData, lastSelectedId, push, emitOp } = useEditorInternals();
  const { status } = useBridge({
    url,
    page: bridge.page,
    selectedId: lastSelectedId,
    currentData,
    config,
    push,
    emitOp,
  });

  return (
    <>
      <ConnectionDot status={status} />
      <ReconnectPrompt status={status} currentUrl={url} onReconnect={setUrl} />
    </>
  );
}
