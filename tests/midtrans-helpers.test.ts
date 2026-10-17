import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  verifyMidtransSignature,
  classifyMidtransStatus,
  parseMidtransOrderId,
  parseGrossAmount,
} from "@/lib/payments/midtrans-helpers";

const serverKey = "test-server-key";
function sign(orderId: string, statusCode: string, gross: string) {
  return crypto.createHash("sha512").update(orderId + statusCode + gross + serverKey).digest("hex");
}

describe("verifyMidtransSignature", () => {
  it("accepts a valid signature", () => {
    const sig = sign("ORD-BM-261017-1234", "200", "150000.00");
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "150000.00", signatureKey: sig, serverKey })
    ).toBe(true);
  });
  it("rejects a wrong signature", () => {
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "150000.00", signatureKey: "abc", serverKey })
    ).toBe(false);
  });
  it("rejects when gross amount is tampered", () => {
    const sig = sign("ORD-BM-261017-1234", "200", "150000.00");
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "1.00", signatureKey: sig, serverKey })
    ).toBe(false);
  });
  it("rejects empty signature or empty server key", () => {
    expect(verifyMidtransSignature({ orderId: "x", statusCode: "200", grossAmount: "1", signatureKey: "", serverKey })).toBe(false);
    expect(verifyMidtransSignature({ orderId: "x", statusCode: "200", grossAmount: "1", signatureKey: "abc", serverKey: "" })).toBe(false);
  });
});

describe("classifyMidtransStatus", () => {
  it("maps statuses", () => {
    expect(classifyMidtransStatus("settlement", null)).toBe("success");
    expect(classifyMidtransStatus("capture", "accept")).toBe("success");
    expect(classifyMidtransStatus("capture", "challenge")).toBe("pending");
    expect(classifyMidtransStatus("expire", null)).toBe("failed");
    expect(classifyMidtransStatus("refund", null)).toBe("refunded");
    expect(classifyMidtransStatus("pending", null)).toBe("pending");
    expect(classifyMidtransStatus("weird", null)).toBe("unknown");
  });
});

describe("parseMidtransOrderId", () => {
  it("parses order ids", () => {
    expect(parseMidtransOrderId("ORD-BM-261017-1234")).toEqual({ kind: "order", providerOrderId: "ORD-BM-261017-1234", orderCode: "BM-261017-1234" });
  });
  it("parses subscription ids", () => {
    expect(parseMidtransOrderId("SUB-1760000000000-1234")).toEqual({ kind: "subscription", providerOrderId: "SUB-1760000000000-1234" });
  });
  it("rejects injection attempts and unknown formats", () => {
    expect(parseMidtransOrderId("ORD-x,id.eq.123")).toBeNull();
    expect(parseMidtransOrderId("BM-261017-1234")).toBeNull();
    expect(parseMidtransOrderId("")).toBeNull();
  });
});

describe("parseGrossAmount", () => {
  it("parses strings", () => {
    expect(parseGrossAmount("150000.00")).toBe(150000);
    expect(parseGrossAmount("abc")).toBeNull();
    expect(parseGrossAmount(undefined)).toBeNull();
  });
});
