"use client";

import React, { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ArrowRight, Calendar1, Filter } from "@/lib/icons";

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
  const [selectedView, setSelectedView] = useState<"monthly" | "weekly">("monthly");

  // Intensity color map
  const getCellColor = (level: number) => {
    switch (level) {
      case 0:
        return "bg-neutral-100 hover:ring-1 hover:ring-neutral-300";
      case 1:
        return "bg-lavender-200 hover:ring-1 hover:ring-lavender-300";
      case 2:
        return "bg-lavender-300 hover:ring-1 hover:ring-lavender-400";
      case 3:
        return "bg-lavender-500 hover:ring-1 hover:ring-lavender-600";
      case 4:
        return "bg-lavender-600 hover:ring-1 hover:ring-lavender-700";
      default:
        return "bg-neutral-100";
    }
  };

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">
            Aktivitas Pesanan & Operasional
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Intensitas pengerjaan jasa dan pemenuhan pesanan sepanjang tahun {year}
          </p>
        </div>

        {/* Toolbar controls mimicking the reference image */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
          >
            <Filter size={14} />
            <span>Filter</span>
          </button>

          <select
            value={selectedView}
            onChange={(e) => setSelectedView(e.target.value as "monthly" | "weekly")}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 text-xs font-medium text-neutral-600 bg-white hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-lavender-300 transition-colors"
          >
            <option value="monthly">Bulanan</option>
            <option value="weekly">Mingguan</option>
          </select>

          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Bandingkan
          </button>
        </div>
      </div>

      {/* Grid of Heatmap across 12 months */}
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
                        className={cn(
                          "w-2.5 h-2.5 rounded-[3px] transition-all cursor-pointer",
                          getCellColor(level)
                        )}
                        title={`${m.monthName} - Hari aktif intensitas level ${level}`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer statistics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-neutral-100 mt-4 text-xs">
        <div className="flex items-center gap-4 text-neutral-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lavender-600" />
            <span className="font-medium text-neutral-700">{activeDays}</span>
            <span>Hari Aktif di {year}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar1 size={14} className="text-neutral-400" />
            <span>Bulan Terbaik:</span>
            <span className="font-medium text-neutral-700">
              {bestMonth} ({bestMonthRate})
            </span>
          </div>
        </div>

        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-1 font-medium text-neutral-600 hover:text-lavender-700 transition-colors group"
        >
          <span>Lihat semua detail</span>
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  );
}
