// Bake the MCP project's landing spec: sample-data + DESIGNER_DELTAS.
//
// The stored page must equal the designer's on-screen document at the moment
// the agent applies its edit — otherwise the agent's broadcast (which carries
// the full document) would visibly revert the designer's earlier edits.
//
// Usage: bun run scripts/demo-video/bake-spec.ts
import type { ComponentData, Data } from "@puckeditor/core";
import { DESIGNER_DELTAS, TARGETS } from "./story.ts";
import sampleData from "../../packages/editor/src/demo/sample-data.json";

const specPath = new URL("./project/pages/landing/data.json", import.meta.url)
  .pathname;

const visit = (nodes: ComponentData[], fn: (node: ComponentData) => void) => {
  for (const node of nodes) {
    fn(node);
    for (const value of Object.values(node.props as Record<string, unknown>)) {
      if (
        Array.isArray(value) &&
        value.every((v) => v && typeof v === "object" && "type" in v)
      ) {
        visit(value as ComponentData[], fn);
      }
    }
  }
};

const edits: Record<string, (props: Record<string, unknown>) => void> = {
  [TARGETS.heading]: (props) => {
    props.text = DESIGNER_DELTAS.headingText;
    props.style = {
      ...(props.style as Record<string, unknown>),
      color: DESIGNER_DELTAS.headingColor,
    };
  },
  [TARGETS.primaryButton]: (props) => {
    props.variant = DESIGNER_DELTAS.buttonVariant;
  },
};

// zones must be present: the editor normalizes its data to `{ ..., zones: {} }`,
// and a bridge push lacking `zones` fails the prop-echo deepEqual, RESETTING
// history — which silently kills Cmd+Z on the agent commit.
const data = { zones: {}, ...structuredClone(sampleData) } as Data;
visit(data.content, (node) => {
  const props = node.props as Record<string, unknown>;
  edits[props.id as string]?.(props);
});

await Bun.write(specPath, JSON.stringify(data, null, 2) + "\n");
// A crashed run can orphan a draft; a stale draft would poison the next apply.
const { unlink } = await import("node:fs/promises");
await unlink(specPath.replace("data.json", "data.draft.json")).catch(() => {});
console.log(`Baked ${specPath}`);
