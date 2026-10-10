import { Order, OrderPhoto } from "./types";
import { MOCK_ORDERS } from "../mock/data";
import { Actor, canTransition, OrderStatus } from "../orders/transitions";

const inMemoryOrders = [...MOCK_ORDERS];

export interface OrderFilter {
  tab?: "all" | "action_needed" | "active" | "completed" | "cancelled" | "complaints";
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
            o.complaint?.status === "open" ||
            (o.status === "awaiting_confirmation" && !o.completed_at)
        );
        break;
      case "active":
        list = list.filter(
          (o) =>
            o.status === "paid" ||
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
