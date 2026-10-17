import { NextResponse } from "next/server";
import { getMitraApplication, saveMitraApplication } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function GET() {
  try {
    const auth = await requireWorker({ requireApproved: false });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const application = await getMitraApplication(userId);

    return NextResponse.json({
      success: true,
      application,
    });
  } catch (err: any) {
    console.error("GET /api/mitra/application error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengambil data pendaftaran" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requireWorker({ requireApproved: false });
    if (!auth.ok) return auth.response;
    const userId = auth.userId;
    const body = await request.json();

    const result = await saveMitraApplication(userId, body);

    return NextResponse.json({
      success: true,
      data: result.data,
    });
  } catch (err: any) {
    console.error("PUT /api/mitra/application error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal menyimpan draf" },
      { status: 500 }
    );
  }
}
