import { NextRequest, NextResponse } from "next/server";
import { getMitraEarnings } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get("range") || "all") as "month" | "3months" | "all";

    const auth = await requireWorker({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.userId;
    const earnings = await getMitraEarnings(workerId, range);

    return NextResponse.json({
      success: true,
      data: earnings,
    });
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw err;
    }
    console.error("GET /api/mitra/earnings error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengambil data pendapatan" },
      { status: 500 }
    );
  }
}
