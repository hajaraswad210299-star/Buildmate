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

    // 2. If not active, check recent subscription payments in payments table
    if (!isPlus) {
      const { data: recentPayments } = await adminSupabase
        .from("payments")
        .select("provider_order_id, status, amount, created_at")
        .eq("customer_id", user.id)
        .eq("kind", "subscription")
        .order("created_at", { ascending: false })
        .limit(3);

      for (const p of recentPayments || []) {
        // If payment already marked success
        if (p.status === "success") {
          const daysToAdd = Number(process.env.PLUS_DURATION_DAYS) || 30;
          const expiry = new Date();
          expiry.setDate(expiry.getDate() + daysToAdd);
          periodEnd = expiry.toISOString();

          await adminSupabase.from("subscriptions").upsert({
            user_id: user.id,
            plan: "plus",
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          });

          isPlus = true;
          break;
        }

        // If payment is pending, query Midtrans Status API
        if (p.status === "pending" && p.provider_order_id) {
          try {
            const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
            const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
            const baseUrl = isProd
              ? "https://api.midtrans.com/v2"
              : "https://api.sandbox.midtrans.com/v2";

            const authHeader =
              "Basic " + Buffer.from(serverKey + ":").toString("base64");
            const midtransRes = await fetch(
              `${baseUrl}/${p.provider_order_id}/status`,
              {
                headers: {
                  Accept: "application/json",
                  Authorization: authHeader,
                },
              }
            );

            if (midtransRes.ok) {
              const statusData = await midtransRes.json();
              const settled =
                statusData.transaction_status === "settlement" ||
                (statusData.transaction_status === "capture" &&
                  statusData.fraud_status === "accept");

              if (settled) {
                const daysToAdd = Number(process.env.PLUS_DURATION_DAYS) || 30;
                const expiry = new Date();
                expiry.setDate(expiry.getDate() + daysToAdd);
                periodEnd = expiry.toISOString();

                // Update payments table
                await adminSupabase
                  .from("payments")
                  .update({
                    status: "success",
                    raw_payload: statusData,
                    processed_at: new Date().toISOString(),
                  })
                  .eq("provider_order_id", p.provider_order_id);

                // Update subscriptions table
                await adminSupabase.from("subscriptions").upsert({
                  user_id: user.id,
                  plan: "plus",
                  current_period_end: periodEnd,
                  updated_at: new Date().toISOString(),
                });

                isPlus = true;
                break;
              }
            }
          } catch (syncErr) {
            console.warn("Midtrans status sync error:", syncErr);
          }
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
    const subOrderId = body.sub_order_id;

    const adminSupabase = createAdminClient();
    const daysToAdd = Number(process.env.PLUS_DURATION_DAYS) || 30;
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + daysToAdd);
    const periodEnd = expiry.toISOString();

    if (subOrderId) {
      await adminSupabase
        .from("payments")
        .update({
          status: "success",
          processed_at: new Date().toISOString(),
        })
        .eq("provider_order_id", subOrderId);
    }

    await adminSupabase.from("subscriptions").upsert({
      user_id: user.id,
      plan: "plus",
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      isPlus: true,
      plan: "plus",
      current_period_end: periodEnd,
      remaining_days: daysToAdd,
    });
  } catch (err: any) {
    console.error("POST /api/subscriptions/status error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
