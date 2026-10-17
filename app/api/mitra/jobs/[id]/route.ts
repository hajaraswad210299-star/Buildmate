import { NextResponse } from "next/server";
import { getMitraJobDetail } from "@/lib/data/mitra";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireWorkerApi({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.workerId;
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
