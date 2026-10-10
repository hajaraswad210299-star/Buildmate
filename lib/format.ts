import { format, formatDistanceToNow, parseISO } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format angka ke mata uang Rupiah sesuai B7.5:
 * "Rp1.250.000" — TANPA spasi setelah "Rp", tanpa desimal, titik pemisah ribuan.
 */
export function formatRupiah(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return "Rp0";
  const formatted = Math.round(amount).toLocaleString("id-ID");
  return `Rp${formatted}`;
}

/**
 * Format persentase sesuai B7.5:
 * Menggunakan koma pemisah desimal di id-ID: "+12,5%", "81,3%".
 */
export function formatPercent(value: number, withSign: boolean = true): string {
  if (isNaN(value) || value === null || value === undefined) return "0%";
  const formatted = Math.abs(value).toLocaleString("id-ID", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  if (withSign) {
    return value >= 0 ? `+${formatted}%` : `-${formatted}%`;
  }
  return `${formatted}%`;
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
