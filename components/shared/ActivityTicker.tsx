"use client";

import React from "react";
import Link from "next/link";
import { Flash } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface TickerItem {
  id: string;
  orderCode: string;
  text: string;
  timestamp: string;
}

interface ActivityTickerProps {
  items: TickerItem[];
  className?: string;
}

export function ActivityTicker({ items, className }: ActivityTickerProps) {
  if (!items || items.length === 0) return null;

  // Duplicate items to make the continuous loop smooth
  const displayItems = [...items, ...items, ...items];

  return (
    <div
      className={cn(
        "relative h-10 bg-white/80 backdrop-blur-xs border border-neutral-200/80 rounded-xl overflow-hidden flex items-center shadow-xs",
        className
      )}
    >
      {/* Fixed label badge on left */}
      <div className="z-10 bg-white px-3 h-full flex items-center gap-1.5 border-r border-neutral-100 text-lavender-700 font-semibold text-xs shrink-0 shadow-[2px_0_4px_rgba(0,0,0,0.02)]">
        <Flash size={16} className="text-lavender-600 animate-pulse" />
        <span className="hidden sm:inline">Aktivitas Terkini</span>
      </div>

      {/* Marquee Container */}
      <div className="overflow-hidden flex-1 relative flex items-center">
        {/* Fade gradients at edges */}
        <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white to-transparent z-1 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white to-transparent z-1 pointer-events-none" />

        <div className="animate-marquee flex items-center gap-8 pl-4 whitespace-nowrap text-xs text-neutral-600">
          {displayItems.map((item, idx) => (
            <Link
              key={`${item.id}-${idx}`}
              href={`/admin/orders/${item.orderCode}`}
              className="inline-flex items-center gap-2 hover:text-lavender-700 transition-colors cursor-pointer group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-lavender-400 group-hover:bg-lavender-600" />
              <span className="font-medium text-neutral-800 group-hover:text-lavender-700">
                {item.text}
              </span>
              <span className="text-[10px] text-neutral-400">({item.timestamp})</span>
              <span className="text-neutral-300 ml-4">•</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
