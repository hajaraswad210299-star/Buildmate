import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function checkAdminAuth() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const adminEmail = (process.env.ADMIN_EMAIL || "hajaraswad210299@gmail.com").toLowerCase();
    if (user.email?.toLowerCase() === adminEmail) {
      return user;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role === "admin") {
      return user;
    }

    return null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await checkAdminAuth();
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Validasi format file
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validMimes.includes(file.type)) {
      return NextResponse.json(
        { error: "Format gambar harus JPG, PNG, atau WebP" },
        { status: 400 }
      );
    }

    // Validasi ukuran maks 5 MB
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Ukuran file maksimal 5 MB" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext = file.name.split(".").pop() || "webp";
    const cleanFileName = `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
    const filePath = `packages/${cleanFileName}`;

    try {
      const adminSupabase = createAdminClient();

      // Pastikan bucket 'services' ada atau buat jika belum ada
      const { data: buckets } = await adminSupabase.storage.listBuckets();
      const hasServicesBucket = buckets?.some((b) => b.name === "services");

      if (!hasServicesBucket) {
        await adminSupabase.storage.createBucket("services", {
          public: true,
        });
      }

      const { error: uploadError } = await adminSupabase.storage
        .from("services")
        .upload(filePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!uploadError) {
        const {
          data: { publicUrl },
        } = adminSupabase.storage.from("services").getPublicUrl(filePath);

        return NextResponse.json({ success: true, url: publicUrl });
      }

      // Coba fallback ke bucket avatars jika bucket services gagal
      const { error: fallbackError } = await adminSupabase.storage
        .from("avatars")
        .upload(`services/${cleanFileName}`, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (!fallbackError) {
        const {
          data: { publicUrl },
        } = adminSupabase.storage.from("avatars").getPublicUrl(`services/${cleanFileName}`);

        return NextResponse.json({ success: true, url: publicUrl });
      }

      console.warn("Supabase storage upload error, falling back to data URL:", uploadError.message);
    } catch (storageErr: any) {
      console.warn("Storage upload exception, falling back to data URL:", storageErr.message);
    }

    // Fallback: return Base64 Data URL jika Supabase storage offline / mock mode
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({ success: true, url: dataUrl });
  } catch (err: any) {
    console.error("POST /api/admin/services/upload error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal mengunggah foto" },
      { status: 500 }
    );
  }
}
