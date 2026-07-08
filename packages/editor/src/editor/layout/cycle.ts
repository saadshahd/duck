import type { Data } from "@puckeditor/core";
import { parentIdOf } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import { buildTiling } from "./tiling.js";
import {
  stepCycle,
  stepCycleBack,
  type Destination,
  type DropTarget,
} from "./destinations.js";

/** Shift-cycle state over the destination stack. `anchorId` is the deepest
 *  container the cycle is bound to — when the pointer moves to a different
 *  deepest container the cycle deactivates and pointer resolution resumes.
 *  Empty `anchorId` means inactive (no container anchored). */
export type CycleState = { active: boolean; index: number; anchorId: string };

/** The cycle chip's disclosure datum across a modality's lifetime. At entry —
 *  before any step — it names the cycle key for the active modality; once stepping
 *  starts it carries the 1-based N-of-M counter. Shared by drag and carry so
 *  neither domain re-declares the chip's contract. */
export type CycleStatus =
  | { phase: "entry"; modality: "drag" | "carry" }
  | { phase: "stepping"; step: number; total: number };

/** Stable equality for CycleStatus: avoids re-renders when the disclosure datum
 *  hasn't changed. Both domains share this predicate — single source of truth. */
export const sameStatus = (
  a: CycleStatus | null,
  b: CycleStatus | null,
): boolean => {
  if (!a || !b) return a === b;
  if (a.phase !== b.phase) return false;
  if (a.phase === "entry" && b.phase === "entry")
    return a.modality === b.modality;
  if (a.phase === "stepping" && b.phase === "stepping")
    return a.step === b.step && a.total === b.total;
  return false;
};

const IDLE: CycleState = { active: false, index: 0, anchorId: "" };

/** The deepest container under the pointer for the current stack: the parent of
 *  the first (deepest-slot) destination. Empty when the stack is empty. */
const deepestId = (stack: readonly Destination[]): string =>
  parentIdOf(stack[0] ?? { at: "root" }) ?? "";

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

  /** Rising reverse edge: same anchor semantics as `step`, but wraps backward
   *  using (i−1+N)%N. On a fresh activation the anchor starts AT `from` (same as
   *  `step`) — the first press locks the pointer's position, then reverse steps
   *  from there. */
  stepBack: (
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
      index: stepCycleBack(stack.length, cycle.index),
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

  /** Compute the cycle chip's disclosure datum for the current frame.
   *  Stepping (N-of-M) when the cycle is active and the stack is non-empty;
   *  entry (name the key) otherwise. Both drag and carry share this path —
   *  the caller supplies the modality literal. */
  status: (
    cycle: CycleState,
    stackLength: number,
    modality: "drag" | "carry",
  ): CycleStatus =>
    cycle.active && stackLength > 0
      ? { phase: "stepping", step: cycle.index + 1, total: stackLength }
      : { phase: "entry", modality },

  /** Render/drop target for a cycle destination. A real parent paints its tiles
   *  with the chosen slot active and drops verbatim; root content has no border
   *  to tile and renders as a labeled root drop. */
  toTarget: (
    destination: Destination,
    data: Data,
    registry: FiberRegistry,
  ): DropTarget => {
    if (destination.at !== "slot")
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
