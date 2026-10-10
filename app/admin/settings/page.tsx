"use client";

import React from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { formatRupiah } from "@/lib/format";

export default function AdminSettingsPage() {
  const configs = [
    {
      group: "Biaya & Model Bisnis",
      items: [
        { label: "Biaya Layanan (Pelanggan Gratis)", value: formatRupiah(5000), note: "Snapshot per pesanan" },
        { label: "Biaya Layanan (Member Plus)", value: "Rp0 (Gratis)", note: "Benefit keanggotaan Plus" },
        { label: "Harga Langganan Plus", value: formatRupiah(29000), note: "Sekali bayar per 30 hari" },
        { label: "Durasi Aktif Plus", value: "30 Hari", note: "Bukan recurring otomatis" },
      ],
    },
    {
      group: "Batas Waktu Operasional (SLA)",
      items: [
        { label: "Batas Konfirmasi Pelanggan", value: "24 Jam (Demo: 2 Menit)", note: "Admin dapat selesaikan setelah batas lewat" },
        { label: "Batas Respon Tawaran Tukang", value: "2 Jam (Demo: 1 Menit)", note: "Masuk antrean darurat bila lewat batas" },
        { label: "Garansi Komplain Plus", value: "7 Hari", note: "Pengerjaan ulang gratis" },
      ],
    },
    {
      group: "Integrasi & Lingkungan Sistem",
      items: [
        { label: "Mode Payment Gateway", value: "Midtrans Snap SANDBOX", note: "Simulasi pembayaran tanpa uang sungguhan" },
        { label: "Nomor WhatsApp CS Admin", value: "+62 812-3456-7890", note: "Digunakan untuk template click-to-chat" },
        { label: "Database Online", value: "Supabase PostgreSQL (Singapore)", note: "RLS aktif & Auth terpadu" },
        { label: "Mode Sumber Data", value: "Mock (USE_MOCK_DATA=true)", note: "Fase 1: UI-first prototype" },
      ],
    },
  ];

  return (
    <AdminShell>
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">
            Pengaturan & Konfigurasi Sistem
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Nilai konfigurasi platform dan parameter environment runtime (Read-only di MVP)
          </p>
        </div>

        <div className="space-y-5">
          {configs.map((grp) => (
            <div
              key={grp.group}
              className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs"
            >
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">
                {grp.group}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {grp.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-100 flex flex-col justify-between"
                  >
                    <div>
                      <span className="text-xs text-neutral-500 font-medium block">
                        {item.label}
                      </span>
                      <span className="text-sm font-bold text-neutral-900 mt-1 block font-mono">
                        {item.value}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-2 block">
                      {item.note}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}
