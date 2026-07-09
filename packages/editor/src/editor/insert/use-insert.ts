import { useCallback, useRef } from "react";
import type { ComponentData, Config, Data } from "@puckeditor/core";
import type { ParentSite } from "@duckeditor/spec";
import type { Result } from "neverthrow";
import { add, mintId, takenIds, type SpecOpsError } from "../spec-ops/index.js";
import type { EditorEvent } from "../machine/index.js";
import type { EditorCommit } from "../types.js";
import { routeInsert, directTarget } from "./route.js";

type InsertDeps = {
  data: Data;
  config: Config;
  lastSelectedId: string | null;
  pointer: string;
  send: (event: EditorEvent) => void;
  commit: EditorCommit;
};

export type InsertTarget = ParentSite & { index?: number };

/** The write target for a direct (non-slot-choice) insert. A slot-choice route
 *  must have been resolved to an explicit target upstream (the slot picker), so
 *  reaching here with one is a wiring defect — surface it and write nothing,
 *  never silently append to the root. */
const resolveDirectTarget = (
  data: Data,
  selectedId: string | null,
): InsertTarget | undefined => {
  const route = routeInsert(data, selectedId);
  if (route.kind === "slot-choice") {
    console.error(
      "useInsert: slot-choice route reached the direct insert path without an explicit target",
      route,
    );
    return undefined;
  }
  return directTarget(route);
};

/** The event an insert intent dispatches, routed without a silent slot default:
 *  - in slot-selected a slot is ALREADY chosen — open the picker for it
 *    (OPEN_INSERT). Never re-route: re-choosing the first slot would silently
 *    reset the user's choice. Retargeting a slot is the band click's job (R11).
 *  - a multi-slot node enters the slot-choice step (slot-selected, every band
 *    painted) — the user picks the slot, then opens the picker.
 *  - a single-slot node inserts in ONE action: straight to the picker with its
 *    one slot named on screen (no choice to make).
 *  - anything else opens the direct (sibling/root) picker. */
export const openInsertEvent = (args: {
  data: Data;
  lastSelectedId: string | null;
  pointer: string;
}): EditorEvent => {
  if (args.pointer === "slot-selected") return { type: "OPEN_INSERT" };
  const route = routeInsert(args.data, args.lastSelectedId);
  if (route.kind !== "slot-choice") return { type: "OPEN_INSERT" };
  return route.paths.length === 1
    ? {
        type: "OPEN_INSERT_SLOT",
        parentId: route.parentId,
        path: route.paths[0],
      }
    : {
        type: "SELECT_SLOT",
        parentId: route.parentId,
        path: route.paths[0],
      };
};

/** Void when no write was attempted (the wiring defect is surfaced upstream);
 *  otherwise the outcome of the add — an Err MUST reach the caller so the
 *  picker can show the rejection instead of silently doing nothing. */
export type InsertOutcome = Result<void, SpecOpsError> | void;

export function useInsert(deps: InsertDeps): {
  openInsert: () => void;
  onInsert: (
    componentType: string,
    explicitTarget?: InsertTarget,
  ) => InsertOutcome;
} {
  const ref = useRef(deps);
  ref.current = deps;

  const openInsert = useCallback(() => {
    const { data, lastSelectedId, pointer, send } = ref.current;
    send(openInsertEvent({ data, lastSelectedId, pointer }));
  }, []);

  const onInsert = useCallback(
    (componentType: string, explicitTarget?: InsertTarget): InsertOutcome => {
      const { data, config, lastSelectedId, send, commit } = ref.current;

      const target =
        explicitTarget ?? resolveDirectTarget(data, lastSelectedId);
      if (!target) return;

      const id = mintId(componentType, takenIds(data));
      const component: ComponentData = {
        type: componentType,
        props: { id },
      };

      return add(data, { site: target, component, index: target.index }, config)
        .map((next) => {
          commit({
            beforeData: data,
            afterData: next,
            label: `Added ${componentType}`,
            resolve: { kind: "insert", id },
          });
          send({ type: "SELECT", elementId: id });
        })
        .orTee((error) => console.error("useInsert: insert rejected", error));
    },
    [],
  );

  return { openInsert, onInsert };
}
