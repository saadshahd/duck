import { describe, it, expect } from "bun:test";
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Field } from "@puckeditor/core";
import { fieldsTree } from "./puck-fields-testing.js";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const controlField = (control: string): Field =>
  ({
    type: "select",
    options: [{ value: "a", label: "A" }],
    metadata: { control },
  }) as unknown as Field;

describe("PuckFields — re-target across elements with a shared field key", () => {
  // The sheet re-targets in place when selection moves. A field key that maps to
  // one control on element A (Segmented — no useState) and a different control on
  // element B (Spacing — adds useState) previously shared PuckFieldInput's fiber,
  // so the second render changed the hook order and crashed. Each renderer must
  // own its fiber so a control swap is an unmount+mount, never a hook mismatch.
  it("swapping the renderer at the same key does not throw a hooks-order error", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    try {
      act(() => {
        root.render(fieldsTree({ pad: controlField("segmented") }));
      });
      act(() => {
        root.render(fieldsTree({ pad: controlField("spacing") }));
      });
      expect(container.querySelector('[data-role="spacing"]')).not.toBeNull();
    } finally {
      act(() => root.unmount());
    }
  });
});
