import { createAdminClient } from "@/lib/supabase/admin";
import { getRoles, getRoleById } from "./roles";
import { logAdminAudit } from "./audit";
import { Permission } from "@/lib/auth/permissions";
import { checkEmailRoleAvailability } from "@/lib/auth/email-check";
import { randomUUID } from "crypto";

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
  const envAdmin = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const adminEmail =
    envAdmin && envAdmin !== "hajaraswad210299@gmail.com"
      ? envAdmin
      : "jonathanhuang88@proton.me";
  const roles = await getRoles();

  // Super Admin row is always first (A10: "Baris pertama selalu Admin Utama (kamu) dengan badge Crown1 'Admin Utama'")
  const superAdmin: TeamMember = {
    id: "admin-super-id",
    full_name: "Theo Nakamura",
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
        "Theo Nakamura";
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

/**
 * Base URL for direct invite links. Without NEXT_PUBLIC_SITE_URL the links pointed at
 * localhost even on Vercel, so fall back to the origin of the admin's request.
 */
function resolveSiteUrl(origin?: string): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || origin || "http://localhost:3000").replace(/\/+$/, "");
}

export async function inviteStaffMember(params: {
  email: string;
  fullName: string;
  roleId: string;
  actorId?: string;
  actorName?: string;
  origin?: string;
}): Promise<{
  member?: TeamMember;
  error?: string;
  inviteLink?: string;
  emailSent?: boolean;
}> {
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

  // Cross-role validation: if email is already registered with any role, cannot be invited
  const check = await checkEmailRoleAvailability(cleanEmail, "staff");
  if (!check.available) {
    return { error: check.message || "Email ini sudah terdaftar dan tidak dapat digunakan untuk peran lain." };
  }

  if (allMembers.some((m) => m.email.toLowerCase() === cleanEmail)) {
    return { error: "Email ini sudah terdaftar sebagai anggota tim." };
  }

  const role = await getRoleById(params.roleId);
  if (!role) {
    return { error: "Peran yang dipilih tidak valid." };
  }

  const siteUrl = resolveSiteUrl(params.origin);
  // Supabase GoTrue whitelist requires production domain or whitelisted callback
  const authRedirectBase =
    siteUrl.includes("localhost")
      ? "https://buildmate-ten.vercel.app"
      : siteUrl;
  const redirectUrl = `${authRedirectBase}/auth/callback?next=/admin/accept-invite`;

  let newUserId: string = randomUUID();
  let inviteLink: string | undefined;
  let emailSent = false;

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
      console.warn("inviteUserByEmail notice:", error.message);
    } else if (data?.user) {
      newUserId = data.user.id;
      emailSent = true;
    }

    // Always generate direct token link as backup/fallback (bypasses rate limits)
    try {
      const linkRes = await supabase.auth.admin.generateLink({
        type: "invite",
        email: cleanEmail,
        options: { redirectTo: redirectUrl },
      });
      if (linkRes.data?.user) {
        newUserId = linkRes.data.user.id;
      }
      if (linkRes.data?.properties?.hashed_token) {
        inviteLink = `${siteUrl}/auth/callback?token_hash=${linkRes.data.properties.hashed_token}&type=invite&next=/admin/accept-invite`;
      } else if (linkRes.data?.properties?.action_link) {
        inviteLink = linkRes.data.properties.action_link;
      }
    } catch {
      // ignore
    }

    // Safely ensure profiles record has full_name without violating constraints
    try {
      // The invite (made by an admin, server-side) is what marks the profile as an
      // invited staff member; accept-invite later checks exactly this (A00e, B2).
      await supabase.from("profiles").upsert({
        id: newUserId,
        full_name: cleanName,
        role: "staff",
        staff_role_id: role.id,
        staff_status: "invited",
      });
    } catch {
      // ignore
    }
  } catch (err: any) {
    console.warn("Supabase invite caught error:", err?.message);
  }

  if (process.env.USE_MOCK_DATA !== "true" && !emailSent && !inviteLink) {
    return {
      error: "Undangan gagal dibuat: email tidak terkirim dan tautan aktivasi tidak bisa dibuat. Coba lagi.",
    };
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
      email_sent: emailSent,
      has_direct_link: Boolean(inviteLink),
    },
  });

  return { member: newStaff, inviteLink, emailSent };
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
  origin?: string;
}): Promise<{
  success: boolean;
  error?: string;
  inviteLink?: string;
  emailSent?: boolean;
}> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);

  if (!target) {
    return { success: false, error: "Anggota tim tidak ditemukan." };
  }

  const siteUrl = resolveSiteUrl(params.origin);
  const authRedirectBase =
    siteUrl.includes("localhost")
      ? "https://buildmate-ten.vercel.app"
      : siteUrl;
  const redirectUrl = `${authRedirectBase}/auth/callback?next=/admin/accept-invite`;

  let inviteLink: string | undefined;
  let emailSent = false;
  let errorMsg: string | undefined;

  try {
    const supabase = createAdminClient();

    // 1. Try sending email via Supabase
    const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(target.email, {
      redirectTo: redirectUrl,
      data: {
        full_name: target.full_name,
        signup_as: "staff",
        role: "staff",
        staff_role_id: target.role_id,
        staff_status: "invited",
      },
    });

    if (inviteError) {
      console.warn("resend inviteUserByEmail notice:", inviteError.message);
      errorMsg = inviteError.message;
    } else {
      emailSent = true;
    }

    // 2. Always generate direct link (bypasses rate limit and gives instant access)
    try {
      const linkRes = await supabase.auth.admin.generateLink({
        type: "invite",
        email: target.email,
        options: { redirectTo: redirectUrl },
      });

      if (linkRes.data?.properties?.hashed_token) {
        inviteLink = `${siteUrl}/auth/callback?token_hash=${linkRes.data.properties.hashed_token}&type=invite&next=/admin/accept-invite`;
      } else if (linkRes.data?.properties?.action_link) {
        inviteLink = linkRes.data.properties.action_link;
      }
    } catch {
      // ignore
    }
  } catch (err: any) {
    errorMsg = err.message;
  }

  await logAdminAudit({
    eventType: "invite_resent",
    actorId: params.actorId,
    actorName: params.actorName,
    details: {
      staff_id: target.id,
      email: target.email,
      email_sent: emailSent,
      has_direct_link: Boolean(inviteLink),
    },
  });

  return { success: true, emailSent, inviteLink, error: errorMsg };
}

