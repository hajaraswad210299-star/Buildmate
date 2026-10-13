import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMitraJobDetail } from "@/lib/data/mitra";

export async function GET(
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
    const job = await getMitraJobDetail(workerId, id);

    if (!job) {
      return NextResponse.json(
        { success: false, error: "Pekerjaan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    console.error("GET /api/mitra/jobs/[id] error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengambil detail pekerjaan" },
      { status: 500 }
    );
  }
}
