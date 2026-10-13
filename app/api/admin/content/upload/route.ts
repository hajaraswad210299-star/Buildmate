import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiPermission } from "@/lib/supabase/auth";

export async function POST(request: Request) {
  try {
    const auth = await requireApiPermission("content.manage");
    if (!auth.authorized) {
      return auth.response;
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan" }, { status: 400 });
    }

    const validMimes = ["image/jpeg", "image/png", "image/webp"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format gambar harus JPG, PNG, atau WebP" },
        { status: 400 }
      );
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran gambar maksimal 5 MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "webp";
    const fileName = `hero-${Date.now()}.${ext}`;

    const adminSupabase = createAdminClient();

    // Ensure bucket exists
    try {
      await adminSupabase.storage.createBucket("site-content", { public: true });
    } catch {}

    const { data: uploadData, error: uploadError } = await adminSupabase.storage
      .from("site-content")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      // Data URI fallback if bucket not writable
      const base64 = buffer.toString("base64");
      const dataUri = `data:${file.type};base64,${base64}`;
      return NextResponse.json({
        success: true,
        url: dataUri,
        message: "Foto berhasil diunggah (fallback buffer).",
      });
    }

    const { data: publicUrlData } = adminSupabase.storage
      .from("site-content")
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      message: "Foto berhasil diunggah ke storage.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
