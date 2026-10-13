import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptMitraJob } from "@/lib/data/mitra";

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

    const workerId = user?.id || "w-1";
    const result = await acceptMitraJob(workerId, id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      message: "Tawaran pekerjaan berhasil diterima",
    });
  } catch (err: any) {
    console.error("POST /api/mitra/jobs/[id]/accept error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal menerima tawaran" },
      { status: 500 }
    );
  }
}
