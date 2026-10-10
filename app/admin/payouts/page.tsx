"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/shared/StatCard";
import { getPayouts, markPayoutAsPaid, PayoutFilter } from "@/lib/data/payouts";
import { Payout } from "@/lib/data/types";
import { formatRupiah, formatDateId } from "@/lib/format";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import { SearchNormal1 } from "@/lib/icons";

export default function AdminPayoutsPage() {
  const [activeTab, setActiveTab] = useState<PayoutFilter["tab"]>("pending");
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  // Dialog mark as paid
  const [markingPayout, setMarkingPayout] = useState<Payout | null>(null);
  const [transferNote, setTransferNote] = useState("Transfer simulasi BCA");

  const loadData = useCallback(() => {
    getPayouts({ tab: activeTab, search }).then((res) => {
      setPayouts(res);
      setSelectedIds([]);
    });
  }, [activeTab, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalPending = payouts
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  const selectedTotal = payouts
    .filter((p) => selectedIds.includes(p.id))
    .reduce((sum, p) => sum + p.amount, 0);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(payouts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirmPayout = async () => {
    if (markingPayout) {
      await markPayoutAsPaid(markingPayout.id, transferNote);
      toast.success(
        `Pencairan dana Rp${markingPayout.amount.toLocaleString("id-ID")} untuk ${markingPayout.worker_name} ditandai sudah dicairkan.`
      );
      setMarkingPayout(null);
      loadData();
    } else if (selectedIds.length > 0) {
      for (const id of selectedIds) {
        await markPayoutAsPaid(id, transferNote);
      }
      toast.success(
        `${selectedIds.length} pencairan dana senilai ${formatRupiah(selectedTotal)} berhasil ditandai sudah dicairkan.`
      );
      setSelectedIds([]);
      loadData();
    }
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* HEADER */}
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Pencairan Dana Mitra (Ledger Escrow)
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Pencatatan hak dana tukang setelah pesanan selesai, dan tanda bukti pencairan
          </p>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Menunggu Dicairkan"
            value={totalPending}
            isCurrency
            accent="orange"
            linkText="Lihat antrean"
          />
          <StatCard
            title="Jumlah Tukang Menunggu"
            value={payouts.filter((p) => p.status === "pending").length}
            accent="lavender"
            linkText="Lihat tukang"
          />
          <StatCard
            title="Sudah Dicairkan (Bulan Ini)"
            value={370000}
            isCurrency
            accent="success"
            linkText="Lihat riwayat"
          />
        </div>

        {/* TABS & TOOLBAR */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "pending"
                  ? "bg-lavender-600 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Menunggu Pencairan
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("paid")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                activeTab === "paid"
                  ? "bg-lavender-600 text-white shadow-xs"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Sudah Dicairkan
            </button>
          </div>

          <div className="relative w-64">
            <SearchNormal1
              size={15}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari tukang atau kode pesanan..."
              className="w-full pl-8 pr-2.5 py-1.5 rounded-xl border border-neutral-200 text-xs"
            />
          </div>
        </div>

        {/* MASS ACTION BAR */}
        {selectedIds.length > 0 && (
          <div className="bg-lavender-50 border border-lavender-200 p-3 px-4 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
            <span className="font-semibold text-lavender-900">
              {selectedIds.length} item dipilih · Total: {formatRupiah(selectedTotal)}
            </span>
            <button
              type="button"
              onClick={() =>
                setMarkingPayout({
                  id: "bulk",
                  order_id: "bulk",
                  order_code: "BULK",
                  worker_id: "bulk",
                  worker_name: `${selectedIds.length} mitra terpilih`,
                  amount: selectedTotal,
                  status: "pending",
                  completed_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                })
              }
              className="px-4 py-1.5 bg-lavender-600 hover:bg-lavender-700 text-white rounded-lg font-semibold shadow-xs"
            >
              Tandai {selectedIds.length} Terpilih Sudah Dicairkan
            </button>
          </div>
        )}

        {/* TABLE */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium">
                  {activeTab === "pending" && (
                    <th className="py-3 px-4 w-10">
                      <input
                        type="checkbox"
                        checked={payouts.length > 0 && selectedIds.length === payouts.length}
                        onChange={handleSelectAll}
                        className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-300"
                      />
                    </th>
                  )}
                  <th className="py-3 px-4 font-medium">Mitra Tukang</th>
                  <th className="py-3 px-3 font-medium">Kode Pesanan</th>
                  <th className="py-3 px-3 font-medium text-right">Hak Pencairan</th>
                  <th className="py-3 px-3 font-medium">Tanggal Selesai</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  {activeTab === "paid" && (
                    <th className="py-3 px-3 font-medium">Dicairkan Pada & Catatan</th>
                  )}
                  {activeTab === "pending" && (
                    <th className="py-3 px-4 text-center font-medium">Aksi</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-neutral-400">
                      Tidak ada data pencairan dana.
                    </td>
                  </tr>
                ) : (
                  payouts.map((po) => {
                    const isSelected = selectedIds.includes(po.id);

                    return (
                      <tr
                        key={po.id}
                        className={`hover:bg-neutral-50/60 ${isSelected ? "bg-lavender-50/30" : ""}`}
                      >
                        {activeTab === "pending" && (
                          <td className="py-3.5 px-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(po.id)}
                              className="rounded border-neutral-300 text-lavender-600"
                            />
                          </td>
                        )}

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={
                                po.worker_avatar ||
                                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100"
                              }
                              alt={po.worker_name}
                              className="w-7 h-7 rounded-full object-cover border border-neutral-200 shrink-0"
                            />
                            <span className="font-semibold text-neutral-800">
                              {po.worker_name}
                            </span>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <Link
                            href={`/admin/orders/${po.order_id}`}
                            className="font-mono font-semibold text-lavender-600 hover:underline"
                          >
                            {po.order_code}
                          </Link>
                        </td>

                        <td className="py-3.5 px-3 font-bold text-neutral-900 tabular-nums text-right">
                          {formatRupiah(po.amount)}
                        </td>

                        <td className="py-3.5 px-3 text-neutral-600">
                          {formatDateId(po.completed_at, "d MMM yyyy, HH:mm")}
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              po.status === "paid"
                                ? "bg-success-50 text-success-700"
                                : "bg-warning-50 text-warning-700"
                            }`}
                          >
                            {po.status === "paid" ? "Sudah Dicairkan" : "Menunggu"}
                          </span>
                        </td>

                        {activeTab === "paid" && (
                          <td className="py-3.5 px-3 text-neutral-500">
                            <span className="block font-medium text-neutral-700">
                              {po.paid_at ? formatDateId(po.paid_at) : "-"}
                            </span>
                            <span className="text-[11px] text-neutral-400">
                              {po.note || "Transfer simulasi"}
                            </span>
                          </td>
                        )}

                        {activeTab === "pending" && (
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => setMarkingPayout(po)}
                              className="px-3 py-1 bg-lavender-50 hover:bg-lavender-100 text-lavender-700 rounded-lg font-semibold text-xs transition-colors"
                            >
                              Tandai Dicairkan
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* DIALOG KONFIRMASI PENCAIRAN */}
      {markingPayout && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setMarkingPayout(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">
              Tandai Sudah Dicairkan (Simulasi)
            </h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Tindakan ini akan mencatat di buku besar bahwa dana telah diteruskan ke mitra
              terkait.
            </p>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-neutral-500">Mitra:</span>
                <span className="font-semibold text-neutral-800">
                  {markingPayout.worker_name || `${selectedIds.length} mitra terpilih`}
                </span>
              </div>
              <div className="flex justify-between py-1 border-t border-neutral-200/60 mt-1">
                <span className="text-neutral-500">Total Nominal:</span>
                <span className="font-bold text-lavender-700 text-sm">
                  {formatRupiah(markingPayout.amount || selectedTotal)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Catatan Pengiriman Dana (Simulasi)
              </label>
              <input
                type="text"
                value={transferNote}
                onChange={(e) => setTransferNote(e.target.value)}
                placeholder="Contoh: Transfer simulasi BCA 10/10/26"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setMarkingPayout(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleConfirmPayout}
              >
                Konfirmasi Pencairan
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
