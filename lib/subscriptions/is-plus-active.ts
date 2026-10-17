export function isPlusActive(
  sub: { plan?: string | null; current_period_end?: string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub || sub.plan !== "plus" || !sub.current_period_end) return false;
  const end = new Date(sub.current_period_end).getTime();
  return Number.isFinite(end) && end > now.getTime();
}
