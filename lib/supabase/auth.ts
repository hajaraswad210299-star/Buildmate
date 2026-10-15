import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  ALL_PERMISSIONS,
  Permission,
  hasPermission,
} from "@/lib/auth/permissions";
import { getRoleById } from "@/lib/data/roles";

export type UserRole = "customer" | "worker" | "admin" | "staff";

export interface UserPermissionContext {
  permissions: Permission[];
  isAdmin: boolean;
  isStaff: boolean;
  roleName: string;
  staffStatus: "invited" | "active" | "disabled" | null;
}

/**
 * Resolves permissions and role details for a given user & profile.
 */
export async function getUserPermissions(
  user: any,
  profile: any
): Promise<UserPermissionContext> {
  const userEmail = (user?.email || "").toLowerCase();
  const isCustomerExplicit = userEmail === "hajaraswad210299@gmail.com";

  if (isCustomerExplicit) {
    return {
      permissions: [],
      isAdmin: false,
      isStaff: false,
      roleName: "customer",
      staffStatus: null,
    };
  }

  const configuredAdmins = [
    (process.env.ADMIN_EMAIL || "").toLowerCase(),
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase(),
    "jonathanhuang88@proton.me",
  ].filter((e) => Boolean(e) && e !== "hajaraswad210299@gmail.com");
  const isSuperAdmin = Boolean(
    (user.email && configuredAdmins.includes(user.email.toLowerCase())) ||
    profile?.role === "admin"
  );

  if (isSuperAdmin) {
    return {
      permissions: [...ALL_PERMISSIONS],
      isAdmin: true,
      isStaff: false,
      roleName: "Admin Utama",
      staffStatus: "active",
    };
  }

  const role = profile?.role || user.user_metadata?.role || user.user_metadata?.signup_as;
  if (role === "staff") {
    const status = profile?.staff_status || user.user_metadata?.staff_status || "invited";
    const roleId = profile?.staff_role_id || user.user_metadata?.staff_role_id;

    if (status !== "active") {
      return {
        permissions: [],
        isAdmin: false,
        isStaff: true,
        roleName: "Staf",
        staffStatus: status,
      };
    }

    if (roleId) {
      const dbRole = await getRoleById(roleId);
      if (dbRole) {
        return {
          permissions: (dbRole.permissions || []) as Permission[],
          isAdmin: false,
          isStaff: true,
          roleName: dbRole.name,
          staffStatus: "active",
        };
      }
    }

    return {
      permissions: [],
      isAdmin: false,
      isStaff: true,
      roleName: "Staf Umum",
      staffStatus: "active",
    };
  }

  return {
    permissions: [],
    isAdmin: false,
    isStaff: false,
    roleName: role || "customer",
    staffStatus: null,
  };
}

/**
 * Server-side guard to verify user authentication and role.
 * Redirects to /admin/login if not authenticated, or /admin/denied if role does not match.
 */
