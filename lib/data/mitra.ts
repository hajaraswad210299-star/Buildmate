import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_ORDERS, MOCK_PACKAGES, MOCK_WORKERS } from "@/lib/mock/data";
import { Order, Worker, ApplicationStatus } from "./types";
import { canTransition, OrderStatus } from "../orders/transitions";
import { formatRupiah } from "../format";
import { DISTRICTS, SERVICE_AREAS } from "../constants/areas";

export interface WorkerApplication {
  id?: string;
  user_id?: string;
  full_name: string;
  phone: string;
  service_area: string;
  experience_years: number;
  bio: string;
  category_ids: string[];
  package_ids: string[];
  photo_path: string;
  portfolio_paths: string[];
  application_status: ApplicationStatus;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  is_verified?: boolean;
  agreement_terms?: boolean;
  agreement_data?: boolean;
  slug?: string;
}

// In-memory applications cache for offline/mock development
const inMemoryApplications = new Map<string, WorkerApplication>();

// Initialize demo worker applications for mock testing
if (inMemoryApplications.size === 0) {
  // Mock worker 1 (Approved worker)
  inMemoryApplications.set("usr-w-1", {
    id: "w-1",
    user_id: "usr-w-1",
    full_name: "Budi Santoso",
    phone: "081234567890",
    service_area: "Jakarta Selatan",
    experience_years: 8,
    bio: "Spesialis instalasi pipa air, deteksi kebocoran dan perbaikan keran.",
    category_ids: ["cat-1"],
    package_ids: ["pkg-1"],
    photo_path: "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&auto=format&fit=crop&q=80",
    portfolio_paths: [
      "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=600&auto=format&fit=crop&q=80",
    ],
    application_status: "approved",
    is_verified: true,
  });

  // Mock worker 2 (Approved worker)
  inMemoryApplications.set("usr-w-2", {
    id: "w-2",
    user_id: "usr-w-2",
    full_name: "Ahmad Hidayat",
    phone: "081398765432",
    service_area: "Jakarta Timur",
    experience_years: 6,
    bio: "Tukang cat profesional dengan pengerjaan rapi dan cepat.",
    category_ids: ["cat-2"],
    package_ids: ["pkg-2"],
    photo_path: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    portfolio_paths: [],
    application_status: "approved",
    is_verified: true,
  });
}

/**
 * Get the current worker record or draft application for a user
 */
export async function getMitraApplication(userId: string): Promise<WorkerApplication | null> {
  const isMock = process.env.USE_MOCK_DATA === "true";

  if (!isMock) {
    try {
      const adminClient = createAdminClient();
      const { data: worker, error } = await adminClient
        .from("workers")
        .select("*, worker_packages(package_id, service_packages(category_id))")
        .eq("user_id", userId)
        .maybeSingle();

      if (!error && worker) {
        const pkgIds = worker.worker_packages?.map((wp: any) => wp.package_id) || [];
        const catIds = (worker.worker_packages || [])
          .map((wp: any) => wp.service_packages?.category_id)
          .filter(Boolean);

        return {
          id: worker.id,
          user_id: worker.user_id,
          full_name: worker.full_name,
          phone: worker.phone,
          service_area: worker.service_area,
          experience_years: worker.experience_years,
          bio: worker.bio || "",
          category_ids: Array.from(new Set(catIds)),
          package_ids: pkgIds,
          photo_path: worker.photo_path || "",
          portfolio_paths: worker.portfolio_paths || [],
          application_status: worker.application_status,
          rejection_reason: worker.rejection_reason,
          reviewed_at: worker.reviewed_at,
          is_verified: worker.is_verified,
          slug: worker.slug,
        };
      }
    } catch (e) {
      console.warn("Error fetching worker from DB, falling back to mock:", e);
    }
  }

  // Fallback to in-memory application
  if (inMemoryApplications.has(userId)) {
    return inMemoryApplications.get(userId)!;
  }

  // Check matching mock worker by user_id or id
  const existingWorker = MOCK_WORKERS.find((w) => w.user_id === userId || w.id === userId);
  if (existingWorker) {
    const pkgIds = existingWorker.package_ids || [];
    const catIds = MOCK_PACKAGES.filter((p) => pkgIds.includes(p.id)).map((p) => p.category_id);
    const app: WorkerApplication = {
      id: existingWorker.id,
      user_id: userId,
      full_name: existingWorker.full_name,
      phone: existingWorker.phone,
      service_area: existingWorker.service_area,
      experience_years: existingWorker.experience_years,
      bio: existingWorker.bio || "",
      category_ids: Array.from(new Set(catIds)),
      package_ids: pkgIds,
      photo_path: existingWorker.photo_path || "",
      portfolio_paths: existingWorker.portfolio_paths || [],
      application_status: existingWorker.application_status,
      rejection_reason: existingWorker.rejection_reason,
      is_verified: existingWorker.is_verified,
    };
    inMemoryApplications.set(userId, app);
    return app;
  }

  return null;
}

