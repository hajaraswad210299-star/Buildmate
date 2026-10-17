import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderByIdFromDb } from "@/lib/data/orders";
import { getUserPermissions } from "@/lib/supabase/auth";
import { hasPermission } from "@/lib/auth/permissions";
import type { Order } from "@/lib/data/types";

export type OrderAccessResult =
  | { ok: true; order: Order; userId: string; isOwner: boolean }
  | { ok: false; status: 401 | 404; error: string };

/**
 * mode "read": pemilik, admin, staf aktif dengan izin orders.view, atau mitra yang ditugaskan.
 * mode "owner_action": HANYA pemilik pesanan.
 * Pesanan milik orang lain dibalas 404 (bukan 403) agar tidak membocorkan keberadaan pesanan.
 */
export async function authorizeOrderAccess(
  idOrCode: string,
  mode: "read" | "owner_action"
): Promise<OrderAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Silakan masuk terlebih dahulu." };

  const notFound: OrderAccessResult = { ok: false, status: 404, error: "Pesanan tidak ditemukan." };

  const order = await getOrderByIdFromDb(idOrCode);
  if (!order) return notFound;

  if (order.customer_id === user.id) {
    return { ok: true, order, userId: user.id, isOwner: true };
  }
  if (mode === "owner_action") return notFound;

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return notFound;

  const perms = await getUserPermissions(user, profile);
  const staffAllowed =
    perms.isStaff && perms.staffStatus === "active" && hasPermission(perms.permissions, "orders.view", false);
  if (perms.isAdmin || staffAllowed) {
    return { ok: true, order, userId: user.id, isOwner: false };
  }

  if (profile.role === "worker" && order.worker_id) {
    const { data: worker } = await db.from("workers").select("id").eq("user_id", user.id).maybeSingle();
    if (worker && worker.id === order.worker_id) {
      return { ok: true, order, userId: user.id, isOwner: false };
    }
  }

  return notFound;
}
