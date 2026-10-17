import { NextResponse } from "next/server";
import { addMitraJobPhoto } from "@/lib/data/mitra";
import { requireWorker } from "@/lib/auth/require-worker";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await requireWorker({ requireApproved: true });
    if (!auth.ok) return auth.response;
    const workerId = auth.userId;

    const contentType = request.headers.get("content-type") || "";
    let photoUrl = "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json(
          { success: false, error: "File foto tidak ditemukan" },
          { status: 400 }
        );
      }

      // Validasi format
      const validMimes = ["image/jpeg", "image/png", "image/webp"];
      if (!validMimes.includes(file.type)) {
        return NextResponse.json(
          { success: false, error: "Format foto harus JPG, PNG, atau WebP" },
          { status: 400 }
        );
      }

      // Validasi ukuran (maks 5MB)
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { success: false, error: "Ukuran foto maksimal 5 MB" },
          { status: 400 }
        );
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Coba upload ke Supabase Storage jika ada
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const adminSupabase = createAdminClient();
        const bucketName = "order-photos";

        const { data: buckets } = await adminSupabase.storage.listBuckets();
        const hasBucket = buckets?.some((b) => b.name === bucketName);
        if (!hasBucket) {
          await adminSupabase.storage.createBucket(bucketName, { public: true });
        }

        const ext = file.name.split(".").pop() || "jpg";
        const cleanName = `${id}/result_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const { error: uploadErr } = await adminSupabase.storage
          .from(bucketName)
          .upload(cleanName, buffer, {
            contentType: file.type,
            upsert: true,
          });

        if (!uploadErr) {
          const {
            data: { publicUrl },
          } = adminSupabase.storage.from(bucketName).getPublicUrl(cleanName);
          photoUrl = publicUrl;
        }
      } catch (storageErr) {
        console.warn("Supabase storage upload fallback to data URL:", storageErr);
      }

      // Fallback jika storage tidak tersedia (mock mode / local)
      if (!photoUrl) {
        const base64 = buffer.toString("base64");
        photoUrl = `data:${file.type};base64,${base64}`;
      }
    } else {
      const body = await request.json();
      photoUrl = body.photo_url || body.storage_path;
    }

    if (!photoUrl) {
      return NextResponse.json(
        { success: false, error: "URL foto tidak valid" },
        { status: 400 }
      );
    }

    const result = await addMitraJobPhoto(workerId, id, photoUrl, "result");
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      photo: result.photo,
      photos: result.photos,
      message: "Foto hasil kerja berhasil diunggah",
    });
  } catch (err: any) {
    console.error("POST /api/mitra/jobs/[id]/photos error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Gagal mengunggah foto hasil kerja" },
      { status: 500 }
    );
  }
}
