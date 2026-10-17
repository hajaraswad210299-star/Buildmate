# Prompt Perbaikan BuildMate untuk Gemini (STRICT)

Dasar: `docs/audit/AUDIT_REPORT_2026-10-17.md` (commit `8694cd8`).

---

## CARA PAKAI (baca dulu, ini untuk kamu, bukan untuk Gemini)

1. **Satu sesi Gemini = satu tugas.** Jangan tempel dua tugas sekaligus.
2. Di awal **setiap** sesi, tempel blok **ATURAN UTAMA** dulu, lalu satu blok **TUGAS G-xx**.
3. Kerjakan tugas **berurutan** (G-00 → G-01 → …). Banyak tugas bergantung pada file yang dibuat oleh tugas sebelumnya.
4. Setelah Gemini selesai, **jalankan sendiri** perintah di bagian "CEK OLEH KAMU". Kalau ada yang gagal, jangan lanjut. Tempel error-nya ke Gemini dengan kalimat: `Perbaiki hanya error ini, jangan ubah file lain.`
5. Commit setelah setiap tugas lolos, dengan pesan `fix(G-xx): <judul tugas>`. Kalau tugas berikutnya merusak sesuatu, kamu bisa `git checkout` ke commit sebelumnya.
6. Tugas yang ada label **⚠️ MANUAL** harus kamu jalankan sendiri di Supabase. Gemini **tidak boleh** menjalankan SQL ke database.
7. **Sebelum deploy G-11 sampai G-15:** jalankan "LANGKAH MANUAL WAJIB" di bagian paling bawah. Kalau dilewati, akun Admin Utama bisa terkunci.

---

## ATURAN UTAMA (tempel di awal setiap sesi Gemini)

```text
KAMU ADALAH CODING AGENT YANG HARUS PATUH 100% PADA INSTRUKSI. BACA SEMUA ATURAN INI SEBELUM MENGERJAKAN APA PUN.

PROYEK: BuildMate, folder D:\BuildMate V.2
STACK: Next.js 16.4 (App Router), React 19, TypeScript strict, Supabase (supabase-js v2), Midtrans Snap.
CATATAN NEXT.JS: versi ini berbeda dari yang kamu kenal. Kalau perlu API Next.js, baca dulu dokumentasi di node_modules/next/dist/docs/. Jangan menebak.

ATURAN WAJIB:
1. Kerjakan HANYA tugas yang diberikan di pesan ini. Jangan memperbaiki hal lain walaupun kamu melihat bug lain. Kalau melihat bug lain, TULIS di laporan saja.
2. Ubah HANYA file yang ada di daftar "FILE YANG BOLEH DIUBAH/DIBUAT". Kalau kamu merasa perlu mengubah file lain, BERHENTI dan tanya dulu.
3. Kalau isi file tidak sama dengan yang dijelaskan di tugas (nomor baris bergeser sedikit itu normal, tapi kodenya berbeda), BERHENTI dan laporkan perbedaannya. Jangan mengarang.
4. Jangan rename, pindah, atau format ulang file. Jangan ubah indentasi atau gaya kode di bagian yang tidak disuruh.
5. Jangan menambah dependency npm kecuali tugas menyuruh.
6. Jangan menjalankan: next build, next dev, perintah supabase ke project remote, migrasi, seed, atau SQL apa pun ke database. Jangan menjalankan script di folder scripts/.
7. Jangan menghapus data. Jangan menulis kode yang menghapus baris tabel payments, orders, atau payouts.
8. Jangan melemahkan keamanan agar test lulus: jangan hapus pengecekan auth, jangan pakai "any" untuk menutupi error tipe yang sebenarnya, jangan pakai @ts-ignore, jangan pakai eslint-disable.
9. supabase-js TIDAK melempar error. Setiap panggilan mengembalikan { data, error }. Di kode yang kamu tulis, SELALU cek `error`.
10. Jangan mencetak atau menulis isi .env.local, password, atau API key.
11. Jangan klaim "selesai" tanpa bukti. Setelah selesai, jalankan perintah di bagian "CEK SELESAI" dan tempel output ASLINYA.
12. Gunakan kode yang diberikan di tugas PERSIS seperti tertulis (copy apa adanya). Kalau ada typo atau error tipe di kode yang diberikan, perbaiki seminimal mungkin dan jelaskan di laporan.

FORMAT LAPORAN AKHIR (wajib, persis urutan ini):
1. File yang diubah/dibuat/dihapus (daftar path).
2. Ringkasan perubahan per file (1–3 baris per file).
3. Output asli dari setiap perintah di "CEK SELESAI".
4. Hal yang TIDAK kamu kerjakan atau perbedaan yang kamu temukan.
5. Bug lain yang kamu lihat tapi TIDAK kamu perbaiki.
```

---

# FASE 1 — KEAMANAN PEMBAYARAN (paling darurat)

## G-00 — Persiapan

```text
TUGAS G-00: Persiapan. JANGAN MENGUBAH KODE APA PUN.

LANGKAH:
1. Jalankan: git status
   Kalau ada perubahan yang belum di-commit selain folder docs/audit/, BERHENTI dan laporkan.
2. Jalankan: git checkout -b fix/security-audit
3. Jalankan: npx tsc --noEmit
   Catat hasilnya (seharusnya 0 error).
4. Jalankan: npx eslint . 2>&1 | tail -n 3
   Catat jumlah problems (sekitar 421). Ini angka awal, JANGAN diperbaiki.

FILE YANG BOLEH DIUBAH/DIBUAT: tidak ada.

CEK SELESAI: tempel output dari langkah 1–4.
```

**CEK OLEH KAMU:** `git branch --show-current` harus menampilkan `fix/security-audit`.

---

## G-01 — Pasang test runner (vitest)

```text
TUGAS G-01: Pasang vitest untuk unit test. Jangan menulis test untuk fitur apa pun selain contoh di bawah.

FILE YANG BOLEH DIUBAH/DIBUAT:
- package.json (hanya bagian "scripts" dan "devDependencies")
- package-lock.json (otomatis dari npm)
- vitest.config.ts (baru)
- tests/sanity.test.ts (baru)

LANGKAH:
1. Jalankan: npm install -D vitest
2. Di package.json, bagian "scripts", TAMBAHKAN dua baris berikut (jangan hapus script lain):
   "test": "vitest run",
   "typecheck": "tsc --noEmit"
3. Buat file vitest.config.ts di root proyek dengan isi PERSIS:

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});

4. Buat file tests/sanity.test.ts dengan isi PERSIS:

import { describe, it, expect } from "vitest";

describe("sanity", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});

JANGAN: mengubah tsconfig.json, eslint.config.mjs, atau file lain.

CEK SELESAI:
- npm test        (harus: 1 passed)
- npx tsc --noEmit  (harus: 0 error)
```

**CEK OLEH KAMU:** `npm test` hasilnya hijau.

---

## G-02 — Hapus endpoint "bayar palsu" `/api/orders/[id]/pay`

```text
TUGAS G-02: Hapus endpoint simulator pembayaran yang bisa menandai pesanan "paid" tanpa login dan tanpa bayar.

KONTEKS:
- File app/api/orders/[id]/pay/route.ts adalah simulator QRIS. Tidak ada pengecekan login. Ia memanggil transitionOrder(order.id, "paid", "webhook", ...) lalu update orders.status = "paid".
- Siapa pun bisa mengirim POST ke /api/orders/<kode>/pay dan pesanan jadi lunas. Ini lubang keamanan P0.
- Sudah dicek: tidak ada halaman di app/ atau components/ yang memanggil endpoint ini.

FILE YANG BOLEH DIUBAH/DIBUAT:
- HAPUS folder: app/api/orders/[id]/pay/ (beserta route.ts di dalamnya)

LANGKAH:
1. Jalankan: git rm -r "app/api/orders/[id]/pay"
2. Jalankan pencarian berikut untuk memastikan tidak ada yang memanggilnya:
   grep -rn "/pay\"" app components lib
   grep -rn "/pay\`" app components lib
   grep -rn "QRIS Simulator" app components lib
   Kalau ada hasil yang memanggil /api/orders/.../pay, BERHENTI dan laporkan file dan barisnya. JANGAN ubah file itu.

JANGAN: membuat endpoint pengganti. Jangan mengubah file lain.

CEK SELESAI:
- ls "app/api/orders/[id]"   (folder pay tidak boleh ada)
- npx tsc --noEmit           (0 error)
- npm test                   (lulus)
```

**CEK OLEH KAMU:** folder `app/api/orders/[id]/pay` sudah hilang.

---

## G-03 — Helper Midtrans (verifikasi signature, klasifikasi status, cek status)

