import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMitraApplication, saveMitraApplication } from "@/lib/data/mitra";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "usr-w-1"; // Fallback to demo worker user in mock mode
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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "usr-w-1";
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
