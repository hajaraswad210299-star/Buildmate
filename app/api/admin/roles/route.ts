import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/supabase/auth";
import { getRoles, createRole } from "@/lib/data/roles";
import { getTeamMembers } from "@/lib/data/team";
import { logAdminAudit } from "@/lib/data/audit";

export async function GET() {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const roles = await getRoles();
    const members = await getTeamMembers();

    const rolesWithCounts = roles.map((r) => ({
      ...r,
      member_count: members.filter((m) => m.role_id === r.id).length,
    }));

    return NextResponse.json({
      success: true,
      roles: rolesWithCounts,
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
    const { name, description, permissions } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Nama peran wajib diisi." }, { status: 400 });
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json(
        { error: "Pilih minimal satu hak akses untuk peran ini." },
        { status: 400 }
      );
    }

    const res = await createRole({
      name,
      description: description || "",
      permissions,
      createdBy: auth.user.id,
    });

    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    await logAdminAudit({
      eventType: "role_created",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin Utama",
      details: {
        role_id: res.role?.id,
        role_name: res.role?.name,
        permissions: res.role?.permissions,
      },
    });

    return NextResponse.json({
      success: true,
      role: res.role,
      message: `Peran "${res.role?.name}" berhasil dibuat.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
