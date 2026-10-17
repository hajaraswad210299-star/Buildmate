import { NextRequest, NextResponse } from "next/server";
import { getMitraJobs } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get("tab") || "offers") as "offers" | "active" | "completed";
    const month = searchParams.get("month") || undefined;

    const auth = await requireWorker({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.userId;
    const jobs = await getMitraJobs(workerId, tab, month);

    return NextResponse.json({
      success: true,
      jobs,
      tab,
    });
  } catch (err: any) {
    if (err?.digest === "NEXT_PRERENDER_INTERRUPTED") {
      throw err;
    }
    console.error("GET /api/mitra/jobs error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengambil daftar pekerjaan" },
      { status: 500 }
    );
  }
}
