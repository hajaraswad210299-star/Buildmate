import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { updateMitraProfile } from "@/lib/data/mitra";

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const userId = user?.id || "usr-w-1";
    const body = await request.json();

    const result = await updateMitraProfile(userId, {
      bio: body.bio,
      photo_path: body.photo_path,
      portfolio_paths: body.portfolio_paths,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: "Gagal memperbarui profil" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      worker: result.worker,
    });
  } catch (err: any) {
    console.error("PATCH /api/mitra/profile error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal memperbarui profil" },
      { status: 500 }
    );
  }
}
