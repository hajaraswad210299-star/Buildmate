import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/supabase/auth";
import { getTeamMembers, inviteStaffMember } from "@/lib/data/team";

export async function GET() {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const members = await getTeamMembers();
    return NextResponse.json({
      success: true,
      members,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const body = await request.json();
    const { email, fullName, roleId } = body;

    if (!email || !fullName || !roleId) {
      return NextResponse.json(
        { error: "Nama, email, dan peran staf wajib diisi." },
        { status: 400 }
      );
    }

    const result = await inviteStaffMember({
      email,
      fullName,
      roleId,
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin Utama",
      origin: new URL(request.url).origin,
    });

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      member: result.member,
      inviteLink: result.inviteLink,
      emailSent: result.emailSent,
      message: result.emailSent
        ? `Undangan staf berhasil dikirim ke ${email}`
        : `Undangan dibuat untuk ${email}. Tautan aktivasi langsung siap dibagikan.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
