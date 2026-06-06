import { useEffect, useRef, useState } from "react";
import type { Data } from "@puckeditor/core";
import { findParent } from "@duckeditor/spec";
import type { FiberRegistry } from "../fiber/index.js";
import type { EditorEvent, EditorSnapshot } from "../machine/index.js";
import {
  destinationStack,
  Cycle,
  type CycleState,
  type Destination,
  type DropTarget,
} from "../layout/index.js";
import { animatedUpdate } from "../animated-update.js";
import { move } from "../spec-ops/index.js";
import type { EditorCommit } from "../types.js";

type Props = {
  registry: FiberRegistry | null;
  data: Data;
  state: EditorSnapshot;
  send: (event: EditorEvent) => void;
  commit: EditorCommit;
};

type Point = { x: number; y: number };

const stateOf = (s: EditorSnapshot) => s.value as { drag: string };

/** Pointer-driven move: while the FSM is `carrying`, the pointer position (and
 *  arrow/Shift steps) select one destination from the stack under it. Click on a
 *  valid destination commits the `move`; Esc cancels. Same resolver, tiles, and
 *  `move` op as drag — only the input is plain pointer events, not a native drag. */
export function useCarry({ registry, data, state, send, commit }: Props): {
  target: DropTarget | null;
  noTargetFlash: Point | null;
} {
  const [target, setTarget] = useState<DropTarget | null>(null);
  const [noTargetFlash, setNoTargetFlash] = useState<Point | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dataRef = useRef(data);
  dataRef.current = data;
  const commitRef = useRef(commit);
  commitRef.current = commit;

  const { drag } = stateOf(state);
  const sourceId = state.context.dragSourceId;
  const carrying = drag === "carrying";

  useEffect(() => {
    if (!registry || !carrying || !sourceId) return;

    // Set cursor on body for the duration of carry (body is outside shadow root).
    const prevCursor = document.body.style.cursor;
    document.body.style.cursor = "move";

    let raf = 0;
    // Seed from the carried element's center so a stationary lift (Space, toolbar
    // Move) resolves a destination immediately — before any pointer move.
    const sourceRect = registry.get(sourceId)?.getBoundingClientRect();
    let point = sourceRect
      ? {
          x: sourceRect.x + sourceRect.width / 2,
          y: sourceRect.y + sourceRect.height / 2,
        }
      : { x: 0, y: 0 };
    let cycle: CycleState = Cycle.idle;
    let selected: Destination | null = null;
    // The gesture that entered carry (toolbar click / Space) is still settling
    // when these listeners attach. Arm on the next tick so that entering event
    // cannot reach commit; genuinely later clicks/keys do.
    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 0);

    const stackAt = () =>
      destinationStack({
        point,
        data: dataRef.current,
        registry,
        excludeId: sourceId,
      });

    const render = (stack: readonly Destination[]) => {
      const picked = Cycle.selected(cycle, stack) ?? stack[0];
      selected = picked ?? null;
      setTarget(
        picked ? Cycle.toTarget(picked, dataRef.current, registry) : null,
      );
    };

    const onPointerMove = (e: PointerEvent) => {
      point = { x: e.clientX, y: e.clientY };
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const stack = stackAt();
        cycle = Cycle.syncPointer(cycle, stack);
        render(stack);
      });
    };

    const step = () => {
      const stack = stackAt();
      cycle = Cycle.step(cycle, stack);
      render(stack);
    };

    const flash = (p: Point) => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      setNoTargetFlash(p);
      flashTimerRef.current = setTimeout(() => {
        setNoTargetFlash(null);
        flashTimerRef.current = null;
      }, 300);
    };

    const commitMove = () => {
      if (!selected) {
        flash(point);
        return;
      }
      const dest = selected;
      const beforeData = dataRef.current;
      if (!findParent(beforeData, sourceId)) {
        flash(point);
        return;
      }
      setTarget(null);
      move(beforeData, sourceId, dest.parentId, dest.slotKey, dest.index).map(
        (next) => {
          animatedUpdate((d) => {
            commitRef.current({
              beforeData,
              afterData: d,
              label: "Moved element",
              resolve: { kind: "move", id: sourceId },
            });
          }, next);
        },
      );
      send({ type: "CARRY_COMMIT" });
    };

    const onClick = (e: MouseEvent) => {
      if (!armed) return; // The entering click — ignore it.
      e.preventDefault();
      e.stopPropagation();
      commitMove();
    };

    // Capture-phase: carry owns these keys while active and stops them before
    // the window-level keyboard machine sees them — so Escape cancels the move
    // without also deselecting, and Space/Enter never double-fire.
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setTarget(null);
        return send({ type: "CARRY_CANCEL" });
      }
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight" ||
        e.key === "Shift"
      ) {
        e.preventDefault();
        e.stopPropagation();
        return step();
      }
      if (e.key === "Enter" || e.key === " ") {
        if (!armed) return; // The Space that entered carry — ignore it.
        e.preventDefault();
        e.stopPropagation();
        commitMove();
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });

    render(stackAt());

    return () => {
      clearTimeout(armTimer);
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.body.style.cursor = prevCursor;
      setTarget(null);
      // Clear any pending flash timer on carry exit.
      if (flashTimerRef.current) {
        clearTimeout(flashTimerRef.current);
        flashTimerRef.current = null;
        setNoTargetFlash(null);
      }
    };
  }, [registry, carrying, sourceId, send]);

  return { target, noTargetFlash };
}
