import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
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
      });
    }

    const adminSupabase = createAdminClient();

    // 1. Fetch current subscription row from subscriptions table
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .single();

    let isPlus = Boolean(
      sub?.plan === "plus" &&
        sub?.current_period_end &&
        new Date(sub.current_period_end) > new Date()
    );

    let periodEnd = sub?.current_period_end || null;

    // 2. If not active, settle any still-pending SUB payment by asking Midtrans (B12).
    //    Payments already marked success are never re-granted here; only the webhook
    //    or this one-time sync extends Plus.
    if (!isPlus) {
      const { data: pendingPayments } = await adminSupabase
        .from("payments")
        .select("provider_order_id")
        .eq("customer_id", user.id)
        .eq("kind", "subscription")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(3);

      for (const p of pendingPayments || []) {
        const result = await settlePendingSubscriptionPayment(user.id, p.provider_order_id);
        if (result) {
          isPlus = true;
          periodEnd = result;
          break;
        }
      }
    }

    let remainingDays = 0;
    if (isPlus && periodEnd) {
      const diffTime = Math.max(0, new Date(periodEnd).getTime() - Date.now());
      remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      isPlus,
      plan: isPlus ? "plus" : "free",
      current_period_end: periodEnd,
      remaining_days: remainingDays,
    });
  } catch (err: any) {
    console.error("GET /api/subscriptions/status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Called by /plus after Snap onSuccess. It never trusts the client: the given
 * SUB- payment must belong to the user and be confirmed as settled by Midtrans.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const subOrderId = typeof body.sub_order_id === "string" ? body.sub_order_id : "";
    if (!subOrderId.startsWith("SUB-")) {
      return NextResponse.json({ error: "sub_order_id tidak valid" }, { status: 400 });
    }

    const periodEnd = await settlePendingSubscriptionPayment(user.id, subOrderId);

    const adminSupabase = createAdminClient();
    const { data: sub } = await adminSupabase
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .single();

    const end = periodEnd || sub?.current_period_end || null;
    const isPlus = Boolean(sub?.plan === "plus" && end && new Date(end) > new Date());
    const remainingDays = isPlus && end
      ? Math.ceil(Math.max(0, new Date(end).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 0;

    return NextResponse.json({
      success: true,
      isPlus,
      plan: isPlus ? "plus" : "free",
      current_period_end: end,
      remaining_days: remainingDays,
    });
  } catch (err: any) {
    console.error("POST /api/subscriptions/status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Checks a pending SUB- payment with the Midtrans Status API and, if settled,
 * extends Plus exactly once: max(now, current_period_end) + PLUS_DURATION_DAYS.
 * Returns the new period end, or null when nothing was granted.
 */
async function settlePendingSubscriptionPayment(
  userId: string,
  providerOrderId: string
): Promise<string | null> {
  const adminSupabase = createAdminClient();

  const { data: payment } = await adminSupabase
    .from("payments")
    .select("provider_order_id, status, amount, customer_id")
    .eq("provider_order_id", providerOrderId)
    .eq("kind", "subscription")
    .maybeSingle();

  if (!payment || payment.customer_id !== userId || payment.status !== "pending") {
    return null;
  }

  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
    if (!serverKey || serverKey === "dummy-midtrans-server-key") return null;

    const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
    const baseUrl = isProd
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";

    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
    const midtransRes = await fetch(`${baseUrl}/${providerOrderId}/status`, {
      headers: { Accept: "application/json", Authorization: authHeader },
    });
    if (!midtransRes.ok) return null;

    const statusData = await midtransRes.json();
    const settled =
      statusData.transaction_status === "settlement" ||
      (statusData.transaction_status === "capture" && statusData.fraud_status === "accept");
    if (!settled || Number(parseFloat(statusData.gross_amount)) !== Number(payment.amount)) {
      return null;
    }

    // Claim the payment atomically so a parallel webhook/sync cannot grant twice
    const { data: claimed } = await adminSupabase
      .from("payments")
      .update({
        status: "success",
        raw_payload: statusData,
        processed_at: new Date().toISOString(),
      })
      .eq("provider_order_id", providerOrderId)
      .eq("status", "pending")
      .select("provider_order_id");

    if (!claimed || claimed.length === 0) return null;

    const { data: currSub } = await adminSupabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .single();

    const daysToAdd = Number(process.env.PLUS_DURATION_DAYS) || 30;
    const baseDate =
      currSub?.current_period_end && new Date(currSub.current_period_end) > new Date()
        ? new Date(currSub.current_period_end)
        : new Date();
    baseDate.setDate(baseDate.getDate() + daysToAdd);
    const periodEnd = baseDate.toISOString();

    await adminSupabase.from("subscriptions").upsert({
      user_id: userId,
      plan: "plus",
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    });

    return periodEnd;
  } catch (syncErr) {
    console.warn("Midtrans status sync error:", syncErr);
    return null;
  }
}
