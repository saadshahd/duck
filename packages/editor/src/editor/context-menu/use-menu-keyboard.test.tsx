import { describe, test, expect } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useMenuKeyboard } from "./use-menu-keyboard.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Api = ReturnType<typeof useMenuKeyboard>;

const Harness = ({
  count,
  onSelect,
  onClose,
  capture,
}: {
  count: number;
  onSelect: (i: number) => void;
  onClose: () => void;
  capture: (api: Api) => void;
}) => {
  const api = useMenuKeyboard({ count, onSelect, onClose });
  capture(api);
  return null;
};

const mount = (
  count: number,
  onSelect: (i: number) => void,
  onClose: () => void,
): { host: HTMLDivElement; root: Root; latest: () => Api } => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  let api: Api;
  act(() =>
    root.render(
      <Harness
        count={count}
        onSelect={onSelect}
        onClose={onClose}
        capture={(a) => (api = a)}
      />,
    ),
  );
  return { host, root, latest: () => api };
};

const unmount = (ctx: { host: HTMLDivElement; root: Root }) => {
  act(() => ctx.root.unmount());
  ctx.host.remove();
};

const press = (key: string): boolean => {
  let defaultPrevented = false;
  act(() => {
    const e = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    document.dispatchEvent(e);
    defaultPrevented = e.defaultPrevented;
  });
  return defaultPrevented;
};

const collect = () => {
  const calls: unknown[] = [];
  return { calls, fn: (...args: unknown[]) => calls.push(args) };
};

describe("useMenuKeyboard", () => {
  test("initial activeIndex is -1 (nothing highlighted)", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      expect(ctx.latest().activeIndex).toBe(-1);
    } finally {
      unmount(ctx);
    }
  });

  test("ArrowDown from -1 moves to 0", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      press("ArrowDown");
      expect(ctx.latest().activeIndex).toBe(0);
    } finally {
      unmount(ctx);
    }
  });

  test("ArrowDown wraps from the last index to 0", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      act(() => ctx.latest().setActiveIndex(2));
      press("ArrowDown");
      expect(ctx.latest().activeIndex).toBe(0);
    } finally {
      unmount(ctx);
    }
  });

  test("ArrowUp from -1 wraps to the last index", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      press("ArrowUp");
      expect(ctx.latest().activeIndex).toBe(2);
    } finally {
      unmount(ctx);
    }
  });

  test("ArrowUp from 0 wraps to the last index", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      act(() => ctx.latest().setActiveIndex(0));
      press("ArrowUp");
      expect(ctx.latest().activeIndex).toBe(2);
    } finally {
      unmount(ctx);
    }
  });

  test("ArrowUp from a middle index decrements by one", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      act(() => ctx.latest().setActiveIndex(1));
      press("ArrowUp");
      expect(ctx.latest().activeIndex).toBe(0);
    } finally {
      unmount(ctx);
    }
  });

  test("Enter with no active index (-1) does not call onSelect", () => {
    const select = collect();
    const ctx = mount(3, select.fn, () => {});
    try {
      press("Enter");
      expect(select.calls).toEqual([]);
    } finally {
      unmount(ctx);
    }
  });

  test("Enter with an active index calls onSelect with that index", () => {
    const select = collect();
    const ctx = mount(3, select.fn, () => {});
    try {
      act(() => ctx.latest().setActiveIndex(1));
      press("Enter");
      expect(select.calls).toEqual([[1]]);
    } finally {
      unmount(ctx);
    }
  });

  test("Escape calls onClose regardless of active index", () => {
    const close = collect();
    const ctx = mount(3, () => {}, close.fn);
    try {
      act(() => ctx.latest().setActiveIndex(1));
      press("Escape");
      expect(close.calls).toEqual([[]]);
    } finally {
      unmount(ctx);
    }
  });

  test("an unhandled key changes nothing and is not prevented", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      act(() => ctx.latest().setActiveIndex(1));
      const prevented = press("a");
      expect(ctx.latest().activeIndex).toBe(1);
      expect(prevented).toBe(false);
    } finally {
      unmount(ctx);
    }
  });

  test("handled keys call preventDefault", () => {
    const ctx = mount(3, () => {}, () => {});
    try {
      expect(press("ArrowDown")).toBe(true);
      expect(press("Escape")).toBe(true);
    } finally {
      unmount(ctx);
    }
  });
});
