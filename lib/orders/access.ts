import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getUserPermissions } from "@/lib/supabase/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getOrderById } from "@/lib/data/orders";
import type { Order } from "@/lib/data/types";

type OrderAccessResult =
  | { ok: true; order: Order; user: User; isOwner: boolean }
  | { ok: false; response: NextResponse };

/**
 * Loads an order for the current requester (C08, B10, B13).
 * - "owner": only the customer who placed the order.
 * - "owner_or_staff": the owner, or an admin/active staff with `orders.view`.
 * Orders the requester may not see answer 404, so ids/codes cannot be probed.
 */
export async function getOrderForRequester(
  id: string,
  mode: "owner" | "owner_or_staff" = "owner"
): Promise<OrderAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Akses tidak diizinkan." }, { status: 401 }),
    };
  }

  const notFound = {
    ok: false as const,
    response: NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 }),
  };

  const order = await getOrderById(id);
  if (!order) return notFound;

  const isOwner = order.customer_id === user.id;
  if (isOwner) return { ok: true, order, user, isOwner };

  if (mode === "owner_or_staff") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const perms = await getUserPermissions(user, profile);
    const canView =
      perms.isAdmin ||
      (perms.isStaff &&
        perms.staffStatus === "active" &&
        hasPermission(perms.permissions, "orders.view", false));
    if (canView) return { ok: true, order, user, isOwner: false };
  }

  return notFound;
}
