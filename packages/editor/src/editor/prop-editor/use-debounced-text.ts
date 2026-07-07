import { useEffect, useRef, useState } from "react";
import { CONTINUOUS_DEBOUNCE_MS } from "./commit-mode.js";

/** A text field's edit state. `committed` renders the stored value directly,
 *  so external data updates (agent pushes, undo) show through automatically.
 *  `drafting` is the designer's uncommitted keystrokes — a distinct state that
 *  external data changes must never overwrite. */
export type TextDraft =
  { status: "committed" } | { status: "drafting"; text: string };

const COMMITTED: TextDraft = { status: "committed" };

// edit :: string => TextDraft
const edit = (text: string): TextDraft => ({ status: "drafting", text });

// display :: (TextDraft, string) => string
const display = (draft: TextDraft, stored: string): string =>
  draft.status === "drafting" ? draft.text : stored;

export const TextDraft = { committed: COMMITTED, edit, display } as const;

/** Enter flushes a single-line input immediately; in a textarea plain Enter
 *  inserts a newline, so only Cmd/Ctrl+Enter flushes. */
export const shouldFlushOnEnter = (e: {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  currentTarget: { tagName: string };
}): boolean =>
  e.key === "Enter" &&
  (e.currentTarget.tagName !== "TEXTAREA" || e.metaKey || e.ctrlKey);

/** The `continuous` CommitMode core, decoupled from any input surface. A caller
 *  `push`es the latest string on each edit; it accumulates as a drafting state
 *  and flushes to `onChange` after CONTINUOUS_DEBOUNCE_MS, on `flush`, or is
 *  dropped by `cancel`. `state` distinguishes an in-flight draft from committed
 *  so an external data change updates untouched controls but never discards a
 *  draft. A DOM `<input>` reaches it through `useDebouncedText`; a Tiptap editor
 *  reaches it directly, pushing `editor.getHTML()`. */
export function useDebouncedCommit(onChange: (v: string) => void): {
  state: TextDraft;
  push: (text: string) => void;
  flush: () => void;
  cancel: () => void;
} {
  const [state, setState] = useState<TextDraft>(TextDraft.committed);
  const stateRef = useRef(state);
  stateRef.current = state;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const flush = () => {
    clearTimer();
    const current = stateRef.current;
    if (current.status !== "drafting") return;
    stateRef.current = TextDraft.committed;
    setState(TextDraft.committed);
    onChangeRef.current(current.text);
  };

  const cancel = () => {
    clearTimer();
    stateRef.current = TextDraft.committed;
    setState(TextDraft.committed);
  };

  const push = (text: string) => {
    const next = TextDraft.edit(text);
    stateRef.current = next;
    setState(next);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, CONTINUOUS_DEBOUNCE_MS);
  };

  useEffect(function clearPendingTimerOnUnmount() {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return { state, push, flush, cancel };
}

/** Debounced text editing over a committed value — a DOM `<input>`/`<textarea>`
 *  adapter over `useDebouncedCommit`. Keystrokes accumulate as a drafting state
 *  and flush after CONTINUOUS_DEBOUNCE_MS, on blur, or on Enter (Cmd/Ctrl+Enter
 *  in a textarea); between drafts the control mirrors the stored value, so an
 *  external data change updates untouched fields but never discards an in-flight
 *  draft. */
export function useDebouncedText(
  value: string,
  onChange: (v: string) => void,
): {
  draft: string;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleBlur: () => void;
  handleKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  /** Discard the in-flight draft without committing — for a sibling discrete
   *  control (chip click) that supersedes whatever was being typed; without
   *  this the pending timer would flush stale text over the chip's commit. */
  cancel: () => void;
} {
  const { state, push, flush, cancel } = useDebouncedCommit(onChange);
  return {
    draft: TextDraft.display(state, value),
    handleChange: (e) => push(e.target.value),
    handleBlur: flush,
    handleKeyDown: (e) => {
      if (shouldFlushOnEnter(e)) flush();
    },
    cancel,
  };
}
