import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkEmailRoleAvailability, RoleType } from "@/lib/auth/email-check";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { fullName, email, phone, password, role = "customer" } = body;

    // 1. Basic validation
    if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
      return NextResponse.json({ error: "Nama lengkap wajib diisi." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "Format email tidak valid." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!phone || typeof phone !== "string" || phone.length < 9 || phone.length > 16) {
      return NextResponse.json(
        { error: "Nomor WhatsApp harus antara 9-13 digit (mis. 0812...)." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password minimal 8 karakter." },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json(
        { error: "Password wajib memuat huruf besar, huruf kecil, dan angka." },
        { status: 400 }
      );
    }

    const targetRole: RoleType = role === "worker" ? "worker" : "customer";

    // 2. Cross-role check (B11)
    const checkRes = await checkEmailRoleAvailability(cleanEmail, targetRole);
    if (!checkRes.available) {
      return NextResponse.json(
        { error: checkRes.message || "Email ini sudah terdaftar." },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // 3. Create user in Supabase Auth via Admin API
    // setting email_confirm: true ensures user is verified and not blocked by SMTP rate limits
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName.trim(),
        name: fullName.trim(),
        phone: phone.trim(),
        signup_as: targetRole,
        role: targetRole,
      },
    });

    if (createError) {
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("duplicate")
      ) {
        return NextResponse.json(
          { error: "Email ini sudah terdaftar. Silakan masuk atau gunakan fitur reset password." },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: createError.message || "Gagal membuat akun." },
        { status: 400 }
      );
    }

    const user = userData.user;

    // 4. Ensure profile exists and has accurate data
    if (user) {
      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();

      if (!existingProfile) {
        await adminSupabase.from("profiles").insert({
          id: user.id,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role: targetRole,
          onboarding_completed: false,
        });
      } else {
        await adminSupabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            phone: phone.trim(),
            role: targetRole,
          })
          .eq("id", user.id);
      }

      if (targetRole === "customer") {
        await adminSupabase
          .from("subscriptions")
          .insert({ user_id: user.id })
          .select()
          .maybeSingle();
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user?.id,
        email: cleanEmail,
      },
      role: targetRole,
    });
  } catch (err: any) {
    console.error("POST /api/auth/register error:", err);
    return NextResponse.json(
      { error: err?.message || "Terjadi kesalahan internal saat pendaftaran." },
      { status: 500 }
    );
  }
}
