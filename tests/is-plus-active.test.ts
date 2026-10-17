import { describe, it, expect } from "vitest";
import { isPlusActive } from "@/lib/subscriptions/is-plus-active";

const now = new Date("2026-10-17T00:00:00Z");

describe("isPlusActive", () => {
  it("false for null/free", () => {
    expect(isPlusActive(null, now)).toBe(false);
    expect(isPlusActive({ plan: "free", current_period_end: "2027-01-01T00:00:00Z" }, now)).toBe(false);
  });
  it("false when end date is null (NOT forever)", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: null }, now)).toBe(false);
  });
  it("false when expired", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: "2026-10-16T00:00:00Z" }, now)).toBe(false);
  });
  it("true when in the future", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: "2026-11-16T00:00:00Z" }, now)).toBe(true);
  });
});
