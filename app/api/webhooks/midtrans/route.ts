import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionOrder, getOrders } from "@/lib/data/orders";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // Verify SHA512 signature if serverKey is configured
    if (serverKey && signature_key) {
      const expected = crypto
        .createHash("sha512")
        .update(order_id + status_code + gross_amount + serverKey)
        .digest("hex");

      if (expected !== signature_key) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    const isFailed =
      transaction_status === "cancel" ||
      transaction_status === "deny" ||
      transaction_status === "expire";

    // 1. Order Payment (ORD-...)
    if (order_id && (order_id.startsWith("ORD-") || order_id.startsWith("BM-"))) {
      const cleanOrderCode = order_id.replace(/^ORD-/, "");
      const allOrders = await getOrders();
      const order = allOrders.find(
        (o) => o.order_code === cleanOrderCode || o.id === order_id
      );

      if (order) {
        if (isSuccess && order.status === "pending_payment") {
          await transitionOrder(order.id, "paid", "webhook", {
            note: `Pembayaran sukses diverifikasi Midtrans (Metode: ${body.payment_type || "snap"}).`,
          });
        } else if (isFailed && order.status === "pending_payment") {
          await transitionOrder(order.id, "cancelled", "webhook", {
            cancelReason: `Pembayaran ${transaction_status} oleh Midtrans.`,
          });
        }
      }
    }

    // 2. Subscription Payment (SUB-...)
    if (order_id && order_id.startsWith("SUB-") && isSuccess) {
      try {
        const supabase = createAdminClient();
        const { data: payment } = await supabase
          .from("payments")
          .select("customer_id")
          .eq("provider_order_id", order_id)
          .single();

        if (payment?.customer_id) {
          const daysToAdd = Number(process.env.PLUS_DURATION_DAYS) || 30;
          const { data: currSub } = await supabase
            .from("subscriptions")
            .select("current_period_end")
            .eq("user_id", payment.customer_id)
            .single();

          const baseDate =
            currSub?.current_period_end &&
            new Date(currSub.current_period_end) > new Date()
              ? new Date(currSub.current_period_end)
              : new Date();

          baseDate.setDate(baseDate.getDate() + daysToAdd);

          await supabase.from("subscriptions").upsert({
            user_id: payment.customer_id,
            plan: "plus",
            current_period_end: baseDate.toISOString(),
          });
        }
      } catch (subErr) {
        console.warn("Subscription webhook update error:", subErr);
      }
    }

    return NextResponse.json({ status: "OK" });
  } catch (err: any) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
