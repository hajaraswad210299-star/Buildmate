import { NextResponse } from "next/server";
import { updateMitraJobStatus } from "@/lib/data/mitra";
import { OrderStatus } from "@/lib/orders/transitions";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const toStatus = body.status as OrderStatus;
    const photoPaths = body.photo_paths as string[] | undefined;

    if (!toStatus) {
      return NextResponse.json(
        { success: false, error: "Status target wajib disertakan" },
        { status: 400 }
      );
    }

    const auth = await requireWorkerApi({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.workerId;
    const result = await updateMitraJobStatus(workerId, id, toStatus, photoPaths);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      order: result.order,
      message: `Status berhasil diubah menjadi ${toStatus}`,
    });
  } catch (err: any) {
    console.error("POST /api/mitra/jobs/[id]/status error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal memperbarui status pekerjaan" },
      { status: 500 }
    );
  }
}
