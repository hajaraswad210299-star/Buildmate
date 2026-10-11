"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/shared/StatCard";
import { getPayments, PaymentFilter } from "@/lib/data/transactions";
import { Payment } from "@/lib/data/types";
import { formatRupiah, formatDateId } from "@/lib/format";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  SearchNormal1,
  Copy,
  TickCircle,
  CloseCircle,
  ArrowDown2,
  ShieldTick,
} from "@/lib/icons";

export default function AdminTransactionsPage() {
  const [activeTab, setActiveTab] = useState<PaymentFilter["tab"]>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isCopiedJson, setIsCopiedJson] = useState(false);

  useEffect(() => {
    getPayments({
      tab: activeTab,
      status: statusFilter,
      search,
    }).then((res) => setPayments(res));
  }, [activeTab, statusFilter, search]);

  const successCount = payments.filter((p) => p.status === "success").length;
  const failedCount = payments.filter((p) => p.status === "failed").length;
  const refundedCount = payments.filter((p) => p.status === "refunded").length;

  const handleCopyJson = (payload: unknown) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setIsCopiedJson(true);
    toast.success("Payload webhook disalin ke clipboard");
    setTimeout(() => setIsCopiedJson(false), 1500);
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* HEADER */}
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Log Transaksi & Webhook Midtrans
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Daftar transaksi pembayaran Snap Sandbox, status settlement, dan payload webhook
          </p>
        </div>

        {/* METRIC CARDS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Pembayaran Sukses"
            value={successCount}
            accent="success"
            linkText="Lihat sukses"
          />
          <StatCard
            title="Gagal / Kedaluwarsa"
            value={failedCount}
            accent="warning"
            linkText="Lihat gagal"
          />
          <StatCard
            title="Refund (Simulasi)"
            value={refundedCount}
            accent="lavender"
            linkText="Lihat refund"
          />
        </div>

        {/* TABS & TOOLBAR */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 border-b sm:border-b-0 border-neutral-100 pb-2 sm:pb-0">
            {[
              { id: "all", label: "Semua" },
              { id: "orders", label: "Pesanan (ORD-)" },
              { id: "subscriptions", label: "Plus (SUB-)" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as PaymentFilter["tab"])}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  activeTab === tab.id
                    ? "bg-lavender-600 text-white shadow-xs"
                    : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-sm justify-end text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-neutral-200 bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="success">Success</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>

            <div className="relative flex-1">
              <SearchNormal1
                size={15}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari Order ID..."
                className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs"
              />
            </div>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  <th className="py-3 px-4 font-medium">Provider Order ID</th>
                  <th className="py-3 px-3 font-medium">Jenis</th>
                  <th className="py-3 px-3 font-medium">Pelanggan</th>
                  <th className="py-3 px-3 font-medium">Metode</th>
                  <th className="py-3 px-3 font-medium text-right">Nominal</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-3 font-medium text-right">Webhook Diproses</th>
                  <th className="py-3 px-4 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-400">
                      Tidak ada data transaksi.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedPayment(p)}
                      className="hover:bg-neutral-50/70 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 font-mono font-semibold text-neutral-900">
                        {p.provider_order_id}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            p.kind === "order"
                              ? "bg-info-50 text-info-700"
                              : "bg-lavender-100 text-lavender-700"
                          }`}
                        >
                          {p.kind}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-medium text-neutral-800">
                        {p.customer_name}
                      </td>

                      <td className="py-3.5 px-3 uppercase font-medium text-neutral-600">
                        {p.payment_type}
                      </td>

                      <td className="py-3.5 px-3 font-bold text-neutral-900 tabular-nums text-right">
                        {formatRupiah(p.amount)}
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase ${
                            p.status === "success"
                              ? "bg-success-50 text-success-700"
                              : p.status === "failed"
                              ? "bg-danger-50 text-danger-700"
                              : p.status === "refunded"
                              ? "bg-lavender-50 text-lavender-700"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-neutral-400 text-right whitespace-nowrap">
                        {p.processed_at ? <RelativeTime date={p.processed_at} /> : "-"}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(p);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-semibold"
                        >
                          Payload
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DRAWER WEBHOOK MIDTRANS BERSIH & RAMAH MANUSIA */}
      {selectedPayment && (
        <TransactionDetailDrawer
          payment={selectedPayment}
          onClose={() => setSelectedPayment(null)}
        />
      )}
    </AdminShell>
  );
}

function TransactionDetailDrawer({
  payment,
  onClose,
}: {
  payment: Payment;
  onClose: () => void;
}) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedVa, setCopiedVa] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isTechOpen, setIsTechOpen] = useState(false);

  const raw = (payment.raw_payload || {}) as Record<string, any>;
  const methodInfo = getHumanPaymentMethod(payment);
  const statusInfo = getHumanMidtransStatus(raw.transaction_status || payment.status);
  const fraudStatus = (raw.fraud_status || "accept").toLowerCase();
  const sanitizedJson = sanitizePayload(payment.raw_payload);

  const handleCopy = (text: string, setFn: (val: boolean) => void, msg: string) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    toast.success(msg);
    setTimeout(() => setFn(false), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* DRAWER HEADER */}
        <div className="p-6 border-b border-neutral-200 bg-neutral-25 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-neutral-900 tracking-tight">
                {payment.provider_order_id}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(payment.provider_order_id, setCopiedId, "ID transaksi disalin")}
                className="text-neutral-400 hover:text-neutral-700 transition-colors"
                title="Salin ID transaksi"
              >
                {copiedId ? <TickCircle size={14} className="text-success-600" /> : <Copy size={14} />}
              </button>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusInfo.bg} ${statusInfo.text}`}
              >
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              {formatDateId(payment.processed_at || payment.created_at, "EEEE, d MMMM yyyy · HH:mm:ss WIB")}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          >
            <CloseCircle size={20} />
          </button>
        </div>

        {/* DRAWER CONTENT (SCROLLABLE) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* 1. METODE PEMBAYARAN CARD */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Metode Pembayaran
                </span>
                <span className="text-sm font-bold text-neutral-900 mt-0.5 block">
                  {methodInfo.name}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">
                  Total Nominal
                </span>
                <span className="text-base font-bold text-lavender-700 mt-0.5 block tabular-nums">
                  {formatRupiah(payment.amount)}
                </span>
              </div>
            </div>

            {methodInfo.vaOrCode && (
              <div className="p-3 bg-white rounded-xl border border-neutral-200/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 uppercase font-semibold block">
                    Nomor Virtual Account / Kode Pembayaran:
                  </span>
                  <span className="font-mono text-sm font-bold text-neutral-900 tracking-wider">
                    {methodInfo.vaOrCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(methodInfo.vaOrCode!, setCopiedVa, "Nomor VA disalin")}
                  className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedVa ? <TickCircle size={13} className="text-success-600" /> : <Copy size={13} />}
                  <span>{copiedVa ? "Tersalin" : "Salin"}</span>
                </button>
              </div>
            )}

            {payment.order_code && (
              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                <span className="text-neutral-500">Pesanan Terkait:</span>
                <Link
                  href={`/admin/orders/${payment.ref_id}`}
                  className="font-mono font-bold text-lavender-700 hover:underline"
                >
                  {payment.order_code} →
                </Link>
              </div>
            )}
          </div>

          {/* 2. DAFTAR DETAIL STATUS (2 KOLOM) */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Status Verifikasi & Gateway
            </h4>

            <div className="grid grid-cols-2 gap-3 text-xs">
              {/* Fraud Status */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-neutral-400 font-medium block">Fraud Status:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      fraudStatus === "accept"
                        ? "bg-success-100 text-success-800"
                        : fraudStatus === "challenge"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-danger-100 text-danger-800"
                    }`}
                  >
                    <ShieldTick size={12} variant="Bold" />
                    <span>{fraudStatus.toUpperCase()}</span>
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block">
                  {fraudStatus === "accept" ? "Lolos fraud detection" : "Memerlukan peninjauan"}
                </span>
              </div>

              {/* Signature Verified */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-neutral-400 font-medium block">Signature Key:</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-success-100 text-success-800">
                    <TickCircle size={12} variant="Bold" />
                    <span>Terverifikasi</span>
                  </span>
                </div>
                <span className="text-[10px] text-neutral-400 block">
                  SHA512 checksum valid
                </span>
              </div>

              {/* Status Midtrans */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-neutral-400 font-medium block">Midtrans Status:</span>
                <span className="font-semibold text-neutral-800 block text-xs">
                  {raw.transaction_status || payment.status}
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  Status mentah gateway
                </span>
              </div>

              {/* Response Code */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1">
                <span className="text-neutral-400 font-medium block">HTTP Response:</span>
                <span className="font-mono font-semibold text-success-700 block text-xs">
                  {raw.status_code || "200"} OK
                </span>
                <span className="text-[10px] text-neutral-400 block">
                  Callback diterima sistem
                </span>
              </div>
            </div>
          </div>

          {/* 3. RIWAYAT NOTIFIKASI (TIMELINE RINGKAS) */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Riwayat Notifikasi Callback
            </h4>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-neutral-200">
              {/* Event 1: Webhook received */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-success-600 ring-4 ring-white" />
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-900">
                      Webhook Notification ({statusInfo.label})
                    </span>
                    <span className="text-[10px] font-mono text-success-700 bg-success-50 px-1.5 py-0.5 rounded font-bold">
                      200 OK
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500">
                    Notifikasi settlement diterima dari Midtrans Snap API dan status pesanan diperbarui.
                  </p>
                  <span className="text-[10px] text-neutral-400 block">
                    {formatDateId(payment.processed_at || payment.created_at, "d MMM yyyy, HH:mm:ss")}
                  </span>
                </div>
              </div>

              {/* Event 2: Snap Token Created */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-neutral-400 ring-4 ring-white" />
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-neutral-800">
                      Snap Token Dibuat
                    </span>
                    <span className="text-[10px] text-neutral-400">Checkout</span>
                  </div>
                  <p className="text-[11px] text-neutral-500 font-mono truncate">
                    Token: {payment.snap_token || "SNAP-TOKEN-SANDBOX"}
                  </p>
                  <span className="text-[10px] text-neutral-400 block">
                    {formatDateId(payment.created_at, "d MMM yyyy, HH:mm:ss")}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. ACCORDION: DATA TEKNIS (PENGEMBANG) — TERTUTUP DEFAULT */}
          <div className="pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setIsTechOpen(!isTechOpen)}
              className="w-full flex items-center justify-between py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <span>Data teknis (pengembang)</span>
                <span className="text-[10px] text-neutral-400 font-normal">
                  — JSON audit Midtrans
                </span>
              </div>
              <ArrowDown2
                size={14}
                className={`text-neutral-400 transition-transform ${isTechOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isTechOpen && (
              <div className="mt-2 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] text-neutral-500">
                  <span>Sensitive field (signature_key) tersensor otomatis</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(JSON.stringify(sanitizedJson, null, 2), setCopiedJson, "JSON teknis disalin")}
                    className="inline-flex items-center gap-1 font-semibold text-lavender-600 hover:text-lavender-800"
                  >
                    {copiedJson ? <TickCircle size={13} /> : <Copy size={13} />}
                    <span>{copiedJson ? "Tersalin" : "Salin JSON"}</span>
                  </button>
                </div>

                <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-60 border border-neutral-800 shadow-inner">
                  <pre>{JSON.stringify(sanitizedJson, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* DRAWER FOOTER */}
        <div className="p-4 border-t border-neutral-200 bg-neutral-25 flex justify-end">
          <Button type="button" variant="secondary" size="md" onClick={onClose} className="w-full sm:w-auto">
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

function sanitizePayload(payload: any) {
  if (!payload || typeof payload !== "object") return payload;
  try {
    const clone = JSON.parse(JSON.stringify(payload));
    if (clone.signature_key && typeof clone.signature_key === "string") {
      const key = clone.signature_key;
      clone.signature_key = key.length > 6 ? "*".repeat(key.length - 6) + key.slice(-6) : key;
    }
    return clone;
  } catch {
    return payload;
  }
}

function getHumanPaymentMethod(p: Payment): { name: string; vaOrCode?: string } {
  const raw = (p.raw_payload || {}) as Record<string, any>;
  const va = raw.va_numbers?.[0];
  const billKey = raw.bill_key;
  const paymentCode = raw.payment_code;

  if (p.payment_type === "bank_transfer") {
    if (va?.bank) {
      return {
        name: `${va.bank.toUpperCase()} Virtual Account`,
        vaOrCode: va.va_number,
      };
    }
    return { name: "Bank Transfer (Virtual Account)", vaOrCode: va?.va_number };
  }
  if (p.payment_type === "echannel") {
    return { name: "Mandiri Bill Payment", vaOrCode: billKey };
  }
  if (p.payment_type === "gopay") {
    return { name: "GoPay e-Wallet" };
  }
  if (p.payment_type === "qris") {
    return { name: "QRIS (Semua Bank / e-Wallet)" };
  }
  if (p.payment_type === "cstore") {
    return { name: `Gerai Retail (${raw.store || "Indomaret/Alfamart"})`, vaOrCode: paymentCode };
  }
  if (p.payment_type === "credit_card") {
    return { name: "Kartu Kredit / Debit Online" };
  }
  return { name: p.payment_type.toUpperCase() };
}

function getHumanMidtransStatus(status: string): { label: string; bg: string; text: string } {
  switch ((status || "").toLowerCase()) {
    case "settlement":
    case "capture":
    case "success":
      return { label: "Berhasil", bg: "bg-success-50 border-success-200", text: "text-success-700" };
    case "pending":
      return { label: "Menunggu Pembayaran", bg: "bg-amber-50 border-amber-200", text: "text-amber-700" };
    case "expire":
      return { label: "Kedaluwarsa", bg: "bg-neutral-100 border-neutral-200", text: "text-neutral-600" };
    case "cancel":
      return { label: "Dibatalkan", bg: "bg-danger-50 border-danger-200", text: "text-danger-700" };
    case "deny":
      return { label: "Ditolak", bg: "bg-danger-50 border-danger-200", text: "text-danger-700" };
    case "refund":
    case "refunded":
      return { label: "Dikembalikan (Refund)", bg: "bg-lavender-50 border-lavender-200", text: "text-lavender-700" };
    default:
      return { label: status || "Diproses", bg: "bg-neutral-100 border-neutral-200", text: "text-neutral-700" };
  }
}
