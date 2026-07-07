import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import { useClipboard } from "./use-clipboard.js";
import { Fragment } from "./fragment.js";
import type { DataCommit, DataPushResult } from "../types.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

// --- Fixtures ---

const config: Config = {
  components: {
    Stack: {
      defaultProps: { items: [] },
      fields: { items: { type: "slot" } },
      render: () => null as never,
    },
    Text: {
      defaultProps: { text: "default" },
      fields: { text: { type: "text" } },
      render: () => null as never,
    },
  },
  root: { render: () => null as never },
} as Config;

const text = (id: string, t = "x"): ComponentData => ({
  type: "Text",
  props: { id, text: t },
});

const stack = (id: string, items: ComponentData[]): ComponentData => ({
  type: "Stack",
  props: { id, items },
});

const sample = (): Data => ({
  root: { props: {} },
  content: [stack("s1", [text("t1"), text("t2")])],
});

// --- Harness: mount the hook and expose its returned API + call logs ---

type Api = ReturnType<typeof useClipboard>;

const collect = <T extends unknown[]>() => {
  const calls: T[] = [];
  return { calls, fn: (...args: T) => calls.push(args) };
};

const Harness = ({
  data,
  lastSelectedId,
  commit,
  onSelect,
  onDeselect,
  capture,
}: {
  data: Data;
  lastSelectedId: string | null;
  commit: (c: DataCommit) => DataPushResult;
  onSelect: (ids: string[]) => void;
  onDeselect: () => void;
  capture: (api: Api) => void;
}) => {
  const api = useClipboard({
    data,
    config,
    lastSelectedId,
    commit,
    onSelect,
    onDeselect,
  });
  capture(api);
  return null;
};

type MountArgs = {
  data: Data;
  lastSelectedId: string | null;
  commit?: (c: DataCommit) => DataPushResult;
  onSelect?: (ids: string[]) => void;
  onDeselect?: () => void;
};

const mount = (args: MountArgs) => {
  const commitCalls = collect<[DataCommit]>();
  const selectCalls = collect<[string[]]>();
  const deselectCalls = collect<[]>();
  const commit = args.commit ?? ((c: DataCommit) => (commitCalls.fn(c), { status: "pushed", entryId: "e" }) as DataPushResult);
  const onSelect = args.onSelect ?? selectCalls.fn;
  const onDeselect = args.onDeselect ?? deselectCalls.fn;

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  let api: Api;
  act(() =>
    root.render(
      <Harness
        data={args.data}
        lastSelectedId={args.lastSelectedId}
        commit={commit}
        onSelect={onSelect}
        onDeselect={onDeselect}
        capture={(a) => (api = a)}
      />,
    ),
  );
  return {
    host,
    root,
    latest: () => api,
    commitCalls: commitCalls.calls,
    selectCalls: selectCalls.calls,
    deselectCalls: deselectCalls.calls,
  };
};

const unmount = (ctx: { host: HTMLDivElement; root: Root }) => {
  act(() => ctx.root.unmount());
  ctx.host.remove();
};

const flush = () => act(async () => {});

describe("useClipboard: onCopy", () => {
  test("no selection: no-op, nothing written to the system clipboard", async () => {
    await navigator.clipboard.writeText("");
    const ctx = mount({ data: sample(), lastSelectedId: null });
    try {
      act(() => ctx.latest().onCopy());
      await flush();
      expect(await navigator.clipboard.readText()).toBe("");
    } finally {
      unmount(ctx);
    }
  });

  test("valid selection: writes the fragment to the system clipboard", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: "t1" });
    try {
      act(() => ctx.latest().onCopy());
      await flush();
      const written = await navigator.clipboard.readText();
      expect(Fragment.parse(written)).toEqual(text("t1", "x"));
    } finally {
      unmount(ctx);
    }
  });

  test("copy failure (orphan selection) announces, does not touch the clipboard", async () => {
    await navigator.clipboard.writeText("untouched");
    const ctx = mount({ data: sample(), lastSelectedId: "missing" });
    try {
      act(() => ctx.latest().onCopy());
      await flush();
      expect(ctx.latest().notice).toContain("Copy failed");
      expect(await navigator.clipboard.readText()).toBe("untouched");
    } finally {
      unmount(ctx);
    }
  });
});

describe("useClipboard: onCut", () => {
  test("valid selection: removes the element and commits with resolve.kind 'remove'", async () => {
    const data = sample();
    const ctx = mount({ data, lastSelectedId: "t1" });
    try {
      act(() => ctx.latest().onCut());
      await flush();

      expect(ctx.commitCalls).toHaveLength(1);
      const commit = ctx.commitCalls[0][0];
      expect(commit.label).toBe("Cut");
      expect(commit.resolve).toEqual({ kind: "remove", ids: ["t1"] });
      const stackAfter = commit.afterData.content[0];
      expect(stackAfter.props.items).toEqual([text("t2")]);

      expect(ctx.deselectCalls).toHaveLength(1);

      const written = await navigator.clipboard.readText();
      expect(Fragment.parse(written)).toEqual(text("t1", "x"));
    } finally {
      unmount(ctx);
    }
  });

  test("no selection: no-op, no commit", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: null });
    try {
      act(() => ctx.latest().onCut());
      await flush();
      expect(ctx.commitCalls).toHaveLength(0);
    } finally {
      unmount(ctx);
    }
  });

  test("cut failure (orphan selection) announces, does not commit or deselect", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: "missing" });
    try {
      act(() => ctx.latest().onCut());
      await flush();
      expect(ctx.commitCalls).toHaveLength(0);
      expect(ctx.deselectCalls).toHaveLength(0);
      expect(ctx.latest().notice).toContain("Cut failed");
    } finally {
      unmount(ctx);
    }
  });
});

