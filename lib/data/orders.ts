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
    complaint: row.complaints?.[0]
      ? {
          id: row.complaints[0].id,
          order_id: row.complaints[0].order_id,
          description: row.complaints[0].description,
          status: row.complaints[0].status,
          is_warranty: Boolean(row.complaints[0].is_warranty),
          resolution: row.complaints[0].resolution,
          created_at: row.complaints[0].created_at,
          closed_at: row.complaints[0].closed_at,
        }
      : undefined,
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
  const found = inMemoryOrders.find((o) => o.id === id || o.order_code === id);
  if (found) return found;

  // Browser-side fallback: check sessionStorage then check server API
  if (typeof window !== "undefined") {
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

    try {
      const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.order) {
          registerClientOrder(data.order);
          return data.order;
        }
      }
    } catch {}
  }

  // Server-side fallback: check Supabase directly
  if (typeof window === "undefined") {
    try {
      const { createAdminClient } = await import("../supabase/admin");
      const adminSupabase = createAdminClient();

      const { data: dbOrder } = await adminSupabase
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
        .or(`id.eq.${id},order_code.eq.${id}`)
        .single();

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
        registerClientOrder(mapped);
        return mapped;
      }
    } catch (err) {
      console.warn("Server getOrderById DB error:", err);
    }
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
  order.status = toStatus;
  order.updated_at = nowIso;

  if (toStatus === "paid") order.paid_at = nowIso;
  if (toStatus === "worker_confirmed") order.worker_confirmed_at = nowIso;
  if (toStatus === "on_the_way") order.on_the_way_at = nowIso;
  if (toStatus === "in_progress") order.in_progress_at = nowIso;
  if (toStatus === "awaiting_confirmation") order.awaiting_confirmation_at = nowIso;
  if (toStatus === "completed") {
    order.completed_at = nowIso;
    order.completed_by = actor === "admin" ? "admin" : "customer";
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
      if (toStatus === "paid") updatePayload.paid_at = nowIso;
      if (toStatus === "worker_confirmed") updatePayload.worker_confirmed_at = nowIso;
      if (toStatus === "on_the_way") updatePayload.on_the_way_at = nowIso;
      if (toStatus === "in_progress") updatePayload.in_progress_at = nowIso;
      if (toStatus === "awaiting_confirmation") updatePayload.awaiting_confirmation_at = nowIso;
      if (toStatus === "completed") {
        updatePayload.completed_at = nowIso;
        updatePayload.completed_by = actor === "admin" ? "admin" : "customer";
      }
      if (toStatus === "cancelled") {
        updatePayload.cancelled_at = nowIso;
        updatePayload.cancel_reason = payload.cancelReason || payload.note || "Dibatalkan";
      }

      await adminSupabase
        .from("orders")
        .update(updatePayload)
        .or(`id.eq.${order.id},order_code.eq.${order.order_code}`);

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

export async function addOrderPhoto(
  orderId: string,
  photo: {
    type: "problem" | "result";
    uploaded_by: "customer" | "worker" | "admin";
    source_note: string;
    storage_path: string;
  }
): Promise<{ success: boolean; photo?: OrderPhoto }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return { success: false };

  const newPhoto: OrderPhoto = {
    id: `photo-${Date.now()}`,
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
): Promise<{ success: boolean }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return { success: false };

  order.worker_id = newWorker.id;
  order.worker = newWorker;
  order.worker_response = "pending";

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "worker_changed",
    actor_type: "admin" as Actor,
    actor_name: "Admin BuildMate",
    note: `Tukang diganti ke ${newWorker.name}. ${note}`,
    created_at: new Date().toISOString(),
  };

  order.events = [event, ...(order.events || [])];
  return { success: true };
}

