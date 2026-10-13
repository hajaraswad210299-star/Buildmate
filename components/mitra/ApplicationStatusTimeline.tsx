"use client";

import React from "react";
import { TickCircle, Clock, Verify } from "@/lib/icons";

interface ApplicationStatusTimelineProps {
  status: "pending" | "approved" | "rejected";
}

export function ApplicationStatusTimeline({ status }: ApplicationStatusTimelineProps) {
  const steps = [
    {
      id: 1,
      title: "Pendaftaran Terkirim",
      desc: "Data profil & keahlian kamu telah masuk ke sistem.",
      isDone: true,
      isActive: false,
    },
    {
      id: 2,
      title: "Ditinjau Tim BuildMate",
      desc: "Tim memverifikasi keahlian dan kesesuaian area layanan.",
      isDone: status === "approved",
      isActive: status === "pending",
    },
    {
      id: 3,
      title: "Disetujui & Aktif",
      desc: "Akun mitra aktif dan dapat langsung menerima tawaran pekerjaan.",
      isDone: status === "approved",
      isActive: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200">
        {steps.map((step) => {
          return (
            <div key={step.id} className="relative flex items-start gap-4">
              {/* Step Icon Node */}
              <div
                className={`absolute -left-6 w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 transition-colors shadow-xs ${
                  step.isDone
                    ? "bg-success-600 text-white"
                    : step.isActive
                    ? "bg-lavender-600 text-white ring-4 ring-lavender-200 animate-pulse"
                    : "bg-white border-2 border-neutral-300 text-neutral-400"
                }`}
              >
                {step.isDone ? (
                  <TickCircle size={14} />
                ) : step.isActive ? (
                  <Clock size={12} />
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Step Description */}
              <div className="space-y-0.5">
                <h4
                  className={`text-sm font-semibold ${
                    step.isActive
                      ? "text-lavender-900"
                      : step.isDone
                      ? "text-neutral-900"
                      : "text-neutral-400"
                  }`}
                >
                  {step.title}
                </h4>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {status === "pending" && (
        <div className="p-3.5 rounded-xl bg-lavender-50 border border-lavender-200/80 text-xs text-lavender-800 flex items-center gap-2">
          <Clock size={16} className="text-lavender-600 shrink-0" />
          <span>Biasanya ditinjau dalam <strong>1×24 jam</strong> hari kerja.</span>
        </div>
      )}
    </div>
  );
}
