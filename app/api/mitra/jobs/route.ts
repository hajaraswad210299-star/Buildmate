import { NextRequest, NextResponse } from "next/server";
import { requireWorkerApi } from "@/lib/mitra/auth";
import { getMitraJobs } from "@/lib/data/mitra";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get("tab") || "offers") as "offers" | "active" | "completed";
    const month = searchParams.get("month") || undefined;

    const auth = await requireWorkerApi({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.workerId;
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
