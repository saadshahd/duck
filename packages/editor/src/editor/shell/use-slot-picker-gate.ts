import { useEffect } from "react";

/** Close the slot picker whenever the pointer leaves slot-selected state.
 *  Returns a tuple of [open, setOpen] so the caller owns the state while this
 *  hook owns the side-effect gate that resets it on state transition. */
export function useSlotPickerGate(
  pointer: string,
  setOpen: (open: boolean) => void,
): void {
  useEffect(() => {
    if (pointer !== "slot-selected") setOpen(false);
  }, [pointer, setOpen]);
}
