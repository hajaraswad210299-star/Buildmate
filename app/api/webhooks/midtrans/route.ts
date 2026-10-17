import { NextResponse } from "next/server";
import {
  verifyMidtransSignature,
  classifyMidtransStatus,
  parseMidtransOrderId,
  parseGrossAmount,
} from "@/lib/payments/midtrans-helpers";
import {
  markOrderPaidFromMidtrans,
  markOrderFailedFromMidtrans,
  markOrderRefundedFromMidtrans,
} from "@/lib/payments/order-payment";
import {
  activatePlusFromPayment,
  markSubscriptionPaymentFailed,
} from "@/lib/data/subscriptions";

export async function POST(request: Request) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey === "dummy-midtrans-server-key") {
    console.error("Midtrans webhook: MIDTRANS_SERVER_KEY belum dikonfigurasi");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body?.order_id === "string" ? body.order_id : "";
  const statusCode = typeof body?.status_code === "string" ? body.status_code : "";
  const grossAmountRaw = typeof body?.gross_amount === "string" ? body.gross_amount : "";
  const signatureKey = typeof body?.signature_key === "string" ? body.signature_key : "";

  if (!orderId || !statusCode || !grossAmountRaw || !signatureKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validSignature = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount: grossAmountRaw,
    signatureKey,
    serverKey,
  });
  if (!validSignature) {
    console.warn("Midtrans webhook: signature tidak valid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = parseMidtransOrderId(orderId);
  if (!parsed) {
    // Signature valid tapi format tidak dikenal (misal notifikasi test dari dashboard): abaikan.
    return NextResponse.json({ status: "OK", result: "ignored_unknown_order_id" });
  }

  const grossAmount = parseGrossAmount(grossAmountRaw);
  if (grossAmount === null) {
    return NextResponse.json({ error: "Invalid gross_amount" }, { status: 400 });
  }

  const transactionStatus = String(body.transaction_status || "");
  const outcome = classifyMidtransStatus(body.transaction_status, body.fraud_status);

  try {
    if (parsed.kind === "order") {
      if (outcome === "success") {
        const r = await markOrderPaidFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          grossAmount,
          paymentType: body.payment_type,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      if (outcome === "failed") {
        const r = await markOrderFailedFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          transactionStatus,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      if (outcome === "refunded") {
        const r = await markOrderRefundedFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          transactionStatus,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      return NextResponse.json({ status: "OK", result: "no_action" });
    }

    // Langganan Plus (SUB-...)
    if (outcome === "success") {
      const r = await activatePlusFromPayment(parsed.providerOrderId, grossAmount, body);
      if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      return NextResponse.json({ status: "OK", activated: r.activated });
    }
    if (outcome === "failed") {
      const r = await markSubscriptionPaymentFailed(parsed.providerOrderId, body);
      if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
    return NextResponse.json({ status: "OK", result: "no_action" });
  } catch (err) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
