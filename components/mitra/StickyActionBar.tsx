"use client";

import React, { useState } from "react";
import { SlideToConfirm } from "./SlideToConfirm";
import { Camera, TickCircle, Clock, InfoCircle } from "@/lib/icons";
import { OrderStatus } from "@/lib/orders/transitions";
import { formatRupiah } from "@/lib/format";

interface StickyActionBarProps {
  status: OrderStatus;
  orderId: string;
  orderCode: string;
  packagePrice: number;
  resultPhotosCount: number;
  onAccept: () => Promise<void> | void;
  onDecline: () => void;
  onTransitionStatus: (toStatus: OrderStatus) => Promise<void> | void;
  onOpenPhotoUploader: () => void;
  cancelReason?: string;
  payoutStatus?: "pending" | "paid";
}

export function StickyActionBar({
  status,
  orderId,
  orderCode,
  packagePrice,
  resultPhotosCount,
  onAccept,
  onDecline,
  onTransitionStatus,
  onOpenPhotoUploader,
  cancelReason,
  payoutStatus = "pending",
}: StickyActionBarProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    try {
      setIsAccepting(true);
      await onAccept();
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-md border-t border-neutral-200/80 p-4 z-40 shadow-xl">
      {/* 1. Status: paid (Tawaran baru) */}
      {status === "paid" && (
        <div className="flex gap-2.5">
          <button
            type="button"
            disabled={isAccepting}
            onClick={onDecline}
            className="flex-1 h-14 rounded-2xl border border-neutral-200 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
          >
            Tolak
          </button>
          <button
            type="button"
            disabled={isAccepting}
            onClick={handleAccept}
            className="flex-2 h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 active:bg-lavender-800 text-sm font-semibold text-white shadow-xs transition-colors flex items-center justify-center gap-2"
          >
            {isAccepting ? "Memproses..." : "Terima Pekerjaan"}
          </button>
        </div>
      )}

      {/* 2. Status: worker_confirmed -> on_the_way */}
      {status === "worker_confirmed" && (
        <SlideToConfirm
          label="Geser — saya berangkat"
          onConfirm={() => onTransitionStatus("on_the_way")}
        />
      )}

      {/* 3. Status: on_the_way -> in_progress */}
      {status === "on_the_way" && (
        <SlideToConfirm
          label="Geser — mulai kerja"
          onConfirm={() => onTransitionStatus("in_progress")}
        />
      )}

      {/* 4. Status: in_progress -> awaiting_confirmation */}
      {status === "in_progress" && (
        <div className="space-y-2.5">
          {resultPhotosCount === 0 ? (
            <div className="space-y-2">
              <p className="text-center text-xs text-neutral-500">
                Unggah minimal 1 foto hasil sebelum menandai selesai.
              </p>
              <button
                type="button"
                onClick={onOpenPhotoUploader}
                className="w-full h-14 rounded-2xl bg-lavender-600 hover:bg-lavender-700 text-sm font-semibold text-white shadow-xs flex items-center justify-center gap-2 transition-colors"
              >
                <Camera size={20} />
                <span>Unggah Foto Hasil Kerja</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <SlideToConfirm
                label="Geser — tandai selesai"
                onConfirm={() => onTransitionStatus("awaiting_confirmation")}
              />
              <button
                type="button"
                onClick={onOpenPhotoUploader}
                className="w-full text-center text-xs font-semibold text-lavender-700 hover:underline"
              >
                + Tambah foto hasil ({resultPhotosCount} foto terunggah)
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Status: awaiting_confirmation */}
      {status === "awaiting_confirmation" && (
        <div className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200/80 text-orange-900 flex items-center gap-3">
          <Clock size={20} className="text-orange-600 shrink-0" />
          <div className="space-y-0.5 text-xs">
            <span className="font-semibold block">Menunggu Konfirmasi Pelanggan</span>
            <span className="text-orange-700 text-[11px]">
              Pelanggan sedang memeriksa hasil kerjamu. Biasanya dalam 24 jam.
            </span>
          </div>
        </div>
      )}

      {/* 6. Status: completed */}
      {status === "completed" && (
        <div className="p-3.5 rounded-2xl bg-success-50 border border-success-200/80 text-success-900 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <TickCircle size={22} className="text-success-600 shrink-0" />
            <div className="text-xs">
              <span className="font-semibold block">Pekerjaan Selesai</span>
              <span className="text-success-700 text-[11px]">
                {payoutStatus === "paid" ? "Dana sudah dicairkan" : "Menunggu pencairan platform"}
              </span>
            </div>
          </div>
          <span className="text-sm font-bold text-success-800">
            {formatRupiah(packagePrice)}
          </span>
        </div>
      )}

      {/* 7. Status: cancelled */}
      {status === "cancelled" && (
        <div className="p-3.5 rounded-2xl bg-danger-50 border border-danger-200/80 text-danger-900 flex items-center gap-3 text-xs">
          <InfoCircle size={20} className="text-danger-600 shrink-0" />
          <div>
            <span className="font-semibold block">Pesanan Dibatalkan</span>
            <span className="text-danger-700 text-[11px]">
              {cancelReason || "Pesanan telah dibatalkan oleh sistem atau admin."}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
