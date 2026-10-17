import crypto from "crypto";

/**
 * Verifikasi signature_key notifikasi Midtrans.
 * Rumus resmi: sha512(order_id + status_code + gross_amount + serverKey).
 * Pakai perbandingan constant-time.
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey: string;
}): boolean {
  if (!params.serverKey || !params.signatureKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(params.orderId + params.statusCode + params.grossAmount + params.serverKey)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signatureKey, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type MidtransOutcome = "success" | "failed" | "refunded" | "pending" | "unknown";

/** Klasifikasi transaction_status Midtrans menjadi hasil yang dipakai aplikasi. */
export function classifyMidtransStatus(
  transactionStatus: string | undefined | null,
  fraudStatus: string | undefined | null
): MidtransOutcome {
  switch (transactionStatus) {
    case "settlement":
      return "success";
    case "capture":
      return fraudStatus === "accept" ? "success" : "pending";
    case "cancel":
    case "deny":
    case "expire":
    case "failure":
      return "failed";
    case "refund":
    case "partial_refund":
    case "chargeback":
    case "partial_chargeback":
      return "refunded";
    case "pending":
    case "authorize":
      return "pending";
    default:
      return "unknown";
  }
}

export type ParsedMidtransOrderId =
  | { kind: "order"; providerOrderId: string; orderCode: string }
  | { kind: "subscription"; providerOrderId: string };

const ORDER_ID_RE = /^ORD-(BM-\d{6}-[A-Z0-9]{4,12})$/;
const SUB_ID_RE = /^SUB-\d{10,16}-\d{4}$/;

/** Validasi format order_id dari Midtrans. Return null kalau format tidak dikenal. */
export function parseMidtransOrderId(orderId: string): ParsedMidtransOrderId | null {
  if (typeof orderId !== "string") return null;
  const orderMatch = ORDER_ID_RE.exec(orderId);
  if (orderMatch) {
    return { kind: "order", providerOrderId: orderId, orderCode: orderMatch[1] };
  }
  if (SUB_ID_RE.test(orderId)) {
    return { kind: "subscription", providerOrderId: orderId };
  }
  return null;
}

/** Ubah gross_amount Midtrans ("150000.00") menjadi integer rupiah. Return null kalau tidak valid. */
export function parseGrossAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}
