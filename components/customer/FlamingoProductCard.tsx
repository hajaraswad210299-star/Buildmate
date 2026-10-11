"use client";

import React from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { Clock, ShieldTick, ArrowRight } from "@/lib/icons";

interface FlamingoProductCardProps {
  id: string;
  name: string;
  categoryName: string;
  categorySlug?: string;
  price: number;
  durationMinutes: number;
  imageUrl: string;
  badge?: string;
  description?: string;
}

export function FlamingoProductCard({
  id,
  name,
  categoryName,
  categorySlug = "plumbing",
  price,
  durationMinutes,
  imageUrl,
  badge,
  description,
}: FlamingoProductCardProps) {
  return (
    <div className="group flex flex-col justify-between text-left rounded-[24px] bg-[#FAF8F5] border border-[#EBE7DF] p-5 sm:p-6 lg:p-7 hover:border-lavender-400 hover:shadow-md transition-all duration-300">
      <div>
        {/* Still Life Photo Container */}
        <div className="relative aspect-square rounded-[18px] bg-[#F3EFE6] overflow-hidden mb-5 border border-[#E5E0D5]">
          <img
            src={imageUrl}
            alt={name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          />
          {badge && (
            <span className="absolute top-3.5 left-3.5 px-3 py-1 rounded-full bg-white/95 text-[10px] font-semibold uppercase tracking-wider text-neutral-800 shadow-xs border border-neutral-100 font-sans">
              {badge}
            </span>
          )}
        </div>

        {/* Category & Duration */}
        <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-2 font-medium font-sans">
          <span className="uppercase tracking-wider text-neutral-500">
            {categoryName}
          </span>
          <span className="flex items-center gap-1 text-neutral-400">
            <Clock size={12} />
            <span>{durationMinutes} mnt</span>
          </span>
        </div>

        {/* Title in Instrument Serif */}
        <h3 className="font-serif text-[22px] sm:text-[24px] text-neutral-900 leading-snug tracking-tight mb-2.5 group-hover:text-lavender-800 transition-colors">
          {name}
        </h3>

        {description && (
          <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed mb-4 font-normal font-sans">
            {description}
          </p>
        )}
      </div>

      {/* Price & Pill Button (Flamingo Estate Style) */}
      <div className="pt-4 border-t border-[#E8E4DA] flex items-center justify-between">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium font-sans">
            Tarif Paket
          </span>
          <span className="text-base sm:text-lg font-semibold text-neutral-900 font-sans tracking-tight">
            {formatRupiah(price)}
          </span>
        </div>

        <Link
          href={`/order/${id}`}
          className="px-4 py-2 rounded-full bg-[#242A24] hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-xs"
        >
          Pesan
        </Link>
      </div>
    </div>
  );
}
