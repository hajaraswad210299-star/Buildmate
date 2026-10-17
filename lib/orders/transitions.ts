export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "worker_confirmed"
  | "on_the_way"
  | "in_progress"
  | "awaiting_confirmation"
  | "completed"
  | "cancelled";

export type Actor = "system" | "webhook" | "admin" | "customer" | "worker";

/**
 * Matriks Transisi Status Sesuai B5 (ATURAN KERAS)
 */
export const TRANSITIONS: Record<
  OrderStatus,
  Partial<Record<OrderStatus, Actor[]>>
> = {
  pending_payment: {
    paid: ["webhook"],
    cancelled: ["webhook", "system", "customer"],
  },
  paid: {
    worker_confirmed: ["worker", "admin"],
    cancelled: ["admin"],
  },
  worker_confirmed: {
    on_the_way: ["worker", "admin"],
    cancelled: ["admin"],
    paid: ["admin"], // lepas tukang & cari ulang
  },
  on_the_way: {
    in_progress: ["worker", "admin"],
  },
  in_progress: {
    awaiting_confirmation: ["worker", "admin"], // Wajib foto hasil
  },
  awaiting_confirmation: {
    completed: ["customer", "system", "admin"], // system: auto_complete_tick; admin: setelah batas waktu
    in_progress: ["admin"], // garansi Plus
  },
  completed: {},
  cancelled: {},
};

export interface OrderStatusMeta {
  status: OrderStatus;
  label: string;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  iconName: string;
  description: string;
}

export const ORDER_STATUS_INFO: Record<OrderStatus, OrderStatusMeta> = {
  pending_payment: {
    status: "pending_payment",
    label: "Menunggu pembayaran",
    badgeBg: "bg-neutral-100",
    badgeText: "text-neutral-700",
    dotColor: "bg-neutral-400",
    iconName: "Clock",
    description: "Pesanan dibuat, belum dibayar oleh pelanggan.",
  },
  paid: {
    status: "paid",
    label: "Dibayar · Menunggu tukang",
    badgeBg: "bg-info-50",
    badgeText: "text-info-700",
    dotColor: "bg-info-500",
    iconName: "CardTick",
    description: "Pembayaran diterima; dana ditahan; tawaran dikirim ke tukang.",
  },
  worker_confirmed: {
    status: "worker_confirmed",
    label: "Tukang dikonfirmasi",
    badgeBg: "bg-lavender-50",
    badgeText: "text-lavender-700",
    dotColor: "bg-lavender-600",
    iconName: "UserTick",
    description: "Tukang menerima tawaran, jadwal pengerjaan disepakati.",
  },
  on_the_way: {
    status: "on_the_way",
    label: "Dalam perjalanan",
    badgeBg: "bg-teal-50",
    badgeText: "text-teal-700",
    dotColor: "bg-teal-500",
    iconName: "Routing2",
    description: "Tukang sedang menuju lokasi pelanggan.",
  },
  in_progress: {
    status: "in_progress",
    label: "Sedang dikerjakan",
    badgeBg: "bg-warning-50",
    badgeText: "text-warning-700",
    dotColor: "bg-warning-500",
    iconName: "Setting4",
    description: "Pekerjaan perbaikan sedang berlangsung di lokasi.",
  },
  awaiting_confirmation: {
    status: "awaiting_confirmation",
    label: "Menunggu konfirmasi",
    badgeBg: "bg-orange-50",
    badgeText: "text-orange-700",
    dotColor: "bg-orange-500",
    iconName: "GalleryTick",
    description: "Foto hasil sudah diunggah, menunggu persetujuan pelanggan.",
  },
  completed: {
    status: "completed",
    label: "Selesai",
    badgeBg: "bg-success-50",
    badgeText: "text-success-700",
    dotColor: "bg-success-500",
    iconName: "TickCircle",
    description: "Pekerjaan diterima dan diselesaikan; hak pencairan dana dibuat.",
  },
  cancelled: {
    status: "cancelled",
    label: "Dibatalkan",
    badgeBg: "bg-danger-50",
    badgeText: "text-danger-700",
    dotColor: "bg-danger-500",
    iconName: "CloseCircle",
    description: "Pesanan dibatalkan. Refund disimulasikan bila sudah dibayar.",
  },
};

/**
 * Validasi apakah suatu transisi diizinkan untuk aktor tertentu
 */
export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: Actor
): boolean {
  const allowed = TRANSITIONS[from]?.[to];
  if (!allowed) return false;
  return allowed.includes(actor);
}

/**
 * Dapatkan daftar transisi valid berikutnya untuk seorang aktor
 */
export function getValidNextTransitions(
  current: OrderStatus,
  actor: Actor
): OrderStatus[] {
  const nextMap = TRANSITIONS[current];
  if (!nextMap) return [];
  return (Object.keys(nextMap) as OrderStatus[]).filter((target) =>
    nextMap[target]?.includes(actor)
  );
}
