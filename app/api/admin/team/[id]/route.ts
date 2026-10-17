import { NextResponse } from "next/server";
import { requireApiSuperAdmin } from "@/lib/supabase/auth";
import {
  updateStaffRole,
  toggleStaffStatus,
  resendInvite,
  cancelInvite,
  getStaffInviteLink,
} from "@/lib/data/team";

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
    const { action, roleId, newStatus } = body;

    const actorId = auth.user.id;
    const actorName = auth.profile?.full_name || auth.user.email || "Admin Utama";

    if (action === "change_role") {
      if (!roleId) {
        return NextResponse.json({ error: "roleId wajib disertakan" }, { status: 400 });
      }
      const res = await updateStaffRole({ userId: id, roleId, actorId, actorName });
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Peran staf berhasil diperbarui" });
    }

    if (action === "toggle_status") {
      if (!newStatus || !["active", "disabled"].includes(newStatus)) {
        return NextResponse.json({ error: "Status baru tidak valid" }, { status: 400 });
      }
      const res = await toggleStaffStatus({
        userId: id,
        newStatus,
        actorId,
        actorName,
      });
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        message: newStatus === "disabled" ? "Staf dinonaktifkan" : "Staf diaktifkan kembali",
      });
    }

    if (action === "resend_invite") {
      const res = await resendInvite({ userId: id, actorId, actorName, origin: new URL(request.url).origin });
      return NextResponse.json({
        success: true,
        emailSent: res.emailSent,
        inviteLink: res.inviteLink,
        message: res.emailSent
          ? "Undangan berhasil dikirim ulang ke email"
          : "Batas email Supabase tercapai (rate limit). Tautan undangan langsung siap disalin.",
      });
    }

    if (action === "get_invite_link") {
      const res = await getStaffInviteLink({ userId: id, origin: new URL(request.url).origin });
      if (!res.success) {
        return NextResponse.json({ error: res.error || "Gagal membuat tautan" }, { status: 400 });
      }
      return NextResponse.json({
        success: true,
        inviteLink: res.inviteLink,
      });
    }

    if (action === "cancel_invite") {
      const res = await cancelInvite({ userId: id, actorId, actorName });
      if (res.error) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: "Undangan berhasil dibatalkan" });
    }

    return NextResponse.json({ error: "Aksi tidak dikenali" }, { status: 400 });
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
    const actorId = auth.user.id;
    const actorName = auth.profile?.full_name || auth.user.email || "Admin Utama";

    const res = await cancelInvite({ userId: id, actorId, actorName });
    if (res.error) {
      return NextResponse.json({ error: res.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Anggota tim berhasil dihapus" });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
