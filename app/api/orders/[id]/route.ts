import { NextResponse } from "next/server";
import { getOrderByIdFromDb } from "@/lib/data/orders";
import { getMidtransTransactionStatus } from "@/lib/payments/midtrans-status";
import { classifyMidtransStatus, parseGrossAmount } from "@/lib/payments/midtrans-helpers";
import { markOrderPaidFromMidtrans } from "@/lib/payments/order-payment";
import { authorizeOrderAccess } from "@/lib/orders/access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const access = await authorizeOrderAccess(id, "read");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    let order: typeof access.order | null = access.order;

    // Jika masih pending, cek langsung ke Midtrans (server-ke-server) kalau webhook terlambat.
    if (order && order.status === "pending_payment") {
      const providerOrderId = `ORD-${order.order_code}`;
      const statusData = await getMidtransTransactionStatus(providerOrderId);
      if (
        statusData &&
        classifyMidtransStatus(statusData.transaction_status, statusData.fraud_status) === "success"
      ) {
        const gross = parseGrossAmount(statusData.gross_amount);
        if (gross !== null) {
          const r = await markOrderPaidFromMidtrans({
            providerOrderId,
            orderCode: order.order_code,
            grossAmount: gross,
            paymentType: statusData.payment_type,
            rawPayload: statusData,
            actorName: "Midtrans Sync",
          });
          if (r.ok && (r.result === "paid" || r.result === "already_paid")) {
            order = (await getOrderByIdFromDb(order.id)) ?? order;
          }
        }
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
