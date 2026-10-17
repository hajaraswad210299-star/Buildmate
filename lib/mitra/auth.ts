import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MOCK_WORKERS } from "@/lib/mock/data";

type WorkerApiAuth =
  | {
      ok: true;
      user: User;
      /** workers.id of the caller (falls back to the auth user id while no row exists yet) */
      workerId: string;
      applicationStatus: string;
    }
  | { ok: false; response: NextResponse };

/**
 * Guard for /api/mitra/* (B10, B13): the caller must be logged in with profiles.role = 'worker'.
 * With `requireApproved`, the worker's application must also be approved (job & earnings routes).
 */
export async function requireWorkerApi(
  options: { requireApproved?: boolean } = {}
): Promise<WorkerApiAuth> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Silakan masuk sebagai mitra terlebih dahulu" },
        { status: 401 }
      ),
    };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "worker") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Akun ini bukan akun mitra" },
        { status: 403 }
      ),
    };
  }

  const { data: worker } = await admin
    .from("workers")
    .select("id, application_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const mockWorker = MOCK_WORKERS.find((w) => w.user_id === user.id);
  const workerId = worker?.id || mockWorker?.id || user.id;
  const applicationStatus = worker?.application_status || mockWorker?.application_status || "draft";

  if (options.requireApproved && applicationStatus !== "approved") {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Pendaftaran mitra belum disetujui" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, user, workerId, applicationStatus };
}
