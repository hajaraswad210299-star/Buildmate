"use client";

import React from "react";
import { Drop, Brush2, Ruler, Wind, TickCircle } from "@/lib/icons";

interface CategoryPickCardProps {
  id: string;
  name: string;
  slug: string;
  packageCount: number;
  isSelected: boolean;
  onToggle: (id: string) => void;
}

export function CategoryPickCard({
  id,
  name,
  slug,
  packageCount,
  isSelected,
  onToggle,
}: CategoryPickCardProps) {
  const getCategoryIcon = () => {
    switch (slug) {
      case "plumbing":
        return <Drop size={26} variant="Bulk" className={isSelected ? "text-lavender-600" : "text-neutral-500"} />;
      case "pengecatan":
        return <Brush2 size={26} variant="Bulk" className={isSelected ? "text-lavender-600" : "text-neutral-500"} />;
      case "perbaikan-umum":
        return <Ruler size={26} variant="Bulk" className={isSelected ? "text-lavender-600" : "text-neutral-500"} />;
      case "servis-ac":
        return <Wind size={26} variant="Bulk" className={isSelected ? "text-lavender-600" : "text-neutral-500"} />;
      default:
        return <Ruler size={26} variant="Bulk" className={isSelected ? "text-lavender-600" : "text-neutral-500"} />;
    }
  };

  return (
    <button
      type="button"
      onClick={() => onToggle(id)}
      className={`w-full p-4 rounded-2xl border text-left flex items-start justify-between transition-all duration-200 relative focus:outline-none ${
        isSelected
          ? "border-lavender-600 bg-lavender-50/60 shadow-xs ring-2 ring-lavender-300/30"
          : "border-neutral-200 hover:border-neutral-300 bg-white"
      }`}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
            isSelected ? "bg-lavender-100/80" : "bg-neutral-100"
          }`}
        >
          {getCategoryIcon()}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
            {name}
          </h4>
          <p className="text-xs text-neutral-500 mt-0.5">
            {packageCount} pilihan paket
          </p>
        </div>
      </div>

      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all ${
          isSelected
            ? "bg-lavender-600 border-lavender-600 text-white shadow-xs"
            : "border-neutral-300 bg-white"
        }`}
      >
        {isSelected && <TickCircle size={14} />}
      </div>
    </button>
  );
}
