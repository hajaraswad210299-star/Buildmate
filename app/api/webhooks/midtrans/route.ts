import { NextResponse } from "next/server";
import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { transitionOrder, getOrders } from "@/lib/data/orders";
import { updatePaymentStatus } from "@/lib/data/transactions";

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
      payment_type,
    } = body;

    const serverKey = process.env.MIDTRANS_SERVER_KEY;

    // 1. Verifikasi Signature Key (B12 & B20): sha512(order_id + status_code + gross_amount + ServerKey)
    if (serverKey && serverKey !== "dummy-midtrans-server-key" && signature_key) {
      const expected = crypto
        .createHash("sha512")
        .update(order_id + status_code + gross_amount + serverKey)
        .digest("hex");

      if (expected !== signature_key) {
        console.warn("Midtrans webhook: invalid signature key rejection");
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

    const nowIso = new Date().toISOString();

    // 2. Transaksi Pesanan (ORD-...)
    if (order_id && (order_id.startsWith("ORD-") || order_id.startsWith("BM-"))) {
      const cleanOrderCode = order_id.replace(/^ORD-/, "");
      const allOrders = await getOrders();
      const order = allOrders.find(
        (o) => o.order_code === cleanOrderCode || o.id === order_id || o.order_code === order_id
      );

      if (order) {
        // Cocokkan nominal jika tersedia
        const receivedGross = parseFloat(gross_amount);
        if (!isNaN(receivedGross) && receivedGross !== order.total) {
          console.warn(`Nominal mismatch for order ${order.order_code}: expected ${order.total}, got ${receivedGross}`);
        }

        // Idempotensi: jika status sudah final (paid atau cancelled), jangan proses ulang
        if (order.status === "paid" && isSuccess) {
          return NextResponse.json({ status: "OK", message: "Order already marked as paid (idempotent)" });
        }
        if (order.status === "cancelled" && isFailed) {
          return NextResponse.json({ status: "OK", message: "Order already cancelled (idempotent)" });
        }

        if (isSuccess && order.status === "pending_payment") {
          await transitionOrder(order.id, "paid", "webhook", {
            actorName: "Midtrans Webhook",
            note: `Pembayaran sukses diverifikasi Midtrans (${payment_type || "snap"}). Gross amount: Rp${receivedGross || order.total}.`,
          });

          // Sync database status
          try {
            const adminSupabase = createAdminClient();
            await adminSupabase
              .from("orders")
              .update({ status: "paid", paid_at: nowIso, updated_at: nowIso })
              .or(`id.eq.${order.id},order_code.eq.${order.order_code}`);
          } catch {}
        } else if (isFailed && order.status === "pending_payment") {
          await transitionOrder(order.id, "cancelled", "webhook", {
            actorName: "Midtrans Webhook",
            cancelReason: `Pembayaran ${transaction_status} oleh Midtrans.`,
          });

          try {
            const adminSupabase = createAdminClient();
            await adminSupabase
              .from("orders")
              .update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso })
              .or(`id.eq.${order.id},order_code.eq.${order.order_code}`);
          } catch {}
        }
      }

      // Update Ledger Payments (In-memory & Supabase)
      updatePaymentStatus(order_id, {
        status: isSuccess ? "success" : isFailed ? "failed" : "pending",
        payment_type: payment_type || "snap",
        raw_payload: body,
        processed_at: nowIso,
      });

      try {
        const adminSupabase = createAdminClient();
        await adminSupabase
          .from("payments")
          .update({
            status: isSuccess ? "success" : isFailed ? "failed" : "pending",
            raw_payload: body,
            processed_at: nowIso,
          })
          .eq("provider_order_id", order_id);
      } catch {}
    }

    // 3. Transaksi Langganan Plus (SUB-...)
    if (order_id && order_id.startsWith("SUB-")) {
      const paymentStatus = isSuccess ? "success" : isFailed ? "failed" : "pending";
      updatePaymentStatus(order_id, {
        status: paymentStatus,
        payment_type: payment_type || "snap",
        raw_payload: body,
        processed_at: nowIso,
      });

      try {
        const supabase = createAdminClient();
        const { data: payment } = await supabase
          .from("payments")
          .select("customer_id")
          .eq("provider_order_id", order_id)
          .single();

        if (payment?.customer_id && isSuccess) {
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

        await supabase
          .from("payments")
          .update({
            status: paymentStatus,
            raw_payload: body,
            processed_at: nowIso,
          })
          .eq("provider_order_id", order_id);
      } catch (subErr) {
        console.warn("Subscription webhook update error:", subErr);
      }
    }

    return NextResponse.json({ status: "OK", processed_at: nowIso });
  } catch (err: any) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json({ error: err?.message || "Error" }, { status: 500 });
  }
}
