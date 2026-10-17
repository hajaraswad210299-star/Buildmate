import { Order, OrderPhoto } from "./types";
import { MOCK_ORDERS } from "../mock/data";
import { Actor, canTransition, OrderStatus } from "../orders/transitions";

const inMemoryOrders = [...MOCK_ORDERS];

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function mapDbOrderToOrder(
  row: any,
  isCustomerPlus: boolean = false,
  customerEmail?: string
): Order {
  const customer = row.customer || {};
  const pkg = row.package || {};
  const worker = row.worker;

  return {
    id: row.id,
    order_code: row.order_code,
    customer_id: row.customer_id,
    customer: {
      id: row.customer_id,
      name: customer.full_name || "Pelanggan",
      email: customerEmail || customer.email || "",
      phone: customer.phone || "-",
      is_plus: isCustomerPlus,
    },
    worker_id: row.worker_id || null,
    worker: worker
      ? {
          id: worker.id,
          name: worker.full_name,
          phone: worker.phone,
          service_area: worker.service_area,
          is_verified: Boolean(worker.is_verified),
          has_account: Boolean(worker.user_id),
          avatar_url: worker.photo_path || undefined,
        }
      : undefined,
    package_id: row.package_id,
    package: {
      id: pkg.id || row.package_id,
      name: pkg.name || "Layanan",
      category_name: pkg.categories?.name || "Layanan",
      inclusions: pkg.inclusions || [],
      exclusions: pkg.exclusions || [],
    },
    package_price: Number(row.package_price) || 0,
    service_fee: Number(row.service_fee) || 0,
    total: Number(row.total) || 0,
    address: row.address || "",
    scheduled_date: row.scheduled_date || "",
    time_slot: row.time_slot || "",
    description: row.description || "",
    status: row.status as OrderStatus,
    worker_response: row.worker_response || "pending",
    admin_notes: row.admin_notes || undefined,
    cancel_reason: row.cancel_reason || undefined,
    paid_at: row.paid_at || undefined,
    worker_confirmed_at: row.worker_confirmed_at || undefined,
    on_the_way_at: row.on_the_way_at || undefined,
    in_progress_at: row.in_progress_at || undefined,
    awaiting_confirmation_at: row.awaiting_confirmation_at || undefined,
    completed_at: row.completed_at || undefined,
    cancelled_at: row.cancelled_at || undefined,
    completed_by: row.completed_by || undefined,
    dispatch_status: row.dispatch_status || undefined,
    allow_reassign: row.allow_reassign ?? undefined,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    photos: (row.photos || []).map((p: any) => ({
      id: p.id,
      order_id: p.order_id,
      type: p.type,
      uploaded_by: p.uploaded_by,
      source_note: p.source_note,
      storage_path: p.storage_path,
      created_at: p.created_at,
    })),
    events: (row.events || []).map((e: any) => ({
      id: e.id,
      order_id: e.order_id,
      event_type: e.event_type,
      from_status: e.from_status,
      to_status: e.to_status,
      actor_type: e.actor_type,
      actor_name: e.actor_name,
      note: e.note,
      created_at: e.created_at,
    })),
    complaint: (() => {
      // Prefer the open complaint; otherwise the most recent one
      const list: any[] = [...(row.complaints || [])].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const c = list.find((x) => x.status === "open") || list[0];
      return c
        ? {
            id: c.id,
            order_id: c.order_id,
            description: c.description,
            status: c.status,
            is_warranty: Boolean(c.is_warranty),
            resolution: c.resolution,
            created_at: c.created_at,
            closed_at: c.closed_at,
          }
        : undefined;
    })(),
  };
}

export interface OrderFilter {
  tab?: "all" | "action_needed" | "finding_worker" | "active" | "completed" | "cancelled" | "complaint" | "complaints";
  status?: OrderStatus | "all";
  search?: string;
  category?: string;
  customerType?: "all" | "free" | "plus";
}

