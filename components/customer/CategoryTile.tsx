"use client";

import React from "react";
import Link from "next/link";
import { Drop, Brush2, Ruler, Wind, Setting4 } from "@/lib/icons";

interface CategoryTileProps {
  name: string;
  slug: string;
  icon?: string;
  startingPrice?: number;
  packageCount?: number;
}

export function CategoryTile({
  name,
  slug,
  icon,
  startingPrice = 100000,
  packageCount,
}: CategoryTileProps) {
  const renderIcon = () => {
    switch (slug) {
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
    <Link
      href={`/search?category=${slug}`}
      className="group block p-5 rounded-2xl bg-white border border-neutral-200/90 shadow-xs hover:border-lavender-300 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
    >
      <div className="flex flex-col items-start gap-4">
        {/* Bulk Icon inside lavender-50 Circle */}
        <div className="w-14 h-14 rounded-2xl bg-lavender-50 border border-lavender-100 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
          {renderIcon()}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-neutral-900 group-hover:text-lavender-700 transition-colors">
            {name}
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Mulai Rp{(startingPrice / 1000).toLocaleString("id-ID")}rb
          </p>
          {packageCount !== undefined && (
            <p className="text-[11px] text-neutral-400 mt-1">
              {packageCount} paket tersedia
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
