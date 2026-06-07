import type { Data } from "@puckeditor/core";
import type { FiberRegistry } from "../fiber/index.js";
import { buildTiling } from "./tiling.js";
import {
  stepCycle,
  type Destination,
  type DropTarget,
} from "./destinations.js";

/** Shift-cycle state over the destination stack. `anchorId` is the deepest
 *  container the cycle is bound to — when the pointer moves to a different
 *  deepest container the cycle deactivates and pointer resolution resumes.
 *  Empty `anchorId` means inactive (no container anchored). */
export type CycleState = { active: boolean; index: number; anchorId: string };

const IDLE: CycleState = { active: false, index: 0, anchorId: "" };

/** The deepest container under the pointer for the current stack: the parent of
 *  the first (deepest-slot) destination. Empty when the stack is empty. */
const deepestId = (stack: readonly Destination[]): string =>
  stack[0]?.parentId ?? "";

export const Cycle = {
  idle: IDLE,

  /** Rising shift edge: activate the cycle, or advance it one step. On a fresh
   *  activation (idle, or the pointer's deepest container changed since the last
   *  step) the cycle anchors AT `from` — the index the pointer currently aims at,
   *  not the stack head (default 0) — so the first press locks in the pointer's
   *  position rather than jumping to the first slot. Repeat presses within the
   *  same anchor advance one, wrapping at the end. Empty stack → idle. */
  step: (
    cycle: CycleState,
    stack: readonly Destination[],
    from = 0,
  ): CycleState => {
    const anchorId = deepestId(stack);
    if (!anchorId) return IDLE;
    if (!cycle.active || cycle.anchorId !== anchorId)
      return { active: true, index: from, anchorId };
    return {
      active: true,
      index: stepCycle(stack.length, cycle.index),
      anchorId,
    };
  },

  /** Pointer moved: the pointer reclaims selection — any move deactivates an
   *  active cycle so pointer resolution resumes. Idle stays idle. */
  reclaim: (cycle: CycleState): CycleState => (cycle.active ? IDLE : cycle),

  /** Pointer drifted within a drag: deactivate the cycle only when its anchored
   *  container is no longer the deepest under the pointer; same anchor holds. The
   *  drag monitor keeps the cycle sticky across small moves — carry instead
   *  `reclaim`s on every move. */
  syncPointer: (
    cycle: CycleState,
    stack: readonly Destination[],
  ): CycleState => {
    if (!cycle.active) return cycle;
    return cycle.anchorId === deepestId(stack) ? cycle : IDLE;
  },

  /** The destination the active cycle selects, when in range. */
  selected: (
    cycle: CycleState,
    stack: readonly Destination[],
  ): Destination | undefined =>
    cycle.active && cycle.index < stack.length ? stack[cycle.index] : undefined,

  /** Render/drop target for a cycle destination. A real parent paints its tiles
   *  with the chosen slot active and drops verbatim; root content has no border
   *  to tile and renders as a labeled root drop. */
  toTarget: (
    destination: Destination,
    data: Data,
    registry: FiberRegistry,
  ): DropTarget => {
    if (destination.parentId === null || destination.slotKey === null)
      return {
        kind: "root",
        index: destination.index,
        label: destination.label,
      };
    return {
      kind: "container",
      elementId: destination.parentId,
      slotKey: destination.slotKey,
      index: destination.index,
      tiling: buildTiling({
        data,
        containerId: destination.parentId,
        registry,
      }).tiling,
      activeLabel: destination.label,
    };
  },
} as const;
