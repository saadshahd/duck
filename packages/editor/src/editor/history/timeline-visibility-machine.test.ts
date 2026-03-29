import { describe, it, expect } from "bun:test";
import { createActor } from "xstate";
import {
  timelineVisibilityMachine,
  type TimelineVisibilityEvent,
} from "./timeline-visibility-machine.js";

const SHORT = 10;

const testMachine = timelineVisibilityMachine.provide({
  delays: { autoHide: SHORT, staleTimeout: SHORT, fadeOut: SHORT },
});

const stateAfter = (events: TimelineVisibilityEvent[]): string => {
  const actor = createActor(testMachine).start();
  events.forEach((e) => actor.send(e));
  const value = actor.getSnapshot().value as string;
  actor.stop();
  return value;
};

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

// --- Synchronous transitions ---

describe("hidden", () => {
  it("SHOW → visible", () => {
    expect(stateAfter([{ type: "SHOW" }])).toBe("visible");
  });

  it("MOUSE_ENTER → stays hidden", () => {
    expect(stateAfter([{ type: "MOUSE_ENTER" }])).toBe("hidden");
  });

  it("MOUSE_LEAVE → stays hidden", () => {
    expect(stateAfter([{ type: "MOUSE_LEAVE" }])).toBe("hidden");
  });
});

describe("visible", () => {
  it("SHOW → visible (re-entry)", () => {
    expect(stateAfter([{ type: "SHOW" }, { type: "SHOW" }])).toBe("visible");
  });

  it("MOUSE_ENTER → interactive", () => {
    expect(stateAfter([{ type: "SHOW" }, { type: "MOUSE_ENTER" }])).toBe(
      "interactive",
    );
  });

  it("MOUSE_LEAVE → stays visible", () => {
    expect(stateAfter([{ type: "SHOW" }, { type: "MOUSE_LEAVE" }])).toBe(
      "visible",
    );
  });
});

describe("interactive", () => {
  it("MOUSE_LEAVE → stale", () => {
    expect(
      stateAfter([
        { type: "SHOW" },
        { type: "MOUSE_ENTER" },
        { type: "MOUSE_LEAVE" },
      ]),
    ).toBe("stale");
  });

  it("SHOW → stays interactive", () => {
    expect(
      stateAfter([{ type: "SHOW" }, { type: "MOUSE_ENTER" }, { type: "SHOW" }]),
    ).toBe("interactive");
  });
});

describe("stale", () => {
  it("MOUSE_ENTER → interactive", () => {
    expect(
      stateAfter([
        { type: "SHOW" },
        { type: "MOUSE_ENTER" },
        { type: "MOUSE_LEAVE" },
        { type: "MOUSE_ENTER" },
      ]),
    ).toBe("interactive");
  });

  it("SHOW → visible", () => {
    expect(
      stateAfter([
        { type: "SHOW" },
        { type: "MOUSE_ENTER" },
        { type: "MOUSE_LEAVE" },
        { type: "SHOW" },
      ]),
    ).toBe("visible");
  });
});

describe("fading", () => {
  it("MOUSE_ENTER → interactive", async () => {
    const actor = createActor(testMachine).start();
    actor.send({ type: "SHOW" });
    await wait(SHORT + 5);
    expect(actor.getSnapshot().value).toBe("fading");
    actor.send({ type: "MOUSE_ENTER" });
    expect(actor.getSnapshot().value).toBe("interactive");
    actor.stop();
  });

  it("SHOW → visible", async () => {
    const actor = createActor(testMachine).start();
    actor.send({ type: "SHOW" });
    await wait(SHORT + 5);
    expect(actor.getSnapshot().value).toBe("fading");
    actor.send({ type: "SHOW" });
    expect(actor.getSnapshot().value).toBe("visible");
    actor.stop();
  });
});

// --- Delayed transitions ---

describe("delayed transitions", () => {
  it("visible → fading after autoHide", async () => {
    const actor = createActor(testMachine).start();
    actor.send({ type: "SHOW" });
    expect(actor.getSnapshot().value).toBe("visible");
    await wait(SHORT + 5);
    expect(actor.getSnapshot().value).toBe("fading");
    actor.stop();
  });

  it("stale → fading after staleTimeout", async () => {
    const actor = createActor(testMachine).start();
    actor.send({ type: "SHOW" });
    actor.send({ type: "MOUSE_ENTER" });
    actor.send({ type: "MOUSE_LEAVE" });
    expect(actor.getSnapshot().value).toBe("stale");
    await wait(SHORT + 5);
    expect(actor.getSnapshot().value).toBe("fading");
    actor.stop();
  });

  it("fading → hidden after fadeOut", async () => {
    const actor = createActor(testMachine).start();
    actor.send({ type: "SHOW" });
    await wait(SHORT + 5); // → fading
    expect(actor.getSnapshot().value).toBe("fading");
    await wait(SHORT + 5); // → hidden
    expect(actor.getSnapshot().value).toBe("hidden");
    actor.stop();
  });

  it("SHOW in visible resets autoHide timer", async () => {
    const DELAY = 50;
    const resetMachine = timelineVisibilityMachine.provide({
      delays: { autoHide: DELAY, staleTimeout: DELAY, fadeOut: DELAY },
    });
    const actor = createActor(resetMachine).start();
    actor.send({ type: "SHOW" });
    await wait(DELAY - 15); // almost expired
    actor.send({ type: "SHOW" }); // re-enter, resets timer
    await wait(DELAY - 15); // would have expired without reset
    expect(actor.getSnapshot().value).toBe("visible");
    await wait(DELAY + 10); // now it expires
    expect(actor.getSnapshot().value).toBe("fading");
    actor.stop();
  });
});