export async function requireRole(
  allowedRoles: UserRole | UserRole[],
  options?: { redirectUrl?: string; deniedUrl?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect(options?.redirectUrl || "/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  const userEmail = (user?.email || "").toLowerCase();
  const isCustomerExplicit = userEmail === "hajaraswad210299@gmail.com";

  if (isCustomerExplicit) {
    if (roles.includes("customer")) {
      return { user, profile: { ...profile, role: "customer" } };
    }
    redirect(options?.deniedUrl || "/admin/denied");
  }

  const configuredAdmins = [
    (process.env.ADMIN_EMAIL || "").toLowerCase(),
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase(),
    "jonathanhuang88@proton.me",
  ].filter((e) => Boolean(e) && e !== "hajaraswad210299@gmail.com");
  const isConfiguredAdmin = Boolean(user.email && configuredAdmins.includes(user.email.toLowerCase()));

  if (profile && roles.includes(profile.role as UserRole)) {
    return { user, profile };
  }

  if (isConfiguredAdmin && roles.includes("admin")) {
    return {
      user,
      profile: profile || {
        id: user.id,
        full_name: user.user_metadata?.full_name || "Super Admin",
        role: "admin",
        onboarding_completed: true,
      },
    };
  }

  redirect(options?.deniedUrl || "/admin/denied");
}

/**
 * Server-side guard enforcing specific permissions (A12).
 * Admin Utama always passes. Staff members must be active and have the required permission.
 * Missing permission triggers redirect to /admin/no-access.
 */
export async function requirePermission(
  requiredPermission: Permission | Permission[],
  options?: { redirectUrl?: string; deniedUrl?: string; noAccessUrl?: string }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect(options?.redirectUrl || "/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const permContext = await getUserPermissions(user, profile);

  // Admin Utama always bypasses checks
  if (permContext.isAdmin) {
    return { user, profile, ...permContext };
  }

  // If user is not staff, deny access
  if (!permContext.isStaff) {
    redirect(options?.deniedUrl || "/admin/denied");
  }

  // Staff status checks
  if (permContext.staffStatus === "invited") {
    redirect("/admin/accept-invite");
  }

  if (permContext.staffStatus === "disabled") {
    redirect("/admin/denied");
  }

  // Check permission
  const allowed = hasPermission(permContext.permissions, requiredPermission, false);
  if (!allowed) {
    redirect(options?.noAccessUrl || "/admin/no-access");
  }

  return { user, profile, ...permContext };
}

export type ApiAuthSuccess = {
  authorized: true;
  user: any;
  profile: any;
  permissions: Permission[];
  isAdmin: boolean;
  isStaff: boolean;
  roleName: string;
  staffStatus: string | null;
  response?: undefined;
};

export type ApiAuthFailure = {
  authorized: false;
  response: NextResponse;
  user?: undefined;
  profile?: undefined;
  permissions?: undefined;
  isAdmin?: undefined;
  isStaff?: undefined;
  roleName?: undefined;
  staffStatus?: undefined;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

/**
 * API route handler guard enforcing permissions (returns JSON 401/403).
 */
export async function requireApiPermission(
  requiredPermission: Permission | Permission[]
): Promise<ApiAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized: Silakan masuk terlebih dahulu" },
          { status: 401 }
        ),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const permContext = await getUserPermissions(user, profile);

    if (permContext.isAdmin) {
      return { authorized: true, user, profile, ...permContext };
    }

    if (!permContext.isStaff || permContext.staffStatus !== "active") {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden: Akun tidak memiliki akses staf aktif" },
          { status: 403 }
        ),
      };
    }

    const allowed = hasPermission(permContext.permissions, requiredPermission, false);
    if (!allowed) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden: Hak akses tidak memadai untuk tindakan ini" },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, user, profile, ...permContext };
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: err?.message || "Internal auth error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * API route handler guard exclusive to Admin Utama (A10: Tim & Akses).
 */
export async function requireApiSuperAdmin(): Promise<ApiAuthResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Unauthorized: Silakan masuk terlebih dahulu" },
          { status: 401 }
        ),
      };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const permContext = await getUserPermissions(user, profile);

    if (!permContext.isAdmin) {
      return {
        authorized: false,
        response: NextResponse.json(
          { error: "Forbidden: Halaman dan aksi ini khusus Admin Utama" },
          { status: 403 }
        ),
      };
    }

    return { authorized: true, user, profile, ...permContext };
  } catch (err: any) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: err?.message || "Internal auth error" },
        { status: 500 }
      ),
    };
  }
}

/**
 * Retrieves the current authenticated user and profile safely from server context.
 */
export async function getCurrentUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile };
  } catch {
    return null;
  }
}

/**
 * Retrieves the current admin user and profile safely from server context.
 */
export async function getCurrentAdmin() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (!user || error) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    return { user, profile };
  } catch {
    return null;
  }
}
