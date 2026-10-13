import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireApiSuperAdmin } from "@/lib/supabase/auth";

export async function POST() {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const currentEmail = auth.user.email;
    if (!currentEmail) {
      return NextResponse.json({ error: "Email pengguna tidak valid" }, { status: 400 });
    }

    // Calling admin.updateUserById with email = currentEmail resets new_email and email_change in Supabase Auth
    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase.auth.admin.updateUserById(auth.user.id, {
      email: currentEmail,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Permintaan perubahan email berhasil dibatalkan.",
      user: data.user,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
