import { useEffect } from "react";
import { tinykeys } from "tinykeys";

// Widened — type safety comes from the static BINDINGS maps, not this signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Send = (event: any) => void;

const MACHINE_BINDINGS = {
  Escape: "ESCAPE",
} as const;

const HISTORY_BINDINGS = {
  "$mod+z": "UNDO",
  "$mod+Shift+z": "REDO",
} as const;

export function useKeyboard(targets: { machine: Send; history: Send }): void {
  useEffect(() => {
    const bind = (send: Send, map: Record<string, string>) =>
      Object.fromEntries(
        Object.entries(map).map(([key, type]) => [
          key,
          (e: KeyboardEvent) => {
            if (key !== "Escape") e.preventDefault();
            send({ type });
          },
        ]),
      );

    return tinykeys(window, {
      ...bind(targets.machine, MACHINE_BINDINGS),
      ...bind(targets.history, HISTORY_BINDINGS),
    });
  }, [targets.machine, targets.history]);
}
