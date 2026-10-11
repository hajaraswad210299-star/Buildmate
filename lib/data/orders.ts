import { Order, OrderPhoto } from "./types";
import { MOCK_ORDERS } from "../mock/data";
import { Actor, canTransition, OrderStatus } from "../orders/transitions";

const inMemoryOrders = [...MOCK_ORDERS];

export interface OrderFilter {
  tab?: "all" | "action_needed" | "finding_worker" | "active" | "completed" | "cancelled" | "complaint" | "complaints";
  search?: string;
  category?: string;
  customerType?: "all" | "free" | "plus";
}

export async function getOrders(filter: OrderFilter = {}): Promise<Order[]> {
  let list = [...inMemoryOrders];

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

  return list;
}

export async function getOrderById(id: string): Promise<Order | null> {
  const found = inMemoryOrders.find((o) => o.id === id || o.order_code === id);
  return found || null;
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

