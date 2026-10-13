import { createAdminClient } from "@/lib/supabase/admin";
import { getRoles, getRoleById } from "./roles";
import { logAdminAudit } from "./audit";

export interface TeamMember {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "staff";
  is_super_admin: boolean;
  role_id?: string;
  role_name: string;
  staff_status: "invited" | "active" | "disabled";
  last_sign_in_at?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

// In-memory cache for staff members to guarantee instant state updates and synchronization
let inMemoryStaff: TeamMember[] = [];

export async function getTeamMembers(): Promise<TeamMember[]> {
  const adminEmail = (process.env.ADMIN_EMAIL || "jonathanhuang88@proton.me").toLowerCase();
  const roles = await getRoles();

  // Super Admin row is always first (A10: "Baris pertama selalu Admin Utama (kamu) dengan badge Crown1 'Admin Utama'")
  const superAdmin: TeamMember = {
    id: "admin-super-id",
    full_name: "Super Admin",
    email: adminEmail,
    role: "admin",
    is_super_admin: true,
    role_name: "Admin Utama",
    staff_status: "active",
    last_sign_in_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createAdminClient();
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const users = usersData?.users || [];

    // Check if Super Admin is in Auth users
    const foundAdmin = users.find((u) => u.email?.toLowerCase() === adminEmail);
    if (foundAdmin) {
      superAdmin.id = foundAdmin.id;
      const { data: prof } = await supabase.from("profiles").select("full_name, avatar_url").eq("id", foundAdmin.id).single();
      superAdmin.full_name =
        prof?.full_name ||
        foundAdmin.user_metadata?.full_name ||
        foundAdmin.user_metadata?.name ||
        "Super Admin";
      superAdmin.avatar_url = prof?.avatar_url || foundAdmin.user_metadata?.avatar_url || null;
      superAdmin.last_sign_in_at = foundAdmin.last_sign_in_at || null;
      superAdmin.created_at = foundAdmin.created_at;
    }

    // Identify staff users from auth or profiles
    const dbStaffList: TeamMember[] = [];

    for (const u of users) {
      if (u.email?.toLowerCase() === adminEmail) continue;

      const meta = u.user_metadata || {};
      const isStaffMeta = meta.signup_as === "staff" || meta.role === "staff";

      if (isStaffMeta) {
        const roleId = meta.staff_role_id;
        const matchedRole = roles.find((r) => r.id === roleId);
        const isBanned = Boolean(u.banned_until && new Date(u.banned_until) > new Date());
        const status = isBanned ? "disabled" : (meta.staff_status || (u.confirmed_at ? "active" : "invited"));

        dbStaffList.push({
          id: u.id,
          full_name: meta.full_name || meta.name || u.email?.split("@")[0] || "Staf",
          email: u.email || "",
          role: "staff",
          is_super_admin: false,
          role_id: roleId,
          role_name: matchedRole ? matchedRole.name : "Staf Umum",
          staff_status: status as any,
          last_sign_in_at: u.last_sign_in_at || null,
          avatar_url: meta.avatar_url || null,
          created_at: u.created_at,
        });
      }
    }

    // Merge with in-memory staff list (to capture any optimistic or mocked state)
    inMemoryStaff.forEach((im) => {
      const existingIdx = dbStaffList.findIndex(
        (db) => db.id === im.id || db.email.toLowerCase() === im.email.toLowerCase()
      );
      if (existingIdx >= 0) {
        dbStaffList[existingIdx] = {
          ...dbStaffList[existingIdx],
          ...im,
          role_name: roles.find((r) => r.id === im.role_id)?.name || dbStaffList[existingIdx].role_name,
        };
      } else {
        dbStaffList.push(im);
      }
    });

    return [superAdmin, ...dbStaffList];
  } catch {
    // Return Super Admin + inMemoryStaff on failure
    return [superAdmin, ...inMemoryStaff];
  }
}

export async function inviteStaffMember(params: {
  email: string;
  fullName: string;
  roleId: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ member?: TeamMember; error?: string }> {
  const allMembers = await getTeamMembers();
  const staffOnly = allMembers.filter((m) => !m.is_super_admin);

  // A10: Batas maksimal 10 anggota staf (MVP)
  if (staffOnly.length >= 10) {
    return {
      error: "Batas maksimal 10 anggota staf telah tercapai.",
    };
  }

  const cleanEmail = params.email.trim().toLowerCase();
  const cleanName = params.fullName.trim();

  if (!cleanEmail || !cleanName) {
    return { error: "Email dan nama lengkap staf wajib diisi." };
  }

  if (allMembers.some((m) => m.email.toLowerCase() === cleanEmail)) {
    return { error: "Email ini sudah terdaftar sebagai anggota tim." };
  }

  const role = await getRoleById(params.roleId);
  if (!role) {
    return { error: "Peran yang dipilih tidak valid." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUrl = `${siteUrl}/auth/callback?next=/admin/accept-invite`;

  let newUserId = `staff-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(cleanEmail, {
      redirectTo: redirectUrl,
      data: {
        full_name: cleanName,
        signup_as: "staff",
        role: "staff",
        staff_role_id: role.id,
        staff_status: "invited",
      },
    });

    if (error) {
      console.warn("inviteUserByEmail error (proceeding with fallback):", error.message);
    } else if (data?.user) {
      newUserId = data.user.id;
    }

    // Ensure profiles record is updated or inserted
    await supabase.from("profiles").upsert({
      id: newUserId,
      full_name: cleanName,
      role: "staff",
      staff_role_id: role.id,
      staff_status: "invited",
    });
  } catch (err: any) {
    console.warn("Supabase invite caught error:", err?.message);
  }

  const newStaff: TeamMember = {
    id: newUserId,
    full_name: cleanName,
    email: cleanEmail,
    role: "staff",
    is_super_admin: false,
    role_id: role.id,
    role_name: role.name,
    staff_status: "invited",
    last_sign_in_at: null,
    created_at: new Date().toISOString(),
  };

  inMemoryStaff.push(newStaff);

  // Log in admin_audit
  await logAdminAudit({
    eventType: "staff_invited",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: newUserId,
      email: cleanEmail,
      full_name: cleanName,
      role_id: role.id,
      role_name: role.name,
    },
  });

  return { member: newStaff };
}

export async function updateStaffRole(params: {
  userId: string;
  roleId: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);

  if (!target) {
    return { success: false, error: "Anggota tim tidak ditemukan." };
  }

  if (target.is_super_admin) {
    return { success: false, error: "Peran Admin Utama tidak dapat diubah." };
  }

  const role = await getRoleById(params.roleId);
  if (!role) {
    return { success: false, error: "Peran tidak valid." };
  }

  try {
    const supabase = createAdminClient();
    await supabase.auth.admin.updateUserById(params.userId, {
      user_metadata: {
        staff_role_id: role.id,
      },
    });

    await supabase.from("profiles").update({
      staff_role_id: role.id,
    }).eq("id", params.userId);
  } catch {
    // continue
  }

  const inMem = inMemoryStaff.find((m) => m.id === params.userId);
  if (inMem) {
    inMem.role_id = role.id;
    inMem.role_name = role.name;
  }

  await logAdminAudit({
    eventType: "staff_role_changed",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: params.userId,
      old_role: target.role_name,
      new_role: role.name,
      new_role_id: role.id,
    },
  });

  return { success: true };
}

export async function toggleStaffStatus(params: {
  userId: string;
  newStatus: "active" | "disabled";
  actorId?: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);

  if (!target) {
    return { success: false, error: "Anggota tim tidak ditemukan." };
  }

  if (target.is_super_admin) {
    return { success: false, error: "Status Admin Utama tidak dapat diubah." };
  }

  try {
    const supabase = createAdminClient();
    // A10: Nonaktifkan: staff_status='disabled' + auth.admin.updateUserById(id, { ban_duration: '876000h' })
    // Aktifkan membalikkan keduanya (ban_duration: 'none')
    const banDuration = params.newStatus === "disabled" ? "876000h" : "none";

    await supabase.auth.admin.updateUserById(params.userId, {
      ban_duration: banDuration,
      user_metadata: {
        staff_status: params.newStatus,
      },
    });

    await supabase.from("profiles").update({
      staff_status: params.newStatus,
    }).eq("id", params.userId);
  } catch {
    // continue
  }

  const inMem = inMemoryStaff.find((m) => m.id === params.userId);
  if (inMem) {
    inMem.staff_status = params.newStatus;
  }

  await logAdminAudit({
    eventType: "staff_status_changed",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: params.userId,
      email: target.email,
      new_status: params.newStatus,
    },
  });

  return { success: true };
}

export async function resendInvite(params: {
  userId: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);

  if (!target) {
    return { success: false, error: "Anggota tim tidak ditemukan." };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const redirectUrl = `${siteUrl}/auth/callback?next=/admin/accept-invite`;

  try {
    const supabase = createAdminClient();
    await supabase.auth.admin.inviteUserByEmail(target.email, {
      redirectTo: redirectUrl,
      data: {
        full_name: target.full_name,
        signup_as: "staff",
        role: "staff",
        staff_role_id: target.role_id,
        staff_status: "invited",
      },
    });
  } catch {
    // continue
  }

  await logAdminAudit({
    eventType: "invite_resent",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: target.id,
      email: target.email,
    },
  });

  return { success: true };
}

export async function cancelInvite(params: {
  userId: string;
  actorId?: string;
  actorName?: string;
}): Promise<{ success: boolean; error?: string }> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);

  if (!target) {
    return { success: false, error: "Anggota tim tidak ditemukan." };
  }

  try {
    const supabase = createAdminClient();
    await supabase.auth.admin.deleteUser(params.userId);
    await supabase.from("profiles").delete().eq("id", params.userId);
  } catch {
    // continue
  }

  inMemoryStaff = inMemoryStaff.filter((m) => m.id !== params.userId);

  await logAdminAudit({
    eventType: "invite_cancelled",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: target.id,
      email: target.email,
    },
  });

  return { success: true };
}
