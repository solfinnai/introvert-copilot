export function nextRequestId(current: number): number {
  return current + 1;
}

export function isLatestRequest(latest: number, id: number): boolean {
  return id === latest;
}

export function accumulateMet(met: readonly string[], id: string, cap = 40): string[] {
  if (met.includes(id)) return [...met];
  return [...met, id].slice(0, cap);
}
