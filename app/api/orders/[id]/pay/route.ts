import { NextResponse } from "next/server";
import { transitionOrder, getOrderById } from "@/lib/data/orders";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const method = body.method || "QRIS";
    const appName = body.appName || "QRIS Simulator";

    // Transition order to paid
    const result = await transitionOrder(order.id, "paid", "webhook", {
      actorName: `Midtrans Sandbox (${method})`,
      note: `Pembayaran ${method} melalui ${appName} sukses diverifikasi di Sandbox.`,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal memproses status pembayaran." },
        { status: 400 }
      );
    }

    // Update in Supabase orders table if configured
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase
        .from("orders")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    } catch {
      // Ignored if purely local mock
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      message: "Pembayaran QRIS berhasil dikonfirmasi!",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
