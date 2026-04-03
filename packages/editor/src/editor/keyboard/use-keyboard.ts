import { useEffect, useRef } from "react";
import { tinykeys } from "tinykeys";
import type { Spec } from "@json-render/core";
import { nextInTreeOrder, type NavTarget } from "../spec-ops/index.js";
import type { ClipboardActions } from "../clipboard/index.js";
import { arrowToDirection } from "./navigation.js";

// Widened — type safety comes from the static BINDINGS maps, not this signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

type NavContext = {
  spec: Spec;
  selectedId: string | null;
  pointer: string;
};

// --- Static binding maps ---

const MACHINE_BINDINGS: Record<string, string> = {
  Escape: "ESCAPE",
};

const HISTORY_BINDINGS: Record<string, string> = {
  "$mod+z": "UNDO",
  "$mod+Shift+z": "REDO",
};

// --- Pure helpers ---

const eventBindings = (send: Send, map: Record<string, string>) =>
  Object.fromEntries(
    Object.entries(map).map(([key, type]) => [
      key,
      (e: KeyboardEvent) => {
        if (key !== "Escape") e.preventDefault();
        send({ type });
      },
    ]),
  );

const sendNavTarget = (send: Send, target: NavTarget) =>
  target.tag === "select"
    ? send({ type: "SELECT", elementId: target.targetId })
    : send({ type: "DESELECT" });

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const arrowBindings = (send: Send, navRef: React.RefObject<NavContext>) =>
  Object.fromEntries(
    ARROW_KEYS.map((key) => [
      key,
      (e: KeyboardEvent) => {
        const { spec, selectedId, pointer } = navRef.current;
        if (pointer !== "selected" || !selectedId) return;

        const direction = arrowToDirection(key);
        if (!direction) return;

        e.preventDefault();
        sendNavTarget(send, nextInTreeOrder(spec, selectedId, direction));
      },
    ]),
  );

const CLIPBOARD_KEYS: Record<string, keyof ClipboardActions> = {
  "$mod+c": "onCopy",
  "$mod+x": "onCut",
  "$mod+v": "onPaste",
  "$mod+d": "onDuplicate",
};

const clipboardBindings = (
  navRef: React.RefObject<NavContext>,
  cbRef: React.RefObject<ClipboardActions>,
) =>
  Object.fromEntries(
    Object.entries(CLIPBOARD_KEYS).map(([key, action]) => [
      key,
      (e: KeyboardEvent) => {
        const { pointer, selectedId } = navRef.current;
        const needsSelection = action !== "onPaste";
        if (pointer === "editing") return;
        if (needsSelection && (pointer !== "selected" || !selectedId)) return;

        e.preventDefault();
        cbRef.current[action]();
      },
    ]),
  );

// --- Hook ---

export function useKeyboard(targets: {
  machine: Send;
  history: Send;
  nav: NavContext;
  clipboard: ClipboardActions;
}): void {
  const navRef = useRef(targets.nav);
  navRef.current = targets.nav;

  const cbRef = useRef(targets.clipboard);
  cbRef.current = targets.clipboard;

  useEffect(
    () =>
      tinykeys(window, {
        ...eventBindings(targets.machine, MACHINE_BINDINGS),
        ...eventBindings(targets.history, HISTORY_BINDINGS),
        ...arrowBindings(targets.machine, navRef),
        ...clipboardBindings(navRef, cbRef),
      }),
    [targets.machine, targets.history],
  );
}