/**
 * Save application draft with autosave (status 'draft')
 */
export async function saveMitraApplication(
  userId: string,
  data: Partial<WorkerApplication>
): Promise<{ success: boolean; error?: string; data?: WorkerApplication }> {
  const existing = await getMitraApplication(userId);

  // B10 / B6.11: the form is only editable while draft or rejected
  if (existing && existing.application_status !== "draft" && existing.application_status !== "rejected") {
    return { success: false, error: "Pendaftaran sedang ditinjau atau sudah disetujui dan tidak bisa diubah" };
  }

  const updated: WorkerApplication = {
    id: existing?.id || `w-${Date.now()}`,
    user_id: userId,
    full_name: data.full_name ?? existing?.full_name ?? "",
    phone: data.phone ?? existing?.phone ?? "",
    service_area: data.service_area ?? existing?.service_area ?? "",
    experience_years: data.experience_years ?? existing?.experience_years ?? 1,
    bio: data.bio ?? existing?.bio ?? "",
    category_ids: data.category_ids ?? existing?.category_ids ?? [],
    package_ids: data.package_ids ?? existing?.package_ids ?? [],
    photo_path: data.photo_path ?? existing?.photo_path ?? "",
    portfolio_paths: data.portfolio_paths ?? existing?.portfolio_paths ?? [],
    application_status: existing?.application_status === "rejected" ? "draft" : (existing?.application_status || "draft"),
    rejection_reason: existing?.rejection_reason ?? null,
    is_verified: existing?.is_verified ?? false,
    agreement_terms: data.agreement_terms ?? existing?.agreement_terms ?? false,
    agreement_data: data.agreement_data ?? existing?.agreement_data ?? false,
  };

  inMemoryApplications.set(userId, updated);

  const isMock = process.env.USE_MOCK_DATA === "true";
  if (!isMock) {
    try {
      const adminClient = createAdminClient();
      const slug = (updated.full_name || "tukang")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") + "-" + userId.slice(0, 4);

      const { data: upsertedWorker, error: upsertError } = await adminClient
        .from("workers")
        .upsert(
          {
            user_id: userId,
            full_name: updated.full_name || "Mitra Pelamar",
            slug,
            phone: updated.phone || "081200000000",
            service_area: updated.service_area || "Jakarta Selatan",
            experience_years: updated.experience_years,
            bio: updated.bio,
            photo_path: updated.photo_path,
            portfolio_paths: updated.portfolio_paths,
            application_status: updated.application_status,
          },
          { onConflict: "user_id" }
        )
        .select()
        .single();

      if (upsertError || !upsertedWorker) {
        console.error("Error upserting worker draft in DB:", upsertError);
        return {
          success: false,
          error: `Draf gagal disimpan ke server: ${upsertError?.message || "baris mitra tidak terbentuk"}`,
        };
      }

      if (updated.package_ids.length > 0) {
        const inserts = updated.package_ids.map((pkgId) => ({
          worker_id: upsertedWorker.id,
          package_id: pkgId,
        }));
        await adminClient.from("worker_packages").delete().eq("worker_id", upsertedWorker.id);
        const { error: linkError } = await adminClient.from("worker_packages").insert(inserts);
        if (linkError) {
          console.warn("Error saving worker packages:", linkError);
          return { success: false, error: "Paket layanan yang dipilih tidak valid. Muat ulang halaman lalu pilih lagi." };
        }
      }
    } catch (e: any) {
      console.error("Error upserting worker draft in DB:", e);
      return { success: false, error: `Draf gagal disimpan ke server: ${e?.message || "kesalahan tak dikenal"}` };
    }
  }

  return { success: true, data: updated };
}

/**
 * Submit application for admin review (transitions from 'draft' to 'pending')
 */
