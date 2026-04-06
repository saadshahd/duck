import { describe, it, expect } from "bun:test";
import type { Spec } from "@json-render/core";
import { createBridge } from "./index.js";
import type {
  BridgeHandle,
  BrowserMessage,
  ServerMessage,
} from "../protocol.js";

const miniSpec: Spec = {
  root: "r",
  elements: { r: { type: "Box", props: {} } },
};

const setup = async () => {
  const bridge = createBridge();
  await bridge.start();
  const teardown = () => bridge.stop();
  return { bridge, teardown };
};

const connectAndReady = async (port: number, page: string) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });
  ws.send(JSON.stringify({ type: "ready", page } satisfies BrowserMessage));
  await Bun.sleep(20);
  return ws;
};

const nextMessage = (ws: WebSocket): Promise<ServerMessage> =>
  new Promise((resolve) => {
    ws.onmessage = (e) => resolve(JSON.parse(e.data as string));
  });

describe("bridge", () => {
  it("assigns a port on start", async () => {
    const { bridge, teardown } = await setup();
    try {
      expect(bridge.port).toBeGreaterThan(0);
    } finally {
      teardown();
    }
  });

  it("GET /health returns ok", async () => {
    const { bridge, teardown } = await setup();
    try {
      const res = await fetch(`http://127.0.0.1:${bridge.port}/health`);
      expect(await res.json()).toEqual({ ok: true, port: bridge.port });
    } finally {
      teardown();
    }
  });

  it("registers viewer on ready message", async () => {
    const { bridge, teardown } = await setup();
    try {
      const ws = await connectAndReady(bridge.port, "landing");
      expect(bridge.hasViewers("landing")).toBe(true);
      expect(bridge.viewers()).toEqual({ landing: 1 });
      ws.close();
    } finally {
      teardown();
    }
  });

  it("broadcasts spec-update to all connections for a page", async () => {
    const { bridge, teardown } = await setup();
    try {
      const ws1 = await connectAndReady(bridge.port, "landing");
      const ws2 = await connectAndReady(bridge.port, "landing");
      const p1 = nextMessage(ws1);
      const p2 = nextMessage(ws2);

      bridge.broadcast("landing", miniSpec);

      const [msg1, msg2] = await Promise.all([p1, p2]);
      expect(msg1).toEqual({ type: "spec-update", spec: miniSpec });
      expect(msg2).toEqual({ type: "spec-update", spec: miniSpec });
      ws1.close();
      ws2.close();
    } finally {
      teardown();
    }
  });

  it("does not broadcast to other pages", async () => {
    const { bridge, teardown } = await setup();
    try {
      const wsLanding = await connectAndReady(bridge.port, "landing");
      const wsAbout = await connectAndReady(bridge.port, "about");

      let aboutReceived = false;
      wsAbout.onmessage = () => {
        aboutReceived = true;
      };

      const pLanding = nextMessage(wsLanding);
      bridge.broadcast("landing", miniSpec);
      await pLanding;

      await Bun.sleep(50);
      expect(aboutReceived).toBe(false);
      wsLanding.close();
      wsAbout.close();
    } finally {
      teardown();
    }
  });

  it("tracks selection per page", async () => {
    const { bridge, teardown } = await setup();
    try {
      const ws = await connectAndReady(bridge.port, "landing");
      expect(bridge.lastSelection("landing")).toBeNull();

      ws.send(
        JSON.stringify({
          type: "selection-changed",
          elementId: "hero",
          ancestorIds: ["root"],
        } satisfies BrowserMessage),
      );
      await Bun.sleep(20);

      expect(bridge.lastSelection("landing")).toEqual({
        elementId: "hero",
        ancestorIds: ["root"],
      });
      ws.close();
    } finally {
      teardown();
    }
  });

  it("removes viewer on disconnect", async () => {
    const { bridge, teardown } = await setup();
    try {
      const ws = await connectAndReady(bridge.port, "landing");
      expect(bridge.hasViewers("landing")).toBe(true);

      ws.close();
      await Bun.sleep(50);

      expect(bridge.hasViewers("landing")).toBe(false);
      expect(bridge.viewers()).toEqual({});
    } finally {
      teardown();
    }
  });

  it("capture rejects when no browser connected", async () => {
    const { bridge, teardown } = await setup();
    try {
      expect(bridge.capture("landing", { mode: "viewport" })).rejects.toThrow(
        "No browser connected",
      );
    } finally {
      teardown();
    }
  });

  it("capture resolves on response", async () => {
    const { bridge, teardown } = await setup();
    try {
      const ws = await connectAndReady(bridge.port, "landing");

      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data as string) as ServerMessage;
        if (msg.type === "capture-request") {
          ws.send(
            JSON.stringify({
              type: "capture-response",
              id: msg.id,
              image: "base64data",
            } satisfies BrowserMessage),
          );
        }
      };

      const result = await bridge.capture("landing", { mode: "viewport" });
      expect(result).toEqual({ image: "base64data" });
      ws.close();
    } finally {
      teardown();
    }
  });
});
