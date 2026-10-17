import { NextResponse } from "next/server";
import { reportCustomerProblem } from "@/lib/data/orders";
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
    const order = access.order;

    const body = await request.json();
    const { problem_type, description, photo_path } = body;
    // Warranty eligibility is decided on the server from the customer's Plus status (B3)
    const is_warranty = Boolean(order.customer?.is_plus);

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
