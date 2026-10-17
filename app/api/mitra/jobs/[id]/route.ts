import { NextResponse } from "next/server";
import { getMitraJobDetail } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireWorker({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.userId;
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
