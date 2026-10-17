import { NextResponse } from "next/server";
import { reportCustomerProblem } from "@/lib/data/orders";
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

    if (order.status === "pending_payment" || order.status === "cancelled") {
      return NextResponse.json(
        { error: "Komplain tidak dapat diajukan untuk pesanan dengan status ini." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { problem_type, description, photo_path } = body;
    const is_warranty = body?.is_warranty === true && order.customer?.is_plus === true;

    if (!problem_type || !description) {
      return NextResponse.json(
        { error: "Jenis masalah dan keterangan wajib diisi." },
        { status: 400 }
      );
    }

    const result = await reportCustomerProblem(
      id,
      problem_type,
      description,
      photo_path,
      is_warranty
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal melaporkan komplain." },
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
