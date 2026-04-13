import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { defineCatalog, type Spec } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { z } from "zod";
import { createMcpServer } from "./server.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";

const testCatalog = defineCatalog(schema, {
  components: {
    Box: {
      description: "Layout container",
      slots: ["default"],
      props: z.object({}),
    },
    Text: {
      description: "Paragraph text",
      props: z.object({ text: z.string() }),
    },
  },
  actions: {},
});

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
      catalog: testCatalog,
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

const readSpecFile = (tmpDir: string, page: string) =>
  fs
    .readFile(path.join(tmpDir, "pages", page, "spec.json"), "utf-8")
    .then(JSON.parse);

const draftExists = (tmpDir: string, page: string) =>
  fs
    .access(path.join(tmpDir, "pages", page, "spec.draft.json"))
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

// ── Tests ─────────────────────────────────────────────────────────

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

  it("returns pages with element counts", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec(3));
      await writePage(tmpDir, "about", makeSpec(5));

      const { data } = await callTool(await connectClient(), "editor_status");
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

      const { data } = await callTool(await connectClient(), "editor_status");

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

// ── editor_commit ────────────────────────────────────────────────

describe("editor_commit", () => {
  it("promotes draft to committed spec", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      const original = makeSpec(2);
      const draft = makeSpec(4);
      await writePage(tmpDir, "landing", original, draft);

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_commit", {
        page: "landing",
      });

      expect(isError).toBeUndefined();
      expect(data).toEqual({
        committed: true,
        page: "landing",
        elementCount: 4,
      });

      const committed = await readSpecFile(tmpDir, "landing");
      expect(committed).toEqual(draft);
      expect(await draftExists(tmpDir, "landing")).toBe(false);
    } finally {
      await teardown();
    }
  });

  it("broadcasts spec-update to connected viewers", async () => {
    const { tmpDir, bridge, connectClient, teardown } = await setup();
    try {
      const draft = makeSpec(3);
      await writePage(tmpDir, "landing", makeSpec(2), draft);

      const ws = await connectAndReady(bridge.port, "landing");
      const messages: unknown[] = [];
      ws.onmessage = (e) => messages.push(JSON.parse(e.data as string));

      const client = await connectClient();
      await callTool(client, "editor_commit", { page: "landing" });
      await Bun.sleep(50);

      expect(messages).toEqual([{ type: "spec-update", spec: draft }]);

      ws.close();
    } finally {
      await teardown();
    }
  });

  it("returns NotFound when no draft exists", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec(2));

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

// ── editor_discard ───────────────────────────────────────────────

describe("editor_discard", () => {
  it("deletes draft and leaves committed spec intact", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      const original = makeSpec(2);
      await writePage(tmpDir, "landing", original, makeSpec(5));

      const client = await connectClient();
      const { data, isError } = await callTool(client, "editor_discard", {
        page: "landing",
      });

      expect(isError).toBeUndefined();
      expect(data).toEqual({ discarded: true, page: "landing" });

      expect(await draftExists(tmpDir, "landing")).toBe(false);
      const committed = await readSpecFile(tmpDir, "landing");
      expect(committed).toEqual(original);
    } finally {
      await teardown();
    }
  });

  it("succeeds when no draft exists (idempotent)", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec(2));

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

// ── editor_manifest ─────────────────────────────────────────────

describe("editor_manifest", () => {
  it("lists components with descriptions", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const { data, isError } = await callTool(
        await connectClient(),
        "editor_manifest",
        { what: "components" },
      );

      expect(isError).toBeUndefined();
      expect(data).toEqual({
        components: [
          {
            name: "Box",
            description: "Layout container",
            slots: ["default"],
            props: {
              $schema: "https://json-schema.org/draft/2020-12/schema",
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
          {
            name: "Text",
            description: "Paragraph text",
            slots: [],
            props: {
              $schema: "https://json-schema.org/draft/2020-12/schema",
              type: "object",
              properties: { text: { type: "string" } },
              required: ["text"],
              additionalProperties: false,
            },
          },
        ],
        actions: [],
      });
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
      expect(data.description).toBe("Paragraph text");
      expect(data.props).toHaveProperty("properties");
      expect(data.props.properties).toHaveProperty("text");
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
