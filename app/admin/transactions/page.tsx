"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/shared/StatCard";
import { getPayments, PaymentFilter } from "@/lib/data/transactions";
import { Payment } from "@/lib/data/types";
import { formatRupiah } from "@/lib/format";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  SearchNormal1,
  Copy,
  TickCircle,
  CloseCircle,
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

      {/* DRAWER WEBHOOK JSON PAYLOAD */}
      {selectedPayment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="w-full max-w-lg bg-white h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <span className="text-[11px] font-mono text-neutral-400">
                    {selectedPayment.provider_order_id}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                    Rincian Webhook Midtrans
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="text-neutral-400 hover:text-neutral-600"
                >
                  <CloseCircle size={20} />
                </button>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-neutral-400 block">Nominal Gross:</span>
                  <span className="font-bold text-neutral-900 text-sm mt-0.5 block">
                    {formatRupiah(selectedPayment.amount)}
                  </span>
                </div>
                <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                  <span className="text-neutral-400 block">Metode Pembayaran:</span>
                  <span className="font-bold text-neutral-900 uppercase text-sm mt-0.5 block">
                    {selectedPayment.payment_type}
                  </span>
                </div>
              </div>

              {selectedPayment.order_code && (
                <div className="p-3 rounded-xl bg-lavender-50 border border-lavender-200 text-xs flex items-center justify-between">
                  <span className="text-lavender-800 font-medium">Pesanan Terkait:</span>
                  <Link
                    href={`/admin/orders/${selectedPayment.ref_id}`}
                    className="font-mono font-bold text-lavender-700 hover:underline"
                  >
                    {selectedPayment.order_code} →
                  </Link>
                </div>
              )}

              {/* Raw JSON Payload Viewer */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-neutral-700">
                    Raw Notification Payload (JSON)
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyJson(selectedPayment.raw_payload)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-lavender-600 hover:text-lavender-800"
                  >
                    {isCopiedJson ? <TickCircle size={13} /> : <Copy size={13} />}
                    <span>{isCopiedJson ? "Tersalin" : "Salin JSON"}</span>
                  </button>
                </div>

                <div className="bg-neutral-900 text-neutral-100 p-3.5 rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-neutral-800 shadow-inner">
                  <pre>
                    {JSON.stringify(selectedPayment.raw_payload || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={() => setSelectedPayment(null)}
                className="w-full"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
