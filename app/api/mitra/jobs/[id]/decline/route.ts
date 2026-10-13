import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { declineMitraJob } from "@/lib/data/mitra";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const reason = body.reason || "Alasan tidak disebutkan";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const workerId = user?.id || "w-1";
    const result = await declineMitraJob(workerId, id, reason);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tawaran berhasil ditolak",
    });
  } catch (err: any) {
    console.error("POST /api/mitra/jobs/[id]/decline error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal menolak tawaran" },
      { status: 500 }
    );
  }
}
