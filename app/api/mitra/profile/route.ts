import { NextResponse } from "next/server";
import { updateMitraProfile } from "@/lib/data/mitra";
import { requireWorkerApi } from "@/lib/mitra/auth";

export async function PATCH(request: Request) {
  try {
    const auth = await requireWorkerApi();
    if (!auth.ok) return auth.response;
    const userId = auth.user.id;
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
