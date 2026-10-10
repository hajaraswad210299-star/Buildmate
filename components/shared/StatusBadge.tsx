"use client";

import React from "react";
import { OrderStatus, ORDER_STATUS_INFO } from "@/lib/orders/transitions";
import { cn } from "@/lib/utils";
import {
  Clock,
  Card,
  UserTick,
  Routing2,
  Setting4,
  GalleryTick,
  TickCircle,
  CloseCircle,
} from "@/lib/icons";

interface StatusBadgeProps {
  status: OrderStatus;
  showIcon?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

export function StatusBadge({
  status,
  showIcon = true,
  className = "",
  size = "md",
}: StatusBadgeProps) {
  const info = ORDER_STATUS_INFO[status] || {
    label: status,
    badgeBg: "bg-neutral-100",
    badgeText: "text-neutral-700",
    dotColor: "bg-neutral-400",
  };

  const renderIcon = () => {
    const iconSize = size === "sm" ? 12 : 14;
    switch (status) {
      case "pending_payment":
        return <Clock size={iconSize} className="mr-1.5 shrink-0" />;
      case "paid":
        return <Card size={iconSize} className="mr-1.5 shrink-0" />;
      case "worker_confirmed":
        return <UserTick size={iconSize} className="mr-1.5 shrink-0" />;
      case "on_the_way":
        return <Routing2 size={iconSize} className="mr-1.5 shrink-0" />;
      case "in_progress":
        return <Setting4 size={iconSize} className="mr-1.5 shrink-0 animate-spin" style={{ animationDuration: "6s" }} />;
      case "awaiting_confirmation":
        return <GalleryTick size={iconSize} className="mr-1.5 shrink-0" />;
      case "completed":
        return <TickCircle size={iconSize} className="mr-1.5 shrink-0" />;
      case "cancelled":
        return <CloseCircle size={iconSize} className="mr-1.5 shrink-0" />;
      default:
        return null;
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-[11px] h-5",
    md: "px-2.5 py-1 text-xs h-6",
    lg: "px-3.5 py-1.5 text-sm h-7 font-medium",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full transition-all duration-200 border border-black/5 shadow-xs whitespace-nowrap",
        info.badgeBg,
        info.badgeText,
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full mr-1.5 shrink-0", info.dotColor)} />
      {showIcon && renderIcon()}
      <span>{info.label}</span>
    </span>
  );
}
