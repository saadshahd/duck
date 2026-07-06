import { useEffect, useRef, useState } from "react";

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

const DEBOUNCE_MS = 500;

/** Debounced text editing over a committed value. Keystrokes accumulate as a
 *  drafting state and flush to `onChange` after DEBOUNCE_MS or on blur; between
 *  drafts the control mirrors the stored value, so an external data change
 *  updates untouched fields but never discards an in-flight draft. */
export function useDebouncedText(
  value: string,
  onChange: (v: string) => void,
): {
  draft: string;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  handleBlur: () => void;
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
    }, DEBOUNCE_MS);
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
  };
}
