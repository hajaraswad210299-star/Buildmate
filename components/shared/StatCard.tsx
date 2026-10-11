"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { formatRupiah, formatPercent } from "@/lib/format";
import { ArrowRight, ArrowUp, ArrowDown, More } from "@/lib/icons";

export interface SubStat {
  label: string;
  value: string;
  ticks?: number; // 0-10
}

interface StatCardProps {
  title: string;
  value: number;
  isCurrency?: boolean;
  deltaPercent?: number;
  isPositiveDelta?: boolean;
  deltaLabel?: string;
  accent?: "lavender" | "success" | "info" | "warning" | "orange" | "teal";
  linkText?: string;
  linkHref?: string;
  subStats?: SubStat[];
  className?: string;
}

export function StatCard({
  title,
  value,
  isCurrency = false,
  deltaPercent,
  isPositiveDelta = true,
  deltaLabel = "vs periode lalu",
  accent = "lavender",
  linkText,
  linkHref,
  subStats,
  className,
}: StatCardProps) {
  const animatedValue = useCountUp(value, { duration: 900 });

  const formattedDisplay = isCurrency
    ? formatRupiah(animatedValue)
    : animatedValue.toLocaleString("id-ID");

  const accentColors = {
    lavender: {
      bar: "bg-lavender-600",
      text: "text-lavender-600",
      bgSub: "bg-lavender-50",
      tick: "bg-lavender-400",
    },
    success: {
      bar: "bg-success-600",
      text: "text-success-600",
      bgSub: "bg-success-50",
      tick: "bg-success-500",
    },
    info: {
      bar: "bg-info-600",
      text: "text-info-600",
      bgSub: "bg-info-50",
      tick: "bg-info-400",
    },
    warning: {
      bar: "bg-warning-600",
      text: "text-warning-600",
      bgSub: "bg-warning-50",
      tick: "bg-warning-400",
    },
    orange: {
      bar: "bg-orange-600",
      text: "text-orange-600",
      bgSub: "bg-orange-50",
      tick: "bg-orange-400",
    },
    teal: {
      bar: "bg-teal-600",
      text: "text-teal-600",
      bgSub: "bg-teal-50",
      tick: "bg-teal-400",
    },
  }[accent];

  return (
    <div
      className={cn(
        "group relative bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col justify-between",
        className
      )}
    >
      <div>
        {/* Top Header Row: Accent Bar 3x16px + Label 13/500 muted + More button */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("w-[3px] h-4 rounded-full shrink-0", accentColors.bar)} />
            <span className="text-[13px] font-medium text-neutral-500 truncate">{title}</span>
          </div>

          <button
            type="button"
            className="text-neutral-400 hover:text-neutral-700 transition-opacity opacity-0 group-hover:opacity-100 p-0.5"
            title="Lihat detail"
          >
            <More size={16} />
          </button>
        </div>

        {/* Big Metric Number (32px tabular) */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-[32px] leading-tight font-semibold tracking-tight text-neutral-900 tabular-nums">
            {formattedDisplay}
          </span>
        </div>

        {/* Delta Chip: ArrowUp/ArrowDown 12px + Persen dengan koma (e.g. +12,5%) */}
        {deltaPercent !== undefined && (
          <div className="flex items-center gap-1.5 text-xs mb-3">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 font-medium px-1.5 py-0.5 rounded-md text-[11px]",
                isPositiveDelta
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-700"
              )}
            >
              {isPositiveDelta ? (
                <ArrowUp size={12} className="shrink-0" />
              ) : (
                <ArrowDown size={12} className="shrink-0" />
              )}
              {formatPercent(deltaPercent, false)}
            </span>
            {deltaLabel && <span className="text-neutral-400 text-[11px]">{deltaLabel}</span>}
          </div>
        )}

        {/* Mini Sub-Stats with fine tick bars visualizer (only defined sub-metrics) */}
        {subStats && subStats.length > 0 && (
          <div className="grid grid-cols-2 gap-3 pt-3 pb-1 border-t border-neutral-100 mt-2">
            {subStats.map((sub, i) => (
              <div key={i} className="flex flex-col min-w-0">
                <span className="text-[11px] text-neutral-400 truncate">{sub.label}</span>
                <span className="text-xs font-semibold text-neutral-800 tabular-nums mt-0.5">
                  {sub.value}
                </span>

                {/* Fine vertical tick bars visualizer */}
                <div className="flex items-center gap-[2px] mt-1.5 h-2 overflow-hidden">
                  {Array.from({ length: 10 }).map((_, tickIdx) => {
                    const activeLimit = Math.round(((sub.ticks || 5) / 10) * 10);
                    const isActive = tickIdx < activeLimit;
                    return (
                      <span
                        key={tickIdx}
                        className={cn(
                          "w-[2px] h-full rounded-full transition-all shrink-0",
                          isActive ? accentColors.tick : "bg-neutral-100"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Link (for current cards without delta, or detail link) */}
      {linkHref && linkText && (
        <div className="pt-3 border-t border-neutral-100 mt-3 flex items-center justify-between text-xs">
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-lavender-700 transition-colors group-hover:text-lavender-600"
          >
            <span>{linkText.replace(/\s*→\s*$/, "")}</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
