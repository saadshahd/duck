import { useEffect, useRef } from "react";
import { tinykeys } from "tinykeys";
import type { Spec } from "@json-render/core";
import { nextInTreeOrder, type NavTarget } from "../spec-ops/index.js";
import type { ClipboardActions } from "../clipboard/index.js";
import { isEditable } from "../overlay/index.js";
import { arrowToDirection } from "./navigation.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

type NavContext = {
  spec: Spec;
  selectedId: string | null;
  pointer: string;
};

// --- Guards ---

const selected = (nav: NavContext): boolean =>
  nav.pointer === "selected" && nav.selectedId !== null;

const notEditing = (nav: NavContext): boolean => nav.pointer !== "editing";

// --- Event bindings: key → send(event) ---

type EventDef = {
  key: string;
  event: string;
  target: "machine" | "history";
  guard?: (nav: NavContext, e: KeyboardEvent) => boolean;
};

const EVENT_DEFS: EventDef[] = [
  { key: "Escape", event: "ESCAPE", target: "machine" },
  { key: "$mod+z", event: "UNDO", target: "history" },
  { key: "$mod+Shift+z", event: "REDO", target: "history" },
  {
    key: "/",
    event: "OPEN_INSERT",
    target: "machine",
    guard: (nav, e) => selected(nav) && !isEditable(e.target),
  },
];

const eventBindings = (
  sends: Record<string, Send>,
  navRef: React.RefObject<NavContext>,
) =>
  Object.fromEntries(
    EVENT_DEFS.map(({ key, event, target, guard }) => [
      key,
      (e: KeyboardEvent) => {
        if (guard && !guard(navRef.current, e)) return;
        if (key !== "Escape") e.preventDefault();
        sends[target]({ type: event });
      },
    ]),
  );

// --- Arrow navigation (custom dispatch: computes NavTarget) ---

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const sendNavTarget = (send: Send, target: NavTarget) =>
  target.tag === "select"
    ? send({ type: "SELECT", elementId: target.targetId })
    : send({ type: "DESELECT" });

const arrowBindings = (send: Send, navRef: React.RefObject<NavContext>) =>
  Object.fromEntries(
    ARROW_KEYS.map((key) => [
      key,
      (e: KeyboardEvent) => {
        const nav = navRef.current;
        if (!selected(nav)) return;

        const direction = arrowToDirection(key);
        if (!direction) return;

        e.preventDefault();
        sendNavTarget(
          send,
          nextInTreeOrder(nav.spec, nav.selectedId!, direction),
        );
      },
    ]),
  );

// --- Clipboard (custom dispatch: routes to ClipboardActions) ---

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
        const nav = navRef.current;
        if (!notEditing(nav)) return;
        if (action !== "onPaste" && !selected(nav)) return;

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
        ...eventBindings(
          { machine: targets.machine, history: targets.history },
          navRef,
        ),
        ...arrowBindings(targets.machine, navRef),
        ...clipboardBindings(navRef, cbRef),
      }),
    [targets.machine, targets.history],
  );
}
