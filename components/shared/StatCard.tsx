"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";
import { formatRupiah } from "@/lib/format";
import { ArrowRight, More } from "@/lib/icons";

interface SubStat {
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
  icon?: React.ReactNode;
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
  deltaLabel,
  accent = "lavender",
  linkText = "Lihat detail",
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
      {/* Top Header Row */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Top colored accent pill / dash mirroring the reference image */}
            <span className={cn("w-3.5 h-1 rounded-full", accentColors.bar)} />
            <span className="text-xs font-medium text-neutral-500">{title}</span>
          </div>

          <button
            type="button"
            className="text-neutral-400 hover:text-neutral-700 transition-colors opacity-60 group-hover:opacity-100 p-0.5"
            title="Opsi detail"
          >
            <More size={16} />
          </button>
        </div>

        {/* Big Metric Number */}
        <div className="flex items-baseline gap-2 mb-1.5">
          <span className="text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 tabular-nums">
            {formattedDisplay}
          </span>
        </div>

        {/* Delta Chip */}
        {deltaPercent !== undefined && (
          <div className="flex items-center gap-1.5 text-xs mb-4">
            <span
              className={cn(
                "inline-flex items-center font-medium px-1.5 py-0.5 rounded-md text-[11px]",
                isPositiveDelta
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-700"
              )}
            >
              {isPositiveDelta ? "+" : "-"}
              {deltaPercent}%
            </span>
            {deltaLabel && <span className="text-neutral-400 text-[11px]">{deltaLabel}</span>}
          </div>
        )}

        {/* Mini stats underneath with fine tick bars mirroring the reference image */}
        {subStats && subStats.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 pb-2 border-t border-neutral-100 mt-2">
            {subStats.map((sub, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[10px] text-neutral-400 truncate">{sub.label}</span>
                <span className="text-xs font-semibold text-neutral-800 tabular-nums mt-0.5">
                  {sub.value}
                </span>

                {/* Fine vertical tick bars visualizer */}
                <div className="flex items-center gap-[2px] mt-1.5 h-2.5 overflow-hidden">
                  {Array.from({ length: 14 }).map((_, tickIdx) => {
                    const activeLimit = Math.round(((sub.ticks || 5) / 10) * 14);
                    const isActive = tickIdx < activeLimit;
                    return (
                      <span
                        key={tickIdx}
                        className={cn(
                          "w-[2px] h-full rounded-full transition-all",
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

      {/* Footer Link */}
      {linkHref && (
        <div className="pt-3 border-t border-neutral-100 mt-3 flex items-center justify-between text-xs">
          <Link
            href={linkHref}
            className="inline-flex items-center gap-1.5 font-medium text-neutral-500 hover:text-lavender-700 transition-colors group-hover:text-lavender-600"
          >
            <span>{linkText}</span>
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