```text
TUGAS G-03: Buat helper Midtrans yang aman dan unit test-nya. JANGAN mengubah webhook dulu (itu tugas G-06).

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/payments/midtrans-helpers.ts (baru)
- lib/payments/midtrans-status.ts (baru)
- tests/midtrans-helpers.test.ts (baru)

LANGKAH:
1. Buat lib/payments/midtrans-helpers.ts dengan isi PERSIS:

import crypto from "crypto";

/**
 * Verifikasi signature_key notifikasi Midtrans.
 * Rumus resmi: sha512(order_id + status_code + gross_amount + serverKey).
 * Pakai perbandingan constant-time.
 */
export function verifyMidtransSignature(params: {
  orderId: string;
  statusCode: string;
  grossAmount: string;
  signatureKey: string;
  serverKey: string;
}): boolean {
  if (!params.serverKey || !params.signatureKey) return false;
  const expected = crypto
    .createHash("sha512")
    .update(params.orderId + params.statusCode + params.grossAmount + params.serverKey)
    .digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(params.signatureKey, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export type MidtransOutcome = "success" | "failed" | "refunded" | "pending" | "unknown";

/** Klasifikasi transaction_status Midtrans menjadi hasil yang dipakai aplikasi. */
export function classifyMidtransStatus(
  transactionStatus: string | undefined | null,
  fraudStatus: string | undefined | null
): MidtransOutcome {
  switch (transactionStatus) {
    case "settlement":
      return "success";
    case "capture":
      return fraudStatus === "accept" ? "success" : "pending";
    case "cancel":
    case "deny":
    case "expire":
    case "failure":
      return "failed";
    case "refund":
    case "partial_refund":
    case "chargeback":
    case "partial_chargeback":
      return "refunded";
    case "pending":
    case "authorize":
      return "pending";
    default:
      return "unknown";
  }
}

export type ParsedMidtransOrderId =
  | { kind: "order"; providerOrderId: string; orderCode: string }
  | { kind: "subscription"; providerOrderId: string };

const ORDER_ID_RE = /^ORD-(BM-\d{6}-[A-Z0-9]{4,12})$/;
const SUB_ID_RE = /^SUB-\d{10,16}-\d{4}$/;

/** Validasi format order_id dari Midtrans. Return null kalau format tidak dikenal. */
export function parseMidtransOrderId(orderId: string): ParsedMidtransOrderId | null {
  if (typeof orderId !== "string") return null;
  const orderMatch = ORDER_ID_RE.exec(orderId);
  if (orderMatch) {
    return { kind: "order", providerOrderId: orderId, orderCode: orderMatch[1] };
  }
  if (SUB_ID_RE.test(orderId)) {
    return { kind: "subscription", providerOrderId: orderId };
  }
  return null;
}

/** Ubah gross_amount Midtrans ("150000.00") menjadi integer rupiah. Return null kalau tidak valid. */
export function parseGrossAmount(value: unknown): number | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

2. Buat lib/payments/midtrans-status.ts dengan isi PERSIS:

/**
 * Ambil status transaksi langsung dari Midtrans (server-side only).
 * Return null kalau server key tidak ada atau request gagal.
 */
export async function getMidtransTransactionStatus(providerOrderId: string): Promise<any | null> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey === "dummy-midtrans-server-key") return null;
  const baseUrl =
    process.env.MIDTRANS_IS_PRODUCTION === "true"
      ? "https://api.midtrans.com/v2"
      : "https://api.sandbox.midtrans.com/v2";
  try {
    const res = await fetch(`${baseUrl}/${encodeURIComponent(providerOrderId)}/status`, {
      headers: {
        Accept: "application/json",
        Authorization: "Basic " + Buffer.from(serverKey + ":").toString("base64"),
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("getMidtransTransactionStatus error:", err);
    return null;
  }
}

3. Buat tests/midtrans-helpers.test.ts dengan isi PERSIS:

import { describe, it, expect } from "vitest";
import crypto from "crypto";
import {
  verifyMidtransSignature,
  classifyMidtransStatus,
  parseMidtransOrderId,
  parseGrossAmount,
} from "@/lib/payments/midtrans-helpers";

const serverKey = "test-server-key";
function sign(orderId: string, statusCode: string, gross: string) {
  return crypto.createHash("sha512").update(orderId + statusCode + gross + serverKey).digest("hex");
}

describe("verifyMidtransSignature", () => {
  it("accepts a valid signature", () => {
    const sig = sign("ORD-BM-261017-1234", "200", "150000.00");
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "150000.00", signatureKey: sig, serverKey })
    ).toBe(true);
  });
  it("rejects a wrong signature", () => {
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "150000.00", signatureKey: "abc", serverKey })
    ).toBe(false);
  });
  it("rejects when gross amount is tampered", () => {
    const sig = sign("ORD-BM-261017-1234", "200", "150000.00");
    expect(
      verifyMidtransSignature({ orderId: "ORD-BM-261017-1234", statusCode: "200", grossAmount: "1.00", signatureKey: sig, serverKey })
    ).toBe(false);
  });
  it("rejects empty signature or empty server key", () => {
    expect(verifyMidtransSignature({ orderId: "x", statusCode: "200", grossAmount: "1", signatureKey: "", serverKey })).toBe(false);
    expect(verifyMidtransSignature({ orderId: "x", statusCode: "200", grossAmount: "1", signatureKey: "abc", serverKey: "" })).toBe(false);
  });
});

describe("classifyMidtransStatus", () => {
  it("maps statuses", () => {
    expect(classifyMidtransStatus("settlement", null)).toBe("success");
    expect(classifyMidtransStatus("capture", "accept")).toBe("success");
    expect(classifyMidtransStatus("capture", "challenge")).toBe("pending");
    expect(classifyMidtransStatus("expire", null)).toBe("failed");
    expect(classifyMidtransStatus("refund", null)).toBe("refunded");
    expect(classifyMidtransStatus("pending", null)).toBe("pending");
    expect(classifyMidtransStatus("weird", null)).toBe("unknown");
  });
});

describe("parseMidtransOrderId", () => {
  it("parses order ids", () => {
    expect(parseMidtransOrderId("ORD-BM-261017-1234")).toEqual({ kind: "order", providerOrderId: "ORD-BM-261017-1234", orderCode: "BM-261017-1234" });
  });
  it("parses subscription ids", () => {
    expect(parseMidtransOrderId("SUB-1760000000000-1234")).toEqual({ kind: "subscription", providerOrderId: "SUB-1760000000000-1234" });
  });
  it("rejects injection attempts and unknown formats", () => {
    expect(parseMidtransOrderId("ORD-x,id.eq.123")).toBeNull();
    expect(parseMidtransOrderId("BM-261017-1234")).toBeNull();
    expect(parseMidtransOrderId("")).toBeNull();
  });
});

describe("parseGrossAmount", () => {
  it("parses strings", () => {
    expect(parseGrossAmount("150000.00")).toBe(150000);
    expect(parseGrossAmount("abc")).toBeNull();
    expect(parseGrossAmount(undefined)).toBeNull();
  });
});

JANGAN: mengubah lib/midtrans.ts atau webhook.

CEK SELESAI:
- npm test         (semua lulus)
- npx tsc --noEmit (0 error)
```

**CEK OLEH KAMU:** `npm test` hijau dan ada sekitar 9 test baru.

---

## G-04 — Logika pembayaran pesanan berbasis database (atomik dan idempoten)

