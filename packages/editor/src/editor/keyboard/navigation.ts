type NavDirection = "forward" | "backward";

const ARROW_DIRECTION: Record<string, NavDirection> = {
  ArrowDown: "forward",
  ArrowRight: "forward",
  ArrowUp: "backward",
  ArrowLeft: "backward",
};

export const arrowToDirection = (key: string): NavDirection | null =>
  ARROW_DIRECTION[key] ?? null;
