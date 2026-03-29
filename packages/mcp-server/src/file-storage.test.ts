import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Effect } from "effect";
import type { Spec } from "@json-render/core";
import { createFileStorage } from "./file-storage.js";
import type { Storage } from "./storage.js";

const makeSpec = (elementCount = 2): Spec => ({
  root: "root",
  elements: Object.fromEntries([
    [
      "root",
      {
        type: "Box",
        props: {},
        children: Array.from({ length: elementCount - 1 }, (_, i) => `el-${i}`),
      },
    ],
    ...Array.from({ length: elementCount - 1 }, (_, i) => [
      `el-${i}`,
      { type: "Text", props: { text: `Item ${i}` } },
    ]),
  ]),
});

const expectFailTag = async <E extends { readonly _tag: string }>(
  effect: Effect.Effect<unknown, E>,
  tag: E["_tag"],
) => {
  const error = await Effect.runPromise(Effect.flip(effect));
  expect(error._tag).toBe(tag);
  return error;
};

let tmpDir: string;
let storage: Storage;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-storage-test-"));
  storage = createFileStorage(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe("FileStorage", () => {
  it("writes and reads back a spec", async () => {
    const spec = makeSpec(5);
    const result = await Effect.runPromise(
      storage
        .writeSpec("landing", spec)
        .pipe(Effect.flatMap(() => storage.readSpec("landing"))),
    );
    expect(result).toEqual(spec);
  });

  it("draft lifecycle: write → read → commit → verify → gone", async () => {
    const original = makeSpec(2);
    const draft = makeSpec(4);

    await Effect.runPromise(storage.writeSpec("landing", original));
    await Effect.runPromise(storage.writeDraft("landing", draft));

    const readDraft = await Effect.runPromise(storage.readDraft("landing"));
    expect(readDraft).toEqual(draft);

    await Effect.runPromise(storage.commitDraft("landing"));

    const committed = await Effect.runPromise(storage.readSpec("landing"));
    expect(committed).toEqual(draft);

    const draftAfterCommit = await Effect.runPromise(
      storage.readDraft("landing"),
    );
    expect(draftAfterCommit).toBeNull();
  });

  it("discard: write draft → discard → gone", async () => {
    await Effect.runPromise(storage.writeSpec("landing", makeSpec()));
    await Effect.runPromise(storage.writeDraft("landing", makeSpec(3)));
    await Effect.runPromise(storage.discardDraft("landing"));

    const result = await Effect.runPromise(storage.readDraft("landing"));
    expect(result).toBeNull();
  });

  it("discard non-existent draft succeeds", async () => {
    await Effect.runPromise(storage.writeSpec("landing", makeSpec()));
    await Effect.runPromise(storage.discardDraft("landing"));
  });

  it("commit without draft fails with NotFound", async () => {
    await Effect.runPromise(storage.writeSpec("landing", makeSpec()));
    const err = await expectFailTag(storage.commitDraft("landing"), "NotFound");
    expect("entity" in err && err.entity).toBe("draft");
  });

  it("list pages returns correct info", async () => {
    await Effect.runPromise(storage.writeSpec("landing", makeSpec(3)));
    await Effect.runPromise(storage.writeSpec("about", makeSpec(5)));
    await Effect.runPromise(storage.writeSpec("contact", makeSpec(2)));
    await Effect.runPromise(storage.writeDraft("about", makeSpec(6)));

    const pages = await Effect.runPromise(storage.listPages());
    const sorted = pages.sort((a, b) => a.name.localeCompare(b.name));

    expect(sorted).toEqual([
      { name: "about", elementCount: 5, hasDraft: true },
      { name: "contact", elementCount: 2, hasDraft: false },
      { name: "landing", elementCount: 3, hasDraft: false },
    ]);
  });

  describe("invalid page names", () => {
    const invalidNames = [
      "UPPER",
      "has spaces",
      "has.dots",
      "has/slash",
      "-starts-with-dash",
      "ends-with-dash-",
      "a".repeat(65),
      "",
    ];

    for (const name of invalidNames) {
      it(`rejects "${name}"`, async () => {
        await expectFailTag(storage.readSpec(name), "InvalidPageName");
      });
    }
  });

  it("read non-existent page fails with NotFound", async () => {
    const err = await expectFailTag(
      storage.readSpec("nonexistent"),
      "NotFound",
    );
    expect("entity" in err && err.entity).toBe("page");
  });

  it("list pages on empty project returns []", async () => {
    const pages = await Effect.runPromise(storage.listPages());
    expect(pages).toEqual([]);
  });

  it("atomic write preserves integrity for large specs", async () => {
    const largeSpec = makeSpec(200);
    await Effect.runPromise(storage.writeSpec("big", largeSpec));
    const result = await Effect.runPromise(storage.readSpec("big"));
    expect(result).toEqual(largeSpec);
    expect(Object.keys(result.elements)).toHaveLength(200);
  });
});
