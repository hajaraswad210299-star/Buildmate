import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitMitraApplication } from "@/lib/data/mitra";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "usr-w-1";
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
