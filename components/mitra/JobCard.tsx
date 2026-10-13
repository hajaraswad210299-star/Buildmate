"use client";

import React from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Calendar1, Clock, Location, ArrowRight2 } from "@/lib/icons";
import { OrderStatus } from "@/lib/orders/transitions";

interface JobCardProps {
  order: {
    id: string;
    order_code: string;
    status: OrderStatus;
    package_price: number;
    scheduled_date: string;
    time_slot: string;
    address: string;
    package: {
      name: string;
      category_name: string;
    };
  };
}

export function JobCard({ order }: JobCardProps) {
  return (
    <Link
      href={`/mitra/jobs/${order.id}`}
      className="block w-full bg-white rounded-2xl border border-neutral-200/80 p-4 space-y-3 hover:border-lavender-300 hover:shadow-sm transition-all duration-200"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs font-semibold text-neutral-500">
          {order.order_code}
        </span>
        <StatusBadge status={order.status} />
      </div>

      {/* Package & Fee */}
      <div>
        <h4 className="text-sm font-semibold text-neutral-900 leading-snug">
          {order.package.name}
        </h4>
        <div className="flex items-baseline justify-between mt-1">
          <span className="text-xs text-neutral-500">
            Hak tukang:
          </span>
          <span className="text-sm font-bold text-lavender-700">
            {formatRupiah(order.package_price)}
          </span>
        </div>
      </div>

      {/* Details Meta */}
      <div className="space-y-1 text-xs text-neutral-500 pt-1 border-t border-neutral-100">
        <div className="flex items-center gap-1.5">
          <Calendar1 size={14} className="text-neutral-400 shrink-0" />
          <span>{order.scheduled_date}</span>
          <span>·</span>
          <Clock size={14} className="text-neutral-400 shrink-0" />
          <span>Slot {order.time_slot}</span>
        </div>

        <div className="flex items-center gap-1.5 truncate">
          <Location size={14} className="text-neutral-400 shrink-0" />
          <span className="truncate">{order.address}</span>
        </div>
      </div>

      <div className="flex items-center justify-end text-xs font-semibold text-lavender-700 pt-1">
        <span>Buka pekerjaan</span>
        <ArrowRight2 size={15} />
      </div>
    </Link>
  );
}
