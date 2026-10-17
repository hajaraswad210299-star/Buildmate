/**
 * Hanya izinkan path internal seperti "/orders" atau "/admin?x=1".
 * Tolak: "//evil.com", "/\\evil.com", "https://...", "javascript:...", karakter kontrol.
 */
export function safeNext(input: string | null | undefined, fallback: string = "/"): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 2048) return fallback;
  if (!input.startsWith("/")) return fallback;
  if (input.startsWith("//") || input.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001F\u007F\\]/.test(input)) return fallback;
  try {
    const base = "http://internal.invalid";
    const url = new URL(input, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
