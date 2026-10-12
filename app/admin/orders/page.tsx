"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { WaButton } from "@/components/shared/WaButton";
import { getOrders, OrderFilter } from "@/lib/data/orders";
import { MOCK_ORDERS } from "@/lib/mock/data";
import { Order } from "@/lib/data/types";
import { OrderStatus } from "@/lib/orders/transitions";
import { formatRupiah, formatDateId } from "@/lib/format";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { WA_TEMPLATES } from "@/lib/wa-templates";
import { Button } from "@/components/shared/Button";
import { toast } from "sonner";
import {
  SearchNormal1,
  Copy,
  TickCircle,
  Crown1,
  UserTick,
  UserEdit,
  DocumentDownload,
} from "@/lib/icons";
import { FilterDropdown } from "@/components/shared/FilterDropdown";

const STATUS_OPTIONS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "pending_payment", label: "Menunggu Pembayaran" },
  { value: "paid", label: "Dibayar (Mencari Tukang)" },
  { value: "worker_confirmed", label: "Tukang Terkonfirmasi" },
  { value: "on_the_way", label: "Menuju Lokasi" },
  { value: "in_progress", label: "Sedang Dikerjakan" },
  { value: "awaiting_confirmation", label: "Menunggu Konfirmasi" },
  { value: "completed", label: "Selesai" },
  { value: "cancelled", label: "Dibatalkan" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "Semua Kategori" },
  { value: "plumbing", label: "Plumbing" },
  { value: "pengecatan", label: "Pengecatan" },
  { value: "perbaikan umum", label: "Perbaikan Umum" },
];

const CUSTOMER_TYPE_OPTIONS: { value: "all" | "free" | "plus"; label: string }[] = [
  { value: "all", label: "Semua Tipe Pelanggan" },
  { value: "free", label: "Pelanggan Reguler" },
  { value: "plus", label: "Member Plus" },
];

