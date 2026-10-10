"use client";

import React from "react";
import { OrderStatus } from "@/lib/orders/transitions";
import { cn } from "@/lib/utils";
import { TickCircle } from "@/lib/icons";

interface OrderStepperProps {
  currentStatus: OrderStatus;
  timestamps?: {
    paid_at?: string;
    worker_confirmed_at?: string;
    on_the_way_at?: string;
    in_progress_at?: string;
    awaiting_confirmation_at?: string;
    completed_at?: string;
  };
  className?: string;
}

const STEPS: { status: OrderStatus; label: string; timeKey: keyof NonNullable<OrderStepperProps["timestamps"]> }[] = [
  { status: "paid", label: "Dibayar", timeKey: "paid_at" },
  { status: "worker_confirmed", label: "Tukang Dikonfirmasi", timeKey: "worker_confirmed_at" },
  { status: "on_the_way", label: "Dalam Perjalanan", timeKey: "on_the_way_at" },
  { status: "in_progress", label: "Sedang Dikerjakan", timeKey: "in_progress_at" },
  { status: "awaiting_confirmation", label: "Menunggu Konfirmasi", timeKey: "awaiting_confirmation_at" },
  { status: "completed", label: "Selesai", timeKey: "completed_at" },
];

export function OrderStepper({ currentStatus, timestamps = {}, className }: OrderStepperProps) {
  const getStepIndex = (status: OrderStatus) => {
    switch (status) {
      case "pending_payment":
        return -1;
      case "paid":
        return 0;
      case "worker_confirmed":
        return 1;
      case "on_the_way":
        return 2;
      case "in_progress":
        return 3;
      case "awaiting_confirmation":
        return 4;
      case "completed":
        return 5;
      case "cancelled":
        return -2;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(currentStatus);
  const isCancelled = currentStatus === "cancelled";

  return (
    <div className={cn("w-full py-2 overflow-x-auto", className)}>
      <div className="min-w-[680px] flex items-center justify-between relative">
        {/* Background connector line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 -z-0" />

        {/* Active colored line */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-lavender-600 transition-all duration-500 -z-0"
          style={{
            width:
              currentIndex <= 0
                ? "0%"
                : `${Math.min(100, (currentIndex / (STEPS.length - 1)) * 96)}%`,
          }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const timeValue = timestamps[step.timeKey];

          return (
            <div key={step.status} className="flex flex-col items-center relative z-10 px-2 flex-1">
              {/* Step indicator circle */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300",
                  isCompleted
                    ? "bg-lavender-600 text-white shadow-xs"
                    : isCurrent
                    ? "bg-white text-lavender-600 border-2 border-lavender-600 ring-4 ring-lavender-100 animate-pulse"
                    : "bg-white text-neutral-400 border-2 border-neutral-200"
                )}
              >
                {isCompleted ? <TickCircle size={18} variant="Bold" /> : idx + 1}
              </div>

              {/* Step Label */}
              <span
                className={cn(
                  "text-xs font-medium text-center mt-2.5 transition-colors whitespace-nowrap",
                  isCurrent
                    ? "text-lavender-700 font-semibold"
                    : isCompleted
                    ? "text-neutral-800"
                    : "text-neutral-400"
                )}
              >
                {step.label}
              </span>

              {/* Timestamp if available */}
              {timeValue ? (
                <span className="text-[10px] text-neutral-400 mt-0.5 tabular-nums">
                  {new Date(timeValue).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              ) : (
                <span className="text-[10px] text-transparent mt-0.5">-</span>
              )}
            </div>
          );
        })}
      </div>

      {isCancelled && (
        <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-center">
          <span className="text-xs font-semibold text-danger-700">
            Pesanan ini telah Dibatalkan
          </span>
        </div>
      )}
    </div>
  );
}
