"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { Clock, TickCircle, Drop, Brush2, Ruler, Wind, Setting4, ArrowRight } from "@/lib/icons";

interface PackageCardProps {
  id: string;
  name: string;
  categoryName: string;
  categorySlug?: string;
  imageUrl?: string;
  badge?: string;
  description?: string;
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
  imageUrl,
  badge,
  description,
  price,
  durationMinutes,
  inclusions = [],
  workerCount = 6,
}: PackageCardProps) {
  const [imageError, setImageError] = useState(false);

  const renderCategoryIcon = () => {
    switch (categorySlug.toLowerCase()) {
      case "plumbing":
        return <Drop size={28} variant="Bulk" className="text-lavender-600" />;
      case "pengecatan":
        return <Brush2 size={28} variant="Bulk" className="text-lavender-600" />;
      case "perbaikan-umum":
        return <Ruler size={28} variant="Bulk" className="text-lavender-600" />;
      case "servis-ac":
        return <Wind size={28} variant="Bulk" className="text-lavender-600" />;
      default:
        return <Setting4 size={28} variant="Bulk" className="text-lavender-600" />;
    }
  };

  return (
    <div className="group flex flex-col justify-between rounded-[22px] bg-white border border-neutral-200/90 p-5 sm:p-6 lg:p-6 shadow-xs hover:border-lavender-300 hover:shadow-md transition-all duration-300">
      <div>
        {/* Top Thumbnail Image (from CMS) */}
        <Link
          href={`/services/${id}`}
          className="block relative aspect-[16/10] rounded-2xl overflow-hidden bg-cream-100 border border-neutral-200/80 mb-5 group/thumb"
        >
          {imageUrl && !imageError ? (
            <img
              src={imageUrl}
              alt={name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover/thumb:scale-105 group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-cream-100 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xs">
                {renderCategoryIcon()}
              </div>
            </div>
          )}

          {/* Floating Category Badge (Top-Left) */}
          <div className="absolute top-3.5 left-3.5 z-10">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[11px] font-semibold text-neutral-800 shadow-xs border border-white/60">
              {categoryName}
            </span>
          </div>

          {/* Floating Highlight Badge (Top-Right) */}
          {badge && (
            <div className="absolute top-3.5 right-3.5 z-10">
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-neutral-900/90 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider uppercase shadow-xs">
                {badge}
              </span>
            </div>
          )}
        </Link>

        {/* Package Name (Instrument Serif 24px) */}
        <Link href={`/services/${id}`} className="block group/title mb-2.5">
          <h3 className="font-serif text-[23px] sm:text-[25px] text-neutral-900 leading-snug tracking-tight group-hover/title:text-lavender-700 transition-colors line-clamp-2">
            {name}
          </h3>
        </Link>

        {/* Duration & Availability */}
        <div className="flex items-center gap-3 text-xs sm:text-[13px] text-neutral-500 mb-3.5">
          <div className="flex items-center gap-1.5 font-medium">
            <Clock size={15} className="text-neutral-400" />
            <span>{durationMinutes} menit</span>
          </div>
          <span>•</span>
          <Link
            href={`/search?category=${categorySlug}&package=${id}`}
            className="hover:text-lavender-700 hover:underline transition-colors font-medium text-neutral-600"
          >
            {workerCount} tukang siap
          </Link>
        </div>

        {/* Short Description if available */}
        {description && (
          <p className="text-xs sm:text-[13px] text-neutral-500 line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>
        )}

        {/* 2 Inclusions Points */}
        <div className="space-y-2 mb-6">
          {inclusions.slice(0, 2).map((item, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs sm:text-[13px] text-neutral-600">
              <TickCircle size={15} className="text-emerald-600 shrink-0 mt-0.5" variant="Bold" />
              <span className="line-clamp-1">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Price & Dual Action Buttons */}
      <div className="pt-4 border-t border-neutral-100">
        <div className="mb-3.5 flex items-baseline justify-between">
          <div>
            <span className="text-[11px] text-neutral-400 block uppercase font-medium tracking-wider">
              Harga paket pasti
            </span>
            <span className="text-2xl font-bold text-neutral-900 font-sans tracking-tight">
              {formatRupiah(price)}
            </span>
          </div>
          <span className="text-[11px] text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            Garansi 14 Hari
          </span>
        </div>

        {/* Dual Actions: Detail Layanan & Pesan Sekarang */}
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/services/${id}`}
            className="py-3 px-3.5 rounded-full border border-neutral-200 hover:border-neutral-900 hover:bg-neutral-50 active:scale-[0.98] text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center justify-center transition-all text-center"
          >
            Detail Layanan
          </Link>

          <Link
            href={`/order/${id}`}
            className="py-3 px-3.5 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-all shadow-xs text-center"
          >
            <span>Pesan</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
