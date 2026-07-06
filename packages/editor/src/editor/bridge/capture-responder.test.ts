import { describe, it, expect } from "bun:test";
import type { CaptureMode } from "@duckeditor/spec";
import { resolveCaptureTarget } from "./capture-responder.js";

const root = document.createElement("div");

describe("resolveCaptureTarget", () => {
  it("fullPage targets the root with no size override", () => {
    const target = resolveCaptureTarget({ mode: "fullPage" }, root);
    expect(target).toEqual({ element: root });
  });

  it("viewport targets the root sized to the window", () => {
    const target = resolveCaptureTarget({ mode: "viewport" }, root);
    expect(target).toEqual({
      element: root,
      width: window.innerWidth,
      height: window.innerHeight,
    });
  });

  it("element falls back to viewport sizing (no DOM id to resolve against)", () => {
    const mode: CaptureMode = { mode: "element", elementId: "abc" };
    expect(resolveCaptureTarget(mode, root)).toEqual(
      resolveCaptureTarget({ mode: "viewport" }, root),
    );
  });
});
