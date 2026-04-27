import type { Data } from "@puckeditor/core";
import type {
  BrowserMessage,
  CaptureMode,
  CaptureResult,
  SelectionData,
  ServerMessage,
} from "../protocol.js";
import { createPool, type WsData } from "./pool.js";
import { createCaptures } from "./captures.js";

export type Bridge = {
  start(): Promise<{ port: number }>;
  stop(): void;
  readonly port: number;
  broadcast(page: string, data: Data): void;
  lastSelection(page: string): SelectionData | null;
  capture(page: string, mode: CaptureMode): Promise<CaptureResult>;
  viewers(): Record<string, number>;
  hasViewers(page: string): boolean;
};

export const createBridge = (): Bridge => {
  const pool = createPool();
  const caps = createCaptures();
  let server: ReturnType<typeof Bun.serve<WsData>> | null = null;
  let port = 0;

  const dispatch: Record<
    string,
    (ws: import("bun").ServerWebSocket<WsData>, msg: any) => void
  > = {
    ready(ws, msg) {
      ws.data.page = msg.page;
      pool.add(msg.page, ws);
      pool.replayTo(msg.page, ws);
    },
    "selection-changed"(ws, msg) {
      if (ws.data.page)
        pool.setSelection(ws.data.page, {
          elementId: msg.elementId,
          ancestorIds: msg.ancestorIds,
        });
    },
    "capture-response"(_ws, msg) {
      caps.resolve(msg.id, msg.image);
    },
  };

  return {
    get port() {
      return port;
    },

    async start() {
      server = Bun.serve<WsData>({
        port: process.env.BRIDGE_PORT ? Number(process.env.BRIDGE_PORT) : 0,
        hostname: "127.0.0.1",
        fetch: (req, srv) => route(req, srv, pool),
        websocket: {
          open() {},
          message(ws, raw) {
            const msg = parseMessage(raw);
            if (msg) dispatch[msg.type]?.(ws, msg);
          },
          close(ws) {
            pool.remove(ws);
          },
        },
      });
      port = server.port ?? 0;
      return { port };
    },

    stop() {
      caps.rejectAll("Bridge stopped");
      server?.stop();
      server = null;
    },

    broadcast(page: string, data: Data) {
      pool.setSnapshot(page, data);
      const set = pool.forPage(page);
      if (!set) return;
      const payload = stringify({ type: "spec-update", data });
      for (const ws of set) ws.send(payload);
    },

    lastSelection: (page) => pool.lastSelection(page),

    capture(page: string, mode: CaptureMode) {
      const ws = pool.pick(page);
      if (!ws)
        return Promise.reject(
          new Error(`No browser connected for page: ${page}`),
        );
      const { id, promise } = caps.request();
      ws.send(stringify({ type: "capture-request", id, ...mode }));
      return promise;
    },

    viewers: () => pool.viewers(),
    hasViewers: (page) => pool.hasViewers(page),
  };
};

// ── Helpers ────────────────────────────────────────────────────────

const stringify = (msg: ServerMessage) => JSON.stringify(msg);

const parseMessage = (raw: string | Buffer): BrowserMessage | null => {
  try {
    const msg = JSON.parse(
      typeof raw === "string" ? raw : new TextDecoder().decode(raw),
    );
    return typeof msg?.type === "string" ? msg : null;
  } catch {
    return null;
  }
};

function route(
  req: Request,
  srv: {
    port?: number;
    upgrade(req: Request, opts: { data: WsData }): boolean;
  },
  pool: ReturnType<typeof createPool>,
) {
  const { pathname } = new URL(req.url);
  if (pathname === "/health")
    return Response.json({ ok: true, port: srv.port ?? 0 });
  if (pathname === "/status") return Response.json({ pages: pool.viewers() });
  if (srv.upgrade(req, { data: { page: null } }))
    return undefined as unknown as Response;
  return new Response("Not Found", { status: 404 });
}
