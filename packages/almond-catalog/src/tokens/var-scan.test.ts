/**
 * Enforcement layer (b) — the static var-ref scan (sp-64 §2.6.2).
 *
 * Grep every `var(--…)` reference in the component sources and assert each is either a
 * contract token OR a custom property the component layer DECLARES itself. This is the
 * guardrail that stops a component reaching past the semantic layer into a ramp step
 * (`--accent-600`), a pruned shadcn token (`--card`), or a typo — none of which the
 * layer declares. A component may still own structural custom properties it both sets
 * and reads (e.g. `CollectionGrid`'s `--cols-*`, set inline from the child count and
 * consumed by media queries): self-owned, they can't leak past the semantic layer, so
 * they are allowed while off-contract theme reaches stay caught. Components must style
 * in a statically-greppable form — a directly-authored `var(--…)`, not a value
 * assembled at runtime.
 */

import { describe, expect, test } from "bun:test";
import { CONTRACT } from "./contract";

const COMPONENTS_DIR = new URL("../components/", import.meta.url).pathname;
const CONTRACT_SET = new Set<string>(CONTRACT);
const VAR_REF = /var\(\s*(--[a-z0-9-]+)/gi;
// A custom-property DECLARATION: `--x:` in CSS or `"--x":` in a JS style object.
const VAR_DECL = /(--[a-z0-9-]+)"?\s*:/gi;

interface Scan {
  reads: Map<string, string[]>; // token → files that read it via var(--…)
  declared: Set<string>; // custom props the component layer declares itself
}

async function scanComponentSources(): Promise<Scan> {
  const glob = new Bun.Glob("**/*.{css,ts,tsx}");
  const reads = new Map<string, string[]>();
  const declared = new Set<string>();
  for await (const rel of glob.scan({ cwd: COMPONENTS_DIR })) {
    const source = await Bun.file(COMPONENTS_DIR + rel).text();
    for (const match of source.matchAll(VAR_REF)) {
      const token = match[1];
      const files = reads.get(token) ?? [];
      if (!files.includes(rel)) files.push(rel);
      reads.set(token, files);
    }
    for (const match of source.matchAll(VAR_DECL)) declared.add(match[1]);
  }
  return { reads, declared };
}

describe("component var(--…) refs ⊆ contract ∪ self-declared", () => {
  test("scan finds at least one reference (the scanner works)", async () => {
    const { reads } = await scanComponentSources();
    expect(reads.size).toBeGreaterThan(0);
  });

  test("every referenced token is a contract token or one the layer declares", async () => {
    const { reads, declared } = await scanComponentSources();
    const offContract = [...reads.entries()]
      .filter(([token]) => !CONTRACT_SET.has(token) && !declared.has(token))
      .map(([token, files]) => `${token} (in ${files.join(", ")})`);
    expect(offContract).toEqual([]);
  });
});
