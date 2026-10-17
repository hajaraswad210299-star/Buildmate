import { Worker } from "./types";
import { MOCK_WORKERS } from "../mock/data";
import { createClient } from "@/lib/supabase/client";

const inMemoryWorkers: Worker[] = [...MOCK_WORKERS];

export interface WorkerFilter {
  tab?: "active" | "applications" | "inactive";
  search?: string;
  category?: string;
  verifiedOnly?: boolean;
}

const isUuid = (val?: string): boolean =>
  Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

export async function getWorkers(filter: WorkerFilter = {}): Promise<Worker[]> {
  try {
    const supabase = createClient();
    let query = supabase.from("workers").select("*, worker_packages(package_id)");

    if (filter.tab === "active") {
      query = query.eq("application_status", "approved").eq("is_active", true);
    } else if (filter.tab === "applications") {
      query = query.eq("application_status", "pending");
    } else if (filter.tab === "inactive") {
      query = query.or("application_status.eq.rejected,is_active.eq.false");
    }

    if (filter.search) {
      const q = filter.search.trim();
      query = query.or(`full_name.ilike.%${q}%,service_area.ilike.%${q}%,slug.ilike.%${q}%`);
    }

    if (filter.verifiedOnly) {
      query = query.eq("is_verified", true);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (!error && data) {
      return data.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        full_name: row.full_name,
        slug: row.slug,
        phone: row.phone,
        email: row.email,
        bio: row.bio || "",
        service_area: row.service_area,
        experience_years: row.experience_years || 1,
        photo_path: row.photo_path,
        portfolio_paths: row.portfolio_paths || [],
        application_status: row.application_status || "approved",
        rejection_reason: row.rejection_reason,
        reviewed_by: row.reviewed_by,
        reviewed_at: row.reviewed_at,
        is_verified: row.is_verified || false,
        is_active: row.is_active !== undefined ? row.is_active : true,
        completed_jobs_count: 0,
        package_ids: row.worker_packages?.map((wp: any) => wp.package_id) || [],
        created_at: row.created_at,
      }));
    }
  } catch (err) {
    console.warn("Supabase fetch workers error, using in-memory:", err);
  }

  // Fallback to in-memory workers if Supabase query fails or offline
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
  try {
    const supabase = createClient();
    const query = isUuid(id)
      ? supabase.from("workers").select("*, worker_packages(package_id)").eq("id", id).single()
      : supabase.from("workers").select("*, worker_packages(package_id)").eq("slug", id).single();

    const { data, error } = await query;

    if (!error && data) {
      return {
        id: data.id,
        user_id: data.user_id,
        full_name: data.full_name,
        slug: data.slug,
        phone: data.phone,
        email: data.email,
        bio: data.bio || "",
        service_area: data.service_area,
        experience_years: data.experience_years || 1,
        photo_path: data.photo_path,
        portfolio_paths: data.portfolio_paths || [],
        application_status: data.application_status || "approved",
        rejection_reason: data.rejection_reason,
        reviewed_by: data.reviewed_by,
        reviewed_at: data.reviewed_at,
        is_verified: data.is_verified || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
        completed_jobs_count: 0,
        package_ids: data.worker_packages?.map((wp: any) => wp.package_id) || [],
        created_at: data.created_at,
      };
    }
  } catch {
    // fallback
  }

  return inMemoryWorkers.find((w) => w.id === id || w.slug === id) || null;
}

