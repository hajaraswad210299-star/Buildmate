import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createMidtransSnapTransaction } from "@/lib/midtrans";
import { recordPayment } from "@/lib/data/transactions";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Silakan masuk terlebih dahulu untuk berlangganan BuildMate Plus." },
        { status: 401 }
      );
    }

    const subOrderId = `SUB-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const plusPrice = Number(process.env.PLUS_PRICE) || 29000;

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("id", user.id)
      .single();

    // Real Midtrans Snap Transaction for Subscription (B12 & B20)
    const midtransRes = await createMidtransSnapTransaction({
      orderId: subOrderId,
      grossAmount: plusPrice,
      customerDetails: {
        first_name: profile?.full_name || user.email?.split("@")[0] || "Pelanggan Plus",
        email: user.email || "pelanggan@buildmate.id",
        phone: profile?.phone || "081200000000",
      },
      itemDetails: [
        {
          id: "plus_membership",
          name: "BuildMate Plus 30 Hari",
          price: plusPrice,
          quantity: 1,
        },
      ],
    });

    if (midtransRes.error || !midtransRes.token) {
      return NextResponse.json(
        { error: midtransRes.error || "Gagal membuat transaksi Midtrans Snap untuk Plus." },
        { status: 400 }
      );
    }

    const snapToken = midtransRes.token;

    recordPayment({
      id: `pay-${Date.now()}`,
      provider_order_id: subOrderId,
      kind: "subscription",
      ref_id: subOrderId,
      customer_name: profile?.full_name || user.email?.split("@")[0] || "Pelanggan Plus",
      customer_id: user.id,
      amount: plusPrice,
      status: "pending",
      payment_type: "snap",
      snap_token: snapToken,
      created_at: new Date().toISOString(),
    });

    // Record subscription payment in payments table if database connected
    try {
      await supabase.from("payments").insert({
        provider_order_id: subOrderId,
        kind: "subscription",
        ref_id: user.id,
        customer_id: user.id,
        amount: plusPrice,
        status: "pending",
        snap_token: snapToken,
      });
    } catch {}

    return NextResponse.json({
      success: true,
      sub_order_id: subOrderId,
      amount: plusPrice,
      snap_token: snapToken,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
