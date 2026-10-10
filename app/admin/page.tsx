"use client";

import React, { useState, useEffect, useSyncExternalStore, useMemo } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ActivityTicker } from "@/components/shared/ActivityTicker";
import { ActivityHeatmap } from "@/components/shared/ActivityHeatmap";
import { getDashboardStats } from "@/lib/data/dashboard";
import { getMockDashboardStats } from "@/lib/mock/data";
import { DashboardStats } from "@/lib/data/types";
import { formatRupiah, formatRelativeTime } from "@/lib/format";
import {
  ArrowRight,
  DocumentDownload,
  Clock,
  Like1,
  Flash,
  CloseCircle,
  Warning2,
  UserOctagon,
  WalletMoney,
} from "@/lib/icons";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<string>("7d");
  const [stats, setStats] = useState<DashboardStats | null>(() => getMockDashboardStats("7d"));
  const [topTab, setTopTab] = useState<"workers" | "categories">("workers");

  const isClient = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const { greeting, currentDateString } = useMemo(() => {
    if (!isClient) {
      return {
        greeting: "Selamat datang",
        currentDateString: "Sabtu, 10 Oktober 2026",
      };
    }
    const now = new Date();
    const hour = now.getHours();
    let g = "Selamat malam";
    if (hour < 11) g = "Selamat pagi";
    else if (hour < 15) g = "Selamat siang";
    else if (hour < 18) g = "Selamat sore";

    return {
      greeting: g,
      currentDateString: now.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    };
  }, [isClient]);

  useEffect(() => {
    getDashboardStats(period).then((data) => setStats(data));
  }, [period]);

  if (!stats) {
    return (
      <AdminShell>
        <div className="py-20 text-center text-xs text-neutral-400">
          Memuat data dashboard...
        </div>
      </AdminShell>
    );
  }

  const { metrics, chartData, urgentActions, statusDistribution, performance, topWorkers, topCategories, recentOrders, activityTicker, activityTimeline } = stats;

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-normal font-serif text-neutral-900 tracking-tight">
              {greeting}, <span className="italic text-lavender-700">Admin</span>
            </h2>
            <p className="text-xs text-neutral-500 mt-1">{currentDateString}</p>
          </div>

          {/* Period Filter & Export Action */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Segmented Filter */}
            <div className="inline-flex bg-white rounded-xl p-1 border border-neutral-200/80 shadow-xs">
              {[
                { label: "Hari ini", val: "today" },
                { label: "7 hari", val: "7d" },
                { label: "30 hari", val: "30d" },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setPeriod(p.val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    period === p.val
                      ? "bg-lavender-600 text-white shadow-xs"
                      : "text-neutral-600 hover:text-neutral-900"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-neutral-200/80 hover:bg-neutral-50 text-xs font-semibold text-neutral-700 shadow-xs transition-colors"
            >
              <DocumentDownload size={15} />
              <span>Ekspor Data</span>
            </button>
          </div>
        </div>

        {/* ACTIVITY TICKER */}
        <ActivityTicker items={activityTicker} />

        {/* METRICS ROW (TOP 4 CRITICAL METRICS) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={metrics.totalOrders.title}
            value={metrics.totalOrders.value}
            deltaPercent={metrics.totalOrders.deltaPercent}
            isPositiveDelta={metrics.totalOrders.isPositiveDelta}
            deltaLabel={metrics.totalOrders.deltaLabel}
            accent={metrics.totalOrders.accent}
            linkHref={metrics.totalOrders.linkHref}
            subStats={metrics.totalOrders.subStats}
          />
          <StatCard
            title={metrics.completedOrders.title}
            value={metrics.completedOrders.value}
            deltaPercent={metrics.completedOrders.deltaPercent}
            isPositiveDelta={metrics.completedOrders.isPositiveDelta}
            deltaLabel={metrics.completedOrders.deltaLabel}
            accent={metrics.completedOrders.accent}
            linkHref={metrics.completedOrders.linkHref}
            subStats={metrics.completedOrders.subStats}
          />
          <StatCard
            title={metrics.transactionValue.title}
            value={metrics.transactionValue.value}
            isCurrency
            deltaPercent={metrics.transactionValue.deltaPercent}
            isPositiveDelta={metrics.transactionValue.isPositiveDelta}
            deltaLabel={metrics.transactionValue.deltaLabel}
            accent={metrics.transactionValue.accent}
            linkHref={metrics.transactionValue.linkHref}
            subStats={metrics.transactionValue.subStats}
          />
          <StatCard
            title={metrics.platformRevenue.title}
            value={metrics.platformRevenue.value}
            isCurrency
            deltaPercent={metrics.platformRevenue.deltaPercent}
            isPositiveDelta={metrics.platformRevenue.isPositiveDelta}
            deltaLabel={metrics.platformRevenue.deltaLabel}
            accent={metrics.platformRevenue.accent}
            linkHref={metrics.platformRevenue.linkHref}
            subStats={metrics.platformRevenue.subStats}
          />
        </div>

        {/* OPERATIONAL ESCROW & MEMBERSHIP ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={metrics.escrowHeld.title}
            value={metrics.escrowHeld.value}
            isCurrency
            accent={metrics.escrowHeld.accent}
            linkText={metrics.escrowHeld.linkText}
            linkHref={metrics.escrowHeld.linkHref}
            subStats={metrics.escrowHeld.subStats}
          />
          <StatCard
            title={metrics.pendingPayouts.title}
            value={metrics.pendingPayouts.value}
            isCurrency
            accent={metrics.pendingPayouts.accent}
            linkText={metrics.pendingPayouts.linkText}
            linkHref={metrics.pendingPayouts.linkHref}
            subStats={metrics.pendingPayouts.subStats}
          />
          <StatCard
            title={metrics.activePlusMembers.title}
            value={metrics.activePlusMembers.value}
            accent={metrics.activePlusMembers.accent}
            linkText={metrics.activePlusMembers.linkText}
            linkHref={metrics.activePlusMembers.linkHref}
            subStats={metrics.activePlusMembers.subStats}
          />
          <StatCard
            title={metrics.activeWorkers.title}
            value={metrics.activeWorkers.value}
            accent={metrics.activeWorkers.accent}
            linkText={metrics.activeWorkers.linkText}
            linkHref={metrics.activeWorkers.linkHref}
            subStats={metrics.activeWorkers.subStats}
          />
        </div>

        {/* ACTIVITY HEATMAP TIMELINE (STYLE MIRRORING REFERENCE IMAGE) */}
        <ActivityHeatmap
          year={activityTimeline.year}
          activeDays={activityTimeline.activeDays}
          bestMonth={activityTimeline.bestMonth}
          bestMonthRate={activityTimeline.bestMonthRate}
          months={activityTimeline.months}
        />

        {/* MIDDLE ROW: CHART CARD (8 COL) + ACTION QUEUE (4 COL) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Chart Card */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-neutral-800">
                  Tren Pesanan Harian
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Perbandingan pesanan selesai vs dibatalkan pada periode ini
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-lavender-500" />
                  <span className="text-neutral-600">Selesai</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-neutral-300" />
                  <span className="text-neutral-600">Dibatalkan</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#A6A2B5" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A6A2B5" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-2.5 rounded-xl border border-neutral-200 shadow-md text-xs">
                            <span className="font-semibold text-neutral-800 block mb-1">
                              {payload[0].payload.label}
                            </span>
                            <span className="text-lavender-600 block">
                              Selesai: {payload[0].value} pesanan
                            </span>
                            <span className="text-neutral-400 block">
                              Dibatalkan: {payload[1]?.value || 0} pesanan
                            </span>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="completed" fill="#9277F2" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="cancelled" fill="#D3D0DE" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Action Queue Card */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <Flash size={18} className="text-danger-500" />
                  <h3 className="text-sm font-semibold text-neutral-800">
                    Antrean Tindakan
                  </h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-50 text-danger-700">
                  {urgentActions.reduce((acc, curr) => acc + curr.count, 0)} Perlu Respon
                </span>
              </div>

              {urgentActions.length === 0 ? (
                <div className="py-12 text-center text-xs text-neutral-400 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-2xl bg-success-50 text-success-600 flex items-center justify-center mb-3">
                    <Like1 size={24} variant="Bulk" />
                  </div>
                  <span className="font-semibold text-neutral-800 text-sm">Semua Beres!</span>
                  <span className="text-neutral-500 mt-1 max-w-xs">
                    Tidak ada antrean darurat yang perlu ditindaklanjuti.
                  </span>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {urgentActions.map((action) => {
                    const typeStyles = {
                      danger: "border-danger-200 bg-danger-50/50 hover:bg-danger-50 text-danger-900",
                      warning: "border-warning-200 bg-warning-50/50 hover:bg-warning-50 text-warning-900",
                      lavender: "border-lavender-200 bg-lavender-50/50 hover:bg-lavender-50 text-lavender-900",
                      neutral: "border-neutral-200 bg-neutral-50/70 hover:bg-neutral-100 text-neutral-900",
                    }[action.type];

                    const renderActionIcon = () => {
                      switch (action.icon) {
                        case "CloseCircle":
                          return <CloseCircle size={16} className="text-danger-600" variant="Bold" />;
                        case "Clock":
                          return <Clock size={16} className="text-warning-600" variant="Bold" />;
                        case "Warning2":
                          return <Warning2 size={16} className="text-warning-600" variant="Bold" />;
                        case "UserOctagon":
                          return <UserOctagon size={16} className="text-lavender-600" variant="Bold" />;
                        case "WalletMoney":
                          return <WalletMoney size={16} className="text-neutral-600" variant="Bold" />;
                        default:
                          return <Flash size={16} className="text-danger-600" />;
                      }
                    };

                    return (
                      <Link
                        key={action.id}
                        href={action.linkHref}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-150 group ${typeStyles}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white shadow-xs flex items-center justify-center shrink-0 border border-neutral-100">
                            {renderActionIcon()}
                          </div>
                          <span className="text-xs font-medium leading-tight truncate">
                            {action.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-white shadow-2xs flex items-center justify-center font-bold text-[11px] tabular-nums text-neutral-800 border border-neutral-150">
                            {action.count}
                          </span>
                          <ArrowRight size={14} className="text-neutral-400 group-hover:text-neutral-700 transition-transform group-hover:translate-x-0.5" />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 mt-4 text-center">
              <Link
                href="/admin/orders?tab=action_needed"
                className="text-xs font-semibold text-lavender-600 hover:text-lavender-700"
              >
                Buka Semua Filter Tindakan →
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW (4 / 4 / 4): STATUS DISTRIBUTION, PERFORMANCE, TOP PERFORMERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Status Distribution */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
            <h3 className="text-sm font-semibold text-neutral-800 mb-3">
              Distribusi Status Pesanan
            </h3>
            <div className="space-y-3">
              {statusDistribution.map((st) => (
                <div key={st.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-600">{st.label}</span>
                    <span className="font-semibold text-neutral-800 tabular-nums">
                      {st.count} ({st.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${st.percentage}%`, backgroundColor: st.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800 mb-4">
                Kinerja Platform & Mitra
              </h3>

              <div className="flex items-center justify-center py-2">
                {/* SVG Progress Ring */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#F0EFF5"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#7A5CE6"
                      strokeWidth="10"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * performance.completionRate) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-bold text-neutral-900 tabular-nums">
                      {performance.completionRate}%
                    </span>
                    <span className="text-[10px] text-neutral-400">Penyelesaian</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-100 flex items-center justify-between text-xs mt-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-neutral-400" />
                <span className="text-neutral-600">Rata-rata Respon Tukang</span>
              </div>
              <span className="font-semibold text-neutral-900 tabular-nums">
                {performance.avgResponseTime}
              </span>
            </div>
          </div>

          {/* Top 5 Performers Card */}
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-800">
                Peringkat Terbaik
              </h3>

              <div className="flex rounded-lg bg-neutral-100 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setTopTab("workers")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    topTab === "workers"
                      ? "bg-white text-lavender-700 font-semibold shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Tukang
                </button>
                <button
                  type="button"
                  onClick={() => setTopTab("categories")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    topTab === "categories"
                      ? "bg-white text-lavender-700 font-semibold shadow-xs"
                      : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  Kategori
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {topTab === "workers" ? (
                topWorkers.map((tw, idx) => (
                  <div key={tw.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center font-bold text-neutral-400">
                        {idx + 1}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={tw.avatar || "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100"}
                        alt={tw.name}
                        className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                      />
                      <div>
                        <span className="font-semibold text-neutral-800 block">
                          {tw.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {tw.category}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-lavender-700 tabular-nums">
                      {tw.completedCount} selesai
                    </span>
                  </div>
                ))
              ) : (
                topCategories.map((tc, idx) => (
                  <div key={tc.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 text-center font-bold text-neutral-400">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-semibold text-neutral-800 block">
                          {tc.name}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {tc.orderCount} pesanan
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-neutral-800 tabular-nums">
                      {formatRupiah(tc.revenue)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RECENT ORDERS TABLE (5 ROWS) */}
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-neutral-800">
                Pesanan Terbaru
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                5 pesanan terakhir yang diproses di platform
              </p>
            </div>
            <Link
              href="/admin/orders"
              className="inline-flex items-center gap-1 text-xs font-semibold text-lavender-600 hover:text-lavender-700"
            >
              <span>Lihat Semua Pesanan</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-100 text-neutral-400 font-medium">
                  <th className="pb-3 font-medium">Kode Pesanan</th>
                  <th className="pb-3 font-medium">Pelanggan</th>
                  <th className="pb-3 font-medium">Paket Layanan</th>
                  <th className="pb-3 font-medium">Tukang</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-3 font-mono font-semibold text-neutral-900">
                      <Link
                        href={`/admin/orders/${ord.id}`}
                        className="hover:text-lavender-600 hover:underline"
                      >
                        {ord.order_code}
                      </Link>
                    </td>
                    <td className="py-3 font-medium text-neutral-800">
                      {ord.customer.name}
                      {ord.customer.is_plus && (
                        <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded text-[10px] bg-lavender-100 text-lavender-700 font-bold">
                          Plus
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-neutral-600">{ord.package.name}</td>
                    <td className="py-3 text-neutral-600">
                      {ord.worker ? ord.worker.name : "Belum ditugaskan"}
                    </td>
                    <td className="py-3">
                      <StatusBadge status={ord.status} size="sm" />
                    </td>
                    <td className="py-3 font-semibold text-neutral-900 tabular-nums text-right">
                      {formatRupiah(ord.total)}
                    </td>
                    <td className="py-3 text-neutral-400 text-right">
                      {formatRelativeTime(ord.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
