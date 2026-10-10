"use client";

import React from "react";
import { WhatsappIcon } from "@/lib/icons";
import { createWaUrl } from "@/lib/wa-templates";
import { cn } from "@/lib/utils";

interface WaButtonProps {
  phone: string;
  messageText: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function WaButton({
  phone,
  messageText,
  label = "Chat WA",
  size = "md",
  className,
}: WaButtonProps) {
  const url = createWaUrl(phone, messageText);

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5 h-8",
    md: "px-3 py-1.5 text-xs font-medium gap-2 h-9",
    lg: "px-4 py-2 text-sm font-semibold gap-2.5 h-11",
  }[size];

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100/90 border border-emerald-200/60 transition-colors shadow-xs shrink-0",
        sizeClasses,
        className
      )}
    >
      <WhatsappIcon size={size === "sm" ? 14 : 16} className="text-emerald-600" />
      <span>{label}</span>
    </a>
  );
}
