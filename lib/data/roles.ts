import { createAdminClient } from "@/lib/supabase/admin";
import {
  PRESET_ROLES,
  normalizePermissions,
  Permission,
  RolePreset,
} from "@/lib/auth/permissions";
import { logAdminAudit } from "./audit";

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  is_preset: boolean;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

// In-memory store initialized with preset roles
let inMemoryRoles: Role[] = [
  {
    id: "preset-editor-konten",
    name: "Editor Konten",
    description: "Dapat melihat dashboard dan mengelola seluruh konten publik CMS.",
    permissions: ["dashboard.view", "content.manage"],
    is_preset: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "preset-pemantau-tukang",
    name: "Pemantau Tukang",
    description: "Dapat memantau pesanan, melihat mitra, dan memverifikasi aplikasi pendaftaran tukang.",
    permissions: ["dashboard.view", "workers.view", "workers.review", "orders.view"],
    is_preset: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export async function getRoles(): Promise<Role[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("roles").select("*").order("created_at", { ascending: true });
    if (!error && data && data.length > 0) {
      // Sync in-memory store
      data.forEach((r) => {
        const idx = inMemoryRoles.findIndex((im) => im.id === r.id || im.name === r.name);
        const item: Role = {
          id: r.id,
          name: r.name,
          description: r.description || "",
          permissions: (r.permissions || []) as Permission[],
          is_preset: Boolean(r.is_preset),
          created_at: r.created_at,
          updated_at: r.updated_at,
        };
        if (idx >= 0) {
          inMemoryRoles[idx] = item;
        } else {
          inMemoryRoles.push(item);
        }
      });
      return inMemoryRoles;
    }
  } catch {
    // fallback to in-memory store
  }
  return [...inMemoryRoles];
}

export async function getRoleById(id: string): Promise<Role | null> {
  const roles = await getRoles();
  return roles.find((r) => r.id === id || r.name.toLowerCase() === id.toLowerCase()) || null;
}

export async function createRole(data: {
  name: string;
  description: string;
  permissions: string[];
  createdBy?: string;
}): Promise<{ role?: Role; error?: string }> {
  const roles = await getRoles();
  const trimmedName = data.name.trim();

  if (!trimmedName) {
    return { error: "Nama peran wajib diisi" };
  }

  if (roles.some((r) => r.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { error: "Nama peran sudah digunakan, gunakan nama lain" };
  }

  const normalized = normalizePermissions(data.permissions);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  const newRole: Role = {
    id,
    name: trimmedName,
    description: data.description.trim(),
    permissions: normalized,
    is_preset: false,
    created_at: now,
    updated_at: now,
  };

  try {
    const supabase = createAdminClient();
    const { data: dbRole, error } = await supabase.from("roles").insert({
      id: newRole.id,
      name: newRole.name,
      description: newRole.description,
      permissions: newRole.permissions,
      is_preset: false,
      created_by: data.createdBy || null,
    }).select().single();

    if (!error && dbRole) {
      newRole.id = dbRole.id;
    }
  } catch {
    // continue with inMemory store
  }

  inMemoryRoles.push(newRole);

  await logAdminAudit({
    eventType: "role_created",
    actorId: data.createdBy,
    actorName: "Admin Utama",
    details: {
      role_id: newRole.id,
      role_name: newRole.name,
      permissions: newRole.permissions,
    },
  });

  return { role: newRole };
}

export async function updateRole(
  id: string,
  data: {
    name?: string;
    description?: string;
    permissions?: string[];
  }
): Promise<{ role?: Role; error?: string }> {
  const roles = await getRoles();
  const targetIndex = inMemoryRoles.findIndex((r) => r.id === id);

  if (targetIndex === -1) {
    return { error: "Peran tidak ditemukan" };
  }

  const currentRole = inMemoryRoles[targetIndex];

  if (data.name && data.name.trim()) {
    const trimmed = data.name.trim();
    if (
      roles.some(
        (r) => r.id !== id && r.name.toLowerCase() === trimmed.toLowerCase()
      )
    ) {
      return { error: "Nama peran sudah digunakan" };
    }
    currentRole.name = trimmed;
  }

  if (data.description !== undefined) {
    currentRole.description = data.description.trim();
  }

  if (data.permissions !== undefined) {
    currentRole.permissions = normalizePermissions(data.permissions);
  }

  currentRole.updated_at = new Date().toISOString();

  try {
    const supabase = createAdminClient();
    await supabase.from("roles").update({
      name: currentRole.name,
      description: currentRole.description,
      permissions: currentRole.permissions,
      updated_at: currentRole.updated_at,
    }).eq("id", id);
  } catch {
    // in-memory updated
  }

  return { role: currentRole };
}

export async function deleteRole(id: string): Promise<{ success: boolean; error?: string }> {
  const target = inMemoryRoles.find((r) => r.id === id);
  if (!target) {
    return { success: false, error: "Peran tidak ditemukan" };
  }

  if (target.is_preset) {
    return { success: false, error: "Peran bawaan tidak bisa dihapus" };
  }

  // Check if any member is using this role
  const { getTeamMembers } = await import("@/lib/data/team");
  const members = await getTeamMembers();
  const usingCount = members.filter((m) => m.role_id === id).length;

  if (usingCount > 0) {
    return {
      success: false,
      error: `Pindahkan ${usingCount} anggota ke peran lain dulu sebelum menghapus peran ini.`,
    };
  }

  inMemoryRoles = inMemoryRoles.filter((r) => r.id !== id);

  try {
    const supabase = createAdminClient();
    await supabase.from("roles").delete().eq("id", id);
  } catch {
    // deleted in-memory
  }

  return { success: true };
}