export async function submitMitraApplication(
  userId: string,
  agreements: { agreement_terms?: boolean; agreement_data?: boolean } = {}
): Promise<{ success: boolean; error?: string; application?: WorkerApplication }> {
  const current = await getMitraApplication(userId);
  if (!current) {
    return { success: false, error: "Draf pendaftaran tidak ditemukan" };
  }

  // B10: only a draft can be submitted (rejected applications return to draft when edited)
  if (current.application_status !== "draft") {
    return { success: false, error: "Pendaftaran ini sudah diajukan" };
  }

  if (!agreements.agreement_terms || !agreements.agreement_data) {
    return { success: false, error: "Setujui syarat mitra dan penggunaan data terlebih dahulu" };
  }

  if (!current.full_name || !current.phone || !current.service_area) {
    return { success: false, error: "Mohon lengkapi data diri Anda" };
  }

  if (current.package_ids.length === 0) {
    return { success: false, error: "Pilih minimal 1 paket layanan yang Anda kuasai" };
  }

  if (!current.photo_path) {
    return { success: false, error: "Foto profil wajib diunggah" };
  }

  current.application_status = "pending";
  current.rejection_reason = null;
  current.reviewed_at = null;
  inMemoryApplications.set(userId, current);

  const isMock = process.env.USE_MOCK_DATA === "true";
  if (!isMock) {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workers")
        .update({
          application_status: "pending",
          rejection_reason: null,
          reviewed_at: null,
        })
        .eq("user_id", userId);
    } catch (e) {
      console.warn("DB submit error, mock updated:", e);
    }
  }

  return { success: true, application: current };
}

/**
 * Update active Mitra profile (bio, photo, portfolio)
 */
export async function updateMitraProfile(
  userId: string,
  data: { bio?: string; photo_path?: string; portfolio_paths?: string[] }
): Promise<{ success: boolean; worker?: Worker }> {
  const app = inMemoryApplications.get(userId);
  if (app) {
    if (data.bio !== undefined) app.bio = data.bio;
    if (data.photo_path !== undefined) app.photo_path = data.photo_path;
    if (data.portfolio_paths !== undefined) app.portfolio_paths = data.portfolio_paths;
  }

  const existingMockWorker = MOCK_WORKERS.find((w) => w.user_id === userId || w.id === app?.id);
  if (existingMockWorker) {
    if (data.bio !== undefined) existingMockWorker.bio = data.bio;
    if (data.photo_path !== undefined) existingMockWorker.photo_path = data.photo_path;
    if (data.portfolio_paths !== undefined) existingMockWorker.portfolio_paths = data.portfolio_paths;
  }

  const isMock = process.env.USE_MOCK_DATA === "true";
  if (!isMock) {
    try {
      const adminClient = createAdminClient();
      await adminClient
        .from("workers")
        .update({
          bio: data.bio,
          photo_path: data.photo_path,
          portfolio_paths: data.portfolio_paths,
        })
        .eq("user_id", userId);
    } catch (e) {
      console.warn("Error updating worker profile in DB:", e);
    }
  }

  return { success: true, worker: existingMockWorker };
}

/**
 * Get dashboard stats for Mitra home screen (W03)
 */
export async function getMitraDashboardStats(workerId: string) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const orders = MOCK_ORDERS.filter((o) => o.worker_id === workerId || o.worker?.id === workerId);

  // Completed jobs this month
  const jobsThisMonth = orders.filter((o) => {
    if (o.status !== "completed") return false;
    const date = new Date(o.completed_at || o.created_at);
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).length;

  // Earnings this month
  const earningsThisMonth = orders
    .filter((o) => {
      if (o.status !== "completed") return false;
      const date = new Date(o.completed_at || o.created_at);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, o) => sum + o.package_price, 0);

  // Pending payout amount
  const pendingPayout = orders
    .filter((o) => o.status === "completed")
    .reduce((sum, o) => sum + o.package_price, 0);

  return {
    jobs_this_month: jobsThisMonth || 3,
    earnings_this_month: earningsThisMonth || 450000,
    pending_payout: pendingPayout || 350000,
  };
}

/**
 * Area label from the address without revealing the street (W05, B25.6):
 * only a known district (kecamatan) and/or city name is ever returned.
 */
function areaFromAddress(address: string): string {
  const lower = (address || "").toLowerCase();
  const district = DISTRICTS.find((d) => lower.includes(d.name.toLowerCase()));
  if (district) return `${district.name}, ${district.area}`;
  const city = SERVICE_AREAS.find((a) => a !== "Semua Area" && lower.includes(a.toLowerCase()));
  return city || "Area layanan BuildMate";
}

