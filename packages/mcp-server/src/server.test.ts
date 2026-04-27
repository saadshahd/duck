import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Config, Data } from "@puckeditor/core";
import { createMcpServer } from "./server.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";

const testConfig = {
  components: {
    Box: {
      defaultProps: {},
      fields: { children: { type: "slot" } },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
  },
} as unknown as Config;

const makeData = (componentCount = 2): Data => ({
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "root",
        children: Array.from({ length: componentCount - 1 }, (_, i) => ({
          type: "Text",
          props: { id: `el-${i}`, text: `Item ${i}` },
        })),
      },
    },
  ],
});

const setup = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-server-test-"));
  const bridge = createBridge();
  await bridge.start();

  const connectClient = async () => {
    const mcp = createMcpServer({
      storage: createFileStorage(tmpDir),
      config: testConfig,
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
  data: Data,
  draft?: Data,
) => {
  const pageDir = path.join(tmpDir, "pages", name);
  await fs.mkdir(pageDir, { recursive: true });
  await fs.writeFile(path.join(pageDir, "data.json"), JSON.stringify(data));
  if (draft)
    await fs.writeFile(
      path.join(pageDir, "data.draft.json"),
      JSON.stringify(draft),
    );
};

const callTool = async (
  client: Client,
  name: string,
  args: Record<string, unknown> = {},
) => {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as Array<{ type: string; text: string }>)[0]
    .text;
  return { data: JSON.parse(text), isError: result.isError };
};

const readDataFile = (tmpDir: string, page: string) =>
  fs
    .readFile(path.join(tmpDir, "pages", page, "data.json"), "utf-8")
    .then(JSON.parse);

const draftExists = (tmpDir: string, page: string) =>
  fs
    .access(path.join(tmpDir, "pages", page, "data.draft.json"))
    .then(() => true)
    .catch(() => false);

const connectAndReady = async (port: number, page: string) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });
  ws.send(JSON.stringify({ type: "ready", page }));
  await Bun.sleep(20);
  return ws;
};

describe("editor_status", () => {
  it("returns empty pages and viewers for a fresh project", async () => {
    const { bridge, connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_status",
      );
      expect(isError).toBeUndefined();
      expect(data).toEqual({
        pages: [],
        bridge: { port: bridge.port, viewers: {} },
      });
    } finally {
      await teardown();
    }
  });

  it("returns pages with component counts", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(3));
      await writePage(tmpDir, "about", makeData(5));

      const { data } = await callTool(await connectClient(), "editor_status");
      const sorted = data.pages.sort(
        (a: { name: string }, b: { name: string }) =>
          a.name.localeCompare(b.name),
      );

      expect(sorted).toEqual([
        { name: "about", componentCount: 5, hasDraft: false },
        { name: "landing", componentCount: 3, hasDraft: false },
      ]);
    } finally {
      await teardown();
    }
  });

  it("reports hasDraft when draft exists", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(2), makeData(4));

      const { data } = await callTool(await connectClient(), "editor_status");

      expect(data.pages).toEqual([
        { name: "landing", componentCount: 2, hasDraft: true },
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

      const { data } = await callTool(await connectClient(), "editor_status");

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

describe("editor_commit", () => {
  it("promotes draft to committed data", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      const original = makeData(2);
      const draft = makeData(4);
      await writePage(tmpDir, "landing", original, draft);

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_commit", {
        page: "landing",
      });

      expect(isError).toBeUndefined();
      expect(data).toEqual({
        committed: true,
        page: "landing",
        componentCount: 4,
      });

      const committed = await readDataFile(tmpDir, "landing");
      expect(committed).toEqual(draft);
      expect(await draftExists(tmpDir, "landing")).toBe(false);
    } finally {
      await teardown();
    }
  });

  it("broadcasts spec-update to connected viewers", async () => {
    const { tmpDir, bridge, connectClient, teardown } = await setup();
    try {
      const draft = makeData(3);
      await writePage(tmpDir, "landing", makeData(2), draft);

      const ws = await connectAndReady(bridge.port, "landing");
      const messages: unknown[] = [];
      ws.onmessage = (e) => messages.push(JSON.parse(e.data as string));

      const client = await connectClient();
      await callTool(client, "editor_commit", { page: "landing" });
      await Bun.sleep(50);

      expect(messages).toEqual([{ type: "spec-update", data: draft }]);

      ws.close();
    } finally {
      await teardown();
    }
  });

  it("returns NotFound when no draft exists", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(2));

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_commit", {
        page: "landing",
      });

      expect(isError).toBe(true);
      expect(data.error).toBe("NotFound");
    } finally {
      await teardown();
    }
  });
});

describe("editor_discard", () => {
  it("deletes draft and leaves committed data intact", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      const original = makeData(2);
      await writePage(tmpDir, "landing", original, makeData(5));

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_discard", {
        page: "landing",
      });

      expect(isError).toBeUndefined();
      expect(data).toEqual({ discarded: true, page: "landing" });

      expect(await draftExists(tmpDir, "landing")).toBe(false);
      const committed = await readDataFile(tmpDir, "landing");
      expect(committed).toEqual(original);
    } finally {
      await teardown();
    }
  });

  it("succeeds when no draft exists (idempotent)", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(2));

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_discard", {
        page: "landing",
      });

      expect(isError).toBeUndefined();
      expect(data).toEqual({ discarded: true, page: "landing" });
    } finally {
      await teardown();
    }
  });
});

describe("editor_apply", () => {
  it("applies an update op via tool call", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(2));
      const client = await connectClient();

      const { data, isError } = await callTool(client, "editor_apply", {
        page: "landing",
        ops: [{ op: "update", id: "el-0", props: { text: "Updated" } }],
      });

      expect(isError).toBeUndefined();
      expect(data.ok).toBe(true);
    } finally {
      await teardown();
    }
  });

  it("returns ok:false on op failure", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeData(2));
      const client = await connectClient();

      const { data } = await callTool(client, "editor_apply", {
        page: "landing",
        ops: [{ op: "remove", id: "missing-id" }],
      });

      expect(data.ok).toBe(false);
      expect(data.failedOpIndex).toBe(0);
      expect(data.error.tag).toBe("element-not-found");
    } finally {
      await teardown();
    }
  });
});

describe("editor_manifest", () => {
  it("lists components", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_manifest",
        { what: "components" },
      );
      expect(isError).toBeUndefined();
      const names = (data.components as Array<{ name: string }>).map(
        (c) => c.name,
      );
      expect(names.sort()).toEqual(["Box", "Text"]);
    } finally {
      await teardown();
    }
  });

  it("returns single component schema", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_manifest",
        { what: "component", componentType: "Text" },
      );
      expect(isError).toBeUndefined();
      expect(data.name).toBe("Text");
      expect(data.fields).toHaveProperty("text");
    } finally {
      await teardown();
    }
  });

  it("returns NotFound for unknown component", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_manifest",
        { what: "component", componentType: "DoesNotExist" },
      );
      expect(isError).toBe(true);
      expect(data.error).toBe("NotFound");
    } finally {
      await teardown();
    }
  });

  it("returns full prompt", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_manifest",
        { what: "prompt" },
      );
      expect(isError).toBeUndefined();
      expect(typeof data.prompt).toBe("string");
      expect(data.prompt.length).toBeGreaterThan(0);
    } finally {
      await teardown();
    }
  });
});