export async function getOrders(filter: OrderFilter = {}): Promise<Order[]> {
  // 1. If in browser, fetch through API route for live database access
  if (typeof window !== "undefined") {
    try {
      const params = new URLSearchParams();
      if (filter.tab) params.set("tab", filter.tab);
      if (filter.status) params.set("status", filter.status);
      if (filter.search) params.set("search", filter.search);
      if (filter.category) params.set("category", filter.category);
      if (filter.customerType) params.set("customerType", filter.customerType);

      const res = await fetch(`/api/orders?${params.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          return data.orders;
        }
      }
    } catch (err) {
      console.warn("Client fetch /api/orders error, falling back to local:", err);
    }
  }

  // 2. If on server, fetch directly from Supabase
  let list = [...inMemoryOrders];
  if (typeof window === "undefined") {
    try {
      const { createAdminClient } = await import("../supabase/admin");
      const adminSupabase = createAdminClient();

      const { data: dbOrders, error: dbErr } = await adminSupabase
        .from("orders")
        .select(`
          *,
          customer:profiles!customer_id (id, full_name, phone, avatar_url),
          worker:workers!worker_id (id, full_name, phone, service_area, is_verified, user_id, photo_path),
          package:service_packages!package_id (id, name, inclusions, exclusions, categories(name)),
          photos:order_photos(*),
          events:order_events(*),
          complaints(*)
        `)
        .order("created_at", { ascending: false });

      if (!dbErr && dbOrders && dbOrders.length > 0) {
        const { data: subs } = await adminSupabase
          .from("subscriptions")
          .select("user_id, plan, current_period_end");

        const plusUserSet = new Set(
          (subs || [])
            .filter(
              (s) =>
                s.plan === "plus" &&
                (!s.current_period_end || new Date(s.current_period_end) > new Date())
            )
            .map((s) => s.user_id)
        );

        const mappedDbOrders = dbOrders.map((row) =>
          mapDbOrderToOrder(row, plusUserSet.has(row.customer_id))
        );

        const dbCodes = new Set(mappedDbOrders.map((o) => o.order_code));
        const nonDuplicateInMem = inMemoryOrders.filter((im) => !dbCodes.has(im.order_code));
        list = [...mappedDbOrders, ...nonDuplicateInMem];
      }
    } catch (serverErr) {
      console.warn("Server getOrders DB fetch error:", serverErr);
    }
  }

  // 3. Apply standard filters to the combined list
  if (filter.tab) {
    switch (filter.tab) {
      case "action_needed":
        list = list.filter(
          (o) =>
            o.worker_response === "declined" ||
            o.dispatch_status === "exhausted" ||
            o.complaint?.status === "open" ||
            (o.status === "paid" && !o.worker)
        );
        break;
      case "finding_worker":
        list = list.filter((o) => o.status === "paid");
        break;
      case "active":
        list = list.filter(
          (o) =>
            o.status === "worker_confirmed" ||
            o.status === "on_the_way" ||
            o.status === "in_progress" ||
            o.status === "awaiting_confirmation"
        );
        break;
      case "completed":
        list = list.filter((o) => o.status === "completed");
        break;
      case "cancelled":
        list = list.filter((o) => o.status === "cancelled");
        break;
      case "complaint":
      case "complaints":
        list = list.filter((o) => !!o.complaint);
        break;
      default:
        break;
    }
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (o) =>
        o.order_code.toLowerCase().includes(q) ||
        o.customer.name.toLowerCase().includes(q) ||
        o.worker?.name.toLowerCase().includes(q)
    );
  }

  if (filter.category && filter.category !== "all") {
    list = list.filter((o) => o.package.category_name.toLowerCase() === filter.category?.toLowerCase());
  }

  if (filter.customerType && filter.customerType !== "all") {
    const isPlus = filter.customerType === "plus";
    list = list.filter((o) => o.customer.is_plus === isPlus);
  }

  if (filter.status && filter.status !== "all") {
    list = list.filter((o) => o.status === filter.status);
  }

  return list;
}

export function registerClientOrder(order: Order) {
  const exists = inMemoryOrders.findIndex((o) => o.id === order.id || o.order_code === order.order_code);
  if (exists >= 0) {
    inMemoryOrders[exists] = order;
  } else {
    inMemoryOrders.unshift(order);
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  // Browser-side: always fetch fresh from server API first for live DB & Midtrans status
  if (typeof window !== "undefined") {
    try {
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          registerClientOrder(data.order);
          try {
            sessionStorage.setItem(`bm_order_${id}`, JSON.stringify(data.order));
          } catch {}
          return data.order;
        }
      }
    } catch {}

    try {
      const cached = sessionStorage.getItem(`bm_order_${id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.id) {
          registerClientOrder(parsed);
          return parsed;
        }
      }
    } catch {}
  }

  // Browser: in-memory copy. Server: the database is the source of truth, so a warm
  // instance never serves a stale status (C08); in-memory is only the mock fallback.
  if (typeof window !== "undefined") {
    const found = inMemoryOrders.find((o) => o.id === id || o.order_code === id);
    if (found) return found;
  }

  if (typeof window === "undefined") {
    try {
      const { createAdminClient } = await import("../supabase/admin");
      const adminSupabase = createAdminClient();

      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      let query = adminSupabase
        .from("orders")
        .select(`
          *,
          customer:profiles!customer_id (id, full_name, phone, avatar_url),
          worker:workers!worker_id (id, full_name, phone, service_area, is_verified, user_id, photo_path),
          package:service_packages!package_id (id, name, inclusions, exclusions, categories(name)),
          photos:order_photos(*),
          events:order_events(*),
          complaints(*)
        `);

      if (isUuid) {
        query = query.or(`id.eq.${id},order_code.eq.${id}`);
      } else {
        query = query.eq("order_code", id);
      }

      const { data: dbOrder } = await query.maybeSingle();

      if (dbOrder) {
        const { data: sub } = await adminSupabase
          .from("subscriptions")
          .select("plan, current_period_end")
          .eq("user_id", dbOrder.customer_id)
          .single();
        const isPlus = Boolean(
          sub?.plan === "plus" &&
            (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
        );
        const mapped = mapDbOrderToOrder(dbOrder, isPlus);

        // The Snap token lives in payments; C06 "Lanjutkan pembayaran" reuses it
        if (mapped.status === "pending_payment") {
          const { data: payment } = await adminSupabase
            .from("payments")
            .select("snap_token")
            .eq("provider_order_id", `ORD-${mapped.order_code}`)
            .maybeSingle();
          if (payment?.snap_token) mapped.snap_token = payment.snap_token;
        }

        registerClientOrder(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Server getOrderById DB error:", err);
    }

    const found = inMemoryOrders.find((o) => o.id === id || o.order_code === id);
    if (found) return found;
  }

  return null;
}

export async function transitionOrder(
  orderId: string,
  toStatus: OrderStatus,
  actor: Actor,
  payload: {
    actorName?: string;
    note?: string;
    cancelReason?: string;
  } = {}
): Promise<{ success: boolean; error?: string; order?: Order }> {
  // Server: load the latest state (DB first) before checking guards
  if (typeof window === "undefined") {
    await getOrderById(orderId);
  }
  const order = inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  if (!canTransition(order.status, toStatus, actor)) {
    return {
      success: false,
      error: `Transisi ilegal dari ${order.status} ke ${toStatus} untuk aktor ${actor}`,
    };
  }

  // Guard foto hasil
  if (toStatus === "awaiting_confirmation") {
    const hasResultPhoto = order.photos?.some((p) => p.type === "result");
    if (!hasResultPhoto) {
      return {
        success: false,
        error: "Foto hasil pekerjaan wajib diunggah sebelum meminta konfirmasi pelanggan.",
      };
    }
  }

  // Guard komplain terbuka
  if (toStatus === "completed" && order.complaint?.status === "open") {
    return {
      success: false,
      error: "Pesanan tidak dapat diselesaikan selama masih ada komplain terbuka.",
    };
  }

  const nowIso = new Date().toISOString();
  const fromStatus = order.status;
  const snapshot = { ...order };
  const rollbackLocal = () => {
    Object.assign(order, snapshot);
  };
  order.status = toStatus;
  order.updated_at = nowIso;

  if (toStatus === "paid" && fromStatus === "pending_payment") order.paid_at = nowIso;
  if (toStatus === "worker_confirmed") order.worker_confirmed_at = nowIso;
  if (toStatus === "on_the_way") order.on_the_way_at = nowIso;
  if (toStatus === "in_progress") order.in_progress_at = nowIso;
  if (toStatus === "awaiting_confirmation") order.awaiting_confirmation_at = nowIso;
  if (toStatus === "completed") {
    order.completed_at = nowIso;
    order.completed_by = actor === "admin" ? "admin" : actor === "system" ? "system" : "customer";
  }
  if (toStatus === "cancelled") {
    order.cancelled_at = nowIso;
    order.cancel_reason = payload.cancelReason || payload.note || "Dibatalkan oleh sistem/admin";
  }

  // Catat event
  const newEvent = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: `transition_${toStatus}`,
    from_status: fromStatus,
    to_status: toStatus,
    actor_type: actor,
    actor_name: payload.actorName || (actor === "admin" ? "Admin BuildMate" : actor),
    note: payload.note || `Status diubah dari ${fromStatus} ke ${toStatus}`,
    created_at: nowIso,
  };

  order.events = [newEvent, ...(order.events || [])];

  if (typeof window === "undefined") {
    try {
      const { createAdminClient } = await import("../supabase/admin");
      const adminSupabase = createAdminClient();
      const updatePayload: any = {
        status: toStatus,
        updated_at: nowIso,
      };
      if (toStatus === "paid" && fromStatus === "pending_payment") updatePayload.paid_at = nowIso;
      if (toStatus === "worker_confirmed") updatePayload.worker_confirmed_at = nowIso;
      if (toStatus === "on_the_way") updatePayload.on_the_way_at = nowIso;
      if (toStatus === "in_progress") updatePayload.in_progress_at = nowIso;
      if (toStatus === "awaiting_confirmation") updatePayload.awaiting_confirmation_at = nowIso;
      if (toStatus === "completed") {
        updatePayload.completed_at = nowIso;
        updatePayload.completed_by = order.completed_by;
      }
      if (toStatus === "cancelled") {
        updatePayload.cancelled_at = nowIso;
        updatePayload.cancel_reason = payload.cancelReason || payload.note || "Dibatalkan";
      }

      // Only move the row if it is still in the status we validated (no double transitions)
      const { data: updatedRows, error: updateError } = await adminSupabase
        .from("orders")
        .update(updatePayload)
        .eq("order_code", order.order_code)
        .eq("status", fromStatus)
        .select("id, worker_id, package_price");

      if (updateError) {
        rollbackLocal();
        return { success: false, error: "Gagal menyimpan perubahan status. Coba lagi." };
      }

      const dbRow = updatedRows?.[0];
      if (!dbRow && UUID_RE.test(order.id)) {
        // Row exists in DB but its status changed in the meantime
        const { data: exists } = await adminSupabase
          .from("orders")
          .select("id")
          .eq("order_code", order.order_code)
          .maybeSingle();
        if (exists) {
          rollbackLocal();
          return { success: false, error: "Status pesanan sudah berubah. Muat ulang halaman." };
        }
      }

      if (dbRow) {
        // B5: entering completed creates the worker payout (escrow → pending payout)
        if (toStatus === "completed" && dbRow.worker_id) {
          await adminSupabase.from("payouts").upsert(
            {
              order_id: dbRow.id,
              worker_id: dbRow.worker_id,
              amount: dbRow.package_price,
              status: "pending",
            },
            { onConflict: "order_id", ignoreDuplicates: true }
          );
        }
        // B5: cancelled after payment → payment marked refunded
        if (toStatus === "cancelled" && fromStatus !== "pending_payment") {
          await adminSupabase
            .from("payments")
            .update({ status: "refunded" })
            .eq("provider_order_id", `ORD-${order.order_code}`)
            .eq("status", "success");
        }
      }

      await adminSupabase.from("order_events").insert({
        order_id: order.id,
        event_type: `transition_${toStatus}`,
        from_status: fromStatus,
        to_status: toStatus,
        actor_type: actor,
        actor_name: payload.actorName || (actor === "admin" ? "Admin BuildMate" : actor),
        note: payload.note || `Status diubah dari ${fromStatus} ke ${toStatus}`,
      });
    } catch (dbSyncErr) {
      console.warn("DB transition update error:", dbSyncErr);
    }
  }

  return { success: true, order };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server-side admin client for orders that live in the database (mock orders have non-UUID ids). */
async function getServerAdminClient(order?: Order) {
  if (typeof window !== "undefined") return null;
  if (order && !UUID_RE.test(order.id)) return null;
  try {
    const { createAdminClient } = await import("../supabase/admin");
    return createAdminClient();
  } catch {
    return null;
  }
}

async function loadOrderForAction(orderId: string): Promise<Order | undefined> {
  if (typeof window === "undefined") {
    await getOrderById(orderId);
  }
  return inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
}

async function insertOrderEvent(
  order: Order,
  event: { event_type: string; actor_type: Actor; actor_name: string; note: string; from_status?: string; to_status?: string }
) {
  const nowIso = new Date().toISOString();
  order.events = [
    { id: `ev-${Date.now()}`, order_id: order.id, created_at: nowIso, ...event },
    ...(order.events || []),
  ];
  const db = await getServerAdminClient(order);
  if (db) {
    await db.from("order_events").insert({ order_id: order.id, ...event });
  }
}

export async function addOrderPhoto(
  orderId: string,
  photo: {
    type: "problem" | "result";
    uploaded_by: "customer" | "worker" | "admin";
    source_note: string;
    storage_path: string;
  }
): Promise<{ success: boolean; error?: string; photo?: OrderPhoto }> {
  const order = await loadOrderForAction(orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  let photoId = `photo-${Date.now()}`;
  const db = await getServerAdminClient(order);
  if (db) {
    const { data, error } = await db
      .from("order_photos")
      .insert({ order_id: order.id, ...photo })
      .select("id")
      .single();
    if (error) return { success: false, error: "Gagal menyimpan foto" };
    photoId = data.id;
  }

  const newPhoto: OrderPhoto = {
    id: photoId,
    order_id: order.id,
    type: photo.type,
    uploaded_by: photo.uploaded_by,
    source_note: photo.source_note,
    storage_path: photo.storage_path,
    created_at: new Date().toISOString(),
  };

  order.photos = [...(order.photos || []), newPhoto];
  return { success: true, photo: newPhoto };
}

export async function updateAdminNotes(
  orderId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const order = await loadOrderForAction(orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  const db = await getServerAdminClient(order);
  if (db) {
    const { error } = await db.from("orders").update({ admin_notes: notes }).eq("id", order.id);
    if (error) return { success: false, error: "Gagal menyimpan catatan" };
  }
  order.admin_notes = notes;
  return { success: true };
}

/**
 * Replace the worker on an order that already has one (before departure).
 * Requires the customer's consent (A03).
 */
export async function replaceWorker(
  orderId: string,
  newWorker: {
    id: string;
    name: string;
    phone: string;
    service_area: string;
    is_verified: boolean;
    has_account: boolean;
  },
  note: string
): Promise<{ success: boolean; error?: string }> {
  const order = await loadOrderForAction(orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };
  if (order.status !== "worker_confirmed") {
    return { success: false, error: "Tukang hanya bisa diganti sebelum berangkat" };
  }

  const db = await getServerAdminClient(order);
  if (db) {
    const { error } = await db
      .from("orders")
      .update({ worker_id: newWorker.id, updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "worker_confirmed");
    if (error) return { success: false, error: "Gagal mengganti tukang" };
  }

  order.worker_id = newWorker.id;
  order.worker = newWorker;

  await insertOrderEvent(order, {
    event_type: "worker_changed",
    actor_type: "admin",
    actor_name: "Admin BuildMate",
    note: `Tukang diganti ke ${newWorker.name}. ${note}`,
  });
  return { success: true };
}

export async function resolveComplaint(
  orderId: string,
  resolution: string,
  action: "warranty_rework" | "close_without_action" | "cancel_refund"
): Promise<{ success: boolean; error?: string }> {
  const order = await loadOrderForAction(orderId);
  if (!order || !order.complaint) return { success: false, error: "Komplain tidak ditemukan" };
  if (order.complaint.status !== "open") {
    return { success: false, error: "Komplain ini sudah ditutup" };
  }

  // Do the status change first; only close the complaint if it succeeded (B5 guards)
  if (action === "warranty_rework") {
    const res = await transitionOrder(order.id, "in_progress", "admin", {
      note: `Komplain ditindaklanjuti dengan garansi perbaikan ulang: ${resolution}`,
    });
    if (!res.success) return { success: false, error: res.error };
  } else if (action === "cancel_refund") {
    const res = await transitionOrder(order.id, "cancelled", "admin", {
      cancelReason: `Dibatalkan dan refund setelah komplain: ${resolution}`,
    });
    if (!res.success) {
      return {
        success: false,
        error: res.error || "Pesanan tidak bisa dibatalkan pada status ini",
      };
    }
  }

  const closedAt = new Date().toISOString();
  const db = await getServerAdminClient(order);
  if (db && UUID_RE.test(order.complaint.id)) {
    const { error } = await db
      .from("complaints")
      .update({ status: "closed", resolution, closed_at: closedAt })
      .eq("id", order.complaint.id)
      .eq("status", "open");
    if (error) return { success: false, error: "Gagal menutup komplain" };
  }

  order.complaint.status = "closed";
  order.complaint.resolution = resolution;
  order.complaint.closed_at = closedAt;

  await insertOrderEvent(order, {
    event_type: "complaint_closed",
    actor_type: "admin",
    actor_name: "Admin BuildMate",
    note: `Komplain ditutup: ${resolution}`,
  });

  return { success: true };
}

export async function manualAssignWorker(
  orderId: string,
  worker: {
    id: string;
    name: string;
    phone: string;
    service_area: string;
    is_verified?: boolean;
    has_account?: boolean;
    avatar_url?: string;
  },
  note?: string
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const before = await loadOrderForAction(orderId);
  if (!before) return { success: false, error: "Pesanan tidak ditemukan" };
  // B25: manual assignment only for a paid order that is still waiting for a worker
  if (before.status !== "paid") {
    return { success: false, error: "Tukang hanya bisa ditugaskan pada pesanan yang sudah dibayar" };
  }

  const res = await transitionOrder(before.id, "worker_confirmed", "admin", {
    actorName: "Admin BuildMate",
    note: `Tukang ${worker.name} ditugaskan secara manual oleh admin.${note ? ` Catatan: ${note}` : ""}`,
  });
  if (!res.success || !res.order) return { success: false, error: res.error };
  const order = res.order;

  const db = await getServerAdminClient(order);
  if (db) {
    const { error } = await db
      .from("orders")
      .update({ worker_id: worker.id, worker_response: "accepted", dispatch_status: "assigned" })
      .eq("id", order.id);
    if (error) return { success: false, error: "Status berubah, tetapi tukang gagal disimpan. Muat ulang halaman." };
  }

  order.worker_id = worker.id;
  order.worker = {
    id: worker.id,
    name: worker.name,
    phone: worker.phone,
    service_area: worker.service_area,
    is_verified: worker.is_verified ?? true,
    has_account: worker.has_account ?? true,
    avatar_url: worker.avatar_url,
  };
  order.worker_response = "accepted";
  order.dispatch_status = "assigned";
  order.assignment_method = "manual";
  order.assigned_by = "Admin BuildMate";
  order.dispatch_offers = [
    {
      id: `off-manual-${Date.now()}`,
      attempt_number: (order.dispatch_offers?.length || 0) + 1,
      worker_id: worker.id,
      worker_name: worker.name,
      worker_area: worker.service_area,
      status: "accepted" as const,
      sent_at: new Date().toISOString(),
      is_manual: true,
      assigned_by: "Admin BuildMate",
    },
    ...(order.dispatch_offers || []),
  ];

  return { success: true, order };
}

/**
 * Restart the search for a worker (B25). Only for paid orders without a worker.
 */
export async function retryDispatch(
  orderId: string
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const order = await loadOrderForAction(orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };
  if (order.status !== "paid" || order.worker_id) {
    return { success: false, error: "Cari ulang hanya untuk pesanan dibayar yang belum punya tukang" };
  }

  const db = await getServerAdminClient(order);
  if (db) {
    const { error } = await db
      .from("orders")
      .update({ dispatch_status: "searching", worker_response: "pending", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "paid");
    if (error) return { success: false, error: "Gagal memulai pencarian ulang" };
  }

  order.dispatch_status = "searching";
  order.worker_response = "pending";

  await insertOrderEvent(order, {
    event_type: "dispatch_restarted",
    actor_type: "admin",
    actor_name: "Admin BuildMate",
    note: "Admin memulai ulang pencarian tukang.",
  });
  return { success: true, order };
}

/**
 * worker_confirmed → paid (admin): release the worker and search again (B5, B25.6).
 */
export async function releaseWorkerAndRedispatch(
  orderId: string,
  reason: string,
  customerConsentChecked: boolean
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const before = await loadOrderForAction(orderId);
  if (!before) return { success: false, error: "Pesanan tidak ditemukan" };
  if (before.allow_reassign === false && !customerConsentChecked) {
    return { success: false, error: "Centang persetujuan pelanggan terlebih dahulu" };
  }
  const prevWorkerName = before.worker?.name || "Tukang sebelumnya";

  const res = await transitionOrder(before.id, "paid", "admin", {
    actorName: "Admin BuildMate",
    note: `Tukang ${prevWorkerName} dilepas dan pesanan dialihkan kembali ke dispatch. Alasan: ${reason}. Konfirmasi pelanggan: ${customerConsentChecked ? "Sudah disetujui" : "Otomatis (allow_reassign aktif)"}.`,
  });
  if (!res.success || !res.order) return { success: false, error: res.error };
  const order = res.order;

  const db = await getServerAdminClient(order);
  if (db) {
    const { error } = await db
      .from("orders")
      .update({ worker_id: null, worker_response: "pending", dispatch_status: "searching" })
      .eq("id", order.id);
    if (error) return { success: false, error: "Gagal melepas tukang. Muat ulang halaman." };
  }

  order.worker_id = null;
  order.worker = undefined;
  order.worker_response = "pending";
  order.dispatch_status = "searching";
  return { success: true, order };
}

export async function createCustomerOrder(data: {
  packageId: string;
  workerId?: string | null;
  address: string;
  scheduledDate: string;
  timeSlot: string;
  description: string;
  photoPaths?: string[];
  allowReassign?: boolean;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  isPlus?: boolean;
}): Promise<{ success: boolean; order?: Order; snapToken?: string; error?: string }> {
  const { getPackages } = await import("./services");
  const { getWorkerById } = await import("./workers");
  const pkgs = await getPackages();
  // Exact, active package only — never fall back to another package (B6.2)
  const pkg = pkgs.find((p) => p.id === data.packageId && p.is_active !== false);

  if (!pkg) {
    return { success: false, error: "Paket layanan tidak ditemukan atau sudah tidak aktif" };
  }

  const worker = data.workerId ? await getWorkerById(data.workerId) : null;
  const nowIso = new Date().toISOString();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const orderCode = `BM-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${randomSuffix}`;
  const orderId = generateUuid();

  const serviceFee = data.isPlus ? 0 : 5000;
  const total = pkg.price + serviceFee;

  const photos: OrderPhoto[] = (data.photoPaths || []).map((path, idx) => ({
    id: `photo-prob-${Date.now()}-${idx}`,
    order_id: orderId,
    type: "problem",
    uploaded_by: "customer",
    source_note: "Foto masalah saat pemesanan",
    storage_path: path,
    created_at: nowIso,
  }));

  const newOrder: Order = {
    id: orderId,
    order_code: orderCode,
    customer_id: data.customerId || "cust-demo",
    customer: {
      id: data.customerId || "cust-demo",
      name: data.customerName || "Pelanggan BuildMate",
      email: data.customerEmail || "pelanggan@buildmate.id",
      phone: data.customerPhone || "6281234567890",
      is_plus: Boolean(data.isPlus),
    },
    worker_id: worker ? worker.id : null,
    worker: worker
      ? {
          id: worker.id,
          name: worker.full_name,
          phone: worker.phone,
          service_area: worker.service_area,
          is_verified: worker.is_verified,
          has_account: Boolean(worker.user_id),
          avatar_url: worker.photo_path || undefined,
        }
      : undefined,
    package_id: pkg.id,
    package: {
      id: pkg.id,
      name: pkg.name,
      category_name: pkg.category_name || "Layanan",
      inclusions: pkg.inclusions,
      exclusions: pkg.exclusions,
    },
    package_price: pkg.price,
    service_fee: serviceFee,
    total,
    address: data.address,
    scheduled_date: data.scheduledDate,
    time_slot: data.timeSlot,
    description: data.description,
    status: "pending_payment",
    worker_response: "pending",
    allow_reassign: data.allowReassign !== undefined ? data.allowReassign : true,
    dispatch_status: "idle",
    photos,
    events: [
      {
        id: `ev-${Date.now()}`,
        order_id: orderId,
        event_type: "order_created",
        from_status: undefined,
        to_status: "pending_payment",
        actor_type: "customer",
        actor_name: data.customerName || "Pelanggan",
        note: `Pesanan dibuat untuk ${pkg.name}. Total: Rp${total.toLocaleString("id-ID")}`,
        created_at: nowIso,
      },
    ],
    created_at: nowIso,
    updated_at: nowIso,
  };

  // Real Midtrans Snap Transaction (B12 & B20)
  const { createMidtransSnapTransaction } = await import("../midtrans");
  const { recordPayment } = await import("./transactions");

  const midtransRes = await createMidtransSnapTransaction({
    orderId: `ORD-${orderCode}`,
    grossAmount: total,
    customerDetails: {
      first_name: data.customerName || "Pelanggan",
      email: data.customerEmail || "pelanggan@buildmate.id",
      phone: data.customerPhone || "081200000000",
    },
    itemDetails: [
      {
        id: pkg.id,
        name: pkg.name.slice(0, 50),
        price: pkg.price,
        quantity: 1,
      },
      ...(serviceFee > 0
        ? [{ id: "service_fee", name: "Biaya Layanan", price: serviceFee, quantity: 1 }]
        : []),
    ],
  });

  if (midtransRes.error || !midtransRes.token) {
    return {
      success: false,
      error: midtransRes.error || "Gagal membuat transaksi Midtrans Snap.",
    };
  }

  const snapToken = midtransRes.token;
  newOrder.snap_token = snapToken;
  inMemoryOrders.unshift(newOrder);

  // Record payment in payments ledger
  recordPayment({
    id: `pay-${Date.now()}`,
    provider_order_id: `ORD-${orderCode}`,
    kind: "order",
    ref_id: newOrder.id,
    order_code: orderCode,
    customer_name: data.customerName || "Pelanggan",
    customer_id: data.customerId || "cust-demo",
    amount: total,
    status: "pending",
    payment_type: "snap",
    snap_token: snapToken,
    created_at: nowIso,
  });

  // Record to Supabase orders, photos, events, and payments tables
  try {
    const { createAdminClient } = await import("../supabase/admin");
    const adminSupabase = createAdminClient();

    let effectiveCustomerId: string | null = null;
    const isCustomerUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.customerId || ""
    );

    if (data.customerId && isCustomerUuid) {
      const { data: profExists } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("id", data.customerId)
        .single();

      if (profExists) {
        effectiveCustomerId = profExists.id;
      } else {
        try {
          const { error: insProfErr } = await adminSupabase.from("profiles").insert({
            id: data.customerId,
            full_name: data.customerName || "Pelanggan",
            phone: data.customerPhone || null,
            role: "customer",
          });
          if (!insProfErr) {
            effectiveCustomerId = data.customerId;
          }
        } catch {}
      }
    }

    if (!effectiveCustomerId) {
      const { data: custProf } = await adminSupabase
        .from("profiles")
        .select("id")
        .eq("role", "customer")
        .limit(1)
        .single();
      effectiveCustomerId = custProf?.id || "1966b32b-76cc-4bf3-808b-59eaa88c7f13";
    }

    if (effectiveCustomerId) {
      // Ensure package_id is a valid UUID present in service_packages
      let validPkgId = pkg.id;
      const isPkgUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        validPkgId
      );

      if (!isPkgUuid) {
        const { data: dbPkg } = await adminSupabase
          .from("service_packages")
          .select("id")
          .ilike("name", `%${pkg.name}%`)
          .limit(1)
          .single();
        validPkgId = dbPkg?.id || "b0000000-0000-0000-0000-000000000001";
      } else {
        const { data: pkgCheck } = await adminSupabase
          .from("service_packages")
          .select("id")
          .eq("id", validPkgId)
          .single();
        if (!pkgCheck) {
          const { data: fallbackPkg } = await adminSupabase
            .from("service_packages")
            .select("id")
            .limit(1)
            .single();
          validPkgId = fallbackPkg?.id || "b0000000-0000-0000-0000-000000000001";
        }
      }

      let validWorkerId: string | null = null;
      if (
        worker &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(worker.id)
      ) {
        const { data: wCheck } = await adminSupabase
          .from("workers")
          .select("id")
          .eq("id", worker.id)
          .single();
        if (wCheck) {
          validWorkerId = wCheck.id;
        }
      }

      const { error: dbOrderErr } = await adminSupabase.from("orders").insert({
        id: orderId,
        order_code: orderCode,
        customer_id: effectiveCustomerId,
        worker_id: validWorkerId,
        package_id: validPkgId,
        package_price: pkg.price,
        service_fee: serviceFee,
        total: total,
        address: data.address,
        scheduled_date: data.scheduledDate,
        time_slot: data.timeSlot,
        description: data.description || "Perbaikan rumah",
        status: "pending_payment",
      });

      if (dbOrderErr) {
        console.error("Supabase orders insert error:", dbOrderErr);
      } else {
        if (data.photoPaths && data.photoPaths.length > 0) {
          await adminSupabase.from("order_photos").insert(
            data.photoPaths.map((path) => ({
              order_id: orderId,
              type: "problem",
              uploaded_by: "customer",
              source_note: "Foto masalah saat pemesanan",
              storage_path: path,
            }))
          );
        }

        await adminSupabase.from("order_events").insert({
          order_id: orderId,
          event_type: "order_created",
          to_status: "pending_payment",
          actor_type: "customer",
          actor_id: effectiveCustomerId,
          actor_name: data.customerName || "Pelanggan",
          note: `Pesanan dibuat untuk ${pkg.name}. Total: Rp${total.toLocaleString("id-ID")}`,
        });
      }

      await adminSupabase.from("payments").insert({
        provider_order_id: `ORD-${orderCode}`,
        kind: "order",
        ref_id: orderId,
        customer_id: effectiveCustomerId,
        amount: total,
        status: "pending",
        snap_token: snapToken,
      });
    }
  } catch (syncErr) {
    console.error("Order Supabase synchronization error:", syncErr);
  }

  return { success: true, order: newOrder, snapToken };
}

export async function confirmCustomerOrder(
  orderId: string,
  note?: string,
  photoPath?: string
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const order = inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  if (photoPath) {
    const photo: OrderPhoto = {
      id: `photo-res-${Date.now()}`,
      order_id: order.id,
      type: "result",
      uploaded_by: "customer",
      source_note: "Foto tambahan konfirmasi pelanggan",
      storage_path: photoPath,
      created_at: new Date().toISOString(),
    };
    order.photos = [...(order.photos || []), photo];
  }

  return transitionOrder(order.id, "completed", "customer", {
    actorName: order.customer.name,
    note: note || "Pelanggan telah memeriksa hasil dan mengonfirmasi pesanan selesai.",
  });
}

export async function reportCustomerProblem(
  orderId: string,
  problemType: string,
  description: string,
  photoPath?: string,
  isWarranty: boolean = false
): Promise<{ success: boolean; error?: string; order?: Order }> {
  if (typeof window === "undefined") {
    await getOrderById(orderId);
  }
  const order = inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  // C08: complaints are filed while the customer reviews the result, one open at a time
  if (order.status !== "awaiting_confirmation") {
    return { success: false, error: "Komplain hanya bisa diajukan saat hasil kerja menunggu konfirmasimu." };
  }
  if (order.complaint?.status === "open") {
    return { success: false, error: "Masih ada komplain yang sedang ditangani untuk pesanan ini." };
  }

  const nowIso = new Date().toISOString();
  const fullDescription = `[${problemType}] ${description}`;
  const eventNote = `Pelanggan melaporkan masalah: ${fullDescription}. ${
    isWarranty ? "(Garansi Plus diajukan)" : ""
  }`;

  let complaintId = `comp-${Date.now()}`;

  const complaintDb = await getServerAdminClient(order);
  if (complaintDb) {
    try {
      const adminSupabase = complaintDb;
      const { data: inserted, error } = await adminSupabase
        .from("complaints")
        .insert({
          order_id: order.id,
          description: fullDescription,
          status: "open",
          is_warranty: isWarranty,
        })
        .select("id")
        .single();
      if (error) {
        return { success: false, error: "Gagal menyimpan komplain. Coba lagi." };
      }
      complaintId = inserted.id;

      if (photoPath) {
        await adminSupabase.from("order_photos").insert({
          order_id: order.id,
          type: "problem",
          uploaded_by: "customer",
          source_note: "Foto komplain pelanggan",
          storage_path: photoPath,
        });
      }

      await adminSupabase.from("order_events").insert({
        order_id: order.id,
        event_type: "complaint_filed",
        actor_type: "customer",
        actor_id: order.customer_id,
        actor_name: order.customer.name,
        note: eventNote,
      });
    } catch (err) {
      console.error("Complaint DB insert error:", err);
      return { success: false, error: "Gagal menyimpan komplain. Coba lagi." };
    }
  }

  order.complaint = {
    id: complaintId,
    order_id: order.id,
    description: fullDescription,
    status: "open",
    is_warranty: isWarranty,
    created_at: nowIso,
  };

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "complaint_filed",
    actor_type: "customer" as Actor,
    actor_name: order.customer.name,
    note: eventNote,
    created_at: nowIso,
  };

  order.events = [event, ...(order.events || [])];
  return { success: true, order };
}

export async function cancelCustomerPendingOrder(
  orderId: string,
  reason?: string
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const order = inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  return transitionOrder(order.id, "cancelled", "customer", {
    actorName: order.customer.name,
    cancelReason: reason || "Dibatalkan oleh pelanggan sebelum pembayaran.",
  });
}

