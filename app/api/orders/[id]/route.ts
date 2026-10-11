import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/data/orders";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (order) {
      return NextResponse.json({ success: true, order });
    }

    // Fallback: check Supabase orders table if configured
    try {
      const supabase = await createClient();
      const { data: dbOrder } = await supabase
        .from("orders")
        .select("*")
        .or(`id.eq.${id},order_code.eq.${id}`)
        .single();

      if (dbOrder) {
        return NextResponse.json({ success: true, order: dbOrder });
      }
    } catch {
      // Ignored if local-only
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