```text
TUGAS G-04: Buat fungsi server untuk memproses hasil pembayaran pesanan langsung ke database, dengan update bersyarat supaya aman dari notifikasi ganda. Webhook BELUM diubah (itu G-06).

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/data/orders.ts (HANYA menambah satu fungsi baru, lihat langkah 1)
- lib/payments/order-payment.ts (baru)

KONTEKS:
- Tabel orders: id uuid, order_code text unik, status text, total int, paid_at, cancelled_at, cancel_reason, updated_at.
- Tabel payments: provider_order_id text unik (format "ORD-<order_code>"), status hanya boleh 'pending' | 'success' | 'failed' | 'refunded', raw_payload jsonb, processed_at.
- Tabel order_events: order_id, event_type, from_status, to_status, actor_type, actor_name, note.
- lib/data/orders.ts punya fungsi getOrderById(id). Di server, fungsi ini MENGUTAMAKAN cache memori (inMemoryOrders) yang bisa basi. Di dalamnya ada blok "Server-side fallback: check Supabase directly" (kira-kira baris 298-341) yang membaca dari DB lalu memanggil mapDbOrderToOrder dan registerClientOrder.

LANGKAH:
1. Di lib/data/orders.ts, TEPAT SETELAH fungsi getOrderById selesai (setelah kurung kurawal penutupnya), TAMBAHKAN fungsi baru ini. JANGAN ubah getOrderById.

/**
 * Selalu baca pesanan langsung dari database (server-side), lalu segarkan cache memori.
 * Pakai fungsi ini di API route, bukan getOrderById.
 */
export async function getOrderByIdFromDb(id: string): Promise<Order | null> {
  if (typeof window !== "undefined") return null;
  const { createAdminClient } = await import("../supabase/admin");
  const adminSupabase = createAdminClient();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  let query = adminSupabase
    .from("orders")
    .select(`
      *,
      customer:profiles!customer_id (id, full_name, phone, avatar_url),
      worker:workers!worker_id (id, full_name, phone, service_area, is_verified, user_id, photo_path),
      package:service_packages!package_id (id, name, inclusions, exclusions, categories(name)),
      photos:order_photos(*),
      events:order_events(*),
      complaints(*)
    `);
  query = isUuid ? query.eq("id", id) : query.eq("order_code", id);

  const { data: dbOrder, error } = await query.maybeSingle();
  if (error) {
    console.error("getOrderByIdFromDb error:", error);
    return null;
  }
  if (!dbOrder) return null;

  const { data: sub } = await adminSupabase
    .from("subscriptions")
    .select("plan, current_period_end")
    .eq("user_id", dbOrder.customer_id)
    .maybeSingle();
  const isPlus = Boolean(
    sub?.plan === "plus" &&
      sub.current_period_end &&
      new Date(sub.current_period_end) > new Date()
  );
  const mapped = mapDbOrderToOrder(dbOrder, isPlus);
  registerClientOrder(mapped);
  return mapped;
}

   Kalau `Order`, `mapDbOrderToOrder`, atau `registerClientOrder` tidak tersedia di file itu dengan nama tersebut, BERHENTI dan laporkan.

2. Buat lib/payments/order-payment.ts dengan isi PERSIS:

import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderByIdFromDb } from "@/lib/data/orders";

type Fail = { ok: false; error: string };

export type MarkPaidResult =
  | { ok: true; result: "paid" | "already_paid" | "amount_mismatch" | "paid_after_cancel" | "order_not_found" }
  | Fail;

/**
 * Tandai pesanan lunas berdasarkan notifikasi/status Midtrans yang SUDAH terverifikasi.
 * Aman dipanggil berkali-kali (idempoten).
 */
export async function markOrderPaidFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  grossAmount: number;
  paymentType?: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<MarkPaidResult> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, order_code, status, total")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (!order) return { ok: true, result: "order_not_found" };

  if (Number(order.total) !== params.grossAmount) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_amount_mismatch",
      from_status: order.status,
      to_status: order.status,
      actor_type: "system",
      actor_name: params.actorName,
      note: `Nominal tidak cocok: tagihan Rp${order.total}, dibayar Rp${params.grossAmount}. Perlu cek manual.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
    return { ok: true, result: "amount_mismatch" };
  }

  const { error: payErr } = await db
    .from("payments")
    .update({ status: "success", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "pending");
  if (payErr) return { ok: false, error: payErr.message };

  const { data: updated, error: updErr } = await db
    .from("orders")
    .update({ status: "paid", paid_at: nowIso, updated_at: nowIso })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id");
  if (updErr) return { ok: false, error: updErr.message };

  if (updated && updated.length === 1) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_settled",
      from_status: "pending_payment",
      to_status: "paid",
      actor_type: "system",
      actor_name: params.actorName,
      note: `Pembayaran sukses diverifikasi Midtrans (${params.paymentType || "snap"}). Nominal: Rp${params.grossAmount}.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
    await getOrderByIdFromDb(order.id);
    return { ok: true, result: "paid" };
  }

  if (order.status === "cancelled") {
    const { data: existing, error: exErr } = await db
      .from("order_events")
      .select("id")
      .eq("order_id", order.id)
      .eq("event_type", "paid_after_cancel")
      .limit(1);
    if (exErr) return { ok: false, error: exErr.message };
    if (!existing || existing.length === 0) {
      const { error: evErr } = await db.from("order_events").insert({
        order_id: order.id,
        event_type: "paid_after_cancel",
        from_status: "cancelled",
        to_status: "cancelled",
        actor_type: "system",
        actor_name: params.actorName,
        note: "Pembayaran masuk setelah pesanan dibatalkan. PERLU REFUND MANUAL.",
      });
      if (evErr) return { ok: false, error: evErr.message };
    }
    return { ok: true, result: "paid_after_cancel" };
  }

  return { ok: true, result: "already_paid" };
}

/** Pembayaran gagal/expire/cancel: batalkan pesanan HANYA jika masih pending_payment. */
export async function markOrderFailedFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  transactionStatus: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<{ ok: true; result: "cancelled" | "unchanged" | "order_not_found" } | Fail> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { error: payErr } = await db
    .from("payments")
    .update({ status: "failed", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "pending");
  if (payErr) return { ok: false, error: payErr.message };

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (!order) return { ok: true, result: "order_not_found" };

  const reason = `Pembayaran ${params.transactionStatus} oleh Midtrans.`;
  const { data: updated, error: updErr } = await db
    .from("orders")
    .update({ status: "cancelled", cancelled_at: nowIso, updated_at: nowIso, cancel_reason: reason })
    .eq("id", order.id)
    .eq("status", "pending_payment")
    .select("id");
  if (updErr) return { ok: false, error: updErr.message };
  if (!updated || updated.length !== 1) return { ok: true, result: "unchanged" };

  const { error: evErr } = await db.from("order_events").insert({
    order_id: order.id,
    event_type: "payment_failed",
    from_status: "pending_payment",
    to_status: "cancelled",
    actor_type: "system",
    actor_name: params.actorName,
    note: reason,
  });
  if (evErr) return { ok: false, error: evErr.message };
  await getOrderByIdFromDb(order.id);
  return { ok: true, result: "cancelled" };
}

/** Refund/chargeback: tandai payment refunded (hanya dari success) + catat event. Status pesanan TIDAK diubah. */
export async function markOrderRefundedFromMidtrans(params: {
  providerOrderId: string;
  orderCode: string;
  transactionStatus: string;
  rawPayload: unknown;
  actorName: string;
}): Promise<{ ok: true; result: "refunded" | "unchanged" } | Fail> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: updated, error: payErr } = await db
    .from("payments")
    .update({ status: "refunded", raw_payload: params.rawPayload, processed_at: nowIso })
    .eq("provider_order_id", params.providerOrderId)
    .eq("status", "success")
    .select("id");
  if (payErr) return { ok: false, error: payErr.message };
  if (!updated || updated.length !== 1) return { ok: true, result: "unchanged" };

  const { data: order, error: orderErr } = await db
    .from("orders")
    .select("id, status")
    .eq("order_code", params.orderCode)
    .maybeSingle();
  if (orderErr) return { ok: false, error: orderErr.message };
  if (order) {
    const { error: evErr } = await db.from("order_events").insert({
      order_id: order.id,
      event_type: "payment_refunded",
      from_status: order.status,
      to_status: order.status,
      actor_type: "system",
      actor_name: params.actorName,
      note: `Midtrans melaporkan ${params.transactionStatus}. Periksa status pesanan secara manual.`,
    });
    if (evErr) return { ok: false, error: evErr.message };
  }
  return { ok: true, result: "refunded" };
}

JANGAN: mengubah getOrderById, transitionOrder, atau fungsi lain di orders.ts. Jangan mengubah webhook.

CEK SELESAI:
- npx tsc --noEmit (0 error)
- npm test (lulus)
- grep -n "export async function getOrderByIdFromDb" lib/data/orders.ts   (harus ada 1 baris)
```

---

## G-05 — Logika aktivasi Member Plus yang aman

```text
TUGAS G-05: Buat satu-satunya fungsi yang boleh mengaktifkan Member Plus, ditambah helper "apakah Plus aktif". Route dan webhook BELUM diubah.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/subscriptions/is-plus-active.ts (baru)
- lib/data/subscriptions.ts (baru. Kalau file ini SUDAH ADA, BERHENTI dan laporkan.)
- tests/is-plus-active.test.ts (baru)

KONTEKS:
- Tabel subscriptions: user_id (PK), plan ('free'|'plus'), current_period_end timestamptz, updated_at.
- Tabel payments: provider_order_id (format SUB-...), kind ('order'|'subscription'), customer_id, amount int, status ('pending'|'success'|'failed'|'refunded').
- Aturan bisnis: 1 pembayaran sukses = tepat 1 kali perpanjangan selama PLUS_DURATION_DAYS (default 30) hari. Perpanjangan dihitung dari max(sekarang, current_period_end).

LANGKAH:
1. Buat lib/subscriptions/is-plus-active.ts dengan isi PERSIS:

export function isPlusActive(
  sub: { plan?: string | null; current_period_end?: string | null } | null | undefined,
  now: Date = new Date()
): boolean {
  if (!sub || sub.plan !== "plus" || !sub.current_period_end) return false;
  const end = new Date(sub.current_period_end).getTime();
  return Number.isFinite(end) && end > now.getTime();
}

2. Buat lib/data/subscriptions.ts dengan isi PERSIS:

import { createAdminClient } from "@/lib/supabase/admin";

type Fail = { ok: false; error: string };

export type PlusActivationResult =
  | { ok: true; activated: true; currentPeriodEnd: string }
  | { ok: true; activated: false; reason: "payment_not_found" | "not_subscription" | "already_processed" | "amount_mismatch" }
  | Fail;

/**
 * SATU-SATUNYA fungsi yang boleh mengaktifkan/memperpanjang Plus.
 * Hanya dipanggil setelah pembayaran terverifikasi (webhook bertanda tangan valid
 * atau cek status server-ke-server ke Midtrans).
 */
export async function activatePlusFromPayment(
  providerOrderId: string,
  paidGrossAmount: number,
  rawPayload: unknown
): Promise<PlusActivationResult> {
  const db = createAdminClient();

  const { data: payment, error: payErr } = await db
    .from("payments")
    .select("id, customer_id, amount, kind, status")
    .eq("provider_order_id", providerOrderId)
    .maybeSingle();
  if (payErr) return { ok: false, error: payErr.message };
  if (!payment) return { ok: true, activated: false, reason: "payment_not_found" };
  if (payment.kind !== "subscription") return { ok: true, activated: false, reason: "not_subscription" };
  if (payment.status !== "pending") return { ok: true, activated: false, reason: "already_processed" };
  if (Number(payment.amount) !== paidGrossAmount) {
    console.warn(`Plus payment amount mismatch for ${providerOrderId}: expected ${payment.amount}, got ${paidGrossAmount}`);
    return { ok: true, activated: false, reason: "amount_mismatch" };
  }

  const nowIso = new Date().toISOString();

  // Kunci idempotensi: hanya satu proses yang berhasil mengubah pending -> success.
  const { data: flipped, error: flipErr } = await db
    .from("payments")
    .update({ status: "success", raw_payload: rawPayload, processed_at: nowIso })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");
  if (flipErr) return { ok: false, error: flipErr.message };
  if (!flipped || flipped.length !== 1) return { ok: true, activated: false, reason: "already_processed" };

  const days = Number(process.env.PLUS_DURATION_DAYS) || 30;
  const { data: sub, error: subErr } = await db
    .from("subscriptions")
    .select("current_period_end")
    .eq("user_id", payment.customer_id)
    .maybeSingle();

  if (subErr) {
    await db.from("payments").update({ status: "pending" }).eq("id", payment.id);
    return { ok: false, error: subErr.message };
  }

  const now = new Date();
  const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
  const base = currentEnd && currentEnd.getTime() > now.getTime() ? currentEnd : now;
  const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000).toISOString();

  const { error: upErr } = await db.from("subscriptions").upsert({
    user_id: payment.customer_id,
    plan: "plus",
    current_period_end: newEnd,
    updated_at: nowIso,
  });
  if (upErr) {
    // Kembalikan ke pending supaya retry Midtrans bisa memproses ulang.
    await db.from("payments").update({ status: "pending" }).eq("id", payment.id);
    return { ok: false, error: upErr.message };
  }

  return { ok: true, activated: true, currentPeriodEnd: newEnd };
}

/** Tandai pembayaran langganan gagal (hanya dari pending). */
export async function markSubscriptionPaymentFailed(
  providerOrderId: string,
  rawPayload: unknown
): Promise<{ ok: true } | Fail> {
  const db = createAdminClient();
  const { error } = await db
    .from("payments")
    .update({ status: "failed", raw_payload: rawPayload, processed_at: new Date().toISOString() })
    .eq("provider_order_id", providerOrderId)
    .eq("kind", "subscription")
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

3. Buat tests/is-plus-active.test.ts dengan isi PERSIS:

import { describe, it, expect } from "vitest";
import { isPlusActive } from "@/lib/subscriptions/is-plus-active";

const now = new Date("2026-10-17T00:00:00Z");

describe("isPlusActive", () => {
  it("false for null/free", () => {
    expect(isPlusActive(null, now)).toBe(false);
    expect(isPlusActive({ plan: "free", current_period_end: "2027-01-01T00:00:00Z" }, now)).toBe(false);
  });
  it("false when end date is null (NOT forever)", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: null }, now)).toBe(false);
  });
  it("false when expired", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: "2026-10-16T00:00:00Z" }, now)).toBe(false);
  });
  it("true when in the future", () => {
    expect(isPlusActive({ plan: "plus", current_period_end: "2026-11-16T00:00:00Z" }, now)).toBe(true);
  });
});

CEK SELESAI:
- npm test (lulus)
- npx tsc --noEmit (0 error)
```

---

## G-06 — Tulis ulang webhook Midtrans dan sync status di GET order

```text
TUGAS G-06: Ganti webhook Midtrans dengan versi aman, lalu pakai helper yang sama di sinkronisasi status GET /api/orders/[id].

PRASYARAT: G-03, G-04, G-05 sudah selesai (file lib/payments/midtrans-helpers.ts, lib/payments/midtrans-status.ts, lib/payments/order-payment.ts, lib/data/subscriptions.ts sudah ada). Kalau belum ada, BERHENTI.

FILE YANG BOLEH DIUBAH/DIBUAT:
- app/api/webhooks/midtrans/route.ts (GANTI SELURUH ISI)
- app/api/orders/[id]/route.ts (HANYA blok sinkronisasi Midtrans, lihat langkah 2)

MASALAH YANG DIPERBAIKI:
- Signature hanya dicek kalau signature_key dikirim, jadi notifikasi palsu tanpa signature diterima.
- order_id dari body dimasukkan ke filter .or(...) (injeksi filter PostgREST).
- Nominal tidak cocok hanya di-log.
- Status payment bisa turun dari success ke pending/failed.
- Plus bertambah 30 hari di SETIAP notifikasi sukses (tidak idempoten).

LANGKAH:
1. Ganti SELURUH isi app/api/webhooks/midtrans/route.ts dengan isi PERSIS berikut:

import { NextResponse } from "next/server";
import {
  verifyMidtransSignature,
  classifyMidtransStatus,
  parseMidtransOrderId,
  parseGrossAmount,
} from "@/lib/payments/midtrans-helpers";
import {
  markOrderPaidFromMidtrans,
  markOrderFailedFromMidtrans,
  markOrderRefundedFromMidtrans,
} from "@/lib/payments/order-payment";
import {
  activatePlusFromPayment,
  markSubscriptionPaymentFailed,
} from "@/lib/data/subscriptions";

export async function POST(request: Request) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey || serverKey === "dummy-midtrans-server-key") {
    console.error("Midtrans webhook: MIDTRANS_SERVER_KEY belum dikonfigurasi");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const orderId = typeof body?.order_id === "string" ? body.order_id : "";
  const statusCode = typeof body?.status_code === "string" ? body.status_code : "";
  const grossAmountRaw = typeof body?.gross_amount === "string" ? body.gross_amount : "";
  const signatureKey = typeof body?.signature_key === "string" ? body.signature_key : "";

  if (!orderId || !statusCode || !grossAmountRaw || !signatureKey) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const validSignature = verifyMidtransSignature({
    orderId,
    statusCode,
    grossAmount: grossAmountRaw,
    signatureKey,
    serverKey,
  });
  if (!validSignature) {
    console.warn("Midtrans webhook: signature tidak valid");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = parseMidtransOrderId(orderId);
  if (!parsed) {
    // Signature valid tapi format tidak dikenal (misal notifikasi test dari dashboard): abaikan.
    return NextResponse.json({ status: "OK", result: "ignored_unknown_order_id" });
  }

  const grossAmount = parseGrossAmount(grossAmountRaw);
  if (grossAmount === null) {
    return NextResponse.json({ error: "Invalid gross_amount" }, { status: 400 });
  }

  const transactionStatus = String(body.transaction_status || "");
  const outcome = classifyMidtransStatus(body.transaction_status, body.fraud_status);

  try {
    if (parsed.kind === "order") {
      if (outcome === "success") {
        const r = await markOrderPaidFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          grossAmount,
          paymentType: body.payment_type,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      if (outcome === "failed") {
        const r = await markOrderFailedFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          transactionStatus,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      if (outcome === "refunded") {
        const r = await markOrderRefundedFromMidtrans({
          providerOrderId: parsed.providerOrderId,
          orderCode: parsed.orderCode,
          transactionStatus,
          rawPayload: body,
          actorName: "Midtrans Webhook",
        });
        if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
        return NextResponse.json({ status: "OK", result: r.result });
      }
      return NextResponse.json({ status: "OK", result: "no_action" });
    }

    // Langganan Plus (SUB-...)
    if (outcome === "success") {
      const r = await activatePlusFromPayment(parsed.providerOrderId, grossAmount, body);
      if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
      return NextResponse.json({ status: "OK", activated: r.activated });
    }
    if (outcome === "failed") {
      const r = await markSubscriptionPaymentFailed(parsed.providerOrderId, body);
      if (!r.ok) return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
    return NextResponse.json({ status: "OK", result: "no_action" });
  } catch (err) {
    console.error("Midtrans webhook error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

2. Di app/api/orders/[id]/route.ts:
   a. Cari blok yang diawali komentar:
        // If still pending, auto-sync with Midtrans Status API in case webhook was delayed
      dan berakhir di kurung kurawal penutup `if (order && order.status === "pending_payment") { ... }` (kira-kira baris 13-72).
   b. GANTI seluruh blok itu (termasuk komentarnya) dengan kode PERSIS ini:

    // Jika masih pending, cek langsung ke Midtrans (server-ke-server) kalau webhook terlambat.
    if (order && order.status === "pending_payment") {
      const providerOrderId = `ORD-${order.order_code}`;
      const statusData = await getMidtransTransactionStatus(providerOrderId);
      if (
        statusData &&
        classifyMidtransStatus(statusData.transaction_status, statusData.fraud_status) === "success"
      ) {
        const gross = parseGrossAmount(statusData.gross_amount);
        if (gross !== null) {
          const r = await markOrderPaidFromMidtrans({
            providerOrderId,
            orderCode: order.order_code,
            grossAmount: gross,
            paymentType: statusData.payment_type,
            rawPayload: statusData,
            actorName: "Midtrans Sync",
          });
          if (r.ok && (r.result === "paid" || r.result === "already_paid")) {
            order = (await getOrderByIdFromDb(order.id)) ?? order;
          }
        }
      }
    }

   c. Ganti baris import di atas file. Hapus import `registerClientOrder` dan `createAdminClient` kalau sudah tidak dipakai. Import yang harus ada:

import { NextResponse } from "next/server";
import { getOrderById, getOrderByIdFromDb } from "@/lib/data/orders";
import { getMidtransTransactionStatus } from "@/lib/payments/midtrans-status";
import { classifyMidtransStatus, parseGrossAmount } from "@/lib/payments/midtrans-helpers";
import { markOrderPaidFromMidtrans } from "@/lib/payments/order-payment";

   d. Masih di file yang sama, ganti baris `let order = await getOrderById(id);` menjadi `let order = await getOrderByIdFromDb(id);`. Setelah itu, kalau `getOrderById` tidak dipakai lagi, hapus dari import.
   e. JANGAN menambah pengecekan login di file ini (itu tugas G-09).

JANGAN: mengubah lib/midtrans.ts, lib/data/transactions.ts, atau route lain.

CEK SELESAI:
- npx tsc --noEmit (0 error)
- npm test (lulus)
- grep -n "signature_key &&\|\.or(" app/api/webhooks/midtrans/route.ts   (harus KOSONG)
- grep -n "transitionOrder\|getOrders\|updatePaymentStatus" app/api/webhooks/midtrans/route.ts   (harus KOSONG)
```

**CEK OLEH KAMU (lokal, `npm run dev` di terminal kamu sendiri):**

```bash
curl -s -X POST http://localhost:3000/api/webhooks/midtrans -H "content-type: application/json" -d "{\"order_id\":\"ORD-BM-261017-1234\",\"transaction_status\":\"settlement\",\"status_code\":\"200\",\"gross_amount\":\"1\"}"
```

Hasil yang benar: `{"error":"Missing required fields"}`, karena signature tidak dikirim. Kalau responsnya OK, berarti gagal.

---

## G-07 — Endpoint status Plus: hapus POST, GET tidak boleh memberi Plus gratis

```text
TUGAS G-07: Tutup lubang "Plus gratis".

PRASYARAT: G-03, G-05 selesai.

FILE YANG BOLEH DIUBAH/DIBUAT:
- app/api/subscriptions/status/route.ts (GANTI SELURUH ISI)
- app/plus/page.tsx (HANYA callback onSuccess dari snap.pay, lihat langkah 2)

MASALAH:
- POST /api/subscriptions/status memberi Plus 30 hari ke user login mana pun tanpa bayar, dan bisa menandai payment siapa pun menjadi success.
- GET memberi ulang Plus 30 hari dari pembayaran lama yang pernah sukses, sehingga sekali bayar berarti Plus selamanya.

LANGKAH:
1. Ganti SELURUH isi app/api/subscriptions/status/route.ts dengan isi PERSIS:

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPlusActive } from "@/lib/subscriptions/is-plus-active";
import { activatePlusFromPayment } from "@/lib/data/subscriptions";
import { getMidtransTransactionStatus } from "@/lib/payments/midtrans-status";
import { classifyMidtransStatus, parseGrossAmount } from "@/lib/payments/midtrans-helpers";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        isPlus: false,
        plan: "free",
        current_period_end: null,
        remaining_days: 0,
      });
    }

    const db = createAdminClient();

    // 1. Sinkronkan pembayaran langganan MILIK USER INI yang masih pending (maks 3 terbaru).
    const { data: pendingPayments, error: pendErr } = await db
      .from("payments")
      .select("provider_order_id")
      .eq("customer_id", user.id)
      .eq("kind", "subscription")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(3);
    if (pendErr) {
      console.error("subscriptions/status pending payments error:", pendErr);
    }

    for (const p of pendingPayments || []) {
      if (!p.provider_order_id) continue;
      const statusData = await getMidtransTransactionStatus(p.provider_order_id);
      if (!statusData) continue;
      if (classifyMidtransStatus(statusData.transaction_status, statusData.fraud_status) !== "success") continue;
      const gross = parseGrossAmount(statusData.gross_amount);
      if (gross === null) continue;
      const r = await activatePlusFromPayment(p.provider_order_id, gross, statusData);
      if (!r.ok) console.error("activatePlusFromPayment error:", r.error);
    }

    // 2. Baca status langganan. TIDAK pernah memberi Plus dari pembayaran lama.
    const { data: sub, error: subErr } = await db
      .from("subscriptions")
      .select("plan, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subErr) {
      return NextResponse.json({ error: "Gagal membaca status langganan." }, { status: 500 });
    }

    const isPlus = isPlusActive(sub);
    const periodEnd = sub?.current_period_end || null;
    let remainingDays = 0;
    if (isPlus && periodEnd) {
      const diff = Math.max(0, new Date(periodEnd).getTime() - Date.now());
      remainingDays = Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      success: true,
      isPlus,
      plan: isPlus ? "plus" : "free",
      current_period_end: periodEnd,
      remaining_days: remainingDays,
    });
  } catch (err) {
    console.error("GET /api/subscriptions/status error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

   CATATAN: Fungsi POST SENGAJA dihapus. Next.js otomatis membalas 405 untuk method yang tidak ada.

2. Di app/plus/page.tsx, cari callback `onSuccess: async () => {` di dalam `(window as any).snap.pay(...)` (kira-kira baris 81-96). Di dalamnya ada blok:

            try {
              await fetch("/api/subscriptions/status", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sub_order_id: subOrderId }),
              });
            } catch {}

   GANTI blok try/catch itu (HANYA itu) dengan:

            try {
              await fetch("/api/subscriptions/status", { cache: "no-store" });
            } catch {}

   Kalau variabel `subOrderId` jadi tidak terpakai, biarkan saja. JANGAN ubah bagian lain dari file ini.

CEK SELESAI:
- npx tsc --noEmit (0 error)
- npm test (lulus)
- grep -n "export async function POST" app/api/subscriptions/status/route.ts   (harus KOSONG)
- grep -n "method: \"POST\"" app/plus/page.tsx   (hasilnya tidak boleh menyebut /api/subscriptions/status. Laporkan semua baris yang muncul.)
```

---

## G-08 — Satukan cek "Plus aktif" (end date null bukan berarti aktif selamanya)

```text
TUGAS G-08: Ganti pengecekan Plus yang salah dengan helper isPlusActive.

PRASYARAT: G-05 selesai.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/data/orders.ts
- app/api/orders/route.ts

MASALAH: kode berikut menganggap Plus aktif SELAMANYA kalau current_period_end null:
    (!s.current_period_end || new Date(s.current_period_end) > new Date())

LANGKAH:
1. Jalankan: grep -n "current_period_end ||\|!s.current_period_end\|!sub.current_period_end" lib/data/orders.ts app/api/orders/route.ts
   Catat semua hasilnya.
2. Untuk SETIAP hasil yang memakai pola "!x.current_period_end ||" untuk menentukan Plus aktif, ganti ekspresi boolean-nya dengan pemanggilan isPlusActive(x). Contoh:

   SEBELUM:
        .filter(
          (s) =>
            s.plan === "plus" &&
            (!s.current_period_end || new Date(s.current_period_end) > new Date())
        )
   SESUDAH:
        .filter((s) => isPlusActive(s))

   SEBELUM:
        const isPlus = Boolean(
          sub?.plan === "plus" &&
            (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
        );
   SESUDAH:
        const isPlus = isPlusActive(sub);

3. Tambahkan import di file yang diubah:
   import { isPlusActive } from "@/lib/subscriptions/is-plus-active";
   (di lib/data/orders.ts boleh pakai path relatif "../subscriptions/is-plus-active" kalau file itu memakai import relatif.)
4. Di app/api/orders/route.ts, di bagian POST, cari pengecekan Plus untuk biaya layanan (sekitar baris 240-255). Kalau logikanya sudah mensyaratkan current_period_end tidak null dan di masa depan, GANTI juga dengan isPlusActive(...) agar konsisten. Kalau bentuknya berbeda jauh, JANGAN ubah dan laporkan.

JANGAN: mengubah logika lain, nama variabel, atau urutan kode.

CEK SELESAI:
- grep -rn "!s.current_period_end ||\|!sub.current_period_end ||" lib app   (harus KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

# FASE 2 — KEPEMILIKAN DATA DAN AUTENTIKASI

## G-09 — Cek kepemilikan pesanan (IDOR) di `/api/orders/[id]/*`

```text
TUGAS G-09: Pastikan hanya pemilik pesanan (atau admin/staf yang berizin, atau mitra yang ditugaskan untuk baca) yang bisa membaca atau mengubah pesanan.

PRASYARAT: G-04 selesai (getOrderByIdFromDb ada).

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/orders/access.ts (baru)
- app/api/orders/[id]/route.ts
- app/api/orders/[id]/cancel/route.ts
- app/api/orders/[id]/confirm/route.ts
- app/api/orders/[id]/complaint/route.ts

MASALAH:
- GET /api/orders/[id] TANPA login mengembalikan nama, HP, alamat, dan foto pelanggan.
- cancel, confirm, dan complaint hanya cek "sudah login", tidak cek "apakah ini pesanan milik dia". User A bisa membatalkan atau menyelesaikan pesanan user B.

LANGKAH:
1. Buat lib/orders/access.ts dengan isi PERSIS:

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrderByIdFromDb } from "@/lib/data/orders";
import { getUserPermissions } from "@/lib/supabase/auth";
import { hasPermission } from "@/lib/auth/permissions";
import type { Order } from "@/lib/data/types";

export type OrderAccessResult =
  | { ok: true; order: Order; userId: string; isOwner: boolean }
  | { ok: false; status: 401 | 404; error: string };

/**
 * mode "read": pemilik, admin, staf aktif dengan izin orders.view, atau mitra yang ditugaskan.
 * mode "owner_action": HANYA pemilik pesanan.
 * Pesanan milik orang lain dibalas 404 (bukan 403) agar tidak membocorkan keberadaan pesanan.
 */
export async function authorizeOrderAccess(
  idOrCode: string,
  mode: "read" | "owner_action"
): Promise<OrderAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, status: 401, error: "Silakan masuk terlebih dahulu." };

  const notFound: OrderAccessResult = { ok: false, status: 404, error: "Pesanan tidak ditemukan." };

  const order = await getOrderByIdFromDb(idOrCode);
  if (!order) return notFound;

  if (order.customer_id === user.id) {
    return { ok: true, order, userId: user.id, isOwner: true };
  }
  if (mode === "owner_action") return notFound;

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return notFound;

  const perms = await getUserPermissions(user, profile);
  const staffAllowed =
    perms.isStaff && perms.staffStatus === "active" && hasPermission(perms.permissions, "orders.view", false);
  if (perms.isAdmin || staffAllowed) {
    return { ok: true, order, userId: user.id, isOwner: false };
  }

  if (profile.role === "worker" && order.worker_id) {
    const { data: worker } = await db.from("workers").select("id").eq("user_id", user.id).maybeSingle();
    if (worker && worker.id === order.worker_id) {
      return { ok: true, order, userId: user.id, isOwner: false };
    }
  }

  return notFound;
}