describe("useClipboard: onPaste", () => {
  test("system clipboard blocked, internal store has a fragment (from a prior copy): pastes from the store", async () => {
    const originalReadText = navigator.clipboard.readText;
    const ctx = mount({ data: sample(), lastSelectedId: "t1" });
    try {
      act(() => ctx.latest().onCopy());
      await flush();

      navigator.clipboard.readText = () => Promise.reject(new Error("denied"));

      await act(async () => {
        ctx.latest().onPaste();
        await Promise.resolve();
      });

      expect(ctx.commitCalls).toHaveLength(1);
      expect(ctx.commitCalls[0][0].label).toBe("Pasted");
      expect(ctx.commitCalls[0][0].resolve.kind).toBe("insert");
      expect(ctx.selectCalls).toHaveLength(1);
      expect(ctx.latest().notice).toContain("System clipboard unavailable");
    } finally {
      navigator.clipboard.readText = originalReadText;
      unmount(ctx);
    }
  });

  test("system clipboard blocked, nothing in the internal store: announces, no commit", async () => {
    const originalReadText = navigator.clipboard.readText;
    navigator.clipboard.readText = () => Promise.reject(new Error("denied"));
    const ctx = mount({ data: sample(), lastSelectedId: "t1" });
    try {
      await act(async () => {
        ctx.latest().onPaste();
        await Promise.resolve();
      });
      expect(ctx.commitCalls).toHaveLength(0);
      expect(ctx.latest().notice).toBe(
        "Nothing to paste. System clipboard unavailable.",
      );
    } finally {
      navigator.clipboard.readText = originalReadText;
      unmount(ctx);
    }
  });

  test("system clipboard has a valid fragment: pastes from the system value", async () => {
    await navigator.clipboard.writeText(Fragment.serialize(text("sys", "from-system")));
    const ctx = mount({ data: sample(), lastSelectedId: "t1" });
    try {
      await act(async () => {
        ctx.latest().onPaste();
        await Promise.resolve();
      });
      expect(ctx.commitCalls).toHaveLength(1);
      const inserted = ctx.selectCalls[0][0][0];
      const stackAfter = ctx.commitCalls[0][0].afterData.content[0];
      const items = stackAfter.props.items as ComponentData[];
      const pasted = items.find((c) => c.props.id === inserted);
      expect(pasted?.props.text).toBe("from-system");
    } finally {
      unmount(ctx);
    }
  });

  test("no destination (orphan selection): announces, no commit", async () => {
    await navigator.clipboard.writeText(Fragment.serialize(text("sys")));
    const ctx = mount({ data: sample(), lastSelectedId: "missing" });
    try {
      await act(async () => {
        ctx.latest().onPaste();
        await Promise.resolve();
      });
      expect(ctx.commitCalls).toHaveLength(0);
      expect(ctx.latest().notice).toBe(
        "Paste failed: no destination for the current selection.",
      );
    } finally {
      unmount(ctx);
    }
  });

  test("nothing selected: pastes at the top level (append)", async () => {
    await navigator.clipboard.writeText(Fragment.serialize(text("sys", "top-level")));
    const ctx = mount({ data: sample(), lastSelectedId: null });
    try {
      await act(async () => {
        ctx.latest().onPaste();
        await Promise.resolve();
      });
      expect(ctx.commitCalls).toHaveLength(1);
      const afterData = ctx.commitCalls[0][0].afterData;
      expect(afterData.content).toHaveLength(2);
      expect(afterData.content[1].props.text).toBe("top-level");
    } finally {
      unmount(ctx);
    }
  });
});

describe("useClipboard: onDuplicate", () => {
  test("valid selection: commits an insert immediately after the source, selects the new id", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: "t1" });
    try {
      act(() => ctx.latest().onDuplicate());
      await flush();

      expect(ctx.commitCalls).toHaveLength(1);
      const commit = ctx.commitCalls[0][0];
      expect(commit.label).toBe("Duplicated");
      expect(commit.resolve.kind).toBe("insert");

      const items = commit.afterData.content[0].props.items as ComponentData[];
      expect(items).toHaveLength(3);
      expect(items[0].props.id).toBe("t1");
      expect(items[1].props.text).toBe("x");
      expect(items[1].props.id).not.toBe("t1");
      expect(items[2].props.id).toBe("t2");

      expect(ctx.selectCalls).toEqual([[[items[1].props.id as string]]]);
    } finally {
      unmount(ctx);
    }
  });

  test("no selection: no-op, no commit", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: null });
    try {
      act(() => ctx.latest().onDuplicate());
      await flush();
      expect(ctx.commitCalls).toHaveLength(0);
    } finally {
      unmount(ctx);
    }
  });

  test("orphan selection (no parent found): no-op, no commit", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: "missing" });
    try {
      act(() => ctx.latest().onDuplicate());
      await flush();
      expect(ctx.commitCalls).toHaveLength(0);
    } finally {
      unmount(ctx);
    }
  });
});

describe("useClipboard: notice lifecycle", () => {
  test("a second failure replaces the pending notice rather than stacking", async () => {
    const ctx = mount({ data: sample(), lastSelectedId: "missing" });
    try {
      act(() => ctx.latest().onCopy());
      await flush();
      expect(ctx.latest().notice).toContain("Copy failed");

      act(() => ctx.latest().onCut());
      await flush();
      expect(ctx.latest().notice).toContain("Cut failed");
    } finally {
      unmount(ctx);
    }
  });
});
