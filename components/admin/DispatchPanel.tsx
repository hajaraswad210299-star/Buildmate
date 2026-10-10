"use client";

import React, { useState } from "react";
import { Order, Worker } from "@/lib/data/types";
import { WaButton } from "@/components/shared/WaButton";
import { WA_TEMPLATES } from "@/lib/wa-templates";
import {
  Clock,
  UserOctagon,
  Refresh,
  TickCircle,
  CloseCircle,
  Warning2,
} from "@/lib/icons";

interface DispatchPanelProps {
  order: Order;
  activeWorkers: Worker[];
  onManualAssign: (worker: Worker, note?: string) => Promise<void>;
  onRetryDispatch: () => Promise<void>;
  onReleaseWorker: (reason: string, customerConsent: boolean) => Promise<void>;
  onAutoCompleteNow?: (note: string) => Promise<void>;
}

export function DispatchPanel({
  order,
  activeWorkers,
  onManualAssign,
  onRetryDispatch,
  onReleaseWorker,
  onAutoCompleteNow,
}: DispatchPanelProps) {
  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseReason, setReleaseReason] = useState("");
  const [releaseConsent, setReleaseConsent] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const [showAutoCompleteModal, setShowAutoCompleteModal] = useState(false);
  const [autoCompleteNote, setAutoCompleteNote] = useState("");

  const [isRetrying, setIsRetrying] = useState(false);

  // Status computation
  const dispatchStatus = order.dispatch_status || (order.worker ? "assigned" : "searching");
  const isAwaitingConfirmation = order.status === "awaiting_confirmation";
  const canRelease = order.status === "worker_confirmed" && !!order.worker;

  const handleExecuteManualAssign = async () => {
    if (!selectedWorkerId) return;
    const worker = activeWorkers.find((w) => w.id === selectedWorkerId);
    if (!worker) return;

    setIsAssigning(true);
    try {
      await onManualAssign(worker, manualNote);
      setShowManualModal(false);
      setSelectedWorkerId("");
      if (manualNote) {
        setManualNote("");
      }
    } finally {
      setIsAssigning(false);
    }
  };

  const handleExecuteRelease = async () => {
    if (!releaseReason.trim()) return;
    if (order.allow_reassign === false && !releaseConsent) return;

    setIsReleasing(true);
    try {
      await onReleaseWorker(releaseReason, releaseConsent);
      setShowReleaseModal(false);
      setReleaseReason("");
      setReleaseConsent(false);
    } finally {
      setIsReleasing(false);
    }
  };

  const handleExecuteRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetryDispatch();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. DISPATCH STATUS & PREFERRED WORKER */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Panel Dispatch
            </h3>
            <span className="text-[10px] font-mono text-lavender-700 bg-lavender-50 px-2 py-0.5 rounded-full font-medium">
              B25 Hybrid
            </span>
          </div>

          {/* Dispatch Status Badge */}
          {dispatchStatus === "searching" && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
              Mencari Tukang
            </span>
          )}
          {dispatchStatus === "assigned" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-success-50 text-success-700 border border-success-200">
              <TickCircle size={13} className="text-success-600" variant="Bold" />
              Ditugaskan
            </span>
          )}
          {dispatchStatus === "exhausted" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-danger-50 text-danger-700 border border-danger-200">
              <Warning2 size={13} className="text-danger-600" variant="Bold" />
              Kandidat Habis
            </span>
          )}
        </div>

        {/* Customer Preference Details */}
        <div className="p-3 bg-neutral-25 rounded-xl border border-neutral-150 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Tukang Pilihan:</span>
            <span className="font-semibold text-neutral-900">
              {order.customer_preferred_worker_name || "Pilihan Sistem (Otomatis)"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-neutral-200/60 pt-2">
            <span className="text-neutral-500">Boleh Dialihkan:</span>
            <span
              className={`font-semibold px-2 py-0.5 rounded-md text-[11px] ${
                order.allow_reassign !== false
                  ? "bg-success-50 text-success-700"
                  : "bg-danger-50 text-danger-700"
              }`}
            >
              {order.allow_reassign !== false ? "Ya (Otomatis)" : "Tidak (Wajib Izin)"}
            </span>
          </div>
        </div>

        {/* Dispatch History / Attempts */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
              Riwayat Tawaran
            </span>
            <span className="text-[11px] text-neutral-400">
              {order.dispatch_offers?.length || 0} Percobaan
            </span>
          </div>

          <div className="space-y-2">
            {order.dispatch_offers && order.dispatch_offers.length > 0 ? (
              order.dispatch_offers.map((offer) => (
                <div
                  key={offer.id}
                  className={`p-2.5 rounded-xl border text-xs transition-colors ${
                    offer.status === "accepted"
                      ? "bg-success-50/50 border-success-200"
                      : offer.status === "pending"
                      ? "bg-amber-50/40 border-amber-200"
                      : "bg-neutral-50/60 border-neutral-200 opacity-80"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-neutral-200 text-neutral-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{offer.attempt_number}
                      </span>
                      <div>
                        <div className="font-semibold text-neutral-900 text-xs">
                          {offer.worker_name}
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          {offer.worker_area || "Area Sesuai"}
                        </div>
                      </div>
                    </div>

                    {/* Offer Status */}
                    {offer.status === "pending" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-full">
                        <Clock size={12} className="animate-spin" />
                        Menunggu (14m)
                      </span>
                    )}
                    {offer.status === "accepted" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success-700 bg-success-100/70 px-2 py-0.5 rounded-full">
                        <TickCircle size={12} />
                        Diterima
                      </span>
                    )}
                    {offer.status === "declined" && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-danger-700 bg-danger-100/70 px-2 py-0.5 rounded-full">
                        <CloseCircle size={12} />
                        Ditolak
                      </span>
                    )}
                    {offer.status === "expired" && (
                      <span className="text-[11px] font-medium text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded-full">
                        Kedaluwarsa
                      </span>
                    )}
                  </div>

                  {offer.decline_reason && (
                    <div className="mt-1.5 text-[11px] text-danger-600 bg-white/70 p-1.5 rounded-lg border border-danger-100">
                      Alasan: &ldquo;{offer.decline_reason}&rdquo;
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-3 text-center text-xs text-neutral-400 italic bg-neutral-50 rounded-xl border border-neutral-150">
                Belum ada tawaran dikirim.
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Action Buttons */}
        <div className="pt-2 border-t border-neutral-100 flex flex-wrap gap-2">
          {(!order.worker || dispatchStatus === "exhausted") && (
            <>
              <button
                type="button"
                onClick={() => setShowManualModal(true)}
                className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-lavender-600 hover:bg-lavender-700 text-white font-medium text-xs rounded-xl shadow-xs transition-colors"
              >
                <UserOctagon size={14} />
                Tugaskan Manual
              </button>

              <button
                type="button"
                disabled={isRetrying}
                onClick={handleExecuteRetry}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-medium text-xs rounded-xl transition-colors disabled:opacity-50"
              >
                <Refresh size={14} className={isRetrying ? "animate-spin" : ""} />
                Cari Ulang
              </button>
            </>
          )}

          {canRelease && (
            <button
              type="button"
              onClick={() => setShowReleaseModal(true)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium text-xs rounded-xl border border-rose-200 transition-colors"
            >
              <Refresh size={14} />
              Lepas Tukang & Cari Ulang
            </button>
          )}
        </div>
      </div>

      {/* 2. SELECTED WORKER CARD */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Mitra / Tukang Terpilih
          </h3>
          {order.worker && (
            <button
              type="button"
              onClick={() => setShowManualModal(true)}
              className="text-xs font-semibold text-lavender-600 hover:text-lavender-800"
            >
              Ganti
            </button>
          )}
        </div>

        {order.worker ? (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    order.worker.avatar_url ||
                    "https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=100"
                  }
                  alt={order.worker.name}
                  className="w-10 h-10 rounded-full object-cover border border-neutral-200 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-neutral-900 text-xs">
                      {order.worker.name}
                    </span>
                    {order.worker.is_verified && (
                      <span className="text-[10px] text-lavender-600 font-semibold bg-lavender-50 px-1 rounded">
                        ✓ Terverifikasi
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-neutral-400 block">
                    Area: {order.worker.service_area}
                  </span>
                  <span className="text-[10px] text-neutral-500 font-medium">
                    {order.worker.has_account ? "Mitra Berakun (Otomatis)" : "Dikelola Admin"}
                  </span>
                </div>
              </div>

              <WaButton
                phone={order.worker.phone}
                messageText={WA_TEMPLATES.adminToWorkerOffer({
                  workerName: order.worker.name,
                  orderCode: order.order_code,
                  packageName: order.package.name,
                  serviceArea: order.worker.service_area,
                  date: order.scheduled_date,
                  timeSlot: order.time_slot,
                })}
                size="sm"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-between text-xs">
              <span className="text-neutral-500">Respon Tawaran:</span>
              <span className="font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full text-[11px]">
                {order.worker_response === "accepted" ? "Diterima" : "Terkonfirmasi"}
              </span>
            </div>
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-neutral-400 italic bg-neutral-25 rounded-xl border border-dashed border-neutral-200">
            Belum ada tukang yang ditugaskan. Menunggu dispatch atau tugaskan manual.
          </div>
        )}
      </div>

      {/* 3. AUTO-COMPLETE / OVERRIDE SLA (Spec A03) */}
      {isAwaitingConfirmation && (
        <div className="bg-amber-50/60 rounded-2xl border border-amber-200/70 p-4 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Clock size={16} />
            <span>Selesai Otomatis</span>
          </div>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            Pesanan akan otomatis selesai dalam <strong>1j 12m</strong> jika pelanggan tidak
            mengonfirmasi atau mengajukan komplain.
          </p>
          {onAutoCompleteNow && (
            <button
              type="button"
              onClick={() => setShowAutoCompleteModal(true)}
              className="mt-1 w-full text-center py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-medium text-xs rounded-xl transition-colors"
            >
              Selesaikan Sekarang (Admin Cadangan)
            </button>
          )}
        </div>
      )}

      {/* MODAL 1: MANUAL ASSIGN */}
      {showManualModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowManualModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-900">Tugaskan Tukang Manual</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Pilih tukang yang melayani kategori paket ini (berakun atau dikelola admin). Status
                pesanan akan langsung menjadi <strong>Tukang Dikonfirmasi</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Pilih Tukang
                </label>
                <select
                  value={selectedWorkerId}
                  onChange={(e) => setSelectedWorkerId(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:ring-2 focus:ring-lavender-300"
                >
                  <option value="">-- Pilih Tukang Aktif --</option>
                  {activeWorkers.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.full_name} • {w.service_area} ({w.user_id ? "Berakun" : "Dikelola Admin"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Catatan Penugasan (Opsional)
                </label>
                <input
                  type="text"
                  value={manualNote}
                  onChange={(e) => setManualNote(e.target.value)}
                  placeholder="Mis. Penugasan mendesak via koordinasi WA"
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!selectedWorkerId || isAssigning}
                onClick={handleExecuteManualAssign}
                className="px-4 py-2 text-xs font-semibold bg-lavender-600 hover:bg-lavender-700 text-white rounded-xl disabled:opacity-50 transition-colors"
              >
                {isAssigning ? "Menugaskan..." : "Konfirmasi Penugasan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: RELEASE WORKER & REDISPATCH */}
      {showReleaseModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowReleaseModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-900">Lepas Tukang & Cari Ulang</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Gunakan jika tukang saat ini berhalangan hadir. Tukang lama akan dikecualikan dan
                sistem akan memulai dispatch mencari tukang baru.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Alasan Pelepasan <span className="text-danger-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="Mis. Tukang mendadak sakit dan konfirmasi via WhatsApp..."
                  className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none"
                />
              </div>

              {order.allow_reassign === false && (
                <div className="p-3 rounded-xl bg-danger-50/60 border border-danger-200/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-danger-800 text-xs font-semibold">
                    <Warning2 size={14} />
                    <span>Persetujuan Pelanggan Diperlukan</span>
                  </div>
                  <p className="text-[11px] text-danger-700 leading-relaxed">
                    Pelanggan memilih &ldquo;Tidak boleh dialihkan&rdquo;. Anda wajib menghubungi
                    pelanggan terlebih dahulu sebelum mengalihkan pesanan ini.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={releaseConsent}
                      onChange={(e) => setReleaseConsent(e.target.checked)}
                      className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-500 border-neutral-300"
                    />
                    <span className="text-xs font-medium text-neutral-800">
                      Pelanggan sudah menyetujui pengalihan tukang ini
                    </span>
                  </label>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowReleaseModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  !releaseReason.trim() ||
                  (order.allow_reassign === false && !releaseConsent) ||
                  isReleasing
                }
                onClick={handleExecuteRelease}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl disabled:opacity-50 transition-colors"
              >
                {isReleasing ? "Memproses..." : "Lepas & Mulai Dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUTO-COMPLETE ADMIN OVERRIDE */}
      {showAutoCompleteModal && onAutoCompleteNow && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowAutoCompleteModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-base font-bold text-neutral-900">Selesaikan Pesanan Sekarang</h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Aksi override darurat admin bila penjadwal otomatis terlewat. Catatan alasan wajib
                diisi untuk audit log.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Catatan Penyelesaian <span className="text-danger-500">*</span>
              </label>
              <textarea
                rows={3}
                value={autoCompleteNote}
                onChange={(e) => setAutoCompleteNote(e.target.value)}
                placeholder="Mis. Waktu konfirmasi pelanggan telah habis, diverifikasi via WhatsApp pekerjaan selesai baik..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowAutoCompleteModal(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={!autoCompleteNote.trim()}
                onClick={async () => {
                  await onAutoCompleteNow(autoCompleteNote);
                  setShowAutoCompleteModal(false);
                  setAutoCompleteNote("");
                }}
                className="px-4 py-2 text-xs font-semibold bg-success-600 hover:bg-success-700 text-white rounded-xl disabled:opacity-50 transition-colors"
              >
                Selesaikan Pesanan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