function AdminOrdersContent() {
  const [activeTab, setActiveTab] = useState<OrderFilter["tab"]>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | "all">("all");
  const [customerType, setCustomerType] = useState<"all" | "free" | "plus">("all");
  const [orders, setOrders] = useState<Order[]>(() => MOCK_ORDERS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    getOrders({
      tab: activeTab,
      status: selectedStatus,
      search,
      category: selectedCategory,
      customerType,
    }).then((res) => {
      setOrders(res);
      setSelectedIds([]);
    });
  }, [activeTab, selectedStatus, search, selectedCategory, customerType]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    toast.success(`Kode ${code} tersalin ke clipboard`);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(orders.map((o) => o.id));
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

  const exportOrdersToCsv = (ordersToExport: Order[], filenamePrefix: string) => {
    if (ordersToExport.length === 0) {
      toast.error("Tidak ada pesanan untuk diekspor.");
      return;
    }

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const filename = `${filenamePrefix}-${dateStr}.csv`;

      // UTF-8 BOM for Microsoft Excel compatibility
      const csvLines: string[] = ["\uFEFF"];

      // Header row
      csvLines.push(
        [
          `"Kode Pesanan"`,
          `"Pelanggan"`,
          `"Email Pelanggan"`,
          `"No. HP Pelanggan"`,
          `"Tipe Pelanggan"`,
          `"Mitra Tukang"`,
          `"No. HP Tukang"`,
          `"Kategori Layanan"`,
          `"Paket Layanan"`,
          `"Biaya Paket"`,
          `"Biaya Layanan"`,
          `"Total Pembayaran"`,
          `"Alamat Pengerjaan"`,
          `"Jadwal Tanggal"`,
          `"Slot Waktu"`,
          `"Status"`,
          `"Tanggal Dibuat"`,
        ].join(",")
      );

      // Data rows
      ordersToExport.forEach((o) => {
        const row = [
          `"${o.order_code}"`,
          `"${o.customer?.name || "-"}"`,
          `"${o.customer?.email || "-"}"`,
          `"${o.customer?.phone || "-"}"`,
          `"${o.customer?.is_plus ? "Member Plus" : "Reguler"}"`,
          `"${o.worker?.name || "-"}"`,
          `"${o.worker?.phone || "-"}"`,
          `"${o.package?.category_name || "-"}"`,
          `"${o.package?.name || "-"}"`,
          `"${o.package_price}"`,
          `"${o.service_fee}"`,
          `"${o.total}"`,
          `"${(o.address || "").replace(/"/g, '""')}"`,
          `"${o.scheduled_date}"`,
          `"${o.time_slot}"`,
          `"${o.status}"`,
          `"${new Date(o.created_at).toLocaleString("id-ID")}"`,
        ];
        csvLines.push(row.join(","));
      });

      const csvContent = csvLines.join("\r\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${ordersToExport.length} pesanan berhasil diekspor ke ${filename}`);
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengekspor data pesanan.");
    }
  };

  const handleExportAll = () => {
    exportOrdersToCsv(orders, "buildmate-semua-pesanan");
  };

  const handleExportSelected = () => {
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    exportOrdersToCsv(selectedOrders, "buildmate-pesanan-terpilih");
  };

  const resetFilters = () => {
    setActiveTab("all");
    setSearch("");
    setSelectedCategory("all");
    setSelectedStatus("all");
    setCustomerType("all");
  };

  return (
    <AdminShell>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
                Daftar Pesanan
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 text-xs font-semibold tabular-nums">
                {orders.length} total
              </span>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Kelola, monitor status pengerjaan, dan intervensi pesanan pelanggan
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            leftIcon={<DocumentDownload size={15} />}
            onClick={handleExportAll}
            className="self-start sm:self-auto"
          >
            Ekspor CSV
          </Button>
        </div>

        {/* TABS WITH BADGES */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-200/80 pb-px">
          {[
            { id: "all", label: "Semua" },
            { id: "action_needed", label: "Perlu Tindakan", urgent: true },
            { id: "finding_worker", label: "Mencari Tukang" },
            { id: "active", label: "Aktif" },
            { id: "completed", label: "Selesai" },
            { id: "cancelled", label: "Dibatalkan" },
            { id: "complaint", label: "Komplain" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as OrderFilter["tab"])}
              className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? "border-lavender-600 text-lavender-700 font-semibold"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <span>{tab.label}</span>
              {tab.urgent && (
                <span className="w-2 h-2 rounded-full bg-danger-500 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-[260px] max-w-md">
            <div className="relative w-full">
              <SearchNormal1
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode atau nama pelanggan..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-neutral-200 text-xs placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Status Filter */}
            <FilterDropdown
              value={selectedStatus}
              options={STATUS_OPTIONS}
              onChange={(val) => setSelectedStatus(val)}
              menuWidth="min-w-[200px]"
            />

            {/* Category Filter */}
            <FilterDropdown
              value={selectedCategory}
              options={CATEGORY_OPTIONS}
              onChange={(val) => setSelectedCategory(val)}
              menuWidth="min-w-[170px]"
            />

            {/* Customer Type Filter */}
            <FilterDropdown
              value={customerType}
              options={CUSTOMER_TYPE_OPTIONS}
              onChange={(val) => setCustomerType(val)}
              menuWidth="min-w-[180px]"
            />

            {(search || selectedCategory !== "all" || selectedStatus !== "all" || customerType !== "all" || activeTab !== "all") && (
              <button
                type="button"
                onClick={resetFilters}
                className="px-2.5 py-1.5 text-xs text-lavender-600 hover:text-lavender-800 font-medium"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* BATCH ACTION BAR IF SELECTED */}
        {selectedIds.length > 0 && (
          <div className="bg-lavender-50 border border-lavender-200 p-2.5 px-4 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 text-xs">
            <span className="font-semibold text-lavender-800">
              {selectedIds.length} pesanan terpilih
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleExportSelected}
            >
              Ekspor Terpilih
            </Button>
          </div>
        )}

        {/* DATA TABLE */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-neutral-500 font-medium select-none">
                  <th className="py-3 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={orders.length > 0 && selectedIds.length === orders.length}
                      onChange={handleSelectAll}
                      className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-300"
                    />
                  </th>
                  <th className="py-3 px-3 font-medium">Kode</th>
                  <th className="py-3 px-3 font-medium">Pelanggan</th>
                  <th className="py-3 px-3 font-medium">Paket & Kategori</th>
                  <th className="py-3 px-3 font-medium">Tukang</th>
                  <th className="py-3 px-3 font-medium">Jadwal</th>
                  <th className="py-3 px-3 font-medium text-right">Total</th>
                  <th className="py-3 px-3 font-medium text-center">Status</th>
                  <th className="py-3 px-3 font-medium text-right">Diperbarui</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-neutral-400">
                      Tidak ada pesanan yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  orders.map((ord) => {
                    const isSelected = selectedIds.includes(ord.id);
                    const isCopied = copiedId === ord.order_code;

                    return (
                      <tr
                        key={ord.id}
                        className={`hover:bg-neutral-50/70 transition-colors ${
                          isSelected ? "bg-lavender-50/30" : ""
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(ord.id)}
                            className="rounded border-neutral-300 text-lavender-600 focus:ring-lavender-300"
                          />
                        </td>

                        {/* Order Code with Copy Button */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5 group/code">
                            <Link
                              href={`/admin/orders/${ord.id}`}
                              className="font-mono font-semibold text-neutral-900 hover:text-lavender-600"
                            >
                              {ord.order_code}
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleCopyCode(ord.order_code)}
                              className="text-neutral-300 hover:text-neutral-600 opacity-0 group-hover/code:opacity-100 transition-opacity"
                              title="Salin kode"
                            >
                              {isCopied ? (
                                <TickCircle size={13} className="text-success-600" />
                              ) : (
                                <Copy size={13} />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Customer */}
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-neutral-800">
                              {ord.customer.name}
                            </span>
                            {ord.customer.is_plus && (
                              <span
                                className="inline-flex items-center text-lavender-600"
                                title="Member Plus Aktif"
                              >
                                <Crown1 size={14} variant="Bold" />
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-neutral-400 block mt-0.5">
                            {ord.customer.phone}
                          </span>
                        </td>

                        {/* Package */}
                        <td className="py-3.5 px-3">
                          <span className="font-medium text-neutral-800 block">
                            {ord.package.name}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {ord.package.category_name}
                          </span>
                        </td>

                        {/* Worker */}
                        <td className="py-3.5 px-3">
                          {ord.worker ? (
                            <div className="flex items-center gap-2">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={
                                  ord.worker.avatar_url ||
                                  "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100"
                                }
                                alt={ord.worker.name}
                                referrerPolicy="no-referrer"
                                className="w-6 h-6 rounded-full object-cover border border-neutral-200 shrink-0"
                              />
                              <div className="flex flex-col">
                                <span className="font-medium text-neutral-800 leading-tight">
                                  {ord.worker.name}
                                </span>
                                <span className="text-[10px] text-neutral-400 flex items-center gap-1">
                                  {ord.worker.has_account ? (
                                    <>
                                      <UserTick size={11} className="text-lavender-600" />
                                      <span>Berakun</span>
                                    </>
                                  ) : (
                                    <>
                                      <UserEdit size={11} className="text-neutral-500" />
                                      <span>Dikelola admin</span>
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic">Belum ada tukang</span>
                          )}
                        </td>

                        {/* Schedule */}
                        <td className="py-3.5 px-3">
                          <span className="text-neutral-800 font-medium block">
                            {formatDateId(ord.scheduled_date, "d MMM yyyy")}
                          </span>
                          <span className="text-[11px] text-neutral-400">
                            {ord.time_slot}
                          </span>
                        </td>

                        {/* Total */}
                        <td className="py-3.5 px-3 font-semibold text-neutral-900 tabular-nums text-right">
                          {formatRupiah(ord.total)}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-3 text-center">
                          <StatusBadge status={ord.status} size="sm" />
                        </td>

                        {/* Updated */}
                        <td className="py-3.5 px-3 text-neutral-400 text-right whitespace-nowrap">
                          <RelativeTime date={ord.updated_at || ord.created_at} />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Link
                              href={`/admin/orders/${ord.id}`}
                              className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-lavender-50 hover:text-lavender-700 text-neutral-600 font-semibold transition-colors"
                            >
                              Detail
                            </Link>

                            <WaButton
                              phone={ord.customer.phone}
                              messageText={WA_TEMPLATES.adminToCustomer({
                                customerName: ord.customer.name,
                                orderCode: ord.order_code,
                                workerName: ord.worker?.name || "Tukang kami",
                                date: ord.scheduled_date,
                                timeSlot: ord.time_slot,
                              })}
                              label="WA"
                              size="sm"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-3.5 px-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
            <span>
              Menampilkan {orders.length} dari {orders.length} pesanan
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-400 cursor-not-allowed"
              >
                Sebelumnya
              </button>
              <span className="px-2 font-semibold text-neutral-800">1</span>
              <button
                type="button"
                disabled
                className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-white text-neutral-400 cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

export default function AdminOrdersPage() {
  return (
    <React.Suspense
      fallback={
        <div className="h-dvh flex items-center justify-center text-xs text-neutral-400">
          Memuat daftar pesanan...
        </div>
      }
    >
      <AdminOrdersContent />
    </React.Suspense>
  );
}
