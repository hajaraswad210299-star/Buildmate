import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "customer" | "worker" | "admin";

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
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isConfiguredAdmin = Boolean(adminEmail && user.email?.toLowerCase() === adminEmail);

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
