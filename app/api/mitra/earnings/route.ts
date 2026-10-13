import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMitraEarnings } from "@/lib/data/mitra";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const range = (searchParams.get("range") || "all") as "month" | "3months" | "all";

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const workerId = user?.id || "w-1";
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
