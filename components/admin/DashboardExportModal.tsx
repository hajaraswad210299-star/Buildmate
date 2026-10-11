"use client";

import React, { useState } from "react";
import { DashboardStats } from "@/lib/data/types";
import { Button } from "@/components/shared/Button";
import { formatRupiah } from "@/lib/format";
import { toast } from "sonner";
import {
  DocumentDownload,
  CloseCircle,
  TickCircle,
  ReceiptText,
  UserOctagon,
  Category2,
  WalletMoney,
} from "@/lib/icons";

interface DashboardExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  period: string;
  stats: DashboardStats;
}

export function DashboardExportModal({
  isOpen,
  onClose,
  period,
  stats,
}: DashboardExportModalProps) {
  const [fileFormat, setFileFormat] = useState<"csv" | "json">("csv");
  const [exportScope, setExportScope] = useState<"all" | "metrics" | "orders" | "workers">("all");
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const periodLabel =
    period === "today" ? "Hari ini" : period === "7d" ? "7 Hari Terakhir" : "30 Hari Terakhir";

  const handleExport = () => {
    setIsExporting(true);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const filename = `buildmate-dashboard-${period}-${dateStr}.${fileFormat}`;

      if (fileFormat === "json") {
        let exportData: any = {};
        if (exportScope === "all" || exportScope === "metrics") {
          exportData.metrics = stats.metrics;
          exportData.statusDistribution = stats.statusDistribution;
        }
        if (exportScope === "all" || exportScope === "orders") {
          exportData.recentOrders = stats.recentOrders;
        }
        if (exportScope === "all" || exportScope === "workers") {
          exportData.topWorkers = stats.topWorkers;
          exportData.topCategories = stats.topCategories;
        }
        exportData.meta = {
          exportedAt: now.toISOString(),
          period,
          periodLabel,
          app: "BuildMate Admin",
        };

        const jsonStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Generate CSV with UTF-8 BOM for Windows Excel compatibility
        let csvLines: string[] = ["\uFEFF"];

        csvLines.push(`"LAPORAN ANALITIK DASHBOARD BUILDMATE"`);
        csvLines.push(`"Periode","${periodLabel}"`);
        csvLines.push(`"Tanggal Ekspor","${now.toLocaleString("id-ID")}"`);
        csvLines.push("");

        // 1. METRICS
        if (exportScope === "all" || exportScope === "metrics") {
          csvLines.push(`"--- RINGKASAN METRIK UTAMA ---"`);
          csvLines.push(`"Metrik","Nilai","Perubahan","Label Perubahan"`);
          csvLines.push(
            `"Total Pesanan","${stats.metrics.totalOrders.value}","${stats.metrics.totalOrders.deltaPercent}%","${stats.metrics.totalOrders.deltaLabel}"`
          );
          csvLines.push(
            `"Total Nilai Transaksi (GMV)","${stats.metrics.transactionValue.value}","${stats.metrics.transactionValue.deltaPercent}%","${stats.metrics.transactionValue.deltaLabel}"`
          );
          csvLines.push(
            `"Pesanan Selesai","${stats.metrics.completedOrders.value}","${stats.metrics.completedOrders.deltaPercent}%","${stats.metrics.completedOrders.deltaLabel}"`
          );
          csvLines.push(
            `"Mitra Tukang Aktif","${stats.metrics.activeWorkers.value}","${stats.metrics.activeWorkers.deltaPercent}%","${stats.metrics.activeWorkers.deltaLabel}"`
          );
          csvLines.push("");
        }

        // 2. RECENT ORDERS
        if (exportScope === "all" || exportScope === "orders") {
          csvLines.push(`"--- DAFTAR PESANAN TERKINI ---"`);
          csvLines.push(`"Kode Pesanan","Pelanggan","Mitra Tukang","Paket Layanan","Total Pembayaran","Status"`);
          stats.recentOrders.forEach((ord) => {
            csvLines.push(
              `"${ord.order_code}","${ord.customer?.name || "Pelanggan"}","${ord.worker?.name || "-"}","${ord.package?.name || "Layanan"}","${formatRupiah(ord.total)}","${ord.status}"`
            );
          });
          csvLines.push("");
        }

        // 3. TOP WORKERS & CATEGORIES
        if (exportScope === "all" || exportScope === "workers") {
          csvLines.push(`"--- PERINGKAT MITRA TUKANG TERBAIK ---"`);
          csvLines.push(`"Nama Tukang","Kategori Keahlian","Total Selesai"`);
          stats.topWorkers.forEach((w) => {
            csvLines.push(`"${w.name}","${w.category}","${w.completedCount} pesanan"`);
          });
          csvLines.push("");

          csvLines.push(`"--- PANGSA PASAR KATEGORI LAYANAN ---"`);
          csvLines.push(`"Kategori Layanan","Total Pesanan","Estimasi Pendapatan"`);
          stats.topCategories.forEach((c) => {
            csvLines.push(`"${c.name}","${c.orderCount} pesanan","${formatRupiah(c.revenue)}"`);
          });
          csvLines.push("");
        }

        const csvContent = csvLines.join("\r\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Data berhasil diekspor ke file ${filename}`);
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Gagal mengekspor data laporan");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
              <DocumentDownload size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Ekspor Laporan Dashboard</h3>
              <p className="text-xs text-neutral-500">
                Periode: <span className="font-semibold text-lavender-700">{periodLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <CloseCircle size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Format Pilihan */}
          <div>
            <label className="font-semibold text-neutral-800 block mb-2">Format Berkas</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFileFormat("csv")}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  fileFormat === "csv"
                    ? "border-lavender-600 bg-lavender-50/50 text-lavender-900 ring-1 ring-lavender-500"
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                }`}
              >
                <div>
                  <span className="font-bold block">CSV (.csv)</span>
                  <span className="text-[11px] text-neutral-500">
                    Kompatibel dengan Microsoft Excel & Google Sheets
                  </span>
                </div>
                {fileFormat === "csv" && <TickCircle size={18} className="text-lavender-600 shrink-0 ml-2" />}
              </button>

              <button
                type="button"
                onClick={() => setFileFormat("json")}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                  fileFormat === "json"
                    ? "border-lavender-600 bg-lavender-50/50 text-lavender-900 ring-1 ring-lavender-500"
                    : "border-neutral-200 hover:border-neutral-300 text-neutral-700"
                }`}
              >
                <div>
                  <span className="font-bold block">JSON (.json)</span>
                  <span className="text-[11px] text-neutral-500">
                    Struktur objek data mentah terstandardisasi
                  </span>
                </div>
                {fileFormat === "json" && <TickCircle size={18} className="text-lavender-600 shrink-0 ml-2" />}
              </button>
            </div>
          </div>

          {/* Cakupan Data */}
          <div>
            <label className="font-semibold text-neutral-800 block mb-2">Cakupan Data</label>
            <div className="space-y-2">
              {[
                {
                  id: "all",
                  label: "Semua Laporan Lengkap",
                  desc: "Metrik KPI, Daftar Pesanan Terkini, Kinerja Mitra, & Kategori Jasa",
                  icon: <ReceiptText size={16} className="text-neutral-500" />,
                },
                {
                  id: "metrics",
                  label: "Ringkasan Metrik & Finansial",
                  desc: "Total Pesanan, GMV Pendapatan, SLA On-Time, & Tukang Aktif",
                  icon: <WalletMoney size={16} className="text-neutral-500" />,
                },
                {
                  id: "orders",
                  label: "Daftar Pesanan Terkini Saja",
                  desc: `Ekspor ${stats.recentOrders.length} transaksi pesanan terbaru periode ini`,
                  icon: <ReceiptText size={16} className="text-neutral-500" />,
                },
                {
                  id: "workers",
                  label: "Kinerja Mitra & Kategori",
                  desc: "Peringkat produktivitas tukang dan pangsa pasar layanan",
                  icon: <UserOctagon size={16} className="text-neutral-500" />,
                },
              ].map((scope) => (
                <label
                  key={scope.id}
                  className={`flex items-start gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    exportScope === scope.id
                      ? "border-lavender-400 bg-lavender-50/40"
                      : "border-neutral-200/80 hover:bg-neutral-50/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportScope"
                    checked={exportScope === scope.id}
                    onChange={() => setExportScope(scope.id as any)}
                    className="mt-1 text-lavender-600 focus:ring-lavender-300"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-neutral-800 flex items-center gap-1.5">
                      {scope.icon}
                      {scope.label}
                    </span>
                    <span className="text-[11px] text-neutral-500 block mt-0.5">
                      {scope.desc}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 bg-neutral-50 border-t border-neutral-100">
          <Button variant="secondary" size="md" onClick={onClose} disabled={isExporting}>
            Batal
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleExport}
            isLoading={isExporting}
            leftIcon={<DocumentDownload size={16} />}
          >
            Unduh Berkas ({fileFormat.toUpperCase()})
          </Button>
        </div>
      </div>
    </div>
  );
}
