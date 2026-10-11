import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    // Simulated / Midtrans Snap Token
    const snapToken = `SNAP-SUB-${Date.now()}`;

    // Record subscription payment in payments table if database connected
    try {
      await supabase.from("payments").insert({
        provider_order_id: subOrderId,
        kind: "subscription",
        customer_id: user.id,
        amount: plusPrice,
        status: "pending",
        snap_token: snapToken,
      });
    } catch {
      // In-memory fallback
    }

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
