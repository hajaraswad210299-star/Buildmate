import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMitraJobs } from "@/lib/data/mitra";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const tab = (searchParams.get("tab") || "offers") as "offers" | "active" | "completed";
    const month = searchParams.get("month") || undefined;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Default to mock worker w-1 if offline/demo
    const workerId = user?.id || "w-1";
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
