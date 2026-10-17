import { describe, it, expect } from "vitest";
import { toWibDateString, isValidScheduledDate } from "@/lib/date/wib";

describe("WIB dates", () => {
  it("uses Jakarta date, not UTC", () => {
    // 2026-10-17 01:00 WIB = 2026-10-16 18:00 UTC
    expect(toWibDateString(new Date("2026-10-16T18:00:00Z"))).toBe("2026-10-17");
  });
  it("validates scheduled date window", () => {
    const now = new Date("2026-10-16T18:00:00Z"); // 17 Okt 01:00 WIB
    expect(isValidScheduledDate("2026-10-17", now)).toBe(false); // hari ini
    expect(isValidScheduledDate("2026-10-18", now)).toBe(true);  // besok
    expect(isValidScheduledDate("2026-10-31", now)).toBe(true);  // +14 hari
    expect(isValidScheduledDate("2026-11-01", now)).toBe(false); // +15 hari
    expect(isValidScheduledDate("18-10-2026", now)).toBe(false);
  });
});
