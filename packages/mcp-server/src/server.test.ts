import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Spec } from "@json-render/core";
import { createMcpServer } from "./server.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";

// ── Factories ─────────────────────────────────────────────────────

const makeSpec = (elementCount = 2): Spec => ({
  root: "root",
  elements: Object.fromEntries([
    [
      "root",
      {
        type: "Box",
        props: {},
        children: Array.from({ length: elementCount - 1 }, (_, i) => `el-${i}`),
      },
    ],
    ...Array.from({ length: elementCount - 1 }, (_, i) => [
      `el-${i}`,
      { type: "Text", props: { text: `Item ${i}` } },
    ]),
  ]),
});

const setup = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-server-test-"));
  const bridge = createBridge();
  await bridge.start();

  const connectClient = async () => {
    const mcp = createMcpServer({
      storage: createFileStorage(tmpDir),
      catalog: { json: {}, prompt: "" },
      bridge,
    });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "0.0.1" });
    await Promise.all([
      client.connect(clientTransport),
      mcp.connect(serverTransport),
    ]);
    return client;
  };

  const teardown = async () => {
    bridge.stop();
    await fs.rm(tmpDir, { recursive: true, force: true });
  };

  return { tmpDir, bridge, connectClient, teardown };
};

const writePage = async (
  tmpDir: string,
  name: string,
  spec: Spec,
  draft?: Spec,
) => {
  const pageDir = path.join(tmpDir, "pages", name);
  await fs.mkdir(pageDir, { recursive: true });
  await fs.writeFile(path.join(pageDir, "spec.json"), JSON.stringify(spec));
  if (draft)
    await fs.writeFile(
      path.join(pageDir, "spec.draft.json"),
      JSON.stringify(draft),
    );
};

const callStatus = async (client: Client) => {
  const result = await client.callTool({ name: "editor_status" });
  const text = (result.content as Array<{ type: string; text: string }>)[0]
    .text;
  return { data: JSON.parse(text), isError: result.isError };
};

const connectAndReady = async (port: number, page: string) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });
  ws.send(JSON.stringify({ type: "ready", page }));
  await Bun.sleep(20);
  return ws;
};

// ── Tests ─────────────────────────────────────────────────────────

describe("editor_status", () => {
  it("returns empty pages and viewers for a fresh project", async () => {
    const { bridge, connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callStatus(await connectClient());

      expect(isError).toBeUndefined();
      expect(data).toEqual({
        pages: [],
        bridge: { port: bridge.port, viewers: {} },
      });
    } finally {
      await teardown();
    }
  });

  it("returns pages with element counts", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec(3));
      await writePage(tmpDir, "about", makeSpec(5));

      const { data } = await callStatus(await connectClient());
      const sorted = data.pages.sort((a: any, b: any) =>
        a.name.localeCompare(b.name),
      );

      expect(sorted).toEqual([
        { name: "about", elementCount: 5, hasDraft: false },
        { name: "landing", elementCount: 3, hasDraft: false },
      ]);
    } finally {
      await teardown();
    }
  });

  it("reports hasDraft when draft exists", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec(2), makeSpec(4));

      const { data } = await callStatus(await connectClient());

      expect(data.pages).toEqual([
        { name: "landing", elementCount: 2, hasDraft: true },
      ]);
    } finally {
      await teardown();
    }
  });

  it("includes bridge port and real viewer counts", async () => {
    const { bridge, connectClient, teardown } = await setup();
    try {
      const ws1 = await connectAndReady(bridge.port, "landing");
      const ws2 = await connectAndReady(bridge.port, "landing");
      const ws3 = await connectAndReady(bridge.port, "about");

      const { data } = await callStatus(await connectClient());

      expect(data.bridge.port).toBe(bridge.port);
      expect(data.bridge.viewers).toEqual({ landing: 2, about: 1 });

      ws1.close();
      ws2.close();
      ws3.close();
    } finally {
      await teardown();
    }
  });
});