/**
 * Before acceptance a worker only receives an allow-listed view of the order:
 * no street address, customer name/contact, admin notes, payment data, or other
 * workers' offers (A1, A4, B6, B25.6).
 */
export function sanitizeOrderForMitra(order: Order, isAccepted: boolean): Order {
  if (isAccepted) {
    const accepted: Order = { ...order };
    delete accepted.snap_token;
    delete accepted.admin_notes;
    delete accepted.dispatch_offers;
    return accepted;
  }

  return {
    id: order.id,
    order_code: order.order_code,
    worker_id: null,
    customer_id: "",
    customer: {
      id: "",
      name: "Pelanggan BuildMate",
      email: "",
      phone: "",
      is_plus: false,
    },
    package_id: order.package_id,
    package: order.package,
    package_price: order.package_price,
    service_fee: 0,
    total: order.package_price,
    address: `${areaFromAddress(order.address)} (Alamat lengkap tampil setelah menerima)`,
    scheduled_date: order.scheduled_date,
    time_slot: order.time_slot,
    description: order.description,
    status: order.status,
    worker_response: order.worker_response,
    created_at: order.created_at,
    updated_at: order.updated_at,
    photos: (order.photos || []).filter((p) => p.type === "problem"),
    events: [],
  };
}

// Offers a worker declined are never shown to that worker again
const declinedOffers = new Map<string, Set<string>>();

function isAssignedTo(order: Order, workerId: string): boolean {
  return order.worker_id === workerId || order.worker?.id === workerId;
}

function isOfferedTo(order: Order, workerId: string): boolean {
  if (order.status !== "paid") return false;
  if (declinedOffers.get(order.id)?.has(workerId)) return false;
  return !order.worker_id || isAssignedTo(order, workerId);
}

/**
 * Get job offers and assigned jobs for a worker
 */
export async function getMitraJobs(
  workerId: string,
  tab: "offers" | "active" | "completed",
  monthFilter?: string
) {
  // Orders where this worker is assigned or is preferred or has a pending offer
  const allOrders = [...MOCK_ORDERS];

  if (tab === "offers") {
    // New incoming offers with status 'paid' waiting for worker acceptance
    const offers = allOrders.filter((o) => isOfferedTo(o, workerId));

    return offers.map((o) => sanitizeOrderForMitra(o, false));
  }

  if (tab === "active") {
    // Active jobs: worker_confirmed, on_the_way, in_progress, awaiting_confirmation
    const active = allOrders.filter(
      (o) =>
        (o.worker_id === workerId || o.worker?.id === workerId) &&
        ["worker_confirmed", "on_the_way", "in_progress", "awaiting_confirmation"].includes(o.status)
    );

    return active.map((o) => sanitizeOrderForMitra(o, true));
  }

  if (tab === "completed") {
    // Completed jobs
    let completed = allOrders.filter(
      (o) =>
        (o.worker_id === workerId || o.worker?.id === workerId) &&
        o.status === "completed"
    );

    if (monthFilter) {
      completed = completed.filter((o) => {
        const d = new Date(o.completed_at || o.created_at);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return ym === monthFilter;
      });
    }

    return completed.map((o) => sanitizeOrderForMitra(o, true));
  }

  return [];
}

/**
 * Get detail of a single job with privacy masking if not accepted
 */
export async function getMitraJobDetail(workerId: string, orderId: string): Promise<Order | null> {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) return null;

  // A8: a worker only sees their own jobs, or an offer made to them
  const assigned = isAssignedTo(order, workerId);
  if (!assigned && !isOfferedTo(order, workerId)) return null;

  const isAccepted =
    assigned && order.status !== "paid" && order.status !== "pending_payment";

  return sanitizeOrderForMitra(order, isAccepted);
}

/**
 * Accept job offer (W03 & W05)
 */
