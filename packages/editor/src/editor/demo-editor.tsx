import type { Config } from "@puckeditor/core";
import { Editor, useEditorInternals, type EditorProps } from "./editor.js";
import { useBridge } from "./bridge/use-bridge.js";
import { ConnectionDot } from "./bridge/connection-dot.js";
import { ReconnectPrompt } from "./bridge/reconnect-prompt.js";
import { useEffect, useState } from "react";

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
  const [reconnectOpen, setReconnectOpen] = useState(false);
  const { currentData, lastSelectedId, commit } = useEditorInternals();
  const { status } = useBridge({
    url,
    page: bridge.page,
    selectedId: lastSelectedId,
    currentData,
    config,
    commit,
  });

  // Deselecting closes any open reconnect prompt too — chrome never outlives
  // the selection that gated it onto the page.
  useEffect(() => {
    if (!lastSelectedId) setReconnectOpen(false);
  }, [lastSelectedId]);

  // Zero-chrome: an untouched page (nothing selected) renders no bridge
  // affordance at all, connected or not. The status dot is the sole ambient
  // signal once a selection exists — it never appears on its own initiative.
  if (!lastSelectedId) return null;

  return (
    <>
      <ConnectionDot
        status={status}
        onOpenReconnect={() => setReconnectOpen(true)}
      />
      {reconnectOpen && (
        <ReconnectPrompt
          status={status}
          currentUrl={url}
          onReconnect={(next) => {
            setUrl(next);
            setReconnectOpen(false);
          }}
          onDismiss={() => setReconnectOpen(false)}
        />
      )}
    </>
  );
}