2. app/api/orders/[id]/route.ts (GET):
   - Tepat setelah `const { id } = await params;`, TAMBAHKAN:

    const access = await authorizeOrderAccess(id, "read");
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

   - Ganti `let order = await getOrderByIdFromDb(id);` menjadi `let order: typeof access.order | null = access.order;`
   - Tambahkan import: import { authorizeOrderAccess } from "@/lib/orders/access";
   - Blok sinkronisasi Midtrans dari G-06 TETAP dipertahankan.

3. app/api/orders/[id]/cancel/route.ts, confirm/route.ts, complaint/route.ts. Di KETIGA file:
   - HAPUS potongan ini:
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          return NextResponse.json({ error: "Akses tidak diizinkan." }, { status: 401 });
        }

        const order = await getOrderById(id);
        if (!order) {
          return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
        }
   - GANTI dengan:
        const access = await authorizeOrderAccess(id, "owner_action");
        if (!access.ok) {
          return NextResponse.json({ error: access.error }, { status: access.status });
        }
        const order = access.order;
   - Hapus import createClient dan getOrderById kalau sudah tidak dipakai. Tambahkan: import { authorizeOrderAccess } from "@/lib/orders/access";
   - Kalau setelah perubahan variabel `order` tidak dipakai di confirm/route.ts, ganti `const order = access.order;` menjadi `void access.order;`. JANGAN pakai eslint-disable.

