"use client";

import React from "react";
import { TickCircle } from "@/lib/icons";

interface ApplicationStepperProps {
  currentStep: number; // 1 to 4
  onStepClick?: (step: number) => void;
  autosaveStatus?: "idle" | "saving" | "saved" | "error";
}

const STEPS = [
  { step: 1, label: "Data Diri" },
  { step: 2, label: "Layanan" },
  { step: 3, label: "Foto" },
  { step: 4, label: "Tinjau" },
];

export function ApplicationStepper({
  currentStep,
  onStepClick,
  autosaveStatus = "saved",
}: ApplicationStepperProps) {
  return (
    <div className="w-full bg-white px-4 pt-4 pb-3 border-b border-neutral-200/80 sticky top-14 z-30">
      {/* Header with Autosave Status */}
      <div className="flex items-center justify-between mb-3 text-xs">
        <span className="font-medium text-neutral-500">
          Langkah <strong className="text-neutral-900">{currentStep}</strong> dari 4
        </span>

        <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-medium">
          {autosaveStatus === "saving" ? (
            <span className="flex items-center gap-1 text-lavender-600">
              <span className="w-2 h-2 rounded-full bg-lavender-600 animate-ping" />
              Menyimpan...
            </span>
          ) : autosaveStatus === "saved" ? (
            <span className="flex items-center gap-1 text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200/60">
              <TickCircle size={13} className="text-success-600" />
              Draf tersimpan
            </span>
          ) : autosaveStatus === "error" ? (
            <span className="flex items-center gap-1 text-danger-700 bg-danger-50 px-2 py-0.5 rounded-full border border-danger-200/60">
              Draf gagal disimpan
            </span>
          ) : null}
        </div>
      </div>

      {/* Steps Visual Tracker */}
      <div className="relative flex items-center justify-between">
        {/* Background Connector Bar */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-neutral-100 rounded-full -z-0" />

        {/* Progress Colored Bar */}
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 h-1 bg-lavender-600 rounded-full transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (STEPS.length - 1)) * 88}%`,
          }}
        />

        {STEPS.map((s) => {
          const isDone = s.step < currentStep;
          const isCurrent = s.step === currentStep;

          return (
            <button
              key={s.step}
              type="button"
              disabled={!isDone && !isCurrent}
              onClick={() => onStepClick && onStepClick(s.step)}
              className="flex flex-col items-center gap-1 z-10 group focus:outline-none"
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 ${
                  isDone
                    ? "bg-lavender-600 text-white shadow-xs"
                    : isCurrent
                    ? "bg-white text-lavender-700 border-2 border-lavender-600 shadow-sm"
                    : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                }`}
              >
                {isDone ? <TickCircle size={15} /> : s.step}
              </div>

              <span
                className={`text-[10px] font-medium tracking-tight ${
                  isCurrent
                    ? "text-lavender-900 font-semibold"
                    : isDone
                    ? "text-neutral-700"
                    : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
