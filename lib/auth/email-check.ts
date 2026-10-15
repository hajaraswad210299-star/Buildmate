import { createAdminClient } from "@/lib/supabase/admin";

export type RoleType = "admin" | "staff" | "worker" | "customer";

export interface CheckEmailResult {
  available: boolean;
  existingRole?: RoleType;
  message?: string;
}

export async function checkEmailRoleAvailability(
  email: string,
  targetRole: RoleType
): Promise<CheckEmailResult> {
  const cleanEmail = email.trim().toLowerCase();
  const envAdmin = (process.env.ADMIN_EMAIL || "").toLowerCase();
  const adminEmail =
    envAdmin && envAdmin !== "hajaraswad210299@gmail.com"
      ? envAdmin
      : "jonathanhuang88@proton.me";

  if (cleanEmail === adminEmail) {
    if (targetRole === "admin") {
      return { available: true };
    }
    return {
      available: false,
      existingRole: "admin",
      message: "Email ini terdaftar sebagai Admin Utama dan tidak dapat digunakan untuk peran lain.",
    };
  }

  try {
    const supabase = createAdminClient();
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUser = usersData?.users.find((u) => u.email?.toLowerCase() === cleanEmail);

    if (existingUser) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", existingUser.id)
        .maybeSingle();

      const existingRole: RoleType = (profile?.role ||
        existingUser.user_metadata?.role ||
        existingUser.user_metadata?.signup_as ||
        "customer") as RoleType;

      const roleLabels: Record<RoleType, string> = {
        admin: "Admin Utama",
        staff: "Anggota Staf",
        worker: "Mitra Tukang",
        customer: "Pelanggan",
      };

      if (existingRole === targetRole) {
        return {
          available: false,
          existingRole,
          message: `Email ini sudah terdaftar sebagai ${roleLabels[existingRole]}. Silakan langsung masuk ke akun kamu.`,
        };
      } else {
        return {
          available: false,
          existingRole,
          message: `Email ini sudah terdaftar sebagai ${roleLabels[existingRole]} dan tidak dapat digunakan untuk peran lain.`,
        };
      }
    }

    return { available: true };
  } catch (err: any) {
    console.error("checkEmailRoleAvailability error:", err);
    return { available: true };
  }
}
