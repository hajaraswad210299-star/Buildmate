import { NextResponse } from "next/server";
import { confirmCustomerOrder } from "@/lib/data/orders";
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
    void access.order;

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
