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

/** Debounced text editing over a committed value — the `continuous` CommitMode
 *  interpreter. Keystrokes accumulate as a drafting state and flush to `onChange`
 *  after CONTINUOUS_DEBOUNCE_MS, on blur, or on Enter (Cmd/Ctrl+Enter in a
 *  textarea); between drafts the control mirrors the stored value, so an external
 *  data change updates untouched fields but never discards an in-flight draft. */
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
  const [draft, setDraft] = useState<TextDraft>(TextDraft.committed);
  const draftRef = useRef(draft);
  draftRef.current = draft;
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
    const current = draftRef.current;
    if (current.status !== "drafting") return;
    draftRef.current = TextDraft.committed;
    setDraft(TextDraft.committed);
    onChangeRef.current(current.text);
  };

  const cancel = () => {
    clearTimer();
    draftRef.current = TextDraft.committed;
    setDraft(TextDraft.committed);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const next = TextDraft.edit(e.target.value);
    draftRef.current = next;
    setDraft(next);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      flush();
    }, CONTINUOUS_DEBOUNCE_MS);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (shouldFlushOnEnter(e)) flush();
  };

  useEffect(function clearPendingTimerOnUnmount() {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  return {
    draft: TextDraft.display(draft, value),
    handleChange,
    handleBlur: flush,
    handleKeyDown,
    cancel,
  };
}
