import { describe, test, expect } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { useState } from "react";
import { CrashGuard, RecoveryNotice } from "./crash-recovery.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const Bomb = ({ armed }: { armed: boolean }) => {
  if (armed) throw new Error("boom");
  return <p data-role="content">alive</p>;
};

const mount = (node: React.ReactNode): { host: HTMLDivElement; root: Root } => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host, {
    onUncaughtError: () => {},
    onCaughtError: () => {},
  });
  act(() => root.render(node));
  return { host, root };
};

const unmount = ({ host, root }: { host: HTMLDivElement; root: Root }) => {
  act(() => root.unmount());
  host.remove();
};

describe("CrashGuard", () => {
  test("renders children when nothing throws", () => {
    const ctx = mount(
      <CrashGuard fallback={() => <p data-role="fallback" />}>
        <Bomb armed={false} />
      </CrashGuard>,
    );
    try {
      expect(ctx.host.querySelector("[data-role='content']")).not.toBeNull();
      expect(ctx.host.querySelector("[data-role='fallback']")).toBeNull();
    } finally {
      unmount(ctx);
    }
  });

  test("a throwing child renders the fallback with the error, not a blank page", () => {
    let seen: Error | undefined;
    const ctx = mount(
      <CrashGuard
        fallback={(error) => {
          seen = error;
          return <p data-role="fallback">recovered</p>;
        }}
      >
        <Bomb armed />
      </CrashGuard>,
    );
    try {
      expect(ctx.host.querySelector("[data-role='fallback']")).not.toBeNull();
      expect(seen?.message).toBe("boom");
    } finally {
      unmount(ctx);
    }
  });

  test("a resetKey change after a crash re-renders the children", () => {
    let bump: () => void = () => {};
    const Harness = () => {
      const [epoch, setEpoch] = useState(0);
      bump = () => setEpoch((n) => n + 1);
      return (
        <CrashGuard
          resetKey={epoch}
          fallback={() => <p data-role="fallback" />}
        >
          <Bomb key={epoch} armed={epoch === 0} />
        </CrashGuard>
      );
    };
    const ctx = mount(<Harness />);
    try {
      expect(ctx.host.querySelector("[data-role='fallback']")).not.toBeNull();
      act(() => bump());
      expect(ctx.host.querySelector("[data-role='content']")).not.toBeNull();
      expect(ctx.host.querySelector("[data-role='fallback']")).toBeNull();
    } finally {
      unmount(ctx);
    }
  });

  test("a crash inside the fallback of a nested guard degrades to that guard's fallback", () => {
    const ctx = mount(
      <CrashGuard
        fallback={() => (
          <>
            <CrashGuard fallback={() => <p data-role="last-resort" />}>
              <Bomb armed />
            </CrashGuard>
            <p data-role="notice" />
          </>
        )}
      >
        <Bomb armed />
      </CrashGuard>,
    );
    try {
      expect(
        ctx.host.querySelector("[data-role='last-resort']"),
      ).not.toBeNull();
      expect(ctx.host.querySelector("[data-role='notice']")).not.toBeNull();
    } finally {
      unmount(ctx);
    }
  });
});

describe("RecoveryNotice", () => {
  test("names the failure and offers resume", () => {
    let resumed = false;
    const ctx = mount(<RecoveryNotice onResume={() => (resumed = true)} />);
    try {
      const notice = ctx.host.querySelector("[data-role='crash-recovery']");
      expect(notice).not.toBeNull();
      const button = ctx.host.querySelector<HTMLButtonElement>(
        "[data-role='crash-resume']",
      );
      expect(button).not.toBeNull();
      act(() => button?.click());
      expect(resumed).toBe(true);
    } finally {
      unmount(ctx);
    }
  });
});
