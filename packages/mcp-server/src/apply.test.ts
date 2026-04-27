import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Effect } from "effect";
import type { Config, Data } from "@puckeditor/core";
import { applyOps } from "./apply.js";
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

const initialData: Data = {
  root: { props: {} },
  content: [
    {
      type: "Box",
      props: {
        id: "root",
        children: [{ type: "Text", props: { id: "heading", text: "Hello" } }],
      },
    },
  ],
};

const setup = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-apply-test-"));
  const storage = createFileStorage(tmpDir);
  const bridge = createBridge();
  await bridge.start();
  const ctx = { storage, config: testConfig, bridge };
  const teardown = async () => {
    bridge.stop();
    await fs.rm(tmpDir, { recursive: true, force: true });
  };
  return { tmpDir, ctx, teardown };
};

const writePage = async (tmpDir: string, name: string, data: Data) => {
  const dir = path.join(tmpDir, "pages", name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "data.json"), JSON.stringify(data));
};

const readDraft = async (tmpDir: string, name: string): Promise<Data> => {
  const raw = await fs.readFile(
    path.join(tmpDir, "pages", name, "data.draft.json"),
    "utf-8",
  );
  return JSON.parse(raw);
};

describe("applyOps", () => {
  it("applies update op and writes draft", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);
      const notices: Array<{ value: number; message?: string }> = [];

      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [{ op: "update", id: "heading", props: { text: "World" } }],
          },
          (n) => notices.push({ value: n.value, message: n.message }),
        ),
      );

      expect(result.ok).toBe(true);
      const draft = await readDraft(tmpDir, "landing");
      const heading = (
        draft.content[0]!.props as {
          children: Array<{ props: { text: string } }>;
        }
      ).children[0]!.props.text;
      expect(heading).toBe("World");
      expect(notices).toEqual([{ value: 1, message: "op 0 ok" }]);
    } finally {
      await teardown();
    }
  });

  it("applies multiple ops and emits progress per op", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);
      const notices: Array<{ value: number; message?: string }> = [];

      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              { op: "update", id: "heading", props: { text: "A" } },
              {
                op: "add",
                parentId: "root",
                slotKey: "children",
                component: { type: "Text", props: { id: "n", text: "B" } },
              },
            ],
          },
          (n) => notices.push({ value: n.value, message: n.message }),
        ),
      );

      expect(result.ok).toBe(true);
      expect(notices.map((n) => n.value)).toEqual([1, 2]);
      expect(notices.map((n) => n.message)).toEqual(["op 0 ok", "op 1 ok"]);
    } finally {
      await teardown();
    }
  });

  it("returns failure with failedOpIndex when an op errors mid-stream", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);
      const notices: Array<{ value: number; message?: string }> = [];

      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              { op: "update", id: "heading", props: { text: "OK" } },
              { op: "remove", id: "does-not-exist" },
              { op: "update", id: "heading", props: { text: "After" } },
            ],
          },
          (n) => notices.push({ value: n.value, message: n.message }),
        ),
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.failedOpIndex).toBe(1);
        expect(result.error.tag).toBe("element-not-found");
      }
      expect(notices.map((n) => n.value)).toEqual([1, 1]);
      expect(notices[1]!.message).toContain("op 1 failed");
    } finally {
      await teardown();
    }
  });

  it("broadcasts to bridge per successful op", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);

      const ws = new WebSocket(`ws://127.0.0.1:${ctx.bridge.port}`);
      await new Promise<void>((resolve) => {
        ws.onopen = () => resolve();
      });
      ws.send(JSON.stringify({ type: "ready", page: "landing" }));
      await Bun.sleep(20);

      const messages: unknown[] = [];
      ws.onmessage = (e) => messages.push(JSON.parse(e.data as string));

      await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              { op: "update", id: "heading", props: { text: "1" } },
              { op: "update", id: "heading", props: { text: "2" } },
            ],
          },
          () => {},
        ),
      );

      await Bun.sleep(30);
      const updates = messages.filter(
        (m) => (m as { type: string }).type === "spec-update",
      );
      expect(updates.length).toBe(2);
      ws.close();
    } finally {
      await teardown();
    }
  });

  it("auto-creates page on first apply", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "fresh",
            ops: [
              {
                op: "add",
                parentId: null,
                slotKey: null,
                component: { type: "Text", props: { id: "hero", text: "Hi" } },
              },
            ],
          },
          () => {},
        ),
      );

      expect(result.ok).toBe(true);
      const draft = await readDraft(tmpDir, "fresh");
      expect(draft.content).toHaveLength(1);
      expect((draft.content[0]!.props as { id: string }).id).toBe("hero");
    } finally {
      await teardown();
    }
  });

  it("rejects add with unknown component type", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);
      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              {
                op: "add",
                parentId: null,
                slotKey: null,
                component: { type: "Unknown", props: { id: "x" } },
              },
            ],
          },
          () => {},
        ),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.tag).toBe("unknown-component");
    } finally {
      await teardown();
    }
  });

  it("rejects move that would create a cycle", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      await writePage(tmpDir, "landing", initialData);
      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              {
                op: "move",
                id: "root",
                toParentId: "heading",
                toSlotKey: "children",
                toIndex: 0,
              },
            ],
          },
          () => {},
        ),
      );
      // heading has no slots so this would actually fail with slot-not-defined.
      // Use a parent-into-child cycle that does have a slot: move root into root.children
      expect(result.ok).toBe(false);
    } finally {
      await teardown();
    }
  });

  it("rejects circular move (parent into descendant)", async () => {
    const { tmpDir, ctx, teardown } = await setup();
    try {
      const dataWithSlot: Data = {
        root: { props: {} },
        content: [
          {
            type: "Box",
            props: {
              id: "outer",
              children: [
                {
                  type: "Box",
                  props: { id: "inner", children: [] },
                },
              ],
            },
          },
        ],
      };
      await writePage(tmpDir, "landing", dataWithSlot);
      const result = await Effect.runPromise(
        applyOps(
          ctx,
          {
            page: "landing",
            ops: [
              {
                op: "move",
                id: "outer",
                toParentId: "inner",
                toSlotKey: "children",
                toIndex: 0,
              },
            ],
          },
          () => {},
        ),
      );
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.tag).toBe("circular-move");
    } finally {
      await teardown();
    }
  });
});
