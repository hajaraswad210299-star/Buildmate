import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format angka ke mata uang Rupiah sesuai B7.5:
 * "Rp1.250.000" (tanpa desimal, titik pemisah ribuan)
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return "Rp0";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal Indonesia lengkap: "Sen, 12 Okt 2026" atau "12 Oktober 2026"
 */
export function formatDateId(date: string | Date, pattern: string = "d MMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, pattern, { locale: id });
}

/**
 * Format waktu relatif: "5 mnt lalu", "2 jam lalu"
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

/**
 * Helper generate slug
 */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}
