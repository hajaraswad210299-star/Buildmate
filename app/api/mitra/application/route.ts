import { NextResponse } from "next/server";
import { getMitraApplication, saveMitraApplication } from "@/lib/data/mitra";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function GET() {
  try {
    const auth = await requireWorkerApi();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
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
    const auth = await requireWorkerApi();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
    const body = await request.json();

    const result = await saveMitraApplication(userId, body);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

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
