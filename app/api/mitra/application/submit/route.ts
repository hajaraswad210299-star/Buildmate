import { NextResponse } from "next/server";
import { submitMitraApplication } from "@/lib/data/mitra";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireWorkerApi();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
    const body = await request.json().catch(() => ({}));
    // Agreements are confirmed explicitly at submit time (W01 step 4)
    const result = await submitMitraApplication(userId, {
      agreement_terms: body.agreement_terms === true,
      agreement_data: body.agreement_data === true,
    });

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
