import { useEffect, useRef } from "react";
import { tinykeys } from "tinykeys";
import { nextInTreeOrder, firstInTreeOrder } from "../spec-ops/index.js";
import type { ClipboardActions } from "../types.js";
import { isEditable } from "../overlay/index.js";
import { arrowToDirection } from "./navigation.js";
import {
  type NavContext,
  selected,
  notEditing,
  insertable,
  isDismissible,
  tabNavigable,
} from "./guards.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

// --- Event bindings: key → send(event) ---

type EventDef = {
  key: string;
  event: string;
  target: "machine" | "history";
  guard?: (nav: NavContext, e: KeyboardEvent) => boolean;
};

const EVENT_DEFS: EventDef[] = [
  { key: "Escape", event: "ESCAPE", target: "machine", guard: isDismissible },
  { key: "$mod+z", event: "UNDO", target: "history" },
  { key: "$mod+Shift+z", event: "REDO", target: "history" },
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
        e.preventDefault();
        sends[target]({ type: event });
      },
    ]),
  );

// --- Arrow navigation (custom dispatch: computes NavTarget) ---

const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"];

const sendNavTarget = (send: Send, targetId: string | null) =>
  targetId !== null
    ? send({ type: "SELECT", elementId: targetId })
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
          nextInTreeOrder(nav.data, nav.lastSelectedId!, direction),
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

const deleteBindings = (
  navRef: React.RefObject<NavContext>,
  onDeleteRef: React.RefObject<() => void>,
) =>
  Object.fromEntries(
    ["Backspace", "Delete"].map((key) => [
      key,
      (e: KeyboardEvent) => {
        if (!selected(navRef.current) || isEditable(e.target)) return;
        e.preventDefault();
        onDeleteRef.current();
      },
    ]),
  );

const liftBinding = (send: Send, navRef: React.RefObject<NavContext>) => ({
  Space: (e: KeyboardEvent) => {
    const nav = navRef.current;
    if (!selected(nav) || isEditable(e.target)) return;
    e.preventDefault();
    send({ type: "CARRY_START", sourceId: nav.lastSelectedId! });
  },
});

const insertBinding = (
  navRef: React.RefObject<NavContext>,
  onInsertRef: React.RefObject<() => void>,
) => ({
  "/": (e: KeyboardEvent) => {
    if (!insertable(navRef.current) || isEditable(e.target)) return;
    e.preventDefault();
    onInsertRef.current();
  },
});

// Tab walks the document in tree order.
// - No selection → select first element.
// - Selection active → select next (Tab) or previous (Shift+Tab) element.
// Guard: don't intercept Tab when focus is in an editable field or when an
// overlay picker is open (editing / inserting), so the user can Tab through
// the picker's controls normally.
const tabBindings = (send: Send, navRef: React.RefObject<NavContext>) => ({
  Tab: (e: KeyboardEvent) => {
    const nav = navRef.current;
    if (!tabNavigable(nav) || isEditable(e.target)) return;
    e.preventDefault();
    if (!selected(nav)) {
      const first = firstInTreeOrder(nav.data);
      if (first !== null) send({ type: "SELECT", elementId: first });
      return;
    }
    const next = nextInTreeOrder(nav.data, nav.lastSelectedId!, "forward");
    if (next !== null) send({ type: "SELECT", elementId: next });
  },
  "Shift+Tab": (e: KeyboardEvent) => {
    const nav = navRef.current;
    if (!tabNavigable(nav) || isEditable(e.target)) return;
    e.preventDefault();
    if (!selected(nav)) {
      const first = firstInTreeOrder(nav.data);
      if (first !== null) send({ type: "SELECT", elementId: first });
      return;
    }
    const prev = nextInTreeOrder(nav.data, nav.lastSelectedId!, "backward");
    if (prev !== null) send({ type: "SELECT", elementId: prev });
  },
});

export function useKeyboard(targets: {
  machine: Send;
  history: Send;
  nav: NavContext;
  clipboard: ClipboardActions;
  onDelete: () => void;
  onInsert: () => void;
}): void {
  const navRef = useRef(targets.nav);
  navRef.current = targets.nav;

  const cbRef = useRef(targets.clipboard);
  cbRef.current = targets.clipboard;

  const deleteRef = useRef(targets.onDelete);
  deleteRef.current = targets.onDelete;

  const insertRef = useRef(targets.onInsert);
  insertRef.current = targets.onInsert;

  useEffect(
    () =>
      tinykeys(window, {
        ...eventBindings(
          { machine: targets.machine, history: targets.history },
          navRef,
        ),
        ...arrowBindings(targets.machine, navRef),
        ...clipboardBindings(navRef, cbRef),
        ...deleteBindings(navRef, deleteRef),
        ...liftBinding(targets.machine, navRef),
        ...insertBinding(navRef, insertRef),
        ...tabBindings(targets.machine, navRef),
      }),
    [targets.machine, targets.history],
  );
}
