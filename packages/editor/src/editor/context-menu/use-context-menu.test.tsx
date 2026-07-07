import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useContextMenu } from "./use-context-menu.js";
import type { FiberRegistry } from "../fiber/index.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

/** A registry that maps elements to ids by identity, unlike fiber/testing.ts's
 *  stubRegistry (which always returns undefined from getNodeId — fine for hit
 *  testing by rect, useless here where useContextMenu needs getNodeId to
 *  resolve real elements from document.elementsFromPoint). */
const idRegistry = (map: Map<Element, string>): FiberRegistry => ({
  get: () => undefined,
  getNodeId: (el) => map.get(el),
  dispose: () => {},
});

type Api = ReturnType<typeof useContextMenu>;

const Harness = ({
  registry,
  capture,
}: {
  registry: FiberRegistry | null;
  capture: (api: Api) => void;
}) => {
  const api = useContextMenu(registry);
  capture(api);
  return null;
};

const mount = (
  registry: FiberRegistry | null,
): { host: HTMLDivElement; root: Root; latest: () => Api } => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  let api: Api;
  act(() =>
    root.render(<Harness registry={registry} capture={(a) => (api = a)} />),
  );
  return { host, root, latest: () => api };
};

const unmount = (ctx: { host: HTMLDivElement; root: Root }) => {
  act(() => ctx.root.unmount());
  ctx.host.remove();
};

const fireContextMenu = (
  target: EventTarget,
  init: { clientX: number; clientY: number },
) => {
  act(() => {
    target.dispatchEvent(
      new MouseEvent("contextmenu", {
        bubbles: true,
        cancelable: true,
        composed: true,
        ...init,
      }),
    );
  });
};

describe("useContextMenu", () => {
  let elementsFromPointBackup: typeof document.elementsFromPoint;

  beforeEach(() => {
    elementsFromPointBackup = document.elementsFromPoint;
  });

  afterEach(() => {
    document.elementsFromPoint = elementsFromPointBackup;
  });

  test("registry null: no listener wired, contextmenu is a no-op", () => {
    const ctx = mount(null);
    try {
      fireContextMenu(document, { clientX: 10, clientY: 10 });
      expect(ctx.latest().menu).toBeNull();
    } finally {
      unmount(ctx);
    }
  });

  test("hit resolves to registered ids: menu opens with deduped, ordered ids", () => {
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);
    const map = new Map([
      [a, "el-a"],
      [b, "el-b"],
    ]);
    document.elementsFromPoint = () => [a, a, b];

    const ctx = mount(idRegistry(map));
    try {
      fireContextMenu(document, { clientX: 5, clientY: 7 });
      expect(ctx.latest().menu).toEqual({
        x: 5,
        y: 7,
        elementIds: ["el-a", "el-b"],
      });
    } finally {
      unmount(ctx);
      a.remove();
      b.remove();
    }
  });

  test("no element under the point maps to a registered id: menu stays null", () => {
    const unregistered = document.createElement("div");
    document.body.append(unregistered);
    document.elementsFromPoint = () => [unregistered];

    const ctx = mount(idRegistry(new Map()));
    try {
      fireContextMenu(document, { clientX: 1, clientY: 1 });
      expect(ctx.latest().menu).toBeNull();
    } finally {
      unmount(ctx);
      unregistered.remove();
    }
  });

  test("event originating inside a shadow root is ignored", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    const inner = document.createElement("div");
    shadow.appendChild(inner);
    document.elementsFromPoint = () => [inner];

    const ctx = mount(idRegistry(new Map([[inner, "el-inner"]])));
    try {
      fireContextMenu(inner, { clientX: 2, clientY: 2 });
      expect(ctx.latest().menu).toBeNull();
    } finally {
      unmount(ctx);
      host.remove();
    }
  });

  test("close() resets both menu and highlightId", () => {
    const a = document.createElement("div");
    document.body.appendChild(a);
    document.elementsFromPoint = () => [a];

    const ctx = mount(idRegistry(new Map([[a, "el-a"]])));
    try {
      fireContextMenu(document, { clientX: 3, clientY: 4 });
      expect(ctx.latest().menu).not.toBeNull();

      act(() => ctx.latest().setHighlightId("el-a"));
      expect(ctx.latest().highlightId).toBe("el-a");

      act(() => ctx.latest().close());
      expect(ctx.latest().menu).toBeNull();
      expect(ctx.latest().highlightId).toBeNull();
    } finally {
      unmount(ctx);
      a.remove();
    }
  });

  test("opening a new menu resets any prior highlight", () => {
    const a = document.createElement("div");
    document.body.appendChild(a);
    document.elementsFromPoint = () => [a];

    const ctx = mount(idRegistry(new Map([[a, "el-a"]])));
    try {
      fireContextMenu(document, { clientX: 3, clientY: 4 });
      act(() => ctx.latest().setHighlightId("el-a"));
      expect(ctx.latest().highlightId).toBe("el-a");

      fireContextMenu(document, { clientX: 9, clientY: 9 });
      expect(ctx.latest().highlightId).toBeNull();
      expect(ctx.latest().menu).toEqual({
        x: 9,
        y: 9,
        elementIds: ["el-a"],
      });
    } finally {
      unmount(ctx);
      a.remove();
    }
  });
});
