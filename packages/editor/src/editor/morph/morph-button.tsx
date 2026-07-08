import { useRef } from "react";
import type { Ref } from "react";
import { useShadowSheet, usePrevious } from "../overlay/index.js";
import css from "./morph.css?inline";

const MorphIcon = () => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 10 10"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M5 1 L8.5 5 L5 9 L1.5 5 Z" />
  </svg>
);

type Props = {
  count: number;
  elementId: string;
  onClick: () => void;
  buttonRef: Ref<HTMLButtonElement>;
};

export function MorphButton({ count, elementId, onClick, buttonRef }: Props) {
  useShadowSheet(css);
  const prevElementId = usePrevious(elementId);
  const pulseKey = useRef(0);

  if (elementId !== prevElementId) {
    if (count > 0) pulseKey.current += 1;
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className={`label-action-btn${count > 0 ? " label-action-btn--active" : ""}`}
      data-role="action-morph"
      disabled={count === 0}
      data-has-patterns={count > 0 ? "" : undefined}
      data-pulse={count > 0 ? String(pulseKey.current) : undefined}
      aria-label={
        count > 0
          ? `${count} structural alternative${count === 1 ? "" : "s"}`
          : "Transform component structure"
      }
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <MorphIcon />
      <span className="action-bar-tooltip" role="tooltip">
        {count > 0 ? `${count} morph${count === 1 ? "" : "s"}` : "Morph"}
      </span>
    </button>
  );
}