4. KHUSUS complaint/route.ts:
   a. Setelah `const order = access.order;`, TAMBAHKAN:
        if (order.status === "pending_payment" || order.status === "cancelled") {
          return NextResponse.json(
            { error: "Komplain tidak dapat diajukan untuk pesanan dengan status ini." },
            { status: 400 }
          );
        }
   b. Baris `const { problem_type, description, photo_path, is_warranty = false } = body;`. Klaim garansi tidak boleh dipercaya dari client. Ganti menjadi:
        const { problem_type, description, photo_path } = body;
        const is_warranty = body?.is_warranty === true && order.customer?.is_plus === true;
      (Kalau properti `order.customer.is_plus` tidak ada di tipe Order, BERHENTI dan laporkan.)

JANGAN: mengubah lib/data/orders.ts. Jangan mengubah response sukses (tetap { success: true, order }).

CEK SELESAI:
- npx tsc --noEmit (0 error)
- npm test (lulus)
- grep -n "authorizeOrderAccess" app/api/orders/\[id\]/route.ts app/api/orders/\[id\]/cancel/route.ts app/api/orders/\[id\]/confirm/route.ts app/api/orders/\[id\]/complaint/route.ts   (harus 4 file, masing-masing ada pemanggilannya)
```

**CEK OLEH KAMU (dev lokal):**
- `curl -s http://localhost:3000/api/orders/BM-261017-1234` tanpa login → harus `401`.
- Login sebagai pelanggan A, buka halaman pesanan milik pelanggan B → harus "Pesanan tidak ditemukan".

---

## G-10 — Kunci semua API Mitra (hapus fallback `"w-1"`)

```text
TUGAS G-10: Semua route /api/mitra/** wajib login sebagai mitra. Hapus identitas palsu "w-1" dan "usr-w-1".

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/auth/require-worker.ts (baru)
- app/api/mitra/jobs/route.ts
- app/api/mitra/jobs/[id]/route.ts
- app/api/mitra/jobs/[id]/accept/route.ts
- app/api/mitra/jobs/[id]/decline/route.ts
- app/api/mitra/jobs/[id]/status/route.ts
- app/api/mitra/jobs/[id]/photos/route.ts
- app/api/mitra/earnings/route.ts
- app/api/mitra/profile/route.ts
- app/api/mitra/application/route.ts
- app/api/mitra/application/submit/route.ts

KONTEKS:
- Setiap route di atas punya pola:  const workerId = user?.id || "w-1";  atau  const userId = user?.id || "usr-w-1";
  Artinya: TANPA login pun route tetap jalan sebagai mitra palsu.
- Tabel workers: id, user_id (= auth user id), application_status ('draft'|'pending'|'approved'|'rejected'), is_active.
- Tabel profiles: id, role ('customer'|'worker'|'admin'|'staff').
- PENTING: fungsi di lib/data/mitra.ts saat ini menerima user.id (auth id). JANGAN ubah argumen yang dikirim ke fungsi-fungsi itu. Tetap kirim user.id. Perbaikan logika data mitra adalah tugas terpisah di masa depan.

LANGKAH:
1. Buat lib/auth/require-worker.ts dengan isi PERSIS:

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

2. Untuk route jobs/route.ts, jobs/[id]/route.ts, accept, decline, status, photos, earnings, profile (8 file):
   - HAPUS potongan pengambilan user:
        const supabase = await createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
   - dan baris fallback:  const workerId = user?.id || "w-1";   (atau  const userId = user?.id || "usr-w-1";  di profile/route.ts)
   - GANTI dengan:
        const auth = await requireWorker({ requireApproved: true });
        if (!auth.ok) return auth.response;
        const workerId = auth.userId;
     (Di profile/route.ts pakai nama variabel yang sama dengan sebelumnya:  const userId = auth.userId; )
   - Letakkan potongan baru di posisi yang sama dengan potongan lama (biasanya di dalam try, setelah `const { id } = await params;` kalau ada).
   - Tambahkan import: import { requireWorker } from "@/lib/auth/require-worker";
   - Hapus import createClient kalau sudah tidak dipakai.

3. Untuk application/route.ts (GET dan PUT) dan application/submit/route.ts: lakukan hal yang sama, TETAPI dengan:
        const auth = await requireWorker({ requireApproved: false });
        if (!auth.ok) return auth.response;
        const userId = auth.userId;

4. KHUSUS jobs/[id]/photos/route.ts: JANGAN ubah bagian upload storage di tugas ini. Cukup ganti bagian auth sesuai langkah 2.

5. Setelah selesai, jalankan:
   grep -rn "\"w-1\"\|\"usr-w-1\"\|user?.id ||" app/api/mitra
   Hasilnya HARUS KOSONG.

JANGAN: mengubah lib/data/mitra.ts. Jangan mengubah isi respons sukses.

CEK SELESAI:
- grep -rn "\"w-1\"\|\"usr-w-1\"" app/api/mitra   (KOSONG)
- grep -rln "requireWorker" app/api/mitra | wc -l   (harus 10)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

**CEK OLEH KAMU:** `curl -s http://localhost:3000/api/mitra/jobs` tanpa login harus mengembalikan 401.

---

## G-11 — Sumber role tunggal (bagian A): `lib/supabase/auth.ts`

⚠️ **Sebelum deploy G-11 sampai G-15, wajib jalankan LANGKAH MANUAL WAJIB di bawah.**

```text
TUGAS G-11: Hentikan pengambilan role dari user_metadata (bisa diubah sendiri oleh user) dan hentikan admin berdasarkan email hard-code di lib/supabase/auth.ts dan app/api/me/permissions/route.ts.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/supabase/auth.ts
- app/api/me/permissions/route.ts

ATURAN BARU (WAJIB DIIKUTI PERSIS):
- Role HANYA dari tabel profiles (kolom role, staff_status, staff_role_id).
- Profile SELALU dibaca dengan createAdminClient() (service role), BUKAN dengan client user, supaya hasilnya tidak tergantung RLS.
- Super admin = profiles.role === "admin". TIDAK ADA lagi pengecekan email.
- Kalau profile tidak ditemukan, user diperlakukan sebagai customer tanpa izin (fail closed).
- user.user_metadata TIDAK BOLEH dipakai untuk keputusan izin di file ini. Boleh untuk nama tampilan.

LANGKAH:
1. Di lib/supabase/auth.ts, fungsi getUserPermissions(user, profile):
   a. HAPUS blok `isCustomerExplicit` (yang membandingkan email dengan "hajaraswad210299@gmail.com") beserta return-nya.
   b. HAPUS array `configuredAdmins` dan ganti definisi isSuperAdmin menjadi:
        const isSuperAdmin = profile?.role === "admin";
   c. Ganti baris:
        const role = profile?.role || user.user_metadata?.role || user.user_metadata?.signup_as;
      menjadi:
        const role = profile?.role || "customer";
   d. Ganti baris:
        const status = profile?.staff_status || user.user_metadata?.staff_status || "invited";
        const roleId = profile?.staff_role_id || user.user_metadata?.staff_role_id;
      menjadi:
        const status = profile?.staff_status || "invited";
        const roleId = profile?.staff_role_id;
2. Di fungsi requireRole (sekitar baris 111-170):
   a. HAPUS blok isCustomerExplicit dan configuredAdmins/isConfiguredAdmin, serta semua cabang `if` yang memakai isConfiguredAdmin.
   b. Logika yang tersisa: kalau profile ada dan roles.includes(profile.role), return { user, profile }. Selain itu redirect ke deniedUrl seperti sebelumnya.
   c. Kalau ada kode yang membuat "profile sintetis" admin untuk email tertentu saat profile tidak ada, HAPUS.
3. Di SEMUA fungsi di file ini (getUserPermissions tidak perlu, tapi requireRole, requirePermission, requireApiPermission, requireApiSuperAdmin, getCurrentUser, getCurrentAdmin): setiap kode yang membaca tabel profiles seperti
        await supabase.from("profiles").select(...).eq("id", user.id).single()
   ganti `supabase` menjadi `createAdminClient()` dan `.single()` menjadi `.maybeSingle()`.
   Tambahkan import di atas file: import { createAdminClient } from "@/lib/supabase/admin";
   JANGAN ganti `supabase.auth.getUser()`. Auth tetap pakai client user.
4. Di app/api/me/permissions/route.ts: ganti pembacaan profile
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
   menjadi:
        const { data: profile } = await createAdminClient().from("profiles").select("*").eq("id", user.id).maybeSingle();
   dan tambahkan import createAdminClient. Bagian `name: profile?.full_name || user.user_metadata?.full_name || "Pengguna"` BOLEH tetap (hanya untuk tampilan).

CEK SELESAI:
- grep -n "hajaraswad\|jonathanhuang\|configuredAdmins\|user_metadata?.role\|user_metadata?.staff\|user_metadata?.signup_as" lib/supabase/auth.ts   (harus KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

## G-12 — Sumber role tunggal (bagian B): `middleware.ts`

```text
TUGAS G-12: Middleware tidak boleh lagi mempercayai user_metadata atau email hard-code untuk akses /admin. Semua pembacaan profiles/workers di middleware pakai service role.

