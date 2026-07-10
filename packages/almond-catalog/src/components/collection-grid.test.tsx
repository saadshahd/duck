import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CollectionGrid,
  resolveColumns,
  type Columns,
} from "./collection-grid";

// A representative declared contract with every breakpoint distinct, so a change at
// any breakpoint is observable.
const columns: Columns = { base: 1, sm: 2, md: 3, lg: 3 };
const COUNTS = [0, 1, 3, 7];

describe("resolveColumns — layout-contract engine", () => {
  test("reflow keeps the declared columns at every count (ghost tracks stay)", () => {
    const declared = { base: 1, sm: 2, md: 3, lg: 3 };
    for (const count of COUNTS) {
      expect(
        resolveColumns({ columns, count, degrade: { rule: "reflow" } }),
      ).toEqual(declared);
    }
  });

  test("balance is vacuous at n=0 — nothing to redistribute", () => {
    expect(
      resolveColumns({ columns, count: 0, degrade: { rule: "balance" } }),
    ).toEqual({ base: 1, sm: 2, md: 3, lg: 3 });
  });

  test("balance collapses to the item count when items are fewer than columns", () => {
    expect(
      resolveColumns({ columns, count: 1, degrade: { rule: "balance" } }),
    ).toEqual({ base: 1, sm: 1, md: 1, lg: 1 });
  });

  test("balance uses the declared columns once items meet or exceed them", () => {
    for (const count of [3, 7]) {
      expect(
        resolveColumns({ columns, count, degrade: { rule: "balance" } }),
      ).toEqual({ base: 1, sm: 2, md: 3, lg: 3 });
    }
  });

  test("cap clamps every breakpoint to its ceiling, independent of count", () => {
    for (const count of COUNTS) {
      expect(
        resolveColumns({ columns, count, degrade: { rule: "cap", max: 2 } }),
      ).toEqual({ base: 1, sm: 2, md: 2, lg: 2 });
    }
  });
});

describe("CollectionGrid — count projection", () => {
  test("projects the resolved base columns onto --cols-base from its child count", () => {
    const html = renderToStaticMarkup(
      <CollectionGrid columns={{ base: 3 }} degrade={{ rule: "balance" }}>
        <span>one</span>
      </CollectionGrid>,
    );
    // one child under a 3-col balance grid → collapses to a single column
    expect(html).toContain("--cols-base:1");
  });

  test("absorbs n=0 without error, still emitting a valid grid", () => {
    const html = renderToStaticMarkup(
      <CollectionGrid columns={{ base: 2, md: 4 }} degrade={{ rule: "reflow" }}>
        {[]}
      </CollectionGrid>,
    );
    expect(html).toContain("--cols-base:2");
    expect(html).toContain("--cols-md:4");
  });
});
