export function computeDotSize(
  index: number,
  currentIndex: number,
  opts?: { max?: number; min?: number; decay?: number },
): number {
  const max = opts?.max ?? 12;
  const min = opts?.min ?? 5;
  const decay = opts?.decay ?? 0.85;

  return min + (max - min) * Math.pow(decay, Math.abs(index - currentIndex));
}
