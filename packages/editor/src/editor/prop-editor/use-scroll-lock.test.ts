import { describe, it, expect } from "bun:test";
import { lock, afterScrollSettles } from "./use-scroll-lock.js";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("lock", () => {
  it("applies overflow:hidden and scrollbar-gutter:stable", () => {
    const el = document.createElement("div");
    lock(el);
    expect(el.style.getPropertyValue("overflow")).toBe("hidden");
    expect(el.style.getPropertyValue("scrollbar-gutter")).toBe("stable");
  });

  it("release restores prior inline values", () => {
    const el = document.createElement("div");
    el.style.setProperty("overflow", "auto");
    el.style.setProperty("scrollbar-gutter", "stable both-edges");
    const release = lock(el);
    release();
    expect(el.style.getPropertyValue("overflow")).toBe("auto");
    expect(el.style.getPropertyValue("scrollbar-gutter")).toBe(
      "stable both-edges",
    );
  });

  it("release removes properties that had no prior inline value", () => {
    const el = document.createElement("div");
    const release = lock(el);
    release();
    expect(el.style.getPropertyValue("overflow")).toBe("");
    expect(el.style.getPropertyValue("scrollbar-gutter")).toBe("");
  });
});

describe("afterScrollSettles", () => {
  it("settles once on scrollend, even when fired twice", async () => {
    const target = new EventTarget();
    let calls = 0;
    afterScrollSettles({ target, fallbackMs: 50, onSettled: () => calls++ });
    target.dispatchEvent(new Event("scrollend"));
    target.dispatchEvent(new Event("scrollend"));
    expect(calls).toBe(1);
  });

  it("settles via fallback timeout when no scrollend arrives", async () => {
    const target = new EventTarget();
    let calls = 0;
    afterScrollSettles({ target, fallbackMs: 5, onSettled: () => calls++ });
    await wait(20);
    expect(calls).toBe(1);
  });

  it("does not double-fire when scrollend precedes the fallback", async () => {
    const target = new EventTarget();
    let calls = 0;
    afterScrollSettles({ target, fallbackMs: 5, onSettled: () => calls++ });
    target.dispatchEvent(new Event("scrollend"));
    await wait(20);
    expect(calls).toBe(1);
  });

  it("cancel prevents both paths", async () => {
    const target = new EventTarget();
    let calls = 0;
    const cancel = afterScrollSettles({
      target,
      fallbackMs: 5,
      onSettled: () => calls++,
    });
    cancel();
    target.dispatchEvent(new Event("scrollend"));
    await wait(20);
    expect(calls).toBe(0);
  });
});
