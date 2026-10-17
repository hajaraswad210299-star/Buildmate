import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email wajib disertakan." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const adminSupabase = createAdminClient();

    // Find user in auth.users
    const { data: usersData, error: listError } = await adminSupabase.auth.admin.listUsers();
    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const user = usersData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (!user) {
      return NextResponse.json({ error: "Pengguna dengan email ini tidak ditemukan." }, { status: 404 });
    }

    // Confirm email
    const { error: updateError } = await adminSupabase.auth.admin.updateUserById(user.id, {
      email_confirm: true,
    });

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Check role in profiles
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("role, onboarding_completed, phone")
      .eq("id", user.id)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      role: profile?.role || user.user_metadata?.signup_as || "customer",
      onboarding_completed: profile?.onboarding_completed ?? false,
      phone: profile?.phone ?? null,
    });
  } catch (err: any) {
    console.error("POST /api/auth/verify-email error:", err);
    return NextResponse.json(
      { error: err?.message || "Gagal memverifikasi email." },
      { status: 500 }
    );
  }
}
