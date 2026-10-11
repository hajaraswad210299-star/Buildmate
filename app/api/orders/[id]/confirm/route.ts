import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { confirmCustomerOrder, getOrderById } from "@/lib/data/orders";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Akses tidak diizinkan." }, { status: 401 });
    }

    const order = await getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { note, photo_path } = body;

    const result = await confirmCustomerOrder(id, note, photo_path);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal mengonfirmasi pesanan." },
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
