import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlusActive } from "@/lib/subscriptions/is-plus-active";
import { activatePlusFromPayment } from "@/lib/data/subscriptions";
import { getMidtransTransactionStatus } from "@/lib/payments/midtrans-status";
import { classifyMidtransStatus, parseGrossAmount } from "@/lib/payments/midtrans-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        isPlus: false,
        plan: "free",
        current_period_end: null,
        remaining_days: 0,
      });
    }

    const db = createAdminClient();

    // 1. Sinkronkan pembayaran langganan MILIK USER INI yang masih pending (maks 3 terbaru).
    const { data: pendingPayments, error: pendErr } = await db
      .from("payments")
      .select("provider_order_id")
      .eq("customer_id", user.id)
      .eq("kind", "subscription")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3);
    if (pendErr) {
      console.error("subscriptions/status pending payments error:", pendErr);
    }

    for (const p of pendingPayments || []) {
      if (!p.provider_order_id) continue;
      const statusData = await getMidtransTransactionStatus(p.provider_order_id);
      if (!statusData) continue;
      if (classifyMidtransStatus(statusData.transaction_status, statusData.fraud_status) !== "success") continue;
      const gross = parseGrossAmount(statusData.gross_amount);
      if (gross === null) continue;
      const r = await activatePlusFromPayment(p.provider_order_id, gross, statusData);
      if (!r.ok) console.error("activatePlusFromPayment error:", r.error);
    }

    // 2. Baca status langganan. TIDAK pernah memberi Plus dari pembayaran lama.
    const { data: sub, error: subErr } = await db
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subErr) {
      return NextResponse.json({ error: "Gagal membaca status langganan." }, { status: 500 });
    }

    const isPlus = isPlusActive(sub);
    const periodEnd = sub?.current_period_end || null;
    let remainingDays = 0;
    if (isPlus && periodEnd) {
      const diff = Math.max(0, new Date(periodEnd).getTime() - Date.now());
      remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      isPlus,
      plan: isPlus ? "plus" : "free",
      current_period_end: periodEnd,
      remaining_days: remainingDays,
    });
  } catch (err) {
    console.error("GET /api/subscriptions/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