export async function resolveComplaint(
  orderId: string,
  resolution: string,
  action: "warranty_rework" | "close_without_action" | "cancel_refund"
): Promise<{ success: boolean }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order || !order.complaint) return { success: false };

  order.complaint.status = "closed";
  order.complaint.resolution = resolution;
  order.complaint.closed_at = new Date().toISOString();

  if (action === "warranty_rework") {
    // Kembali ke in_progress untuk garansi
    await transitionOrder(orderId, "in_progress", "admin", {
      note: `Komplain ditindaklanjuti dengan garansi perbaikan ulang: ${resolution}`,
    });
  } else if (action === "cancel_refund") {
    await transitionOrder(orderId, "cancelled", "admin", {
      cancelReason: `Dibatalkan dan refund setelah komplain: ${resolution}`,
    });
  }

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
): Promise<{ success: boolean; order?: Order }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return { success: false };

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
  order.status = "worker_confirmed";
  order.worker_confirmed_at = new Date().toISOString();
  order.assignment_method = "manual";
  order.assigned_by = "Admin BuildMate";

  const manualOffer = {
    id: `off-manual-${Date.now()}`,
    attempt_number: (order.dispatch_offers?.length || 0) + 1,
    worker_id: worker.id,
    worker_name: worker.name,
    worker_area: worker.service_area,
    status: "accepted" as const,
    sent_at: new Date().toISOString(),
    is_manual: true,
    assigned_by: "Admin BuildMate",
  };
  order.dispatch_offers = [manualOffer, ...(order.dispatch_offers || [])];

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "worker_assigned_manual",
    actor_type: "admin" as Actor,
    actor_name: "Admin BuildMate",
    note: `Tukang ${worker.name} ditugaskan secara manual oleh admin.${note ? ` Catatan: ${note}` : ""}`,
    created_at: new Date().toISOString(),
  };

  order.events = [event, ...(order.events || [])];
  return { success: true, order };
}

export async function retryDispatch(
  orderId: string
): Promise<{ success: boolean; order?: Order }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return { success: false };

  order.dispatch_status = "searching";
  order.worker_id = null;
  order.worker = undefined;
  order.worker_response = "pending";

  const newOffer = {
    id: `off-${Date.now()}`,
    attempt_number: (order.dispatch_offers?.length || 0) + 1,
    worker_id: "w-new",
    worker_name: "Slamet Santoso (Kandidat Baru)",
    worker_area: "Jakarta Selatan",
    status: "pending" as const,
    sent_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };

  order.dispatch_offers = [newOffer, ...(order.dispatch_offers || [])];

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "offer_sent",
    actor_type: "system" as Actor,
    actor_name: "Sistem Dispatch",
    note: `Mencari ulang kandidat tukang. Mengirim tawaran #${newOffer.attempt_number} ke ${newOffer.worker_name}.`,
    created_at: new Date().toISOString(),
  };

  order.events = [event, ...(order.events || [])];
  return { success: true, order };
}

export async function releaseWorkerAndRedispatch(
  orderId: string,
  reason: string,
  customerConsentChecked: boolean
): Promise<{ success: boolean; order?: Order }> {
  const order = inMemoryOrders.find((o) => o.id === orderId);
  if (!order) return { success: false };

  const prevWorkerName = order.worker?.name || "Tukang sebelumnya";
  order.worker_id = null;
  order.worker = undefined;
  order.worker_response = "pending";
  order.dispatch_status = "searching";
  order.status = "paid";

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "worker_released",
    actor_type: "admin" as Actor,
    actor_name: "Admin BuildMate",
    note: `Tukang ${prevWorkerName} dilepas dan pesanan dialihkan kembali ke dispatch. Alasan: ${reason}. Konfirmasi pelanggan: ${customerConsentChecked ? "Sudah disetujui" : "Otomatis (allow_reassign aktif)"}.`,
    created_at: new Date().toISOString(),
  };

  order.events = [event, ...(order.events || [])];
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
  const pkg = pkgs.find((p) => p.id === data.packageId) || pkgs[0];

  if (!pkg) {
    return { success: false, error: "Paket layanan tidak ditemukan" };
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
  const order = inMemoryOrders.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return { success: false, error: "Pesanan tidak ditemukan" };

  const complaintId = `comp-${Date.now()}`;
  order.complaint = {
    id: complaintId,
    order_id: order.id,
    description: `[${problemType}] ${description}`,
    status: "open",
    is_warranty: isWarranty,
    created_at: new Date().toISOString(),
  };

  const event = {
    id: `ev-${Date.now()}`,
    order_id: order.id,
    event_type: "complaint_filed",
    actor_type: "customer" as Actor,
    actor_name: order.customer.name,
    note: `Pelanggan melaporkan masalah: [${problemType}] ${description}. ${
      isWarranty ? "(Garansi Plus diajukan)" : ""
    }`,
    created_at: new Date().toISOString(),
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

