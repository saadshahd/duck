// Real MCP agent for the demo video's live-edit beat.
//
// Spawns the Duck mcp-server as a stdio subprocess (bridge on a fixed port so
// the browser wrapper at :5173 auto-connects) and drives it through the same
// MCP client SDK an AI agent would use. Nothing is staged: editor_apply
// streams the draft over the bridge, editor_commit promotes it as a labeled
// history entry the designer can Cmd+Z.
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const REPO_ROOT = new URL("../../", import.meta.url).pathname;

export type Agent = {
  apply(page: string, ops: unknown[]): Promise<unknown>;
  commit(page: string, label?: string): Promise<unknown>;
  discard(page: string): Promise<unknown>;
  close(): Promise<void>;
};

export const connectAgent = async (opts: {
  projectDir: string;
  bridgePort: number;
}): Promise<Agent> => {
  const transport = new StdioClientTransport({
    command: "bun",
    args: [
      "run",
      "packages/mcp-server/src/index.ts",
      "--project-dir",
      opts.projectDir,
    ],
    cwd: REPO_ROOT,
    env: { ...process.env, BRIDGE_PORT: String(opts.bridgePort) },
    stderr: "pipe",
  });
  const client = new Client({ name: "demo-video-agent", version: "0.0.1" });
  await client.connect(transport);

  const call = async (name: string, args: Record<string, unknown>) => {
    const res = await client.callTool({ name, arguments: args });
    const text = (res.content as Array<{ type: string; text?: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text)
      .join("\n");
    if (res.isError) throw new Error(`${name} failed: ${text}`);
    return text;
  };

  return {
    apply: (page, ops) => call("editor_apply", { page, ops }),
    commit: (page, label) => call("editor_commit", { page, label }),
    discard: (page) => call("editor_discard", { page }),
    close: () => client.close(),
  };
};
