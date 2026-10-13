import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { acceptStaffInvite } from "@/lib/data/team";
import { getFirstAllowedRoute } from "@/lib/auth/permissions";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (!user || userError) {
      return NextResponse.json(
        {
          error:
            "Sesi tidak valid atau telah kedaluwarsa. Silakan buka kembali link undangan dari email kamu.",
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { fullName, password } = body;

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: "Nama lengkap wajib diisi." },
        { status: 400 }
      );
    }

    if (password) {
      // Validate password rules (SPEC_ADMIN.md B11.3 & A00e)
      const hasMinLength = password.length >= 8;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber) {
        return NextResponse.json(
          {
            error:
              "Password belum memenuhi kriteria keamanan (minimal 8 karakter, ada huruf besar, huruf kecil, dan angka).",
          },
          { status: 400 }
        );
      }
    }

    const result = await acceptStaffInvite({
      userId: user.id,
      fullName: fullName.trim(),
      password,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Gagal mengaktifkan akun staf" },
        { status: 400 }
      );
    }

    const nextRoute = getFirstAllowedRoute(result.permissions || [], false);

    return NextResponse.json({
      success: true,
      message: "Akun staf berhasil diaktifkan!",
      roleName: result.roleName,
      nextRoute: nextRoute === "/admin/no-access" ? "/admin" : nextRoute,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
