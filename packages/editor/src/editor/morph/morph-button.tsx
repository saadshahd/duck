import { useRef } from "react";
import type { Ref } from "react";
import { useShadowSheet } from "../overlay/index.js";
import css from "./morph.css?inline";

type Props = {
  count: number;
  elementId: string;
  onClick: () => void;
  buttonRef: Ref<HTMLButtonElement>;
};

export function MorphButton({ count, elementId, onClick, buttonRef }: Props) {
  useShadowSheet(css);
  const prevElementId = useRef(elementId);
  const pulseKey = useRef(0);

  if (elementId !== prevElementId.current) {
    prevElementId.current = elementId;
    if (count > 0) pulseKey.current += 1;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="morph-btn"
      disabled={count === 0}
      data-has-patterns={count > 0 ? "" : undefined}
      data-pulse={count > 0 ? String(pulseKey.current) : undefined}
      title={
        count > 0
          ? `${count} structural alternative${count === 1 ? "" : "s"}`
          : "Transform component structure"
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      ◆{count > 0 && <span className="morph-badge">{count}</span>}
    </button>
  );
}
