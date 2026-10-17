/**
 * Base URL of the Supabase project (https://<ref>.supabase.co).
 *
 * The env var is sometimes pasted as the REST endpoint (".../rest/v1/") from the
 * dashboard. supabase-js appends "/rest/v1" and "/auth/v1" itself, so such a value
 * makes every query and auth call 404 — strip it back to the project origin.
 */
export function getSupabaseUrl(fallback = "https://dummy.supabase.co"): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return fallback;
  return raw.replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
}
