"use client";

import React from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { Clock, TickCircle, Drop, Brush2, Ruler, Wind, Setting4 } from "@/lib/icons";

interface PackageCardProps {
  id: string;
  name: string;
  categoryName: string;
  categorySlug?: string;
  price: number;
  durationMinutes: number;
  inclusions?: string[];
  workerCount?: number;
}

export function PackageCard({
  id,
  name,
  categoryName,
  categorySlug = "plumbing",
  price,
  durationMinutes,
  inclusions = [],
  workerCount = 6,
}: PackageCardProps) {
  const renderCategoryIcon = () => {
    switch (categorySlug.toLowerCase()) {
      case "plumbing":
        return <Drop size={24} variant="Bulk" className="text-lavender-600" />;
      case "pengecatan":
        return <Brush2 size={24} variant="Bulk" className="text-lavender-600" />;
      case "perbaikan-umum":
        return <Ruler size={24} variant="Bulk" className="text-lavender-600" />;
      case "servis-ac":
        return <Wind size={24} variant="Bulk" className="text-lavender-600" />;
      default:
        return <Setting4 size={24} variant="Bulk" className="text-lavender-600" />;
    }
  };

  return (
    <div className="group flex flex-col justify-between rounded-2xl bg-white border border-neutral-200/90 p-5 shadow-xs hover:border-lavender-300 hover:shadow-md transition-all duration-200">
      <div>
        {/* Top Tile cream-100 with Category Badge */}
        <div className="h-28 rounded-xl bg-cream-100 border border-cream-200/60 flex items-center justify-between p-4 mb-4 relative overflow-hidden group-hover:bg-cream-50 transition-colors">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white text-[11px] font-semibold text-neutral-700 shadow-xs border border-neutral-200/60">
            {categoryName}
          </span>
          <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur-sm flex items-center justify-center shadow-xs">
            {renderCategoryIcon()}
          </div>
        </div>

        {/* Package Name (Instrument Serif 22px) */}
        <h3 className="font-serif text-[22px] text-neutral-900 leading-snug tracking-tight mb-2">
          {name}
        </h3>

        {/* Duration & Availability */}
        <div className="flex items-center gap-3 text-xs text-neutral-500 mb-4">
          <div className="flex items-center gap-1.5">
            <Clock size={14} className="text-neutral-400" />
            <span>{durationMinutes} menit</span>
          </div>
          <span>•</span>
          <span>{workerCount} tukang siap</span>
        </div>

        {/* 2 Inclusions Points */}
        <div className="space-y-1.5 mb-5">
          {inclusions.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-neutral-600">
              <TickCircle size={14} className="text-emerald-600 shrink-0 mt-0.5" variant="Bold" />
              <span className="line-clamp-1">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Price & Button */}
      <div className="pt-4 border-t border-neutral-100">
        <div className="mb-3">
          <span className="text-[11px] text-neutral-400 block">Harga paket pasti</span>
          <span className="text-xl font-semibold text-neutral-900 font-sans tracking-tight">
            {formatRupiah(price)}
          </span>
        </div>

        <Link
          href={`/search?category=${categorySlug}&package=${id}`}
          className="w-full py-2.5 px-4 rounded-full border border-neutral-300 hover:border-lavender-600 hover:bg-lavender-50 active:scale-[0.98] text-xs font-semibold uppercase tracking-wider text-neutral-800 hover:text-lavender-700 flex items-center justify-center gap-1 transition-all"
        >
          <span>Lihat Tukang</span>
          <span>·</span>
          <span>{formatRupiah(price)}</span>
        </Link>
      </div>
    </div>
  );
}