export async function acceptMitraJob(
  workerId: string,
  orderId: string
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan" };
  }

  if (!isOfferedTo(order, workerId)) {
    return { success: false, error: "Tawaran pekerjaan ini sudah tidak berlaku" };
  }

  const worker = MOCK_WORKERS.find((w) => w.id === workerId || w.user_id === workerId);

  order.worker_id = workerId;
  order.worker = {
    id: workerId,
    name: worker?.full_name || "Budi Santoso",
    phone: worker?.phone || "081234567890",
    service_area: worker?.service_area || "Jakarta Selatan",
    is_verified: worker?.is_verified ?? true,
    has_account: true,
    avatar_url: worker?.photo_path || undefined,
  };
  order.worker_response = "accepted";
  order.status = "worker_confirmed";
  order.worker_confirmed_at = new Date().toISOString();
  order.updated_at = new Date().toISOString();

  // Add event
  order.events = [
    {
      id: `ev-${Date.now()}`,
      order_id: order.id,
      event_type: "offer_accepted",
      from_status: "paid",
      to_status: "worker_confirmed",
      actor_type: "worker",
      actor_name: worker?.full_name || "Mitra Tukang",
      note: "Mitra menerima tawaran pekerjaan.",
      created_at: new Date().toISOString(),
    },
    ...(order.events || []),
  ];

  return { success: true, order };
}

/**
 * Decline job offer with reason (W03, W05)
 */
export async function declineMitraJob(
  workerId: string,
  orderId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan" };
  }
  if (!isOfferedTo(order, workerId)) {
    return { success: false, error: "Tawaran pekerjaan ini sudah tidak berlaku" };
  }

  const declinedBy = declinedOffers.get(order.id) || new Set<string>();
  declinedBy.add(workerId);
  declinedOffers.set(order.id, declinedBy);
  if (isAssignedTo(order, workerId)) {
    // A directly offered worker declined: free the order for dispatch again
    order.worker_id = null;
    order.worker = undefined;
  }
  order.worker_response = "declined";
  order.events = [
    {
      id: `ev-${Date.now()}`,
      order_id: order.id,
      event_type: "offer_declined",
      actor_type: "worker",
      actor_name: "Mitra Tukang",
      note: `Tawaran ditolak: ${reason}`,
      created_at: new Date().toISOString(),
    },
    ...(order.events || []),
  ];

  return { success: true };
}

/**
 * Transition job status (on_the_way, in_progress, awaiting_confirmation)
 */
export async function updateMitraJobStatus(
  workerId: string,
  orderId: string,
  toStatus: OrderStatus,
  photoPaths?: string[]
): Promise<{ success: boolean; error?: string; order?: Order }> {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order || !isAssignedTo(order, workerId)) {
    return { success: false, error: "Pesanan tidak ditemukan" };
  }

  // If same status, allow attaching photos without transition error
  if (toStatus === order.status) {
    if (photoPaths && photoPaths.length > 0) {
      photoPaths.forEach((path) => {
        order.photos = [
          ...(order.photos || []),
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            order_id: order.id,
            type: "result",
            uploaded_by: "worker" as const,
            source_note: "Foto hasil kerja diunggah mitra",
            storage_path: path,
            created_at: new Date().toISOString(),
          },
        ];
      });
    }
    return { success: true, order };
  }

  if (!canTransition(order.status, toStatus, "worker")) {
    return {
      success: false,
      error: `Transisi status tidak valid dari ${order.status} ke ${toStatus}`,
    };
  }

  // Guard: awaiting_confirmation requires at least 1 result photo
  if (toStatus === "awaiting_confirmation") {
    if (photoPaths && photoPaths.length > 0) {
      photoPaths.forEach((path) => {
        order.photos = [
          ...(order.photos || []),
          {
            id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            order_id: order.id,
            type: "result",
            uploaded_by: "worker" as const,
            source_note: "Foto hasil kerja diunggah mitra",
            storage_path: path,
            created_at: new Date().toISOString(),
          },
        ];
      });
    }

    const hasResult = order.photos?.some((p) => p.type === "result");
    if (!hasResult) {
      return {
        success: false,
        error: "Unggah minimal 1 foto hasil sebelum menandai pekerjaan selesai.",
      };
    }
  }

  const now = new Date().toISOString();
  order.status = toStatus;
  order.updated_at = now;

  if (toStatus === "on_the_way") order.on_the_way_at = now;
  if (toStatus === "in_progress") order.in_progress_at = now;
  if (toStatus === "awaiting_confirmation") order.awaiting_confirmation_at = now;

  order.events = [
    {
      id: `ev-${Date.now()}`,
      order_id: order.id,
      event_type: `transition_${toStatus}`,
      to_status: toStatus,
      actor_type: "worker",
      actor_name: order.worker?.name || "Mitra Tukang",
      note:
        toStatus === "on_the_way"
          ? "Mitra berangkat menuju lokasi pelanggan."
          : toStatus === "in_progress"
          ? "Mitra mulai mengerjakan perbaikan di lokasi."
          : "Mitra menandai pekerjaan selesai dan mengunggah foto hasil.",
      created_at: now,
    },
    ...(order.events || []),
  ];

  return { success: true, order };
}

