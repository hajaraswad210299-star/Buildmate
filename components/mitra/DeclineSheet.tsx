"use client";

import React, { useState } from "react";
import { Warning2 } from "@/lib/icons";

interface DeclineSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDecline: (reason: string) => Promise<void> | void;
  orderCode?: string;
}

const REASONS = [
  "Jadwal bentrok dengan pekerjaan lain",
  "Lokasi terlalu jauh dari jangkauan",
  "Di luar keahlian atau alat tidak tersedia",
  "Lainnya",
];

export function DeclineSheet({
  isOpen,
  onClose,
  onConfirmDecline,
  orderCode,
}: DeclineSheetProps) {
  const [selectedReason, setSelectedReason] = useState(REASONS[0]);
  const [otherReason, setOtherReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = selectedReason === "Lainnya" ? otherReason.trim() || "Alasan lainnya" : selectedReason;

    try {
      setLoading(true);
      await onConfirmDecline(finalReason);
      onClose();
    } catch {
      // Keep open on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-[480px] bg-white rounded-t-3xl sm:rounded-2xl p-6 space-y-5 shadow-2xl border border-neutral-200 animate-in slide-in-from-bottom-8 duration-250"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar on mobile */}
        <div className="w-12 h-1.5 bg-neutral-200 rounded-full mx-auto sm:hidden -mt-2 mb-2" />

        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-danger-50 text-danger-600 flex items-center justify-center shrink-0 border border-danger-100">
            <Warning2 size={22} variant="Bulk" />
          </div>

          <div>
            <h3 className="font-serif text-xl text-neutral-900">
              Tolak Tawaran Pekerjaan
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Pesanan {orderCode || "ini"} akan dialihkan ke mitra tukang lain.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-neutral-700">
              Pilih alasan penolakan:
            </label>
            <div className="space-y-1.5">
              {REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                    selectedReason === reason
                      ? "border-lavender-600 bg-lavender-50/50 font-medium text-neutral-900"
                      : "border-neutral-200 hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <input
                    type="radio"
                    name="decline_reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-lavender-600 w-4 h-4"
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>

          {selectedReason === "Lainnya" && (
            <div className="space-y-1 animate-in fade-in">
              <label className="text-[11px] font-medium text-neutral-600">
                Tuliskan alasan lainnya:
              </label>
              <textarea
                value={otherReason}
                onChange={(e) => setOtherReason(e.target.value)}
                placeholder="Misal: Sedang sakit atau ada keperluan mendadak..."
                rows={2}
                maxLength={200}
                className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none"
              />
            </div>
          )}

          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 h-12 rounded-xl bg-danger-600 hover:bg-danger-700 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              {loading ? "Menolak..." : "Ya, Tolak Pekerjaan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
