import { NextResponse } from "next/server";
import { registerClientOrder } from "@/lib/data/orders";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderForRequester } from "@/lib/orders/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Owner, or admin/staff with orders.view (C08, B13)
    const access = await getOrderForRequester(id, "owner_or_staff");
    if (!access.ok) return access.response;
    let order = access.order;

    // If still pending, auto-sync with Midtrans Status API in case webhook was delayed
    if (order && order.status === "pending_payment") {
      try {
        const serverKey = process.env.MIDTRANS_SERVER_KEY || "";
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === "true";
        const baseUrl = isProd
          ? "https://api.midtrans.com/v2"
          : "https://api.sandbox.midtrans.com/v2";

        const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");
        const midtransRes = await fetch(`${baseUrl}/ORD-${order.order_code}/status`, {
          headers: { Accept: "application/json", Authorization: authHeader },
        });

        if (midtransRes.ok) {
          const statusData = await midtransRes.json();
          const isSuccess =
            statusData.transaction_status === "settlement" ||
            (statusData.transaction_status === "capture" && statusData.fraud_status === "accept");

          const amountMatches =
            Number(parseFloat(statusData.gross_amount)) === Number(order.total);

          if (isSuccess && amountMatches) {
            const nowIso = new Date().toISOString();
            const adminSupabase = createAdminClient();

            // Server-to-server status check (same trust as the webhook); only the
            // request that actually moves the row writes the event.
            const { data: moved } = await adminSupabase
              .from("orders")
              .update({ status: "paid", paid_at: nowIso, updated_at: nowIso })
              .eq("id", order.id)
              .eq("status", "pending_payment")
              .select("id");
            const didMove = Boolean(moved && moved.length > 0);
            if (didMove) {
              await adminSupabase.from("order_events").insert({
                order_id: order.id,
                event_type: "payment_settled",
                from_status: "pending_payment",
                to_status: "paid",
                actor_type: "system",
                actor_name: "Midtrans Sync",
                note: `Pembayaran terkonfirmasi via Midtrans Sync (${statusData.payment_type || "snap"}).`,
              });

              await adminSupabase
                .from("payments")
                .update({
                  status: "success",
                  raw_payload: statusData,
                  processed_at: nowIso,
                })
                .eq("provider_order_id", `ORD-${order.order_code}`);

              order = {
                ...order,
                status: "paid",
                paid_at: nowIso,
              };
              registerClientOrder(order);
            }
          }
        }
      } catch (syncErr) {
        console.warn("Midtrans order status sync error:", syncErr);
      }
    }

    if (order) {
      return NextResponse.json({ success: true, order });
    }

    return NextResponse.json(
      { error: "Pesanan tidak ditemukan." },
      { status: 404 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
