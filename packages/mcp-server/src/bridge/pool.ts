import type { ServerWebSocket } from "bun";
import type { Data } from "@puckeditor/core";
import type { SelectionData, ServerMessage } from "../protocol.js";

export type WsData = { page: string | null };

const stringify = (msg: ServerMessage) => JSON.stringify(msg);

export const createPool = () => {
  const pages = new Map<string, Set<ServerWebSocket<WsData>>>();
  const selections = new Map<string, SelectionData>();
  const snapshots = new Map<string, Data>();

  const ensureSet = (page: string) => {
    let set = pages.get(page);
    if (!set) {
      set = new Set();
      pages.set(page, set);
    }
    return set;
  };

  return {
    add: (page: string, ws: ServerWebSocket<WsData>) => ensureSet(page).add(ws),

    remove(ws: ServerWebSocket<WsData>) {
      const page = ws.data.page;
      if (!page) return;
      const set = pages.get(page);
      if (!set) return;
      set.delete(ws);
      if (set.size === 0) {
        pages.delete(page);
        selections.delete(page);
      }
    },

    pick: (page: string) => pages.get(page)?.values().next().value ?? null,
    forPage: (page: string) => pages.get(page),
    setSelection: (page: string, data: SelectionData) =>
      selections.set(page, data),
    lastSelection: (page: string) => selections.get(page) ?? null,
    viewers: () => Object.fromEntries([...pages].map(([p, s]) => [p, s.size])),
    hasViewers: (page: string) => (pages.get(page)?.size ?? 0) > 0,

    /** Cache the latest data for a page so new connections get it immediately. */
    setSnapshot: (page: string, data: Data) => snapshots.set(page, data),

    /** Send the cached data to a socket that just connected. No-op if none cached. */
    replayTo: (page: string, ws: ServerWebSocket<WsData>) => {
      const data = snapshots.get(page);
      if (data) ws.send(stringify({ type: "spec-update", data }));
    },
  };
};
