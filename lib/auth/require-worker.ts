import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkerAuthResult =
  | {
      ok: true;
      userId: string;
      worker: { id: string; application_status: string; is_active: boolean | null } | null;
    }
  | { ok: false; response: NextResponse };

/**
 * requireApproved=true: wajib mitra dengan application_status 'approved' dan aktif (untuk route jobs/earnings/profile/photos).
 * requireApproved=false: cukup login dengan role 'worker' (untuk route pendaftaran/application).
 */
export async function requireWorker(opts: { requireApproved: boolean }): Promise<WorkerAuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (!user || error) {
    return { ok: false, response: NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 }) };
  }

  const db = createAdminClient();
  const { data: profile, error: profErr } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profErr) {
    return { ok: false, response: NextResponse.json({ error: "Gagal memeriksa akun." }, { status: 500 }) };
  }
  if (!profile || profile.role !== "worker") {
    return { ok: false, response: NextResponse.json({ error: "Akun ini bukan akun mitra." }, { status: 403 }) };
  }

  const { data: worker, error: wErr } = await db
    .from("workers")
    .select("id, application_status, is_active")
    .eq("user_id", user.id)
    .maybeSingle();
  if (wErr) {
    return { ok: false, response: NextResponse.json({ error: "Gagal memeriksa data mitra." }, { status: 500 }) };
  }

  if (opts.requireApproved) {
    if (!worker || worker.application_status !== "approved" || worker.is_active === false) {
      return {
        ok: false,
        response: NextResponse.json({ error: "Akun mitra belum disetujui atau tidak aktif." }, { status: 403 }),
      };
    }
  }

  return { ok: true, userId: user.id, worker: worker ?? null };
}
