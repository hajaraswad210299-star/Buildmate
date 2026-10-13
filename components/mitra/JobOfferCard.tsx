"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatRupiah } from "@/lib/format";
import {
  Calendar1,
  Clock,
  Location,
  Drop,
  Brush2,
  Ruler,
  Wind,
  Briefcase,
  Lock,
} from "@/lib/icons";
import { DeclineSheet } from "./DeclineSheet";

interface JobOfferCardProps {
  order: {
    id: string;
    order_code: string;
    package_price: number;
    scheduled_date: string;
    time_slot: string;
    address: string;
    package: {
      name: string;
      category_name: string;
    };
    created_at?: string;
  };
  onAccept: (orderId: string) => Promise<void> | void;
  onDecline: (orderId: string, reason: string) => Promise<void> | void;
}

export function JobOfferCard({
  order,
  onAccept,
  onDecline,
}: JobOfferCardProps) {
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const getCategoryIcon = () => {
    const cat = order.package.category_name.toLowerCase();
    if (cat.includes("plumb")) return <Drop size={22} variant="Bulk" className="text-lavender-600" />;
    if (cat.includes("cat")) return <Brush2 size={22} variant="Bulk" className="text-lavender-600" />;
    if (cat.includes("ac")) return <Wind size={22} variant="Bulk" className="text-lavender-600" />;
    return <Ruler size={22} variant="Bulk" className="text-lavender-600" />;
  };

  const handleConfirmAccept = async () => {
    try {
      setIsAccepting(true);
      setShowConfirmModal(false);
      await onAccept(order.id);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <>
      <div className="w-full bg-white rounded-2xl border border-lavender-200/80 p-4 space-y-3.5 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:border-lavender-300">
        {/* Glow Accent Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-lavender-50 border border-lavender-200/60 flex items-center justify-center shrink-0">
              {getCategoryIcon()}
            </div>
            <div>
              <span className="text-[10px] font-semibold text-lavender-700 uppercase tracking-wider bg-lavender-50 px-2 py-0.5 rounded-md">
                Tawaran Baru
              </span>
              <h3 className="text-sm font-semibold text-neutral-900 mt-0.5 leading-snug">
                {order.package.name}
              </h3>
            </div>
          </div>

          <span className="text-[11px] font-mono font-medium text-neutral-400">
            {order.order_code}
          </span>
        </div>

        {/* Big Hak Tukang Amount (A1, A4) */}
        <div className="p-3 bg-gradient-to-r from-lavender-50/70 to-white rounded-xl border border-lavender-100 flex items-baseline justify-between">
          <span className="text-xs font-medium text-neutral-600">
            Hak kamu terima:
          </span>
          <div className="text-right">
            <span className="text-base font-bold text-lavender-800">
              {formatRupiah(order.package_price)}
            </span>
            <span className="block text-[10px] text-neutral-500">
              Bersih setelah selesai
            </span>
          </div>
        </div>

        {/* Schedule & Area Details */}
        <div className="space-y-1.5 text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <Calendar1 size={15} className="text-neutral-400 shrink-0" />
            <span>{order.scheduled_date}</span>
            <span className="text-neutral-300">·</span>
            <Clock size={15} className="text-neutral-400 shrink-0" />
            <span>Slot {order.time_slot}</span>
          </div>

          <div className="flex items-center gap-2 text-neutral-600">
            <Location size={15} className="text-neutral-400 shrink-0" />
            <span title="Alamat lengkap terkunci" className="shrink-0 flex items-center">
              <Lock size={12} className="text-neutral-400" />
            </span>
          </div>
        </div>

        {/* Action Buttons: Tolak (sekunder) · Terima (utama) */}
        <div className="flex gap-2.5 pt-1">
          <button
            type="button"
            disabled={isAccepting}
            onClick={() => setShowDeclineSheet(true)}
            className="flex-1 h-12 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
          >
            Tolak
          </button>
          <button
            type="button"
            disabled={isAccepting}
            onClick={() => setShowConfirmModal(true)}
            className="flex-1 h-12 rounded-xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-xs font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-1.5"
          >
            {isAccepting ? "Memproses..." : "Terima Pekerjaan"}
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200">
            <h3 className="font-serif text-xl text-neutral-900">
              Terima Pekerjaan Ini?
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Kamu akan ditugaskan untuk <strong>{order.package.name}</strong> pada tanggal {order.scheduled_date} (Slot {order.time_slot}). Alamat lengkap pelanggan akan segera terbuka.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                className="flex-1 h-11 rounded-xl bg-lavender-600 hover:bg-lavender-700 text-xs font-semibold text-white shadow-xs"
              >
                Ya, Terima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline Bottom Sheet */}
      <DeclineSheet
        isOpen={showDeclineSheet}
        onClose={() => setShowDeclineSheet(false)}
        onConfirmDecline={(reason) => onDecline(order.id, reason)}
        orderCode={order.order_code}
      />
    </>
  );
}
