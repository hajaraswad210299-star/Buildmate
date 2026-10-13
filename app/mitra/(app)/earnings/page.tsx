"use client";

import React, { useState, useEffect } from "react";
import { MitraShell } from "@/components/mitra/MitraShell";
import { EarningsChart } from "@/components/mitra/EarningsChart";
import { useCountUp } from "@/hooks/useCountUp";
import { formatRupiah } from "@/lib/format";
import {
  Wallet3,
  Clock,
  TickCircle,
  InfoCircle,
  Calendar1,
  ReceiptText,
} from "@/lib/icons";

export default function MitraEarningsPage() {
  const [range, setRange] = useState<"month" | "3months" | "all">("all");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    total_disbursed: 1250000,
    pending_payout: 350000,
    month_earnings: 450000,
    monthly_chart: [
      { month: "Mei", amount: 650000 },
      { month: "Jun", amount: 920000 },
      { month: "Jul", amount: 800000 },
      { month: "Ags", amount: 1150000 },
      { month: "Sep", amount: 1400000 },
      { month: "Okt", amount: 450000 },
    ],
    payouts: [] as any[],
  });

  const loadEarnings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mitra/earnings?range=${range}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setData(json.data);
        }
      }
    } catch (err) {
      console.warn("Failed fetching earnings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEarnings();
  }, [range]);

  const animatedTotal = useCountUp(data.total_disbursed);
  const animatedPending = useCountUp(data.pending_payout);
  const animatedMonth = useCountUp(data.month_earnings);

  return (
    <MitraShell title="Pendapatan Saya">
      <div className="p-4 space-y-5 animate-in fade-in duration-200">
        {/* Hero Card: Total Dicairkan */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-lavender-600 via-lavender-700 to-lavender-800 text-white shadow-md space-y-3 relative overflow-hidden">
          {/* Subtle Glow */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-lavender-400/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-lavender-200">
              Total Sudah Dicairkan
            </span>
            {/* Filter Periode */}
            <div className="flex gap-1 p-0.5 bg-black/20 rounded-xl text-[10px] font-semibold">
              <button
                type="button"
                onClick={() => setRange("month")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  range === "month" ? "bg-white text-lavender-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
              >
                Bulan Ini
              </button>
              <button
                type="button"
                onClick={() => setRange("3months")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  range === "3months" ? "bg-white text-lavender-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
              >
                3 Bulan
              </button>
              <button
                type="button"
                onClick={() => setRange("all")}
                className={`px-2 py-1 rounded-lg transition-colors ${
                  range === "all" ? "bg-white text-lavender-900 shadow-xs" : "text-white/80 hover:text-white"
                }`}
              >
                Semua
              </button>
            </div>
          </div>

          <div className="pt-1">
            <span className="font-sans text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums block">
              {formatRupiah(animatedTotal)}
            </span>
            <span className="text-[11px] text-lavender-200 mt-1 block">
              Dana bersih yang telah ditransfer ke rekeningmu.
            </span>
          </div>
        </div>

        {/* 2 Stat Cards: Menunggu Pencairan & Bulan Ini */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <Clock size={15} className="text-warning-600" />
              <span>Menunggu Cair</span>
            </div>
            <span className="font-sans text-base font-bold text-warning-800 tabular-nums block">
              {formatRupiah(animatedPending)}
            </span>
            <span className="text-[10px] text-neutral-400">
              Sedang diproses admin
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/80 space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium">
              <Wallet3 size={15} className="text-lavender-600" />
              <span>Bulan Ini</span>
            </div>
            <span className="font-sans text-base font-bold text-lavender-800 tabular-nums block">
              {formatRupiah(animatedMonth)}
            </span>
            <span className="text-[10px] text-neutral-400">
              Total pendapatan bulan berjalan
            </span>
          </div>
        </div>

        {/* 6-Month Chart */}
        <EarningsChart data={data.monthly_chart} />

        {/* Payout History Ledger */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-neutral-800">
              Riwayat Pencairan per Pesanan
            </h3>
            <span className="text-[11px] text-neutral-400">
              {data.payouts.length} transaksi
            </span>
          </div>

          <div className="space-y-2">
            {data.payouts.map((p) => (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl border border-neutral-200/80 bg-white flex items-center justify-between gap-3 shadow-xs hover:border-lavender-200 transition-colors"
              >
                <div className="space-y-0.5 truncate">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-800">
                      {p.order_code}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        p.status === "paid"
                          ? "bg-success-50 text-success-700 border border-success-200/60"
                          : "bg-warning-50 text-warning-700 border border-warning-200/60"
                      }`}
                    >
                      {p.status === "paid" ? "Dicairkan" : "Menunggu"}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 truncate">
                    {p.package_name}
                  </p>
                  <span className="text-[10px] text-neutral-400 block">
                    {p.status === "paid" && p.paid_at
                      ? `Ditransfer pada ${new Date(p.paid_at).toLocaleDateString("id-ID")}`
                      : `Selesai ${new Date(p.completed_at).toLocaleDateString("id-ID")}`}
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-sans text-sm font-bold text-neutral-900 block tabular-nums">
                    {formatRupiah(p.amount)}
                  </span>
                  <span className="text-[10px] text-neutral-400">
                    Tanpa potongan
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Simulation Notice Box (A4, B3) */}
        <div className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 flex items-start gap-2.5">
          <InfoCircle size={16} className="text-neutral-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            Pencairan dana dicatat oleh tim BuildMate (simulasi sandbox challenge, tanpa transfer bank sungguhan).
          </p>
        </div>
      </div>
    </MitraShell>
  );
}
