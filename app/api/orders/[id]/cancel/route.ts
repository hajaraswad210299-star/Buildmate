import { NextResponse } from "next/server";
import { cancelCustomerPendingOrder } from "@/lib/data/orders";
import { authorizeOrderAccess } from "@/lib/orders/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const access = await authorizeOrderAccess(id, "owner_action");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const order = access.order;

    if (order.status !== "pending_payment") {
      return NextResponse.json(
        { error: "Hanya pesanan yang belum dibayar yang dapat dibatalkan langsung." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const result = await cancelCustomerPendingOrder(id, reason);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal membatalkan pesanan." },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, order: result.order });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
