import { Worker } from "./types";
import { MOCK_WORKERS } from "../mock/data";

const inMemoryWorkers = [...MOCK_WORKERS];

export interface WorkerFilter {
  tab?: "active" | "applications" | "inactive";
  search?: string;
  category?: string;
  verifiedOnly?: boolean;
}

export async function getWorkers(filter: WorkerFilter = {}): Promise<Worker[]> {
  let list = [...inMemoryWorkers];

  if (filter.tab === "active") {
    list = list.filter((w) => w.application_status === "approved" && w.is_active);
  } else if (filter.tab === "applications") {
    list = list.filter((w) => w.application_status === "pending");
  } else if (filter.tab === "inactive") {
    list = list.filter((w) => w.application_status === "rejected" || !w.is_active);
  }

  if (filter.search) {
    const q = filter.search.toLowerCase().trim();
    list = list.filter(
      (w) =>
        w.full_name.toLowerCase().includes(q) ||
        w.service_area.toLowerCase().includes(q) ||
        w.slug.toLowerCase().includes(q)
    );
  }

  if (filter.verifiedOnly) {
    list = list.filter((w) => w.is_verified);
  }

  return list;
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  return inMemoryWorkers.find((w) => w.id === id || w.slug === id) || null;
}

export async function saveWorker(
  data: Partial<Worker> & { full_name: string; service_area: string }
): Promise<Worker> {
  const existingIndex = inMemoryWorkers.findIndex((w) => w.id === data.id);

  if (existingIndex >= 0) {
    const updated = { ...inMemoryWorkers[existingIndex], ...data };
    inMemoryWorkers[existingIndex] = updated;
    return updated;
  } else {
    const newWorker: Worker = {
      id: `w-${Date.now()}`,
      user_id: data.user_id ?? null,
      full_name: data.full_name,
      slug: data.slug || data.full_name.toLowerCase().replace(/\s+/g, "-"),
      phone: data.phone || "6281200000000",
      email: data.email,
      bio: data.bio || "",
      service_area: data.service_area,
      experience_years: data.experience_years || 1,
      photo_path: data.photo_path,
      portfolio_paths: data.portfolio_paths || [],
      application_status: data.application_status || "approved",
      is_verified: data.is_verified || false,
      is_active: data.is_active !== undefined ? data.is_active : true,
      completed_jobs_count: 0,
      package_ids: data.package_ids || [],
      created_at: new Date().toISOString(),
    };
    inMemoryWorkers.unshift(newWorker);
    return newWorker;
  }
}

export async function reviewWorkerApplication(
  workerId: string,
  approved: boolean,
  reason?: string,
  isVerified: boolean = false
): Promise<{ success: boolean; worker?: Worker }> {
  const worker = inMemoryWorkers.find((w) => w.id === workerId);
  if (!worker) return { success: false };

  const now = new Date().toISOString();
  worker.application_status = approved ? "approved" : "rejected";
  worker.is_active = approved;
  worker.is_verified = approved ? isVerified : false;
  worker.reviewed_at = now;
  worker.reviewed_by = "Admin BuildMate";

  if (!approved) {
    worker.rejection_reason = reason || "Kualifikasi portofolio belum sesuai.";
  }

  return { success: true, worker };
}

export async function toggleWorkerActive(
  workerId: string
): Promise<{ success: boolean; is_active?: boolean }> {
  const worker = inMemoryWorkers.find((w) => w.id === workerId);
  if (!worker) return { success: false };

  worker.is_active = !worker.is_active;
  return { success: true, is_active: worker.is_active };
}
