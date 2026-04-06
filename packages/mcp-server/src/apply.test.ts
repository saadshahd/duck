import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import type { Spec } from "@json-render/core";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "./server.js";
import { createFileStorage } from "./file-storage.js";
import { createBridge } from "./bridge/index.js";

// ── Factories ─────────────────────────────────────────────────────

const makeSpec = (): Spec => ({
  root: "root",
  elements: {
    root: { type: "Box", props: { gap: 8 }, children: ["heading"] },
    heading: { type: "Text", props: { text: "Hello" } },
  },
});

const setup = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-apply-test-"));
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

  return { tmpDir, connectClient, teardown };
};

const writePage = async (tmpDir: string, name: string, spec: Spec) => {
  const pageDir = path.join(tmpDir, "pages", name);
  await fs.mkdir(pageDir, { recursive: true });
  await fs.writeFile(path.join(pageDir, "spec.json"), JSON.stringify(spec));
};

const readDraft = async (tmpDir: string, name: string): Promise<Spec> => {
  const raw = await fs.readFile(
    path.join(tmpDir, "pages", name, "spec.draft.json"),
    "utf-8",
  );
  return JSON.parse(raw);
};

const callApply = async (client: Client, page: string, patches: unknown[]) => {
  const result = await client.callTool({
    name: "editor_apply",
    arguments: { page, patches },
  });
  const text = (result.content as Array<{ type: string; text: string }>)[0]
    .text;
  return { data: JSON.parse(text), isError: result.isError };
};

// ── Tests ─────────────────────────────────────────────────────────

describe("editor_apply", () => {
  it("applies a valid patch and creates a draft", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      const { data, isError } = await callApply(client, "landing", [
        { op: "replace", path: "/elements/heading/props/text", value: "World" },
      ]);

      expect(isError).toBeUndefined();
      expect(data).toEqual({ applied: true, opCount: 1 });

      const draft = await readDraft(tmpDir, "landing");
      expect(draft.elements.heading.props.text).toBe("World");
    } finally {
      await teardown();
    }
  });

  it("applies multiple patches sequentially", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      const { data } = await callApply(client, "landing", [
        { op: "replace", path: "/elements/heading/props/text", value: "A" },
        {
          op: "add",
          path: "/elements/root/props/padding",
          value: 16,
        },
      ]);

      expect(data).toEqual({ applied: true, opCount: 2 });

      const draft = await readDraft(tmpDir, "landing");
      expect(draft.elements.heading.props.text).toBe("A");
      expect(draft.elements.root.props.padding).toBe(16);
    } finally {
      await teardown();
    }
  });

  it("returns error with failedOpIndex on invalid patch", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      const { data, isError } = await callApply(client, "landing", [
        { op: "replace", path: "/elements/heading/props/text", value: "OK" },
        { op: "test", path: "/elements/heading/props/text", value: "WRONG" },
        { op: "replace", path: "/elements/heading/props/text", value: "After" },
      ]);

      expect(isError).toBe(true);
      expect(data.error).toBe("PatchError");
      expect(data.failedOpIndex).toBe(1);
    } finally {
      await teardown();
    }
  });

  it("does not write draft when a patch fails", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      await callApply(client, "landing", [
        { op: "test", path: "/elements/heading/props/text", value: "WRONG" },
      ]);

      const draftExists = await fs
        .access(path.join(tmpDir, "pages", "landing", "spec.draft.json"))
        .then(() => true)
        .catch(() => false);

      expect(draftExists).toBe(false);
    } finally {
      await teardown();
    }
  });

  it("applies to existing draft, not committed spec", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      await callApply(client, "landing", [
        {
          op: "replace",
          path: "/elements/heading/props/text",
          value: "Draft1",
        },
      ]);
      await callApply(client, "landing", [
        { op: "add", path: "/elements/root/props/padding", value: 24 },
      ]);

      const draft = await readDraft(tmpDir, "landing");
      expect(draft.elements.heading.props.text).toBe("Draft1");
      expect(draft.elements.root.props.padding).toBe(24);
    } finally {
      await teardown();
    }
  });

  it("returns warnings for validation issues", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      const { data } = await callApply(client, "landing", [
        { op: "add", path: "/elements/heading/props/visible", value: true },
      ]);

      expect(data.applied).toBe(true);
      expect(data.warnings).toBeDefined();
      expect(data.warnings.length).toBeGreaterThan(0);
    } finally {
      await teardown();
    }
  });

  it("auto-fixes fixable issues and reports fixes", async () => {
    const { tmpDir, connectClient, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", makeSpec());
      const client = await connectClient();

      const { data } = await callApply(client, "landing", [
        { op: "add", path: "/elements/heading/props/visible", value: true },
      ]);

      expect(data.fixes).toBeDefined();
      expect(data.fixes.length).toBeGreaterThan(0);

      const draft = await readDraft(tmpDir, "landing");
      expect(draft.elements.heading.props.visible).toBeUndefined();
      expect(draft.elements.heading.visible).toBe(true);
    } finally {
      await teardown();
    }
  });

  it("returns NotFound for nonexistent page", async () => {
    const { connectClient, teardown } = await setup();
    try {
      const client = await connectClient();

      const { data, isError } = await callApply(client, "nope", [
        { op: "replace", path: "/root", value: "x" },
      ]);

      expect(isError).toBe(true);
      expect(data.error).toBe("NotFound");
    } finally {
      await teardown();
    }
  });
});
