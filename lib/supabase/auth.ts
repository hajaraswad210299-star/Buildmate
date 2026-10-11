import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type UserRole = "customer" | "worker" | "admin";

/**
 * Server-side guard to verify user authentication and role.
 * Redirects to /admin/login if not authenticated, or /admin/denied if role does not match.
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!user || error) {
    redirect("/admin/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  if (!profile || !roles.includes(profile.role as UserRole)) {
    redirect("/admin/denied");
  }

  return { user, profile };
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