PRASYARAT: G-11 selesai.

FILE YANG BOLEH DIUBAH/DIBUAT:
- middleware.ts

LANGKAH:
1. Tambahkan import di atas file:
   import { createAdminClient } from "@/lib/supabase/admin";

2. Tambahkan fungsi ini DI LUAR fungsi middleware (misalnya tepat sebelum `export async function middleware`):

type AdminAccess = "admin" | "staff_active" | "staff_invited" | "staff_disabled" | "none";

async function getAdminAccess(userId: string): Promise<AdminAccess> {
  const { data: profile, error } = await createAdminClient()
    .from("profiles")
    .select("role, staff_status")
    .eq("id", userId)
    .maybeSingle();
  if (error || !profile) return "none";
  if (profile.role === "admin") return "admin";
  if (profile.role === "staff") {
    if (profile.staff_status === "active") return "staff_active";
    if (profile.staff_status === "disabled") return "staff_disabled";
    return "staff_invited";
  }
  return "none";
}

3. Cari blok yang diawali komentar `// 1. ADMIN ROUTES` dan baris `if (pathname.startsWith("/admin")) {`. Blok ini berakhir tepat SEBELUM komentar `// 2. MITRA / WORKER ROUTES`. GANTI SELURUH blok `if (pathname.startsWith("/admin")) { ... }` dengan kode PERSIS ini:

  // 1. ADMIN ROUTES (akses ditentukan HANYA dari tabel profiles)
  if (pathname.startsWith("/admin")) {
    const noStore = (res: NextResponse) => {
      res.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0");
      res.headers.set("Pragma", "no-cache");
      res.headers.set("Expires", "0");
      return res;
    };
    const redirectTo = (path: string, withNext = false) => {
      const url = request.nextUrl.clone();
      url.pathname = path;
      url.search = "";
      if (withNext) url.searchParams.set("next", pathname);
      return noStore(NextResponse.redirect(url));
    };

    const isOpen = OPEN_ADMIN_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`)
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      if (isOpen) return noStore(response);
      return redirectTo("/admin/login", true);
    }

    const access = await getAdminAccess(user.id);

    if (pathname === "/admin/login") {
      if (access === "admin" || access === "staff_active") return redirectTo("/admin");
      if (access === "staff_invited") return redirectTo("/admin/accept-invite");
      if (access === "staff_disabled") return redirectTo("/admin/denied");
      return noStore(response);
    }

    if (isOpen) return noStore(response);

    if (access === "admin" || access === "staff_active") return noStore(response);
    if (access === "staff_invited") return redirectTo("/admin/accept-invite");
    return redirectTo("/admin/denied");
  }

4. Di bagian MITRA dan CUSTOMER (sisa file setelah blok admin): setiap
        await supabase
          .from("profiles")
   dan
        await supabase
          .from("workers")
   ganti `supabase` menjadi `createAdminClient()`. JANGAN ubah `supabase.auth.getUser()`. JANGAN ubah logika redirect di bagian mitra/customer.

5. JANGAN ubah `export const config = { matcher: [...] }`.

CEK SELESAI:
- grep -n "hajaraswad\|jonathanhuang\|configuredAdmins\|user_metadata" middleware.ts   (harus KOSONG)
- grep -n "supabase\s*\.from\|supabase\.from" middleware.ts   (harus KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

## G-13 — Sumber role tunggal (bagian C): callback, `/api/orders`, halaman login admin

```text
TUGAS G-13: Hapus keputusan akses berbasis email hard-code dan user_metadata di 3 file berikut.

PRASYARAT: G-11, G-12 selesai.

FILE YANG BOLEH DIUBAH/DIBUAT:
- app/auth/callback/route.ts
- app/api/orders/route.ts
- app/admin/login/page.tsx

BAGIAN 1. app/auth/callback/route.ts:
1. HAPUS blok (sekitar baris 79-97) yang diawali:
        const meta = user.user_metadata || {};
        const isStaff = meta.role === "staff" || meta.signup_as === "staff";
   sampai akhir if (isStaff) { ... } beserta return-nya.
2. HAPUS deklarasi `configuredAdmins` dan `isConfiguredAdmin` (sekitar baris 99-104).
3. Di blok pembuatan profile baru (`if (!existingProfile) { ... }`):
   - HAPUS variabel isStaffInvite.
   - Ganti penentuan targetRole menjadi:
        const targetRole = as === "worker" ? "worker" : "customer";
   - Di insert, ganti `role: targetRole === "staff" ? "customer" : targetRole,` menjadi `role: targetRole,`
   - Ganti `if (!isStaffInvite && targetRole !== "admin") {` menjadi `{` (subscription tetap dibuat), ATAU kalau lebih rapi, hapus kondisinya sehingga insert subscriptions selalu jalan untuk profile baru.
4. Di blok `else { profile = existingProfile; ... }`: HAPUS seluruh logika `isCustomerExplicit` (ubah role jadi customer) dan `else if (isConfiguredAdmin && ...)` (ubah role jadi admin). Sisakan HANYA sinkronisasi avatar (`if (!existingProfile.avatar_url && googleAvatar)`).
5. HAPUS:
        const userEmail = (user.email || "").toLowerCase();
        const isCustomerExplicit = userEmail === "hajaraswad210299@gmail.com";
   dan ganti kondisi:
        if (!isCustomerExplicit && (isConfiguredAdmin || profile?.role === "admin" || type === "email_change")) {
   menjadi:
        if (profile?.role === "admin" || type === "email_change") {
6. Ganti kondisi staff:
        if (
          profile?.role === "staff" ||
          user.user_metadata?.role === "staff" ||
          user.user_metadata?.signup_as === "staff"
        ) {
          const status = profile?.staff_status || user.user_metadata?.staff_status || "invited";
   menjadi:
        if (profile?.role === "staff") {
          const status = profile?.staff_status || "invited";
7. Di blok catch (`profileSyncErr`), fallback membaca profile dengan client user. BIARKAN.
8. Pemakaian user_metadata untuk googleAvatar/googleName BOLEH tetap (hanya tampilan).

BAGIAN 2. app/api/orders/route.ts (fungsi GET):
1. Ganti seluruh blok "// Check user role" (dari `let role = "customer";` sampai akhir `if (user) { ... }` yang menentukan role) dengan:

    // Tentukan apakah boleh melihat SEMUA pesanan (admin, atau staf aktif dengan izin orders.view)
    let canViewAll = false;
    if (user) {
      const { data: prof } = await adminSupabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      const perms = await getUserPermissions(user, prof);
      canViewAll =
        perms.isAdmin ||
        (perms.isStaff && perms.staffStatus === "active" && hasPermission(perms.permissions, "orders.view", false));
    }

2. Ganti kondisi:
        if (role !== "admin" && role !== "staff") {
   menjadi:
        if (!canViewAll) {
3. Cari semua pemakaian variabel `role` lain di fungsi GET (misalnya untuk menggabungkan MOCK_ORDERS). Ganti `role === "admin" || role === "staff"` atau pola serupa dengan `canViewAll`. Kalau pemakaiannya berbeda dari pola itu, BERHENTI dan laporkan.
4. Tambahkan import:
        import { getUserPermissions } from "@/lib/supabase/auth";
        import { hasPermission } from "@/lib/auth/permissions";

BAGIAN 3. app/admin/login/page.tsx (halaman client, hanya UX; keamanan sebenarnya ada di server):
1. Di useEffect checkSession, GANTI isi `if (user) { ... }` dengan:

        if (user) {
          const res = await fetch("/api/me/permissions", { cache: "no-store" });
          if (!res.ok) return;
          const perm = await res.json();
          if (perm.isAdmin || (perm.isStaff && perm.staffStatus === "active")) {
            const next = searchParams.get("next") || "/admin";
            window.location.replace(next);
          }
        }

2. Di fungsi submit login, cari bagian dari komentar `// Pastikan akun memiliki hak akses admin atau staf` sampai TEPAT SEBELUM baris `toast.success("Berhasil masuk ke dashboard admin!");`. GANTI bagian itu dengan:

      // Pastikan akun memiliki hak akses admin atau staf (diputuskan server dari tabel profiles)
      const permRes = await fetch("/api/me/permissions", { cache: "no-store" });
      const perm = permRes.ok ? await permRes.json() : null;

      if (!perm || (!perm.isAdmin && !perm.isStaff)) {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("Akses ditolak. Akun ini tidak terdaftar sebagai admin atau staf BuildMate.");
        toast.error("Akses ditolak. Bukan akun admin atau staf.");
        return;
      }

      if (perm.isStaff && perm.staffStatus === "disabled") {
        await supabase.auth.signOut();
        setIsLoading(false);
        setErrorMessage("Akun staf telah dinonaktifkan. Silakan hubungi Admin Utama.");
        toast.error("Akun staf dinonaktifkan.");
        return;
      }

      if (perm.isStaff && perm.staffStatus !== "active") {
        window.location.replace("/admin/accept-invite");
        return;
      }

JANGAN mengubah file lain. Email hard-code di app/admin/settings/page.tsx, lib/data/team.ts, lib/auth/email-check.ts, dan app/api/admin/customers/route.ts JANGAN disentuh (bukan keputusan izin).

CEK SELESAI:
- grep -n "hajaraswad\|jonathanhuang\|configuredAdmins" app/auth/callback/route.ts app/api/orders/route.ts app/admin/login/page.tsx   (harus KOSONG)
- grep -n "user_metadata?.role\|user_metadata?.staff_status\|meta.role\|meta.signup_as" app/auth/callback/route.ts app/api/orders/route.ts app/admin/login/page.tsx   (harus KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

## G-14 — Alur undangan staf: tulis status ke profiles, cek undangan saat menerima

```text
TUGAS G-14: Undangan staf harus menulis role/status ke tabel profiles (oleh server), dan accept-invite hanya boleh untuk user yang benar-benar diundang.

PRASYARAT: G-11 sampai G-13 selesai.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/data/team.ts
- app/api/admin/accept-invite/route.ts

KONTEKS:
- lib/data/team.ts fungsi invite (sekitar baris 170-240) memanggil auth.admin.inviteUserByEmail dengan user_metadata { signup_as: "staff", role: "staff", staff_role_id, staff_status: "invited" }, lalu meng-upsert profiles HANYA dengan { id, full_name }.
- Fungsi acceptStaffInvite (sekitar baris 540-600) mengubah user_metadata menjadi staff_status "active" untuk SIAPA PUN yang login, tanpa cek undangan, dan TIDAK mengubah profiles.staff_status.
- Setelah G-11, izin dibaca HANYA dari profiles. Jadi kalau profiles tidak diisi, staf undangan tidak bisa masuk.

LANGKAH:
1. Di fungsi invite (yang memanggil inviteUserByEmail, sekitar baris 215-224), GANTI blok:
        // Safely ensure profiles record has full_name without violating constraints
        try {
          await supabase.from("profiles").upsert({
            id: newUserId,
            full_name: cleanName,
          });
        } catch {
          // ignore
        }
   dengan:
        // Profil staf ditulis oleh server (service role). Ini satu-satunya sumber izin.
        const { error: profErr } = await supabase.from("profiles").upsert({
          id: newUserId,
          full_name: cleanName,
          role: "staff",
          staff_role_id: role.id,
          staff_status: "invited",
        });
        if (profErr) {
          console.error("Invite: gagal menulis profil staf:", profErr.message);
          return { success: false, error: "Gagal menyimpan profil staf. Undangan dibatalkan." };
        }
   CATATAN: periksa tipe return fungsi invite ini. Kalau bentuk return error-nya berbeda dari { success: false, error }, sesuaikan dengan bentuk yang dipakai fungsi tersebut, lalu laporkan.

2. Di fungsi yang mengirim ulang undangan (sekitar baris 405-420, memanggil inviteUserByEmail untuk target.email): setelah panggilan itu, TAMBAHKAN update profiles yang sama (role "staff", staff_role_id: target.role_id, staff_status "invited") untuk id target, dengan pengecekan error (cukup console.error, jangan gagalkan proses).

3. Di fungsi yang mengubah role staf (sekitar baris 285-295, ada staff_role_id: role.id): pastikan ada update ke profiles.staff_role_id. Kalau sudah ada, cek bahwa error-nya diperiksa (tambahkan `const { error } = ...; if (error) console.error(...)`). Jangan ubah logika lain.

4. Di acceptStaffInvite (sekitar baris 540-600):
   a. Di AWAL fungsi (sebelum blok "// 1. Try to fetch & update Auth user"), TAMBAHKAN:

        const supabaseCheck = createAdminClient();
        const { data: invitedProfile, error: invErr } = await supabaseCheck
          .from("profiles")
          .select("role, staff_status, staff_role_id")
          .eq("id", params.userId)
          .maybeSingle();
        if (invErr) {
          return { success: false, error: "Gagal memeriksa undangan." };
        }
        if (!invitedProfile || invitedProfile.role !== "staff" || invitedProfile.staff_status !== "invited") {
          return { success: false, error: "Undangan tidak ditemukan atau sudah dipakai." };
        }

      (Sesuaikan bentuk return dengan tipe return acceptStaffInvite yang ada. Kalau tidak cocok, laporkan.)
   b. Ganti `roleId = userRes.user.user_metadata?.staff_role_id;` menjadi `roleId = invitedProfile.staff_role_id ?? undefined;`
   c. GANTI blok "// 2. Safely update profiles table (only full_name ...)" dengan:

        const { error: updErr } = await supabase
          .from("profiles")
          .update({ full_name: params.fullName.trim(), staff_status: "active" })
          .eq("id", params.userId)
          .eq("role", "staff")
          .eq("staff_status", "invited");
        if (updErr) {
          return { success: false, error: "Gagal mengaktifkan akun staf." };
        }

      (Gunakan nama variabel client yang sudah ada di fungsi itu, biasanya `supabase`.)
   d. Penulisan user_metadata (staff_status "active", role "staff") di blok auth admin BOLEH tetap ada, tapi sekarang hanya kosmetik.

5. app/api/admin/accept-invite/route.ts: tidak perlu diubah, KECUALI kalau acceptStaffInvite sekarang bisa mengembalikan error "Undangan tidak ditemukan atau sudah dipakai.". Pastikan route membalas status 403 untuk kasus itu. Caranya: kalau `!result.success` dan `result.error` mengandung "Undangan tidak ditemukan", balas 403. Selain itu biarkan seperti sekarang.

JANGAN: menghapus inMemoryStaff atau mengubah logika audit.

CEK SELESAI:
- grep -n "staff_status: \"invited\"" lib/data/team.ts   (minimal 2 hasil, salah satunya di upsert profiles)
- grep -n "Undangan tidak ditemukan" lib/data/team.ts   (ada)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

## G-15 — File migrasi SQL: hentikan eskalasi role di database

⚠️ **MANUAL:** Gemini hanya **membuat file**. Kamu yang menjalankannya di Supabase SQL Editor, dan **hanya setelah** LANGKAH MANUAL WAJIB nomor 1 selesai.

```text
TUGAS G-15: Buat SATU file migrasi SQL baru. JANGAN menjalankannya. JANGAN mengubah file migrasi lama.

FILE YANG BOLEH DIUBAH/DIBUAT:
- supabase/migrations/20261018000000_harden_roles.sql (baru)

MASALAH:
- Trigger handle_new_user memberi role 'staff' dan staff_role_id dari raw_user_meta_data. Siapa pun bisa mengirim data ini saat signUp publik.
- Ada kemungkinan policy "user_update_own_profile" yang membolehkan user mengubah kolom role-nya sendiri menjadi 'admin'.
- Policy worker_manage_own_profile membolehkan mitra menyetujui dirinya sendiri (application_status='approved', is_verified=true).

Buat file dengan isi PERSIS:

-- 20261018000000_harden_roles.sql
-- Tujuan: role/status hanya bisa diubah oleh service role (server) atau admin.
-- ROLLBACK (jalankan manual jika perlu):
--   drop trigger if exists trg_protect_profile_privileged on public.profiles;
--   drop function if exists public.protect_profile_privileged();
--   drop trigger if exists trg_protect_worker_privileged on public.workers;
--   drop function if exists public.protect_worker_privileged();
--   (handle_new_user versi lama ada di 20261013000000_staff_and_permissions.sql)

-- 1. Trigger signup: hanya 'worker' atau 'customer'. Staf dibuat oleh server saat undangan.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Pengguna Baru'),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'avatar_url',
    case when new.raw_user_meta_data->>'signup_as' = 'worker' then 'worker' else 'customer' end
  )
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end; $$;

-- 2. Lindungi kolom sensitif profiles. SECURITY INVOKER (default) supaya current_user = role pemanggil.
create or replace function public.protect_profile_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.my_role() = 'admin' then
    return new;
  end if;
  if new.role is distinct from old.role
     or new.staff_role_id is distinct from old.staff_role_id
     or new.staff_status is distinct from old.staff_status then
    raise exception 'Tidak diizinkan mengubah role, staff_role_id, atau staff_status' using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_profile_privileged on public.profiles;
create trigger trg_protect_profile_privileged
  before update on public.profiles
  for each row execute function public.protect_profile_privileged();

-- 3. Lindungi kolom persetujuan mitra.
create or replace function public.protect_worker_privileged()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.my_role() = 'admin' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.application_status := 'draft';
    new.is_verified := false;
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
    return new;
  end if;
  if new.application_status is distinct from old.application_status
     or new.is_verified is distinct from old.is_verified
     or new.is_active is distinct from old.is_active
     or new.reviewed_by is distinct from old.reviewed_by
     or new.reviewed_at is distinct from old.reviewed_at
     or new.rejection_reason is distinct from old.rejection_reason then
    raise exception 'Tidak diizinkan mengubah status persetujuan mitra' using errcode = '42501';
  end if;
  return new;
end; $$;

drop trigger if exists trg_protect_worker_privileged on public.workers;
create trigger trg_protect_worker_privileged
  before insert or update on public.workers
  for each row execute function public.protect_worker_privileged();

-- 4. Default status mitra baru = draft (baris lama TIDAK diubah).
alter table public.workers alter column application_status set default 'draft';

JANGAN: menjalankan file ini. Jangan menambah DELETE/UPDATE data. Jangan mengubah migrasi lama atau SETUP_FULL_DATABASE.sql.

CEK SELESAI:
- ls supabase/migrations   (file baru ada)
- grep -n "delete from\|truncate\|drop table" supabase/migrations/20261018000000_harden_roles.sql   (harus KOSONG)
```

---

## G-16 — Hapus endpoint "verifikasi email tanpa bukti"

```text
TUGAS G-16: Hapus /api/auth/verify-email. Endpoint ini mengonfirmasi email SIAPA PUN tanpa login dan tanpa bukti kepemilikan email (celah ambil alih akun). Hapus juga tombol yang memanggilnya.

FILE YANG BOLEH DIUBAH/DIBUAT:
- HAPUS: app/api/auth/verify-email/route.ts
- app/(auth)/login/page.tsx
- app/(auth)/verify-email/page.tsx
- app/mitra/(auth)/login/page.tsx
- app/mitra/(auth)/verify-email/page.tsx

LANGKAH:
1. git rm "app/api/auth/verify-email/route.ts"
2. app/(auth)/login/page.tsx dan app/mitra/(auth)/login/page.tsx:
   - Hapus fungsi handleVerifyAndLogin seluruhnya.
   - Cari tombol/elemen JSX yang memanggil handleVerifyAndLogin. Hapus elemen tombol itu SAJA. Tombol "kirim ulang verifikasi" (handleResendVerification) TETAP ADA.
   - Kalau ada state yang jadi tidak terpakai, biarkan (jangan refactor).
3. app/(auth)/verify-email/page.tsx dan app/mitra/(auth)/verify-email/page.tsx:
   - Di handler onClick yang berisi `await fetch("/api/auth/verify-email", ...)`, HAPUS blok if beserta fetch itu (blok `if (email && email !== "emailmu") { await fetch(...) }`). Sisa logika handler (cek user, redirect) TETAP.
4. Jalankan: grep -rn "api/auth/verify-email" app components lib
   Hasilnya HARUS KOSONG.

JANGAN: mengubah app/api/auth/register/route.ts (keputusan wajib verifikasi email saat daftar akan ditentukan pemilik produk).

CEK SELESAI:
- grep -rn "api/auth/verify-email" app components lib   (KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

# FASE 3 — PENGERASAN WEB DAN PERBAIKAN FRONTEND

## G-17 — Validasi redirect `next` (open redirect)

```text
TUGAS G-17: Buat helper safeNext dan pakai di semua tempat yang me-redirect berdasarkan parameter `next`.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/auth/safe-redirect.ts (baru)
- tests/safe-redirect.test.ts (baru)
- app/auth/callback/route.ts (hanya baris safeNext dan baseOrigin)
- app/admin/login/page.tsx
- app/(auth)/login/page.tsx
- app/(auth)/verify-email/page.tsx
- app/(customer)/welcome/page.tsx
- middleware.ts (hanya bagian /login,/register yang menghitung safeNext)

LANGKAH:
1. Buat lib/auth/safe-redirect.ts PERSIS:

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

2. Buat tests/safe-redirect.test.ts PERSIS:

import { describe, it, expect } from "vitest";
import { safeNext } from "@/lib/auth/safe-redirect";

describe("safeNext", () => {
  it("allows internal paths", () => {
    expect(safeNext("/orders")).toBe("/orders");
    expect(safeNext("/admin?tab=1")).toBe("/admin?tab=1");
  });
  it("blocks external and tricky values", () => {
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("javascript:alert(1)")).toBe("/");
    expect(safeNext("/ok\nx")).toBe("/");
    expect(safeNext(null, "/admin")).toBe("/admin");
  });
});

3. app/auth/callback/route.ts:
   - Ganti:  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";
     menjadi: const safeNextPath = safeNext(next, "/");
     lalu ganti SEMUA pemakaian variabel `safeNext` di file itu menjadi `safeNextPath` (karena nama safeNext sekarang dipakai fungsi). Import: import { safeNext } from "@/lib/auth/safe-redirect";
   - Ganti perhitungan baseOrigin:
        const forwardedHost = request.headers.get("x-forwarded-host");
        const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
        const baseOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : url.origin;
     menjadi:
        const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL
          ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin
          : url.origin;
4. Halaman client: setiap `searchParams.get("next")` yang dipakai untuk router.push, window.location.href, atau window.location.replace, bungkus dengan safeNext(...). Contoh:
        window.location.replace(searchParams.get("next") || "/admin");
   menjadi:
        window.location.replace(safeNext(searchParams.get("next"), "/admin"));
   Lakukan di: app/admin/login/page.tsx, app/(auth)/login/page.tsx, app/(auth)/verify-email/page.tsx, app/(customer)/welcome/page.tsx. Tambahkan import safeNext di masing-masing file.
5. middleware.ts bagian `// 3. CUSTOMER AUTH PAGES`: ganti perhitungan safeNext manual menjadi:
        const candidate = safeNext(request.nextUrl.searchParams.get("next"), "/");
        const safeNextValue =
          candidate.startsWith("/admin") || candidate.startsWith("/mitra") ? "/" : candidate;
   lalu pakai safeNextValue di bawahnya (ganti nama variabel lama). Import safeNext di middleware.

CEK SELESAI:
- npm test (lulus, termasuk safe-redirect)
- npx tsc --noEmit (0 error)
- grep -rn "searchParams.get(\"next\")" app middleware.ts   (laporkan semua hasil. Setiap hasil harus dibungkus safeNext atau hanya diteruskan ke safeNext di baris berikutnya.)
```

---

## G-18 — URL Snap Midtrans sesuai environment, dan tanggal WIB

```text
TUGAS G-18: (a) Script Snap tidak boleh hard-code ke sandbox. (b) Tanggal jadwal harus memakai zona WIB dan divalidasi di server.

FILE YANG BOLEH DIUBAH/DIBUAT:
- lib/payments/snap-url.ts (baru)
- lib/date/wib.ts (baru)
- tests/wib.test.ts (baru)
- app/order/[packageId]/page.tsx
- app/payment/[orderId]/page.tsx
- app/plus/page.tsx
- app/api/orders/route.ts (hanya validasi scheduled_date di POST)
- .env.example (tambah 1 nama variabel)

LANGKAH:
1. lib/payments/snap-url.ts PERSIS:

export function getSnapScriptUrl(): string {
  return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

2. Di 3 halaman (order, payment, plus), ganti:
        src="https://app.sandbox.midtrans.com/snap/snap.js"
   menjadi:
        src={getSnapScriptUrl()}
   dan tambahkan import getSnapScriptUrl.
3. Di .env.example, tambahkan baris (tanpa nilai rahasia):
        NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=false
4. lib/date/wib.ts PERSIS:

export function toWibDateString(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Tanggal jadwal valid: format YYYY-MM-DD, minimal besok (WIB), maksimal 14 hari ke depan (WIB). */
export function isValidScheduledDate(value: unknown, now: Date = new Date()): boolean {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const today = toWibDateString(now);
  const max = toWibDateString(new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000));
  return value > today && value <= max;
}

5. tests/wib.test.ts PERSIS:

import { describe, it, expect } from "vitest";
import { toWibDateString, isValidScheduledDate } from "@/lib/date/wib";

describe("WIB dates", () => {
  it("uses Jakarta date, not UTC", () => {
    // 2026-10-17 01:00 WIB = 2026-10-16 18:00 UTC
    expect(toWibDateString(new Date("2026-10-16T18:00:00Z"))).toBe("2026-10-17");
  });
  it("validates scheduled date window", () => {
    const now = new Date("2026-10-16T18:00:00Z"); // 17 Okt 01:00 WIB
    expect(isValidScheduledDate("2026-10-17", now)).toBe(false); // hari ini
    expect(isValidScheduledDate("2026-10-18", now)).toBe(true);  // besok
    expect(isValidScheduledDate("2026-10-31", now)).toBe(true);  // +14 hari
    expect(isValidScheduledDate("2026-11-01", now)).toBe(false); // +15 hari
    expect(isValidScheduledDate("18-10-2026", now)).toBe(false);
  });
});

6. app/order/[packageId]/page.tsx, di dateOptions (sekitar baris 69-75): ganti
        const iso = d.toISOString().split("T")[0];
   menjadi
        const iso = toWibDateString(d);
   dan import toWibDateString. Jangan ubah dayName/dayDate.
7. app/api/orders/route.ts, di POST, TEPAT SETELAH pengecekan `if (!package_id || !address || !scheduled_date || !time_slot) { ... }`, tambahkan:
        if (!isValidScheduledDate(scheduled_date)) {
          return NextResponse.json(
            { error: "Tanggal jadwal tidak valid. Pilih tanggal mulai besok hingga 14 hari ke depan." },
            { status: 400 }
          );
        }
   dan import isValidScheduledDate.

CEK SELESAI:
- grep -rn "app.sandbox.midtrans.com/snap/snap.js" app   (KOSONG)
- npm test (lulus)
- npx tsc --noEmit (0 error)
```

**Untuk kamu:** di Vercel, set `NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION` dengan nilai yang sama seperti `MIDTRANS_IS_PRODUCTION`.

---

## G-19 — FAQ admin wajib izin, ID role/FAQ pakai UUID

```text
TUGAS G-19: (a) GET /api/admin/faq wajib izin content.manage. (b) Role dan FAQ baru memakai UUID asli, karena kolom id bertipe uuid dan ID "role-..." / "faq-..." gagal disimpan.

FILE YANG BOLEH DIUBAH/DIBUAT:
- app/api/admin/faq/route.ts (hanya fungsi GET)
- lib/data/roles.ts (hanya baris pembuatan id)
- lib/data/content.ts (hanya baris pembuatan id FAQ)

LANGKAH:
1. app/api/admin/faq/route.ts, fungsi GET: ubah menjadi
        export async function GET() {
          const auth = await requireApiPermission("content.manage");
          if (!auth.authorized) return auth.response;
          try {
            ... (isi lama tetap)
   (requireApiPermission sudah di-import di file itu.)
2. lib/data/roles.ts sekitar baris 97: ganti
        const id = `role-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
   menjadi
        const id = crypto.randomUUID();
   Kalau `crypto` belum tersedia, tambahkan: import { randomUUID } from "crypto"; lalu pakai randomUUID(). Cek dulu apakah file ini juga dipakai di komponen client ("use client"). Kalau ya, pakai globalThis.crypto.randomUUID() dan jangan import "crypto".
3. lib/data/content.ts sekitar baris 130: ganti pembuatan id `faq-...` dengan cara yang sama seperti langkah 2.

CEK SELESAI:
- grep -n "role-\${Date.now()}\|faq-\${" lib/data/roles.ts lib/data/content.ts   (KOSONG)
- npx tsc --noEmit (0 error)
- npm test (lulus)
```

---

# LANGKAH MANUAL WAJIB (dikerjakan kamu sendiri, BUKAN Gemini)

Kerjakan langkah 1–3 **sebelum** deploy hasil G-11 sampai G-15. Jalankan di **Supabase Dashboard → SQL Editor**.

**1. Cek kondisi database (read-only, aman):**

```sql
-- Policy pada profiles
select polname, polcmd, pg_get_expr(polqual, polrelid) as using_expr, pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy where polrelid = 'public.profiles'::regclass;

-- Pastikan kolom staff ada (G-15 butuh ini)
select column_name from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name in ('staff_role_id','staff_status');

-- Siapa saja admin/staf sekarang
select p.id, u.email, p.role, p.staff_status, p.staff_role_id
from public.profiles p join auth.users u on u.id = p.id
where p.role in ('admin','staff') or u.raw_user_meta_data->>'role' = 'staff';
```

- Kalau query kedua **tidak** mengembalikan 2 baris, berarti migrasi staff belum terpasang. **Jangan jalankan G-15** dan kabari saya.
- Kirim hasil query ketiga ke saya kalau ada akun yang tidak kamu kenal.

**2. Pastikan Admin Utama punya `role = 'admin'` di tabel profiles.** Setelah G-11, admin **tidak lagi** ditentukan oleh email. Ganti `EMAIL_ADMIN_UTAMA` dengan email admin kamu:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where lower(email) = lower('EMAIL_ADMIN_UTAMA'));
```

Kalau ada akun yang memang harus customer saja (misalnya akun yang sebelumnya di-hard-code sebagai customer), pastikan role-nya `customer`:

```sql
update public.profiles set role = 'customer', staff_role_id = null, staff_status = null
where id = (select id from auth.users where lower(email) = lower('EMAIL_CUSTOMER_ITU'));
```

**3. Pindahkan status staf yang sah dari metadata ke profiles.** Ini hanya untuk staf yang **memang** kamu undang. Periksa dulu hasil SELECT:

```sql
select p.id, u.email, u.raw_user_meta_data->>'staff_status' as meta_status, u.raw_user_meta_data->>'staff_role_id' as meta_role_id
from public.profiles p join auth.users u on u.id = p.id
where u.raw_user_meta_data->>'role' = 'staff' or u.raw_user_meta_data->>'signup_as' = 'staff';
```

Untuk setiap baris yang **benar** staf kamu, jalankan (ganti ID-nya):

```sql
update public.profiles
set role = 'staff',
    staff_status = '<active|invited|disabled sesuai meta_status>',
    staff_role_id = '<meta_role_id>'
where id = '<id>';
```

**4. Jalankan isi file `supabase/migrations/20261018000000_harden_roles.sql`** di SQL Editor (setelah G-15 selesai dan langkah 1–3 beres).

**5. Uji setelah deploy:**
- Login admin utama → masuk `/admin`.
- Login sebagai customer biasa → buka `/admin` → harus diarahkan ke `/admin/denied`.
- Tes eskalasi role: coba ubah `role` menjadi `admin` **memakai token login customer** (lewat REST API Supabase, bukan SQL Editor; SQL Editor memakai superuser sehingga selalu lolos). Hasil yang benar: error `Tidak diizinkan mengubah role...`. Minta saya membantu kalau belum tahu caranya.
- Login staf yang sah → masuk `/admin` sesuai izinnya.
- Undang staf baru → buka link undangan → isi nama → masuk `/admin`.

---

# FASE 4 — PERBAIKAN BESAR (JANGAN diberikan ke Gemini dalam bentuk satu prompt)

Item di bawah adalah refactor arsitektur: data mock/in-memory dipindah ke database dan transaksi atomik. Kalau dikerjakan model yang lemah dalam satu langkah, hampir pasti merusak alur pesanan. Kerjakan **setelah** Fase 1–3 lolos, dan minta saya memecahnya menjadi tugas kecil bergaya G-xx seperti di atas:

| Kode di audit | Isi |
|---|---|
| FP-07 | Satukan skema (migrasi sebagai satu-satunya sumber), lengkapi RLS, bucket storage di migrasi |
| FP-08 | Pembuatan pesanan dan transisi status lewat fungsi Postgres atomik; hapus fallback customer/paket palsu |
| FP-09 | Dispatch, alur kerja mitra, dan payout benar-benar tersimpan di DB |
| FP-10 | Aksi admin di halaman detail pesanan dipindah ke API server; hapus data mock dari produksi |
| FP-11 | Hapus pelanggan diganti anonimisasi (riwayat keuangan tidak hilang), validasi zod, audit log |

Detail lengkapnya ada di `docs/audit/AUDIT_REPORT_2026-10-17.md`, Section 9.
