"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Calendar1,
  Filter,
  CloseCircle,
  TickCircle,
  Flash,
  Chart,
  Refresh,
} from "@/lib/icons";
import { Button } from "@/components/shared/Button";

interface MonthData {
  monthName: string;
  weeks: number[][]; // array of weeks, each week has days with intensity 0-4
}

interface ActivityHeatmapProps {
  year?: number;
  activeDays?: number;
  bestMonth?: string;
  bestMonthRate?: string;
  months?: MonthData[];
  className?: string;
}

export function ActivityHeatmap({
  year = 2026,
  activeDays = 218,
  bestMonth = "September",
  bestMonthRate = "92% aktivitas",
  months = [],
  className,
}: ActivityHeatmapProps) {
  // View states: 'monthly' | 'quarterly' | 'weekly'
  const [selectedView, setSelectedView] = useState<"monthly" | "quarterly" | "weekly">("monthly");

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [intensityFilter, setIntensityFilter] = useState<"all" | "high" | "normal" | "zero">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Comparison modal state
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [comparePeriod, setComparePeriod] = useState<"yoy" | "semester">("yoy");

  // Cell hover / active inspection tooltip
  const [hoveredCell, setHoveredCell] = useState<{
    month: string;
    weekIdx: number;
    dayIdx: number;
    level: number;
    x: number;
    y: number;
  } | null>(null);

  // Check if any filter is active
  const isFilterActive = intensityFilter !== "all" || categoryFilter !== "all";

  // Filter evaluation helper
  const isCellMatched = (level: number) => {
    if (intensityFilter === "high") return level >= 3;
    if (intensityFilter === "normal") return level === 1 || level === 2;
    if (intensityFilter === "zero") return level === 0;
    return true;
  };

  // Intensity color map with filter dimming
  const getCellColor = (level: number) => {
    const matched = isCellMatched(level);
    if (!matched) {
      return "bg-neutral-100 opacity-20";
    }

    switch (level) {
      case 0:
        return "bg-neutral-100 hover:ring-2 hover:ring-neutral-300";
      case 1:
        return "bg-lavender-200 hover:ring-2 hover:ring-lavender-300";
      case 2:
        return "bg-lavender-300 hover:ring-2 hover:ring-lavender-400";
      case 3:
        return "bg-lavender-500 hover:ring-2 hover:ring-lavender-600";
      case 4:
        return "bg-lavender-600 hover:ring-2 hover:ring-lavender-700";
      default:
        return "bg-neutral-100";
    }
  };

  // Calculated active days based on filter
  const displayedActiveDays = useMemo(() => {
    if (!isFilterActive) return activeDays;
    let count = 0;
    months.forEach((m) => {
      m.weeks.forEach((w) => {
        w.forEach((l) => {
          if (l > 0 && isCellMatched(l)) {
            count++;
          }
        });
      });
    });
    return count;
  }, [months, activeDays, isFilterActive, intensityFilter]);

  // Quarterly aggregated data
  const quarters = useMemo(() => {
    const qList = [
      { name: "Kuartal 1 (Jan - Mar)", monthsIdx: [0, 1, 2], target: 120 },
      { name: "Kuartal 2 (Apr - Jun)", monthsIdx: [3, 4, 5], target: 140 },
      { name: "Kuartal 3 (Jul - Sep)", monthsIdx: [6, 7, 8], target: 160 },
      { name: "Kuartal 4 (Okt - Des)", monthsIdx: [9, 10, 11], target: 150 },
    ];

    return qList.map((q) => {
      let activeCount = 0;
      let totalLevel = 0;
      let cellCount = 0;
      const quarterMonths = q.monthsIdx
        .map((idx) => months[idx])
        .filter(Boolean);

      quarterMonths.forEach((m) => {
        m.weeks.forEach((w) => {
          w.forEach((l) => {
            cellCount++;
            if (l > 0) activeCount++;
            totalLevel += l;
          });
        });
      });

      const maxPossibleLevel = cellCount * 4;
      const percentage = maxPossibleLevel > 0 ? Math.round((totalLevel / maxPossibleLevel) * 100) : 0;
      const estimatedOrders = Math.round(activeCount * 2.8);

      return {
        name: q.name,
        months: quarterMonths,
        activeCount,
        percentage,
        estimatedOrders,
      };
    });
  }, [months]);

  // 16 Weeks trend data
  const weeklyTrends = useMemo(() => {
    const list: {
      weekNumber: number;
      label: string;
      days: number[];
      avgIntensity: number;
      orders: number;
    }[] = [];

    let count = 1;
    // Flatten last 4 months (16 weeks)
    const recentMonths = months.slice(8, 12);
    recentMonths.forEach((m) => {
      m.weeks.forEach((w, wIdx) => {
        const sum = w.reduce((a, b) => a + b, 0);
        const avg = Math.round((sum / (w.length * 4)) * 100);
        list.push({
          weekNumber: count,
          label: `${m.monthName} M${wIdx + 1}`,
          days: w,
          avgIntensity: avg,
          orders: Math.round(sum * 3.5),
        });
        count++;
      });
    });

    return list;
  }, [months]);

  const resetFilters = () => {
    setIntensityFilter("all");
    setCategoryFilter("all");
    setIsFilterOpen(false);
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs transition-all duration-200 hover:shadow-md relative",
        className
      )}
    >
      {/* HEADER & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
            Aktivitas Pesanan & Operasional
            {isFilterActive && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lavender-100 text-lavender-700">
                Filter Aktif
              </span>
            )}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Intensitas pengerjaan jasa dan pemenuhan pesanan sepanjang tahun {year}
          </p>
        </div>

        {/* TOOLBAR CONTROLS */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 1. TOMBOL FILTER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all shadow-2xs",
                isFilterActive || isFilterOpen
                  ? "bg-lavender-50 border-lavender-300 text-lavender-800 ring-1 ring-lavender-200"
                  : "border-neutral-200/90 text-neutral-700 hover:bg-neutral-50"
              )}
            >
              <Filter size={14} className={isFilterActive ? "text-lavender-700" : "text-neutral-500"} />
              <span>Filter</span>
              {isFilterActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-lavender-600 ml-0.5" />
              )}
            </button>

            {/* Filter Dropdown Popover */}
            {isFilterOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-neutral-200/90 p-4 z-40 animate-in fade-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-neutral-100 mb-3">
                  <span className="text-xs font-bold text-neutral-900">Filter Aktivitas</span>
                  <button
                    type="button"
                    onClick={() => setIsFilterOpen(false)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <CloseCircle size={16} />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Tingkat Intensitas */}
                  <div>
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1.5 uppercase tracking-wider">
                      Tingkat Kepadatan
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: "all", label: "Semua Tingkat" },
                        { id: "high", label: "Tinggi & Puncak (Level 3-4)" },
                        { id: "normal", label: "Normal (Level 1-2)" },
                        { id: "zero", label: "Tanpa Aktivitas (Level 0)" },
                      ].map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="intensityFilter"
                            checked={intensityFilter === item.id}
                            onChange={() => setIntensityFilter(item.id as any)}
                            className="text-lavender-600 focus:ring-lavender-300"
                          />
                          <span className="text-neutral-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Kategori Jasa */}
                  <div className="pt-2 border-t border-neutral-100">
                    <label className="text-[11px] font-semibold text-neutral-500 block mb-1.5 uppercase tracking-wider">
                      Kategori Layanan
                    </label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full p-2 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-700"
                    >
                      <option value="all">Semua Kategori</option>
                      <option value="plumbing">Plumbing & Pipa</option>
                      <option value="pengecatan">Pengecatan Dinding</option>
                      <option value="perbaikan-umum">Perbaikan Umum</option>
                      <option value="servis-ac">Servis AC Ringan</option>
                    </select>
                  </div>
                </div>

                {/* Footer Popover */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 mt-3">
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-xs text-neutral-500 hover:text-neutral-800 underline"
                  >
                    Reset
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Terapkan
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. DROPDOWN PILIHAN TAMPILAN: BULANAN / KUARTAL / MINGGUAN */}
          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as any)}
            className="px-3 py-1.5 rounded-lg border border-neutral-200/90 text-xs font-medium text-neutral-700 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-lavender-300 shadow-2xs transition-colors cursor-pointer"
          >
            <option value="monthly">Bulanan (12 Bulan)</option>
            <option value="quarterly">Kuartal (Q1 - Q4)</option>
            <option value="weekly">Mingguan (16 Minggu)</option>
          </select>

          {/* 3. TOMBOL BANDINGKAN */}
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Chart size={14} />
            <span>Bandingkan</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: BULANAN (DEFAULT ANNUAL HEATMAP) */}
      {selectedView === "monthly" && (
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[760px] grid grid-cols-12 gap-3">
            {months.map((m, mIdx) => (
              <div key={mIdx} className="flex flex-col">
                <span className="text-[11px] font-medium text-neutral-400 mb-2 text-center">
                  {m.monthName}
                </span>
                <div className="grid grid-cols-4 gap-1">
                  {m.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-1">
                      {week.map((level, dIdx) => (
                        <div
                          key={dIdx}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setHoveredCell({
                              month: m.monthName,
                              weekIdx: wIdx + 1,
                              dayIdx: dIdx + 1,
                              level,
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            });
                          }}
                          onMouseLeave={() => setHoveredCell(null)}
                          className={cn(
                            "w-2.5 h-2.5 rounded-[3px] transition-all cursor-pointer",
                            getCellColor(level)
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: KUARTAL (Q1 - Q4) */}
      {selectedView === "quarterly" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-2 animate-in fade-in duration-150">
          {quarters.map((q, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-neutral-200/90 bg-neutral-50/50 hover:bg-white hover:border-lavender-200 hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900">{q.name}</span>
                <span className="text-[11px] font-bold text-lavender-700 bg-lavender-100 px-2 py-0.5 rounded-full">
                  {q.percentage}% Kapasitas
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-neutral-200/70 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-lavender-600 h-full rounded-full transition-all duration-500"
                  style={{ width: `${q.percentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-neutral-600 pt-1">
                <span>{q.activeCount} Hari Aktif</span>
                <span className="font-semibold text-neutral-800">
                  ~{q.estimatedOrders} Pesanan
                </span>
              </div>

              {/* Mini Heatmap Preview */}
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between gap-1">
                {q.months.map((m, mIdx) => (
                  <div key={mIdx} className="text-center flex-1">
                    <span className="text-[10px] text-neutral-400 block mb-1">{m.monthName}</span>
                    <div className="grid grid-cols-2 gap-0.5 max-w-[28px] mx-auto">
                      {m.weeks.slice(0, 2).map((w, wIdx) => (
                        <div
                          key={wIdx}
                          className={cn("w-2 h-2 rounded-xs", getCellColor(w[0] || 0))}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE 3: MINGGUAN (16 WEEKS TREND) */}
      {selectedView === "weekly" && (
        <div className="overflow-x-auto pb-2 py-1 animate-in fade-in duration-150">
          <div className="min-w-[700px] flex items-end gap-2 h-36 pt-4 px-2">
            {weeklyTrends.map((w, idx) => (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-1.5 group cursor-pointer"
                title={`${w.label}: ~${w.orders} pesanan (${w.avgIntensity}% kapasitas)`}
              >
                <span className="text-[10px] font-semibold text-lavender-700 opacity-0 group-hover:opacity-100 transition-opacity">
                  {w.orders}
                </span>
                <div className="w-full bg-neutral-100 rounded-lg h-24 flex items-end p-1 overflow-hidden">
                  <div
                    className="w-full bg-lavender-500 hover:bg-lavender-600 rounded-md transition-all duration-300"
                    style={{ height: `${Math.max(w.avgIntensity, 12)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 font-medium truncate w-full text-center">
                  {w.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CELL HOVER TOOLTIP */}
      {hoveredCell && (
        <div
          className="fixed pointer-events-none z-50 -translate-x-1/2 -translate-y-full mb-2 bg-neutral-900 text-white rounded-xl px-3 py-2 text-[11px] shadow-xl space-y-0.5 animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8,
          }}
        >
          <div className="font-bold">
            {hoveredCell.month} • Pekan {hoveredCell.weekIdx}, Hari {hoveredCell.dayIdx}
          </div>
          <div className="text-neutral-300 flex items-center gap-1">
            <span
              className={cn(
                "w-2 h-2 rounded-full inline-block",
                hoveredCell.level >= 3
                  ? "bg-lavender-400"
                  : hoveredCell.level > 0
                  ? "bg-lavender-300"
                  : "bg-neutral-500"
              )}
            />
            <span>
              {hoveredCell.level === 4
                ? "Puncak Operasional (~18-24 pesanan)"
                : hoveredCell.level === 3
                ? "Beban Tinggi (~12-17 pesanan)"
                : hoveredCell.level === 2
                ? "Normal Standar (~7-11 pesanan)"
                : hoveredCell.level === 1
                ? "Aktivitas Ringan (~1-6 pesanan)"
                : "Tidak Ada Pengerjaan"}
            </span>
          </div>
        </div>
      )}

      {/* FOOTER STATISTICS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100 mt-4 text-xs">
        <div className="flex items-center gap-4 text-neutral-500 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lavender-600" />
            <span className="font-bold text-neutral-800">{displayedActiveDays}</span>
            <span>Hari Aktif {isFilterActive ? "(Sesuai Filter)" : `di ${year}`}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar1 size={14} className="text-neutral-400" />
            <span>Bulan Terbaik:</span>
            <span className="font-semibold text-neutral-800">
              {bestMonth} ({bestMonthRate})
            </span>
          </div>

          {isFilterActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-lavender-700 hover:underline font-medium text-[11px] flex items-center gap-1"
            >
              <Refresh size={12} />
              Reset Filter
            </button>
          )}
        </div>

        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 font-semibold text-neutral-600 hover:text-lavender-700 transition-colors group"
        >
          <span>Lihat semua detail</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* MODAL BANDINGKAN TAHUNAN / PERIODE */}
      {isCompareModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsCompareModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-neutral-100 overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-lavender-100 text-lavender-700 flex items-center justify-center">
                  <Chart size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Perbandingan Kinerja Operasional
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Analisis komparatif intensitas pengerjaan jasa dan pemenuhan pesanan
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <CloseCircle size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5 text-xs">
              {/* Segmented Period Tabs */}
              <div className="flex items-center gap-2 p-1 bg-neutral-100 rounded-xl max-w-xs">
                <button
                  type="button"
                  onClick={() => setComparePeriod("yoy")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg font-medium transition-all",
                    comparePeriod === "yoy"
                      ? "bg-white text-neutral-900 shadow-2xs font-bold"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  2026 vs 2025 (YoY)
                </button>
                <button
                  type="button"
                  onClick={() => setComparePeriod("semester")}
                  className={cn(
                    "flex-1 py-1.5 px-3 rounded-lg font-medium transition-all",
                    comparePeriod === "semester"
                      ? "bg-white text-neutral-900 shadow-2xs font-bold"
                      : "text-neutral-600 hover:text-neutral-900"
                  )}
                >
                  Semester 1 vs 2
                </button>
              </div>

              {/* KPI Comparison Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  {
                    label: "Hari Aktif",
                    valCurrent: comparePeriod === "yoy" ? "218 Hari" : "112 Hari",
                    valPrev: comparePeriod === "yoy" ? "176 Hari" : "106 Hari",
                    growth: "+23.8%",
                  },
                  {
                    label: "Kapasitas Rata-rata",
                    valCurrent: comparePeriod === "yoy" ? "82%" : "84%",
                    valPrev: comparePeriod === "yoy" ? "68%" : "79%",
                    growth: "+14.0%",
                  },
                  {
                    label: "Pesanan/Hari",
                    valCurrent: comparePeriod === "yoy" ? "14.2" : "15.1",
                    valPrev: comparePeriod === "yoy" ? "11.4" : "13.2",
                    growth: "+24.5%",
                  },
                  {
                    label: "Ketepatan SLA",
                    valCurrent: comparePeriod === "yoy" ? "98.4%" : "98.8%",
                    valPrev: comparePeriod === "yoy" ? "94.2%" : "97.5%",
                    growth: "+4.2%",
                  },
                ].map((kpi, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-neutral-100 bg-neutral-50/60 space-y-1"
                  >
                    <span className="text-[11px] text-neutral-500 block truncate">{kpi.label}</span>
                    <div className="font-bold text-neutral-900 text-sm">{kpi.valCurrent}</div>
                    <div className="text-[10px] text-neutral-400 flex items-center justify-between">
                      <span>vs {kpi.valPrev}</span>
                      <span className="font-bold text-emerald-600">{kpi.growth}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Visual Breakdown */}
              <div className="p-4 rounded-xl border border-neutral-100 bg-neutral-50/40 space-y-3">
                <span className="font-bold text-neutral-800 block text-xs">
                  {comparePeriod === "yoy"
                    ? "Tren Pengerjaan Bulanan: 2026 (Lavender) vs 2025 (Abu-abu)"
                    : "Tren Semester: Semester 2 (Lavender) vs Semester 1 (Abu-abu)"}
                </span>

                <div className="space-y-2">
                  {[
                    { label: "Q1 / Triwulan I", c26: 78, c25: 62 },
                    { label: "Q2 / Triwulan II", c26: 84, c25: 70 },
                    { label: "Q3 / Triwulan III (Puncak)", c26: 92, c25: 81 },
                    { label: "Q4 / Triwulan IV", c26: 85, c25: 72 },
                  ].map((row, rIdx) => (
                    <div key={rIdx} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-neutral-600 font-medium">
                        <span>{row.label}</span>
                        <span>{row.c26}% vs {row.c25}%</span>
                      </div>
                      <div className="flex items-center gap-1.5 h-3">
                        <div className="flex-1 bg-neutral-200/60 h-2 rounded-full overflow-hidden flex gap-0.5">
                          <div
                            className="bg-lavender-600 h-full rounded-full"
                            style={{ width: `${row.c26}%` }}
                          />
                        </div>
                        <div className="flex-1 bg-neutral-200/60 h-2 rounded-full overflow-hidden flex gap-0.5">
                          <div
                            className="bg-neutral-400 h-full rounded-full"
                            style={{ width: `${row.c25}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 p-4 bg-neutral-50 border-t border-neutral-100">
              <Button
                variant="secondary"
                size="md"
                onClick={() => setIsCompareModalOpen(false)}
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
