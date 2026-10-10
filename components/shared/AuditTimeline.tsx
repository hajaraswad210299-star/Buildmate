"use client";

import React from "react";
import { OrderEvent } from "@/lib/data/types";
import { RelativeTime } from "@/components/shared/RelativeTime";
import { cn } from "@/lib/utils";
import {
  TickCircle,
  Routing2,
  Setting4,
  GalleryTick,
  CloseCircle,
  Card,
  User,
} from "@/lib/icons";

interface AuditTimelineProps {
  events: OrderEvent[];
  className?: string;
}

export function AuditTimeline({ events = [], className }: AuditTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-neutral-400">
        Belum ada riwayat jejak audit untuk pesanan ini.
      </div>
    );
  }

  const getEventIcon = (event: OrderEvent) => {
    if (event.to_status === "completed") return <TickCircle size={14} className="text-success-600" />;
    if (event.to_status === "cancelled") return <CloseCircle size={14} className="text-danger-600" />;
    if (event.to_status === "in_progress") return <Setting4 size={14} className="text-warning-600" />;
    if (event.to_status === "on_the_way") return <Routing2 size={14} className="text-teal-600" />;
    if (event.to_status === "awaiting_confirmation") return <GalleryTick size={14} className="text-orange-600" />;
    if (event.actor_type === "webhook") return <Card size={14} className="text-info-600" />;
    return <User size={14} className="text-lavender-600" />;
  };

  return (
    <div className={cn("relative pl-5 border-l-2 border-neutral-100 space-y-6", className)}>
      {events.map((ev, idx) => (
        <div key={ev.id || idx} className="relative group">
          {/* Timeline node dot */}
          <div className="absolute -left-[27px] top-0.5 w-6 h-6 rounded-full bg-white border border-neutral-200 shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
            {getEventIcon(ev)}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-neutral-800">
                {ev.actor_name || ev.actor_type}
              </span>
              <span className="text-[11px] text-neutral-400">
                <RelativeTime date={ev.created_at} />
              </span>
            </div>

            {ev.note && (
              <p className="text-xs text-neutral-600 mt-1 bg-neutral-50/70 p-2.5 rounded-lg border border-neutral-100">
                {ev.note}
              </p>
            )}

            {ev.from_status && ev.to_status && (
              <div className="flex items-center gap-1.5 mt-1 text-[11px] text-neutral-400 font-mono">
                <span>{ev.from_status}</span>
                <span>→</span>
                <span className="text-lavender-700 font-medium">{ev.to_status}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
