export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export function learningGain(pre: number, post: number): number {
  return post - pre;
}

export function normalizedGain(pre: number, post: number): number | null {
  if (pre >= 100) return null;
  return (post - pre) / (100 - pre);
}

export function efficiency(pre: number, post: number, timeTakenSeconds: number): number | null {
  if (timeTakenSeconds <= 0) return null;
  return (post - pre) / timeTakenSeconds;
}

export function timeImprovement(previousSeconds: number, nextSeconds: number): number {
  return previousSeconds - nextSeconds;
}
