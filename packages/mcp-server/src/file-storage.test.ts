import { describe, it, expect } from "bun:test";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Effect } from "effect";
import type { Data } from "@puckeditor/core";
import { createFileStorage } from "./file-storage.js";

const makeData = (componentCount = 2): Data => ({
  root: { props: {} },
  content: Array.from({ length: componentCount }, (_, i) => ({
    type: "Text",
    props: { id: `el-${i}`, text: `Item ${i}` },
  })),
});

const expectFailTag = async <E extends { readonly _tag: string }>(
  effect: Effect.Effect<unknown, E>,
  tag: E["_tag"],
) => {
  const error = await Effect.runPromise(Effect.flip(effect));
  expect(error._tag).toBe(tag);
  return error;
};

const setup = async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "jre-storage-test-"));
  const storage = createFileStorage(tmpDir);
  const teardown = () => fs.rm(tmpDir, { recursive: true, force: true });
  return { storage, teardown };
};

describe("FileStorage", () => {
  it("writes and reads back data", async () => {
    const { storage, teardown } = await setup();
    try {
      const data = makeData(5);
      const result = await Effect.runPromise(
        storage
          .writeData("landing", data)
          .pipe(Effect.flatMap(() => storage.readData("landing"))),
      );
      expect(result).toEqual(data);
    } finally {
      await teardown();
    }
  });

  it("draft lifecycle: write → read → commit → verify → gone", async () => {
    const { storage, teardown } = await setup();
    try {
      const original = makeData(2);
      const draft = makeData(4);

      await Effect.runPromise(storage.writeData("landing", original));
      await Effect.runPromise(storage.writeDraft("landing", draft));

      const readDraft = await Effect.runPromise(storage.readDraft("landing"));
      expect(readDraft).toEqual(draft);

      await Effect.runPromise(storage.commitDraft("landing"));

      const committed = await Effect.runPromise(storage.readData("landing"));
      expect(committed).toEqual(draft);

      const after = await Effect.runPromise(storage.readDraft("landing"));
      expect(after).toBeNull();
    } finally {
      await teardown();
    }
  });

  it("discard: write draft → discard → gone", async () => {
    const { storage, teardown } = await setup();
    try {
      await Effect.runPromise(storage.writeData("landing", makeData()));
      await Effect.runPromise(storage.writeDraft("landing", makeData(3)));
      await Effect.runPromise(storage.discardDraft("landing"));

      const result = await Effect.runPromise(storage.readDraft("landing"));
      expect(result).toBeNull();
    } finally {
      await teardown();
    }
  });

  it("discard non-existent draft succeeds", async () => {
    const { storage, teardown } = await setup();
    try {
      await Effect.runPromise(storage.writeData("landing", makeData()));
      await Effect.runPromise(storage.discardDraft("landing"));
    } finally {
      await teardown();
    }
  });

  it("commit without draft fails with NotFound", async () => {
    const { storage, teardown } = await setup();
    try {
      await Effect.runPromise(storage.writeData("landing", makeData()));
      const err = await expectFailTag(
        storage.commitDraft("landing"),
        "NotFound",
      );
      expect("entity" in err && err.entity).toBe("draft");
    } finally {
      await teardown();
    }
  });

  it("list pages returns correct info", async () => {
    const { storage, teardown } = await setup();
    try {
      await Effect.runPromise(storage.writeData("landing", makeData(3)));
      await Effect.runPromise(storage.writeData("about", makeData(5)));
      await Effect.runPromise(storage.writeData("contact", makeData(2)));
      await Effect.runPromise(storage.writeDraft("about", makeData(6)));

      const pages = await Effect.runPromise(storage.listPages());
      const sorted = pages.sort((a, b) => a.name.localeCompare(b.name));

      expect(sorted).toEqual([
        { name: "about", componentCount: 5, hasDraft: true },
        { name: "contact", componentCount: 2, hasDraft: false },
        { name: "landing", componentCount: 3, hasDraft: false },
      ]);
    } finally {
      await teardown();
    }
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
        const { storage, teardown } = await setup();
        try {
          await expectFailTag(storage.readData(name), "InvalidPageName");
        } finally {
          await teardown();
        }
      });
    }
  });

  it("read non-existent page fails with NotFound", async () => {
    const { storage, teardown } = await setup();
    try {
      const err = await expectFailTag(
        storage.readData("nonexistent"),
        "NotFound",
      );
      expect("entity" in err && err.entity).toBe("page");
    } finally {
      await teardown();
    }
  });

  it("list pages on empty project returns []", async () => {
    const { storage, teardown } = await setup();
    try {
      const pages = await Effect.runPromise(storage.listPages());
      expect(pages).toEqual([]);
    } finally {
      await teardown();
    }
  });

  it("atomic write preserves integrity for large data", async () => {
    const { storage, teardown } = await setup();
    try {
      const big = makeData(200);
      await Effect.runPromise(storage.writeData("big", big));
      const result = await Effect.runPromise(storage.readData("big"));
      expect(result).toEqual(big);
      expect(result.content).toHaveLength(200);
    } finally {
      await teardown();
    }
  });
});