export async function saveWorker(
  data: Partial<Worker> & { full_name: string; service_area: string }
): Promise<Worker> {
  const isEditing = Boolean(data.id && isUuid(data.id));
  const workerId = isEditing
    ? data.id!
    : typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `w-${Date.now()}`;

  let baseSlug =
    data.slug?.trim() ||
    data.full_name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const slug = isEditing ? baseSlug : `${baseSlug}-${Math.floor(1000 + Math.random() * 9000)}`;

  const workerPayload = {
    id: workerId,
    user_id: data.user_id || null,
    full_name: data.full_name.trim(),
    slug,
    phone: data.phone || "6281200000000",
    email: data.email || null,
    bio: data.bio || "",
    service_area: data.service_area,
    experience_years: data.experience_years || 1,
    photo_path: data.photo_path || null,
    portfolio_paths: data.portfolio_paths || [],
    application_status: data.application_status || "approved",
    is_verified: data.is_verified ?? false,
    is_active: data.is_active !== undefined ? data.is_active : true,
  };

  try {
    const supabase = createClient();
    const { data: dbSaved, error } = await supabase
      .from("workers")
      .upsert(workerPayload, { onConflict: "id" })
      .select()
      .single();

    if (error) {
      console.error("Supabase worker save error:", error.message);
      throw new Error(error.message);
    }

    if (dbSaved) {
      // Sync worker_packages if package_ids is specified
      if (Array.isArray(data.package_ids)) {
        await supabase.from("worker_packages").delete().eq("worker_id", workerId);
        if (data.package_ids.length > 0) {
          const links = data.package_ids.map((pkgId) => ({
            worker_id: workerId,
            package_id: pkgId,
          }));
          await supabase.from("worker_packages").insert(links);
        }
      }

      const savedWorker: Worker = {
        ...workerPayload,
        completed_jobs_count: data.completed_jobs_count || 0,
        package_ids: data.package_ids || [],
        created_at: dbSaved.created_at || new Date().toISOString(),
      };

      const existingIdx = inMemoryWorkers.findIndex((w) => w.id === workerId);
      if (existingIdx >= 0) {
        inMemoryWorkers[existingIdx] = savedWorker;
      } else {
        inMemoryWorkers.unshift(savedWorker);
      }

      return savedWorker;
    }
  } catch (err: any) {
    if (err?.message) throw err;
  }

  // Fallback to in-memory
  const fallbackWorker: Worker = {
    ...workerPayload,
    completed_jobs_count: data.completed_jobs_count || 0,
    package_ids: data.package_ids || [],
    created_at: new Date().toISOString(),
  };

  const existingIndex = inMemoryWorkers.findIndex((w) => w.id === workerId);
  if (existingIndex >= 0) {
    inMemoryWorkers[existingIndex] = fallbackWorker;
  } else {
    inMemoryWorkers.unshift(fallbackWorker);
  }

  return fallbackWorker;
}

export async function reviewWorkerApplication(
  workerId: string,
  approved: boolean,
  reason?: string,
  isVerified: boolean = false
): Promise<{ success: boolean; worker?: Worker }> {
  const now = new Date().toISOString();
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: updatedRows, error } = await supabase
      .from("workers")
      .update({
        application_status: approved ? "approved" : "rejected",
        is_active: approved,
        is_verified: approved ? isVerified : false,
        rejection_reason: approved ? null : reason || "Kualifikasi portofolio belum sesuai.",
        reviewed_at: now,
        reviewed_by: user?.id || null,
      })
      .eq("id", workerId)
      .select("id");

    if (error) {
      console.error("Supabase review worker error:", error.message);
      throw new Error(error.message);
    }
    // RLS turns an unauthorized update into "0 rows" without an error
    if (!updatedRows?.length) {
      throw new Error("Pendaftaran tidak tersimpan: akun ini tidak punya izin meninjau mitra");
    }
  } catch (err: any) {
    if (err?.message) throw err;
  }

  const worker = inMemoryWorkers.find((w) => w.id === workerId);
  if (worker) {
    worker.application_status = approved ? "approved" : "rejected";
    worker.is_active = approved;
    worker.is_verified = approved ? isVerified : false;
    worker.reviewed_at = now;
    worker.reviewed_by = "Admin BuildMate";
    if (!approved) {
      worker.rejection_reason = reason || "Kualifikasi portofolio belum sesuai.";
    }
  }

  return { success: true, worker };
}

export async function toggleWorkerActive(
  workerId: string
): Promise<{ success: boolean; is_active?: boolean }> {
  let nextActive = true;
  try {
    const supabase = createClient();
    const { data: curr, error: fetchErr } = await supabase
      .from("workers")
      .select("is_active")
      .eq("id", workerId)
      .single();

    if (!fetchErr && curr) {
      nextActive = !curr.is_active;
      const { error: updateErr } = await supabase
        .from("workers")
        .update({ is_active: nextActive })
        .eq("id", workerId);

      if (updateErr) throw new Error(updateErr.message);
    }
  } catch (err: any) {
    const worker = inMemoryWorkers.find((w) => w.id === workerId);
    if (worker) {
      worker.is_active = !worker.is_active;
      nextActive = worker.is_active;
    }
    return { success: true, is_active: nextActive };
  }

  const worker = inMemoryWorkers.find((w) => w.id === workerId);
  if (worker) {
    worker.is_active = nextActive;
  }

  return { success: true, is_active: nextActive };
}

export async function resetDemoWorkerApplication(): Promise<{ success: boolean }> {
  const targetId = "c0000000-0000-0000-0000-000000000004";
  try {
    const supabase = createClient();
    await supabase
      .from("workers")
      .update({
        application_status: "pending",
        is_active: false,
        is_verified: false,
        rejection_reason: null,
        reviewed_at: null,
        reviewed_by: null,
      })
      .eq("id", targetId);
  } catch (err) {
    console.warn("resetDemoWorkerApplication db error:", err);
  }

  const w = inMemoryWorkers.find((item) => item.id === targetId || item.id === "w-4");
  if (w) {
    w.application_status = "pending";
    w.is_active = false;
    w.is_verified = false;
    w.rejection_reason = undefined;
    w.reviewed_at = undefined;
    w.reviewed_by = undefined;
  }

  return { success: true };
}
