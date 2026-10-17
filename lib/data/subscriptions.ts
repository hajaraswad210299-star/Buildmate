import { createAdminClient } from "@/lib/supabase/admin";

type Fail = { ok: false; error: string };

export type PlusActivationResult =
  | { ok: true; activated: true; currentPeriodEnd: string }
  | { ok: true; activated: false; reason: "payment_not_found" | "not_subscription" | "already_processed" | "amount_mismatch" }
  | Fail;

/**
 * SATU-SATUNYA fungsi yang boleh mengaktifkan/memperpanjang Plus.
 * Hanya dipanggil setelah pembayaran terverifikasi (webhook bertanda tangan valid
 * atau cek status server-ke-server ke Midtrans).
 */
export async function activatePlusFromPayment(
  providerOrderId: string,
  paidGrossAmount: number,
  rawPayload: unknown
): Promise<PlusActivationResult> {
  const db = createAdminClient();

  const { data: payment, error: payErr } = await db
    .from("payments")
    .select("id, customer_id, amount, kind, status")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (payErr) return { ok: false, error: payErr.message };
  if (!payment) return { ok: true, activated: false, reason: "payment_not_found" };
  if (payment.kind !== "subscription") return { ok: true, activated: false, reason: "not_subscription" };
  if (payment.status !== "pending") return { ok: true, activated: false, reason: "already_processed" };
  if (Number(payment.amount) !== paidGrossAmount) {
    console.warn(`Plus payment amount mismatch for ${providerOrderId}: expected ${payment.amount}, got ${paidGrossAmount}`);
    return { ok: true, activated: false, reason: "amount_mismatch" };
  }

  const nowIso = new Date().toISOString();

  // Kunci idempotensi: hanya satu proses yang berhasil mengubah pending -> success.
  const { data: flipped, error: flipErr } = await db
    .from("payments")
    .update({ status: "success", raw_payload: rawPayload, processed_at: nowIso })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (flipErr) return { ok: false, error: flipErr.message };
  if (!flipped || flipped.length !== 1) return { ok: true, activated: false, reason: "already_processed" };

  const days = Number(process.env.PLUS_DURATION_DAYS) || 30;
  const { data: sub, error: subErr } = await db
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", payment.customer_id)
    .maybeSingle();

  if (subErr) {
    await db.from("payments").update({ status: "pending" }).eq("id", payment.id);
    return { ok: false, error: subErr.message };
  }

  const now = new Date();
  const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: upErr } = await db.from("subscriptions").upsert({
    user_id: payment.customer_id,
    plan: "plus",
    current_period_end: newEnd,
    updated_at: nowIso,
  });
  if (upErr) {
    // Kembalikan ke pending supaya retry Midtrans bisa memproses ulang.
    await db.from("payments").update({ status: "pending" }).eq("id", payment.id);
    return { ok: false, error: upErr.message };
  }

  return { ok: true, activated: true, currentPeriodEnd: newEnd };
}

/** Tandai pembayaran langganan gagal (hanya dari pending). */
export async function markSubscriptionPaymentFailed(
  providerOrderId: string,
  rawPayload: unknown
): Promise<{ ok: true } | Fail> {
  const db = createAdminClient();
  const { error } = await db
    .from("payments")
    .update({ status: "failed", raw_payload: rawPayload, processed_at: new Date().toISOString() })
    .eq("provider_order_id", providerOrderId)
    .eq("kind", "subscription")
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
