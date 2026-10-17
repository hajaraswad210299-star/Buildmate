import { NextResponse } from "next/server";
import { submitMitraApplication } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function POST() {
  try {
    const auth = await requireWorker({ requireApproved: false });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const result = await submitMitraApplication(userId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      application: result.application,
    });
  } catch (err: any) {
    console.error("POST /api/mitra/application/submit error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengirim pendaftaran" },
      { status: 500 }
    );
  }
}
