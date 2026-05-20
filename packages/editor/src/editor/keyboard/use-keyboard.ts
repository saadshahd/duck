import { useEffect, useRef } from "react";
import { tinykeys } from "tinykeys";
import type { Data } from "@puckeditor/core";
import { nextInTreeOrder } from "../spec-ops/index.js";
import { Target } from "../machine/index.js";
import type { ClipboardActions } from "../types.js";
import { isEditable } from "../overlay/index.js";
import { arrowToDirection } from "./navigation.js";
import { parentTarget } from "./parent-target.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

type NavContext = {
  data: Data;
  selection: Target | null;
  pointer: string;
};

// --- Guards ---

const isElementSelected = (nav: NavContext): boolean =>
  nav.pointer === "selected" && nav.selection?.kind === "element";

const notEditing = (nav: NavContext): boolean => nav.pointer !== "editing";

// --- Event bindings: key → send(event) ---

type EventDef = {
  key: string;
  event: string;
  target: "machine" | "history";
  guard?: (nav: NavContext, e: KeyboardEvent) => boolean;
};

const EVENT_DEFS: EventDef[] = [
  { key: "$mod+z", event: "UNDO", target: "history" },
  { key: "$mod+Shift+z", event: "REDO", target: "history" },
  {
    key: "/",
    event: "OPEN_INSERT",
    target: "machine",
    guard: (nav, e) =>
      nav.pointer === "selected" &&
      nav.selection !== null &&
      !isEditable(e.target),
  },
];

/** Esc traversal: child element → enclosing slot → parent element → cleared. */
const escapeBinding = (send: Send, navRef: React.RefObject<NavContext>) => ({
  Escape: () => {
    const nav = navRef.current;
    if (nav.pointer === "editing" || nav.pointer === "inserting") {
      send({ type: "ESCAPE" });
      return;
    }
    if (nav.pointer === "selected" && nav.selection) {
      const next = parentTarget(nav.data, nav.selection);
      if (next) {
        send({ type: "SELECT", target: next });
        return;
      }
    }
    send({ type: "ESCAPE" });
  },
});

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

// --- Arrow navigation ---

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const sendNavTarget = (send: Send, targetId: string | null) =>
  targetId !== null
    ? send({ type: "SELECT", target: Target.element(targetId) })
    : send({ type: "DESELECT" });

const arrowBindings = (send: Send, navRef: React.RefObject<NavContext>) =>
  Object.fromEntries(
    ARROW_KEYS.map((key) => [
      key,
      (e: KeyboardEvent) => {
        const nav = navRef.current;
        const elementId = Target.elementId(nav.selection);
        if (!isElementSelected(nav) || !elementId) return;

        const direction = arrowToDirection(key);
        if (!direction) return;

        e.preventDefault();
        sendNavTarget(send, nextInTreeOrder(nav.data, elementId, direction));
      },
    ]),
  );

// --- Clipboard ---

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
        if (action !== "onPaste" && !isElementSelected(nav)) return;

        e.preventDefault();
        cbRef.current[action]();
      },
    ]),
  );

// --- Delete ---

const deleteBindings = (
  navRef: React.RefObject<NavContext>,
  onDeleteRef: React.RefObject<() => void>,
) =>
  Object.fromEntries(
    ["Backspace", "Delete"].map((key) => [
      key,
      (e: KeyboardEvent) => {
        if (!isElementSelected(navRef.current) || isEditable(e.target)) return;
        e.preventDefault();
        onDeleteRef.current();
      },
    ]),
  );

// --- Hook ---

export function useKeyboard(targets: {
  machine: Send;
  history: Send;
  nav: NavContext;
  clipboard: ClipboardActions;
  onDelete: () => void;
}): void {
  const navRef = useRef(targets.nav);
  navRef.current = targets.nav;

  const cbRef = useRef(targets.clipboard);
  cbRef.current = targets.clipboard;

  const deleteRef = useRef(targets.onDelete);
  deleteRef.current = targets.onDelete;

  useEffect(
    () =>
      tinykeys(window, {
        ...eventBindings(
          { machine: targets.machine, history: targets.history },
          navRef,
        ),
        ...escapeBinding(targets.machine, navRef),
        ...arrowBindings(targets.machine, navRef),
        ...clipboardBindings(navRef, cbRef),
        ...deleteBindings(navRef, deleteRef),
      }),
    [targets.machine, targets.history],
  );
}
