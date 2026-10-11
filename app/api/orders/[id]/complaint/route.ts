import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reportCustomerProblem, getOrderById } from "@/lib/data/orders";

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

    const body = await request.json();
    const { problem_type, description, photo_path, is_warranty = false } = body;

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
