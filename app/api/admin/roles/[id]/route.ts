import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/supabase/auth";
import { updateRole, deleteRole, getRoleById } from "@/lib/data/roles";
import { logAdminAudit } from "@/lib/data/audit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, permissions } = body;

    const oldRole = await getRoleById(id);
    if (!oldRole) {
      return NextResponse.json({ error: "Peran tidak ditemukan" }, { status: 404 });
    }

    const res = await updateRole(id, { name, description, permissions });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    await logAdminAudit({
      eventType: "role_updated",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin Utama",
      details: {
        role_id: id,
        old_name: oldRole.name,
        new_name: res.role?.name,
        permissions: res.role?.permissions,
      },
    });

    return NextResponse.json({
      success: true,
      role: res.role,
      message: `Peran "${res.role?.name}" berhasil diperbarui.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiSuperAdmin();
    if (!auth.authorized) {
      return auth.response;
    }

    const { id } = await params;
    const oldRole = await getRoleById(id);
    if (!oldRole) {
      return NextResponse.json({ error: "Peran tidak ditemukan" }, { status: 404 });
    }

    const res = await deleteRole(id);
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    await logAdminAudit({
      eventType: "role_deleted",
      actorId: auth.user.id,
      actorName: auth.profile?.full_name || auth.user.email || "Admin Utama",
      details: {
        role_id: id,
        role_name: oldRole.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Peran "${oldRole.name}" berhasil dihapus.`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
