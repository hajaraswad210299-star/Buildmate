export function toWibDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Tanggal jadwal valid: format YYYY-MM-DD, minimal besok (WIB), maksimal 14 hari ke depan (WIB). */
export function isValidScheduledDate(value: unknown, now: Date = new Date()): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = toWibDateString(now);
  const max = toWibDateString(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
  return value > today && value <= max;
}
