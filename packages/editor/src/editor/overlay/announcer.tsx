import type React from "react";

const HIDDEN: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
};

/** Persistent aria-live region. Mount once; message changes are announced.
 *  `assertive` interrupts (mode changes); default polite (label echoes). */
export function Announcer({
  message,
  assertive,
}: {
  message: string;
  assertive?: boolean;
}) {
  return (
    <div
      data-role="announcer"
      aria-live={assertive ? "assertive" : "polite"}
      aria-atomic="true"
      style={HIDDEN}
    >
      {message}
    </div>
  );
}