export async function getStaffInviteLink(params: {
  userId: string;
  origin?: string;
}): Promise<{ success: boolean; inviteLink?: string; error?: string }> {
  const members = await getTeamMembers();
  const target = members.find((m) => m.id === params.userId);
  if (!target) return { success: false, error: "Anggota tim tidak ditemukan." };

  const siteUrl = resolveSiteUrl(params.origin);
  const authRedirectBase =
    siteUrl.includes("localhost")
      ? "https://buildmate-ten.vercel.app"
      : siteUrl;
  const redirectUrl = `${authRedirectBase}/auth/callback?next=/admin/accept-invite`;

  try {
    const supabase = createAdminClient();
    const linkRes = await supabase.auth.admin.generateLink({
      type: "invite",
      email: target.email,
      options: { redirectTo: redirectUrl },
    });

    if (linkRes.data?.properties?.hashed_token) {
      const inviteLink = `${siteUrl}/auth/callback?token_hash=${linkRes.data.properties.hashed_token}&type=invite&next=/admin/accept-invite`;
      return { success: true, inviteLink };
    }
    if (linkRes.data?.properties?.action_link) {
      return { success: true, inviteLink: linkRes.data.properties.action_link };
    }
    return { success: false, error: linkRes.error?.message || "Gagal membuat tautan undangan" };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
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

export async function acceptStaffInvite(params: {
  userId: string;
  fullName: string;
  password?: string;
}): Promise<{
  success: boolean;
  error?: string;
  roleName?: string;
  permissions?: Permission[];
}> {
  const supabase = createAdminClient();

  let userEmail: string | undefined;
  let roleId: string | undefined;

  // 0. Only a profile an admin invited may be activated. user_metadata is editable
  //    by the user, so the decision comes from profiles (or the in-memory mock list).
  const inMemInvite = inMemoryStaff.find((m) => m.id === params.userId);
  let invitedProfile: { role?: string; staff_status?: string | null; staff_role_id?: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("profiles")
      .select("role, staff_status, staff_role_id")
      .eq("id", params.userId)
      .maybeSingle();
    invitedProfile = data;
  } catch {
    invitedProfile = null;
  }

  const isInvitedInDb = invitedProfile?.role === "staff" && invitedProfile?.staff_status === "invited";
  const isInvitedInMemory = inMemInvite?.staff_status === "invited";
  if (!isInvitedInDb && !isInvitedInMemory) {
    return {
      success: false,
      error: "Undangan tidak ditemukan atau sudah digunakan. Minta Admin Utama mengirim ulang undangan.",
    };
  }
  roleId = invitedProfile?.staff_role_id || inMemInvite?.role_id || undefined;

  // 1. Try to fetch & update Auth user (if exists in auth.users)
  try {
    const { data: userRes } = await supabase.auth.admin.getUserById(params.userId);
    if (userRes?.user) {
      userEmail = userRes.user.email;
      roleId = roleId || userRes.user.user_metadata?.staff_role_id;
      const updatePayload: any = {
        user_metadata: {
          ...userRes.user.user_metadata,
          full_name: params.fullName.trim(),
          staff_status: "active",
          role: "staff",
        },
      };
      if (params.password) {
        updatePayload.password = params.password;
      }

      await supabase.auth.admin.updateUserById(params.userId, updatePayload);
    }
  } catch (authErr: any) {
    console.warn("Auth admin updateUserById notice:", authErr?.message);
  }

  // 2. Activate the staff profile (permissions are read from profiles first)
  if (isInvitedInDb) {
    const { error: activateError } = await supabase
      .from("profiles")
      .update({
        full_name: params.fullName.trim(),
        staff_status: "active",
      })
      .eq("id", params.userId)
      .eq("role", "staff");
    if (activateError) {
      console.warn("Profiles activate error:", activateError.message);
      return { success: false, error: "Gagal mengaktifkan akun staf. Coba lagi." };
    }
  }

  // 3. Update in-memory staff if present
  const inMem = inMemoryStaff.find((m) => m.id === params.userId);
  if (inMem) {
    inMem.full_name = params.fullName.trim();
    inMem.staff_status = "active";
    if (inMem.role_id) roleId = inMem.role_id;
    if (inMem.email && !userEmail) userEmail = inMem.email;
  }

  // 4. Determine role & permissions
  let roleName = "Staf";
  let permissions: Permission[] = [];
  if (roleId) {
    const role = await getRoleById(roleId);
    if (role) {
      roleName = role.name;
      permissions = role.permissions;
    }
  }

  // 5. Audit log
  await logAdminAudit({
    eventType: "staff_invite_accepted",
    actorId: params.userId,
    actorName: params.fullName.trim(),
    details: {
      staff_id: params.userId,
      email: userEmail || "staff@buildmate.id",
      role_name: roleName,
      role_id: roleId,
    },
  });

  return { success: true, roleName, permissions };
}
