import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderByIdFromDb } from "@/lib/data/orders";

type Fail = { ok: false; error: string };

export type MarkPaidResult =
  | { ok: true; result: "paid" | "already_paid" | "amount_mismatch" | "paid_after_cancel" | "order_not_found" }
  | Fail;

/**
 * Tandai pesanan lunas berdasarkan notifikasi/status Midtrans yang SUDAH terverifikasi.
 * Aman dipanggil berkali-kali (idempoten).
 */
export async function markOrderPaidFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  grossAmount: number;
  paymentType?: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<MarkPaidResult> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, order_code, status, total")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (!order) return { ok: true, result: "order_not_found" };

  if (Number(order.total) !== params.grossAmount) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_amount_mismatch",
      from_status: order.status,
      to_status: order.status,
      actor_type: "system",
      actor_name: params.actorName,
      note: `Nominal tidak cocok: tagihan Rp${order.total}, dibayar Rp${params.grossAmount}. Perlu cek manual.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
    return { ok: true, result: "amount_mismatch" };
  }

  const { error: payErr } = await db
    .from("payments")
    .update({ status: "success", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "pending");
  if (payErr) return { ok: false, error: payErr.message };

  const { data: updated, error: updErr } = await db
    .from("orders")
    .update({ status: "paid", paid_at: nowIso, updated_at: nowIso })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id");
  if (updErr) return { ok: false, error: updErr.message };

  if (updated && updated.length === 1) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_settled",
      from_status: "pending_payment",
      to_status: "paid",
      actor_type: "system",
      actor_name: params.actorName,
      note: `Pembayaran sukses diverifikasi Midtrans (${params.paymentType || "snap"}). Nominal: Rp${params.grossAmount}.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
    await getOrderByIdFromDb(order.id);
    return { ok: true, result: "paid" };
  }

  if (order.status === "cancelled") {
    const { data: existing, error: exErr } = await db
      .from("order_events")
      .select("id")
      .eq("order_id", order.id)
      .eq("event_type", "paid_after_cancel")
      .limit(1);
    if (exErr) return { ok: false, error: exErr.message };
    if (!existing || existing.length === 0) {
      const { error: evErr } = await db.from("order_events").insert({
        order_id: order.id,
        event_type: "paid_after_cancel",
        from_status: "cancelled",
        to_status: "cancelled",
        actor_type: "system",
        actor_name: params.actorName,
        note: "Pembayaran masuk setelah pesanan dibatalkan. PERLU REFUND MANUAL.",
      });
      if (evErr) return { ok: false, error: evErr.message };
    }
    return { ok: true, result: "paid_after_cancel" };
  }

  return { ok: true, result: "already_paid" };
}

/** Pembayaran gagal/expire/cancel: batalkan pesanan HANYA jika masih pending_payment. */
export async function markOrderFailedFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  transactionStatus: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<{ ok: true; result: "cancelled" | "unchanged" | "order_not_found" } | Fail> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { error: payErr } = await db
    .from("payments")
    .update({ status: "failed", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "pending");
  if (payErr) return { ok: false, error: payErr.message };

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (!order) return { ok: true, result: "order_not_found" };

  const reason = `Pembayaran ${params.transactionStatus} oleh Midtrans.`;
  const { data: updated, error: updErr } = await db
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso, cancel_reason: reason })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id");
  if (updErr) return { ok: false, error: updErr.message };
  if (!updated || updated.length !== 1) return { ok: true, result: "unchanged" };

  const { error: evErr } = await db.from("order_events").insert({
    order_id: order.id,
    event_type: "payment_failed",
    from_status: "pending_payment",
    to_status: "cancelled",
    actor_type: "system",
    actor_name: params.actorName,
    note: reason,
  });
  if (evErr) return { ok: false, error: evErr.message };
  await getOrderByIdFromDb(order.id);
  return { ok: true, result: "cancelled" };
}

/** Refund/chargeback: tandai payment refunded (hanya dari success) + catat event. Status pesanan TIDAK diubah. */
export async function markOrderRefundedFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  transactionStatus: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<{ ok: true; result: "refunded" | "unchanged" } | Fail> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: updated, error: payErr } = await db
    .from("payments")
    .update({ status: "refunded", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "success")
    .select("id");
  if (payErr) return { ok: false, error: payErr.message };
  if (!updated || updated.length !== 1) return { ok: true, result: "unchanged" };

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, status")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (order) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_refunded",
      from_status: order.status,
      to_status: order.status,
      actor_type: "system",
      actor_name: params.actorName,
      note: `Midtrans melaporkan ${params.transactionStatus}. Periksa status pesanan secara manual.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
  }
  return { ok: true, result: "refunded" };
}
