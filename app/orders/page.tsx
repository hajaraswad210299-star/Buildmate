"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  ReceiptText,
  Calendar1,
  Location,
  Clock,
  ArrowRight,
  ShieldTick,
  Refresh,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getOrders } from "@/lib/data/orders";
import { Order } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";

export default function CustomerOrdersPage() {
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const all = await getOrders();
      setOrders(all);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  // Split Active vs History
  const activeOrders = orders.filter(
    (o) =>
      o.status !== "completed" && o.status !== "cancelled"
  );
  const historyOrders = orders.filter(
    (o) => o.status === "completed" || o.status === "cancelled"
  );

  const displayedOrders = activeTab === "active" ? activeOrders : historyOrders;

  return (
    <CustomerShell title="Pesanan Saya">
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Pesanan Saya
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Pantau progres kedatangan tukang dan konfirmasi hasil pekerjaan.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-xs transition-colors"
          >
            <Refresh size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Segarkan</span>
          </button>
        </div>

        {/* Tab Aktif vs Riwayat */}
        <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "active"
                ? "bg-lavender-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <span>Aktif ({activeOrders.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === "history"
                ? "bg-lavender-600 text-white shadow-xs"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            <span>Riwayat Selesai ({historyOrders.length})</span>
          </button>
        </div>

        {/* Empty State */}
        {!loading && displayedOrders.length === 0 && (
          <div className="bg-white p-12 rounded-3xl border border-neutral-200/90 text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-lavender-50 border border-lavender-100 flex items-center justify-center mx-auto text-lavender-600">
              <ReceiptText size={32} variant="Bulk" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-2xl text-neutral-900">
                Belum ada pesanan {activeTab === "active" ? "aktif" : "di riwayat"}
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Butuh perbaikan keran bocor, cat ulang kamar, atau pintu seret? Temukan tukang terverifikasi sekarang.
              </p>
            </div>
            <Link
              href="/search"
              className="inline-block px-5 py-2.5 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              Cari Tukang Sekarang
            </Link>
          </div>
        )}

        {/* Orders List */}
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const isAwaiting = order.status === "awaiting_confirmation";
            const isPendingPayment = order.status === "pending_payment";

            return (
              <div
                key={order.id}
                className={`p-5 sm:p-6 rounded-3xl bg-white border transition-all shadow-xs ${
                  isAwaiting
                    ? "border-lavender-500 ring-2 ring-lavender-100 shadow-md"
                    : "border-neutral-200/90 hover:border-neutral-300"
                }`}
              >
                {/* Header Card: Status & Order Code */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-900 bg-neutral-100 px-2.5 py-1 rounded-md">
                      {order.order_code}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {formatDateId(order.created_at)}
                    </span>
                  </div>
                  <StatusBadge status={order.status} />
                </div>

                {/* Package & Worker Info */}
                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-xl sm:text-2xl text-neutral-900">
                      {order.package.name}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      {order.package.category_name} · Jadwal: {formatDateId(order.scheduled_date)}, {order.time_slot}
                    </p>

                    {order.worker ? (
                      <p className="text-xs text-neutral-700 font-medium mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Mitra: {order.worker.name} ({order.worker.service_area})</span>
                      </p>
                    ) : (
                      <p className="text-xs text-amber-700 font-medium mt-2 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                        <span>Sedang mencarikan tukang terbaik untukmu…</span>
                      </p>
                    )}
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-[11px] text-neutral-400 block">Total Biaya</span>
                    <span className="text-base sm:text-lg font-bold text-neutral-900 font-sans">
                      {formatRupiah(order.total)}
                    </span>
                  </div>
                </div>

                {/* Contextual Action Button */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <div className="text-[11px] text-neutral-400">
                    {isAwaiting && (
                      <span className="font-semibold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-md">
                        Foto hasil telah diunggah! Mohon periksa.
                      </span>
                    )}
                  </div>

                  {isPendingPayment ? (
                    <Link
                      href={`/payment/${order.id}`}
                      className="px-4 py-2 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>Lanjutkan Pembayaran</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : isAwaiting ? (
                    <Link
                      href={`/orders/${order.id}`}
                      className="px-5 py-2 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1"
                    >
                      <span>Cek Hasil & Konfirmasi</span>
                      <ArrowRight size={13} />
                    </Link>
                  ) : (
                    <Link
                      href={`/orders/${order.id}`}
                      className="px-4 py-2 rounded-full border border-neutral-200 hover:bg-neutral-50 text-neutral-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>Lihat Progres</span>
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CustomerShell>
  );
}