const MAX_RESULT_PHOTOS = 3; // W05

/**
 * Add photo to job (W05 - Foto bukti hasil kerja)
 */
export async function addMitraJobPhoto(
  workerId: string,
  orderId: string,
  photoUrl: string,
  type: "problem" | "result" = "result"
): Promise<{ success: boolean; error?: string; photo?: any; photos?: any[] }> {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId);
  if (!order || !isAssignedTo(order, workerId)) {
    return { success: false, error: "Pesanan tidak ditemukan" };
  }
  if (order.status !== "in_progress") {
    return { success: false, error: "Foto hasil hanya bisa diunggah saat pekerjaan sedang dikerjakan" };
  }
  if ((order.photos || []).filter((p) => p.type === "result").length >= MAX_RESULT_PHOTOS) {
    return { success: false, error: `Maksimal ${MAX_RESULT_PHOTOS} foto hasil` };
  }

  const newPhoto = {
    id: `photo-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    order_id: order.id,
    type,
    uploaded_by: "worker" as const,
    source_note: "Foto hasil kerja diunggah mitra",
    storage_path: photoUrl,
    created_at: new Date().toISOString(),
  };

  order.photos = [...(order.photos || []), newPhoto];
  order.updated_at = new Date().toISOString();

  // Audit event for photo upload
  order.events = [
    {
      id: `ev-${Date.now()}`,
      order_id: order.id,
      event_type: "photo_uploaded",
      actor_type: "worker",
      actor_name: order.worker?.name || "Mitra Tukang",
      note: "Mitra mengunggah foto hasil pekerjaan.",
      created_at: new Date().toISOString(),
    },
    ...(order.events || []),
  ];

  return {
    success: true,
    photo: newPhoto,
    photos: order.photos,
  };
}

/**
 * Get Mitra earnings summary and 6-month chart data (W06)
 */
export async function getMitraEarnings(workerId: string, range: "month" | "3months" | "all" = "all") {
  const completedOrders = MOCK_ORDERS.filter(
    (o) => (o.worker_id === workerId || o.worker?.id === workerId) && o.status === "completed"
  );

  const totalDisbursed = 1250000;
  const pendingPayout = 350000;
  const monthEarnings = 450000;

  const monthlyChart = [
    { month: "Mei", amount: 650000 },
    { month: "Jun", amount: 920000 },
    { month: "Jul", amount: 800000 },
    { month: "Ags", amount: 1150000 },
    { month: "Sep", amount: 1400000 },
    { month: "Okt", amount: 450000 },
  ];

  const payouts = [
    {
      id: "po-1",
      order_code: "BM-261009-0008",
      package_name: "Pengecatan Ulang Dinding Kamar",
      amount: 350000,
      status: "pending",
      completed_at: "2026-10-09T12:15:00Z",
    },
    {
      id: "po-2",
      order_code: "BM-261006-0001",
      package_name: "Ganti Keran & Deteksi Pipa",
      amount: 150000,
      status: "paid",
      completed_at: "2026-10-06T14:30:00Z",
      paid_at: "2026-10-07T09:00:00Z",
    },
    {
      id: "po-3",
      order_code: "BM-260928-0012",
      package_name: "Instalasi & Peremajaan Listrik",
      amount: 250000,
      status: "paid",
      completed_at: "2026-09-28T16:00:00Z",
      paid_at: "2026-09-29T10:30:00Z",
    },
    {
      id: "po-4",
      order_code: "BM-260915-0005",
      package_name: "Ganti Keran & Deteksi Pipa",
      amount: 150000,
      status: "paid",
      completed_at: "2026-09-15T11:00:00Z",
      paid_at: "2026-09-16T08:45:00Z",
    },
    {
      id: "po-5",
      order_code: "BM-260830-0021",
      package_name: "Perbaikan Engsel & Pintu Kayu",
      amount: 100000,
      status: "paid",
      completed_at: "2026-08-30T15:20:00Z",
      paid_at: "2026-08-31T09:15:00Z",
    },
  ];

  return {
    total_disbursed: totalDisbursed,
    pending_payout: pendingPayout,
    month_earnings: monthEarnings,
    monthly_chart: monthlyChart,
    payouts,
  };
}
