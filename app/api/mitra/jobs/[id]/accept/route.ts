import { NextResponse } from "next/server";
import { acceptMitraJob } from "@/lib/data/mitra";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireWorkerApi({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.workerId;
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
