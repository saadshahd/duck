import { describe, it, expect, beforeEach, afterEach } from "bun:test";
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

const connectAndReady = async (port: number, page: string) => {
  const ws = new WebSocket(`ws://127.0.0.1:${port}`);
  await new Promise<void>((resolve) => {
    ws.onopen = () => resolve();
  });
  ws.send(JSON.stringify({ type: "ready", page } satisfies BrowserMessage));
  await Bun.sleep(20); // let message process
  return ws;
};

const nextMessage = (ws: WebSocket): Promise<ServerMessage> =>
  new Promise((resolve) => {
    ws.onmessage = (e) => resolve(JSON.parse(e.data as string));
  });

let bridge: BridgeHandle;

beforeEach(async () => {
  bridge = createBridge();
  await bridge.start();
});

afterEach(() => {
  bridge.stop();
});

describe("bridge", () => {
  it("assigns a port on start", () => {
    expect(bridge.port).toBeGreaterThan(0);
  });

  it("GET /health returns ok", async () => {
    const res = await fetch(`http://127.0.0.1:${bridge.port}/health`);
    expect(await res.json()).toEqual({ ok: true, port: bridge.port });
  });

  it("registers viewer on ready message", async () => {
    const ws = await connectAndReady(bridge.port, "landing");
    expect(bridge.hasViewers("landing")).toBe(true);
    expect(bridge.viewers()).toEqual({ landing: 1 });
    ws.close();
  });

  it("broadcasts spec-update to all connections for a page", async () => {
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
  });

  it("does not broadcast to other pages", async () => {
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
  });

  it("tracks selection per page", async () => {
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
  });

  it("removes viewer on disconnect", async () => {
    const ws = await connectAndReady(bridge.port, "landing");
    expect(bridge.hasViewers("landing")).toBe(true);

    ws.close();
    await Bun.sleep(50);

    expect(bridge.hasViewers("landing")).toBe(false);
    expect(bridge.viewers()).toEqual({});
  });

  it("capture rejects when no browser connected", async () => {
    expect(bridge.capture("landing", { mode: "viewport" })).rejects.toThrow(
      "No browser connected",
    );
  });

  it("capture resolves on response", async () => {
    const ws = await connectAndReady(bridge.port, "landing");

    // Listen for the capture-request to echo back a response
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
  });
});
