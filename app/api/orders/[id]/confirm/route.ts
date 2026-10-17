import { NextResponse } from "next/server";
import { confirmCustomerOrder } from "@/lib/data/orders";
import { getOrderForRequester } from "@/lib/orders/access";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Only the customer who owns the order may act on it (C08, B10)
    const access = await getOrderForRequester(id, "owner");
    if (!access.ok) return access.response;

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
