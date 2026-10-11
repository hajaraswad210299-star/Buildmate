"use client";

import React, { useRef } from "react";
import Link from "next/link";
import {
  Drop,
  Brush2,
  Ruler,
  Wind,
  Setting4,
  Flash,
  ShieldTick,
  Home2,
  ArrowRight2,
  ArrowLeft2,
} from "@/lib/icons";

interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  package_count?: number;
}

interface AirbnbCategoryRibbonProps {
  categories: CategoryItem[];
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  className?: string;
}

export function AirbnbCategoryRibbon({
  categories,
  selectedSlug = "all",
  onSelect,
  className = "",
}: AirbnbCategoryRibbonProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getCategoryIcon = (slug: string, iconName?: string) => {
    switch (slug.toLowerCase()) {
      case "plumbing":
        return <Drop size={22} variant="Bulk" />;
      case "pengecatan":
        return <Brush2 size={22} variant="Bulk" />;
      case "perbaikan-umum":
        return <Ruler size={22} variant="Bulk" />;
      case "servis-ac":
        return <Wind size={22} variant="Bulk" />;
      case "kelistrikan":
        return <Flash size={22} variant="Bulk" />;
      default:
        return <Setting4 size={22} variant="Bulk" />;
    }
  };

  const handleScroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    const offset = dir === "left" ? -240 : 240;
    scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
  };

  return (
    <div className={`relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="flex items-center gap-2">
        {/* Left Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          className="hidden sm:flex w-8 h-8 rounded-full border border-neutral-200/90 bg-white items-center justify-center text-neutral-600 hover:text-neutral-900 hover:shadow-xs transition-all shrink-0"
          aria-label="Gulir ke kiri"
        >
          <ArrowLeft2 size={14} />
        </button>

        {/* Categories Strip */}
        <div
          ref={scrollRef}
          className="flex-1 flex items-center gap-6 sm:gap-8 overflow-x-auto py-3 scrollbar-none scroll-smooth"
        >
          {/* Semua Layanan */}
          <button
            type="button"
            onClick={() => onSelect?.("all")}
            className={`group flex flex-col items-center gap-2 pb-2 transition-all shrink-0 border-b-2 text-center ${
              selectedSlug === "all"
                ? "border-neutral-900 text-neutral-900 font-semibold"
                : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
            }`}
          >
            <div
              className={`w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-110 ${
                selectedSlug === "all" ? "text-lavender-600" : "text-neutral-500"
              }`}
            >
              <Home2 size={22} variant="Bulk" />
            </div>
            <span className="text-xs whitespace-nowrap">Semua</span>
          </button>

          {categories.map((cat) => {
            const isSelected = selectedSlug === cat.slug;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect?.(cat.slug)}
                className={`group flex flex-col items-center gap-2 pb-2 transition-all shrink-0 border-b-2 text-center ${
                  isSelected
                    ? "border-neutral-900 text-neutral-900 font-semibold"
                    : "border-transparent text-neutral-500 hover:text-neutral-800 hover:border-neutral-300"
                }`}
              >
                <div
                  className={`w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isSelected ? "text-lavender-600" : "text-neutral-500"
                  }`}
                >
                  {getCategoryIcon(cat.slug, cat.icon)}
                </div>
                <span className="text-xs whitespace-nowrap">{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Scroll Button */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          className="hidden sm:flex w-8 h-8 rounded-full border border-neutral-200/90 bg-white items-center justify-center text-neutral-600 hover:text-neutral-900 hover:shadow-xs transition-all shrink-0"
          aria-label="Gulir ke kanan"
        >
          <ArrowRight2 size={14} />
        </button>
      </div>
    </div>
  );
}
