import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/safe-redirect";

describe("safeNext", () => {
  it("allows internal paths", () => {
    expect(safeNext("/orders")).toBe("/orders");
    expect(safeNext("/admin?tab=1")).toBe("/admin?tab=1");
  });
  it("blocks external and tricky values", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("/ok\nx")).toBe("/");
    expect(safeNext(null, "/admin")).toBe("/admin");
  });
});
