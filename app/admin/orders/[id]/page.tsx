"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { OrderStepper } from "@/components/shared/OrderStepper";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { PhotoUploader } from "@/components/shared/PhotoUploader";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { WaButton } from "@/components/shared/WaButton";
import { Button } from "@/components/shared/Button";
import { getOrderById, registerClientOrder } from "@/lib/data/orders";
import { DispatchPanel } from "@/components/admin/DispatchPanel";
import { RequirePermission } from "@/components/admin/PermissionGate";
import { getWorkers } from "@/lib/data/workers";
import { MOCK_ORDERS, MOCK_WORKERS } from "@/lib/mock/data";
import { Order, Worker } from "@/lib/data/types";
import {
  canTransition,
  getValidNextTransitions,
  ORDER_STATUS_INFO,
  OrderStatus,
} from "@/lib/orders/transitions";
import { formatRupiah, formatDateId } from "@/lib/format";
import { WA_TEMPLATES } from "@/lib/wa-templates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ArrowLeft2,
  Copy,
  TickCircle,
  Location,
  Calendar1,
  Crown1,
  Warning2,
  AddCircle,
} from "@/lib/icons";
import { FilterDropdown } from "@/components/shared/FilterDropdown";

const COMPLAINT_ACTION_OPTIONS = [
  { value: "warranty_rework", label: "Kirim tukang lagi (Garansi Plus)" },
  { value: "close_without_action", label: "Selesai tanpa tindakan lanjutan" },
  { value: "cancel_refund", label: "Batalkan & refund pesanan" },
];

function OrderDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<Order | null>(
    () => MOCK_ORDERS.find((o) => o.id === orderId || o.order_code === orderId) || null
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    () => !MOCK_ORDERS.some((o) => o.id === orderId || o.order_code === orderId)
  );
  const [activeWorkers, setActiveWorkers] = useState<Worker[]>(
    () => MOCK_WORKERS.filter((w) => w.application_status === "approved")
  );
  const [isCopied, setIsCopied] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [notesSaveStatus, setNotesSaveStatus] = useState<"saved" | "saving" | "error">("saved");

  // Modals & Lightbox
  const [lightboxImage, setLightboxImage] = useState<{
    url: string;
    title: string;
    subtitle: string;
  } | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  // Dialogs
  const [confirmDialogProps, setConfirmDialogProps] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    targetStatus?: OrderStatus;
    requireReason?: boolean;
    requireConsentCheckbox?: boolean;
    consentCheckboxLabel?: string;
    variant?: "danger" | "primary" | "warning";
    onConfirmAction: (reason?: string) => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirmAction: () => {},
  });

  // Replace worker dialog
  const [showReplaceWorkerModal, setShowReplaceWorkerModal] = useState(false);
  const [selectedReplacementWorkerId, setSelectedReplacementWorkerId] = useState("");
  const [replacementConsent, setReplacementConsent] = useState(false);
  const [replacementNote, setReplacementNote] = useState("");

  // Complaint dialog
  const [showResolveComplaintModal, setShowResolveComplaintModal] = useState(false);
  const [complaintResolution, setComplaintResolution] = useState("");
  const [complaintAction, setComplaintAction] = useState<
    "warranty_rework" | "close_without_action" | "cancel_refund"
  >("warranty_rework");

  // Sticky header scroll detection & Emergency Action
  const [isScrolled, setIsScrolled] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyReason, setEmergencyReason] = useState("");
  const [emergencyTargetStatus, setEmergencyTargetStatus] = useState<OrderStatus>("awaiting_confirmation");

  useEffect(() => {
    const mainEl = document.querySelector("main");
    if (!mainEl) return;
    const handleScroll = () => {
      setIsScrolled(mainEl.scrollTop > 12);
    };
    mainEl.addEventListener("scroll", handleScroll, { passive: true });
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  const loadData = useCallback(() => {
    getOrderById(orderId)
      .then((res) => {
        setOrder(res);
        if (res) {
          setInternalNotes(res.admin_notes || "");
        }
      })
      .catch((err) => {
        console.error("Gagal memuat detail pesanan:", err);
      })
      .finally(() => {
        setIsLoading(false);
      });

    getWorkers({ tab: "active" }).then((workers) => {
      setActiveWorkers(workers);
    });
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // All admin actions run on the server (persisted, permission-checked, B5-validated)
  const runOrderAction = async (
    payload: Record<string, unknown>
  ): Promise<{ success: boolean; error?: string; order?: Order }> => {
    try {
      const res = await fetch(`/api/admin/orders/${encodeURIComponent(order?.id || orderId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || "Aksi gagal dijalankan" };
      }
      if (data.order) {
        registerClientOrder(data.order);
        setOrder({ ...data.order });
      }
      return { success: true, order: data.order };
    } catch {
      return { success: false, error: "Koneksi bermasalah. Coba lagi." };
    }
  };

  // Autosave internal notes (debounced)
  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleNotesChange = (val: string) => {
    setInternalNotes(val);
    setNotesSaveStatus("saving");
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(async () => {
      const res = await runOrderAction({ action: "update_notes", notes: val });
      if (res.success) {
        setNotesSaveStatus("saved");
      } else {
        setNotesSaveStatus("error");
        toast.error(res.error || "Gagal menyimpan catatan");
      }
    }, 800);
  };

  const handleManualAssign = async (worker: Worker, note?: string) => {
    if (!order) return;
    const res = await runOrderAction({
      action: "assign_worker",
      worker: {
        id: worker.id,
        name: worker.full_name,
        phone: worker.phone,
        service_area: worker.service_area,
        is_verified: worker.is_verified,
        has_account: !!worker.user_id,
        avatar_url: worker.photo_path || undefined,
      },
      note,
    });
    if (res.success) {
      toast.success(`Tukang ${worker.full_name} berhasil ditugaskan`);
    } else {
      toast.error(res.error || "Gagal menugaskan tukang");
    }
  };

  const handleRetryDispatch = async () => {
    if (!order) return;
    const res = await runOrderAction({ action: "retry_dispatch" });
    if (res.success) {
      toast.success("Mencari ulang kandidat dispatch...");
    } else {
      toast.error(res.error || "Gagal mengulang dispatch");
    }
  };

  const handleReleaseWorker = async (reason: string, consent: boolean) => {
    if (!order) return;
    const res = await runOrderAction({ action: "release_worker", reason, consent });
    if (res.success) {
      toast.success("Tukang dilepas dan proses dispatch dimulai kembali");
    } else {
      toast.error(res.error || "Gagal melepas tukang");
    }
  };

  const handleAutoCompleteNow = async (note: string) => {
    if (!order) return;
    const res = await runOrderAction({
      action: "transition",
      to_status: "completed",
      note: `Override selesai otomatis oleh admin: ${note}`,
    });
    if (res.success) {
      toast.success("Pesanan berhasil diselesaikan");
    } else {
      toast.error(res.error || "Gagal menyelesaikan pesanan");
    }
  };

  if (isLoading) {
    return (
      <AdminShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-8 h-8 border-3 border-lavender-200 border-t-lavender-600 rounded-full animate-spin mb-4" />
          <p className="text-xs font-medium text-neutral-600">Memuat data detail pesanan...</p>
        </div>
      </AdminShell>
    );
  }

  if (!order) {
    return (
      <AdminShell>
        <div className="max-w-md mx-auto py-20 px-4 text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <Warning2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-neutral-900 mb-1">
            Pesanan Tidak Ditemukan
          </h2>
          <p className="text-xs text-neutral-500 mb-6">
            Data pesanan dengan kode/ID <span className="font-mono font-medium text-neutral-700">{orderId}</span> tidak ditemukan dalam sistem.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/admin/orders"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-lavender-600 hover:bg-lavender-700 text-white shadow-xs transition-colors"
            >
              Ke Daftar Pesanan
            </Link>
            <Link
              href="/admin/payouts"
              className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-700 transition-colors"
            >
              Ke Pencairan Dana
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  const validNextTransitions = getValidNextTransitions(order.status, "admin");
  const primaryTransition = validNextTransitions[0];
  const otherTransitions = validNextTransitions.slice(1);

  const handleExecuteTransition = async (
    targetStatus: OrderStatus,
    reason?: string
  ) => {
    const res = await runOrderAction({
      action: "transition",
      to_status: targetStatus,
      note: reason,
    });

    if (!res.success) {
      toast.error(res.error || "Gagal mengubah status");
      return;
    }

    toast.success(
      `Status pesanan berhasil diubah menjadi ${ORDER_STATUS_INFO[targetStatus].label}`
    );
  };

  const handleConfirmAction = (targetStatus: OrderStatus) => {
    if (targetStatus === "cancelled") {
      setConfirmDialogProps({
        isOpen: true,
        title: "Batalkan Pesanan?",
        description:
          "Pesanan akan dibatalkan dan proses refund simulasi Midtrans akan dicatat.",
        variant: "danger",
        requireReason: true,
        onConfirmAction: (reason) => {
          setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }));
          handleExecuteTransition("cancelled", reason);
        },
      });
    } else if (targetStatus === "completed") {
      setConfirmDialogProps({
        isOpen: true,
        title: "Selesaikan Pesanan Sekarang?",
        description:
          "Admin akan menyelesaikan pesanan ini dan membuat hak pencairan dana tukang di ledger.",
        variant: "primary",
        requireReason: true,
        onConfirmAction: (reason) => {
          setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }));
          handleExecuteTransition("completed", reason);
        },
      });
    } else {
      handleExecuteTransition(targetStatus);
    }
  };

  const handleSavePhoto = async (photo: {
    storage_path: string;
    source_note: string;
    type: "problem" | "result";
  }) => {
    const res = await runOrderAction({ action: "add_photo", photo });
    if (!res.success) {
      toast.error(res.error || "Gagal menyimpan foto");
      return;
    }
    setShowUploader(false);
  };

  const handleReplaceWorkerSubmit = async () => {
    const w = activeWorkers.find((item) => item.id === selectedReplacementWorkerId);
    if (!w) {
      toast.error("Pilih tukang pengganti");
      return;
    }
    if (!replacementConsent) {
      toast.error("Centang persetujuan pelanggan terlebih dahulu");
      return;
    }

    const res = await runOrderAction({
      action: "replace_worker",
      consent: replacementConsent,
      note: replacementNote,
      worker: {
        id: w.id,
        name: w.full_name,
        phone: w.phone,
        service_area: w.service_area,
        is_verified: w.is_verified,
        has_account: !!w.user_id,
      },
    });
    if (!res.success) {
      toast.error(res.error || "Gagal mengganti tukang");
      return;
    }

    toast.success(`Tukang berhasil diganti ke ${w.full_name}`);
    setShowReplaceWorkerModal(false);
  };

  const handleResolveComplaintSubmit = async () => {
    if (!complaintResolution.trim()) {
      toast.error("Tuliskan deskripsi resolusi komplain");
      return;
    }

    const res = await runOrderAction({
      action: "resolve_complaint",
      resolution: complaintResolution,
      resolution_action: complaintAction,
    });
    if (!res.success) {
      toast.error(res.error || "Gagal menindaklanjuti komplain");
      return;
    }
    toast.success("Komplain berhasil ditutup dan ditindaklanjuti");
    setShowResolveComplaintModal(false);
  };

  const hasResultPhotos = Boolean(
    order.photos && order.photos.some((p) => p.type === "result")
  );

  return (
    <AdminShell>
      <RequirePermission permission="orders.view">
      <div className="space-y-6">
        {/* STICKY HEADER — Full width, flush with topbar, no margins, sticky top-0 in main */}
        <div
          className={cn(
            "-mx-6 -mt-6 px-6 xl:-mx-8 xl:-mt-8 xl:px-8 bg-white border-b border-neutral-200 sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200",
            isScrolled
              ? "h-14 py-2 shadow-xs mb-4"
              : "min-h-[72px] py-4 shadow-none mb-6"
          )}
        >
          <div className="flex items-center gap-3">
            <Link
              href="/admin/orders"
              className="p-2 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-neutral-500 transition-colors shrink-0"
              title="Kembali ke daftar pesanan"
            >
              <ArrowLeft2 size={16} />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-neutral-900 tracking-tight">
                  {order.order_code}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(order.order_code);
                    setIsCopied(true);
                    toast.success("Kode pesanan disalin");
                    setTimeout(() => setIsCopied(false), 1500);
                  }}
                  className="text-neutral-400 hover:text-neutral-700 transition-colors"
                  title="Salin kode"
                >
                  {isCopied ? (
                    <TickCircle size={15} className="text-success-600" />
                  ) : (
                    <Copy size={15} />
                  )}
                </button>

                <StatusBadge status={order.status} size="md" />

                {order.customer.is_plus && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-lavender-100 text-lavender-700 font-bold">
                    <Crown1 size={13} variant="Bold" />
                    <span>Plus</span>
                  </span>
                )}
              </div>
              {!isScrolled && (
                <span className="text-xs text-neutral-400 block mt-0.5 animate-in fade-in">
                  Dibuat pada {formatDateId(order.created_at, "d MMMM yyyy, HH:mm")}
                </span>
              )}
            </div>
          </div>

          {/* RIGHT ACTION BUTTONS */}
          <div className="flex items-center gap-2 flex-wrap">
            {primaryTransition && (
              <span
                title={
                  primaryTransition === "awaiting_confirmation" && !hasResultPhotos
                    ? "Unggah foto hasil dulu sebelum meminta konfirmasi pelanggan"
                    : undefined
                }
              >
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={primaryTransition === "awaiting_confirmation" && !hasResultPhotos}
                  onClick={() => handleConfirmAction(primaryTransition)}
                >
                  {primaryTransition === "on_the_way" && "Tandai Dalam Perjalanan"}
                  {primaryTransition === "in_progress" && "Mulai Pekerjaan"}
                  {primaryTransition === "awaiting_confirmation" && "Minta Konfirmasi Pelanggan"}
                  {primaryTransition === "completed" && "Selesaikan Pesanan"}
                  {primaryTransition === "worker_confirmed" && "Konfirmasi Tukang"}
                </Button>
              </span>
            )}

            {/* Emergency action for account-managed workers only */}
            {order.worker?.has_account && primaryTransition && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setEmergencyTargetStatus(primaryTransition);
                  setShowEmergencyModal(true);
                }}
                className="text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-200"
              >
                Tindakan Darurat (atas nama tukang)
              </Button>
            )}

            {/* Other transitions or Cancel */}
            {otherTransitions.map((st) => (
              <Button
                key={st}
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => handleConfirmAction(st)}
              >
                {ORDER_STATUS_INFO[st].label}
              </Button>
            ))}

            {canTransition(order.status, "cancelled", "admin") && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => handleConfirmAction("cancelled")}
              >
                Batalkan Pesanan
              </Button>
            )}
          </div>
        </div>

        {/* 2-COLUMN MAIN CONTENT (8 / 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (8/12) */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. PROGRESS STEPPER */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
                Tahapan Pengerjaan
              </h3>
              <OrderStepper
                currentStatus={order.status}
                timestamps={{
                  paid_at: order.paid_at,
                  worker_confirmed_at: order.worker_confirmed_at,
                  on_the_way_at: order.on_the_way_at,
                  in_progress_at: order.in_progress_at,
                  awaiting_confirmation_at: order.awaiting_confirmation_at,
                  completed_at: order.completed_at,
                }}
              />
            </div>

            {/* 2. ORDER DETAILS CARD */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <span className="text-[11px] font-semibold text-lavender-600 uppercase tracking-wider">
                    {order.package.category_name}
                  </span>
                  <h3 className="text-base font-bold text-neutral-900 mt-0.5">
                    {order.package.name}
                  </h3>
                </div>
              </div>

              {/* Schedule and Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex items-start gap-2.5">
                  <Calendar1 size={18} className="text-lavender-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 font-medium block">
                      Jadwal Pengerjaan
                    </span>
                    <span className="font-semibold text-neutral-800 block mt-0.5">
                      {formatDateId(order.scheduled_date, "EEEE, d MMMM yyyy")}
                    </span>
                    <span className="text-neutral-500">{order.time_slot}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100 flex items-start gap-2.5">
                  <Location size={18} className="text-lavender-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-400 font-medium block">
                      Alamat Pelanggan
                    </span>
                    <span className="font-semibold text-neutral-800 block mt-0.5">
                      {order.address}
                    </span>
                  </div>
                </div>
              </div>

              {/* Problem description */}
              <div>
                <span className="text-xs font-semibold text-neutral-600 block mb-1">
                  Keluhan / Deskripsi Masalah:
                </span>
                <p className="text-xs text-neutral-700 bg-neutral-50/70 p-3 rounded-xl border border-neutral-100 leading-relaxed">
                  {order.description}
                </p>
              </div>

              {/* Inclusions Accordion */}
              {order.package.inclusions && (
                <div className="pt-2">
                  <span className="text-xs font-semibold text-neutral-600 block mb-1.5">
                    Cakupan Pekerjaan (Termasuk):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-neutral-600">
                    {order.package.inclusions.map((inc, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <TickCircle size={14} className="text-success-600 shrink-0" />
                        <span>{inc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 3. PHOTOS: SEBELUM & SESUDAH */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
                <div>
                  <h3 className="text-sm font-bold text-neutral-800">
                    Dokumentasi Foto Pekerjaan
                  </h3>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    Bandingkan foto keluhan awal dengan hasil pengerjaan tukang
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowUploader(!showUploader)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-lavender-50 hover:bg-lavender-100 text-lavender-700 text-xs font-semibold transition-colors"
                >
                  <AddCircle size={15} />
                  <span>{showUploader ? "Tutup Uploader" : "Unggah Foto Hasil"}</span>
                </button>
              </div>

              {/* Uploader Component */}
              {showUploader && (
                <PhotoUploader
                  defaultType="result"
                  onUploadSuccess={handleSavePhoto}
                  className="mb-4"
                />
              )}

              {/* Photo Galleries: Sebelum vs Sesudah */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Panel Sebelum */}
                <div className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 flex flex-col">
                  <span className="text-xs font-bold text-neutral-700 mb-2 flex items-center justify-between">
                    <span>Foto Sebelum (Keluhan Awal)</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Dari Pelanggan</span>
                  </span>

                  {order.photos?.filter((p) => p.type === "problem").length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {order.photos
                        .filter((p) => p.type === "problem")
                        .map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() =>
                              setLightboxImage({
                                url: photo.storage_path,
                                title: "Foto Keluhan Sebelum Pengerjaan",
                                subtitle: photo.source_note || "Diunggah pelanggan",
                              })
                            }
                            className="group relative h-28 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer shadow-xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.storage_path}
                              alt="Sebelum"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                              Perbesar
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-neutral-400 text-xs italic">
                      Tidak ada foto keluhan awal
                    </div>
                  )}
                </div>

                {/* Panel Sesudah */}
                <div className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 flex flex-col">
                  <span className="text-xs font-bold text-neutral-700 mb-2 flex items-center justify-between">
                    <span>Foto Sesudah (Hasil Selesai)</span>
                    <span className="text-[10px] text-lavender-600 font-normal">Bukti Tukang</span>
                  </span>

                  {order.photos?.filter((p) => p.type === "result").length ? (
                    <div className="grid grid-cols-2 gap-2">
                      {order.photos
                        .filter((p) => p.type === "result")
                        .map((photo) => (
                          <div
                            key={photo.id}
                            onClick={() =>
                              setLightboxImage({
                                url: photo.storage_path,
                                title: "Foto Hasil Pengerjaan Selesai",
                                subtitle: photo.source_note || "Bukti pekerjaan selesai",
                              })
                            }
                            className="group relative h-28 rounded-xl overflow-hidden border border-neutral-200 cursor-pointer shadow-xs"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.storage_path}
                              alt="Sesudah"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-medium">
                              Perbesar
                            </div>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-neutral-400 text-xs italic">
                      Belum ada foto hasil diunggah
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4. COMPLAINT SECTION (IF ANY) */}
            {order.complaint && (
              <div className="bg-warning-50/60 border border-warning-200 p-5 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <Warning2 size={20} className="text-warning-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-warning-800">
                          {order.complaint.status === "open"
                            ? "Komplain Terbuka dari Pelanggan"
                            : "Komplain Pelanggan (Ditutup)"}
                        </h4>
                        {order.complaint.is_warranty && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-warning-200 text-warning-800 font-bold">
                            Garansi Plus
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-warning-700 mt-1 leading-relaxed">
                        {order.complaint.description}
                      </p>
                      <span className="text-[11px] text-warning-600 block mt-1">
                        Diajukan pada {formatDateId(order.complaint.created_at, "d MMM yyyy, HH:mm")}
                      </span>
                    </div>
                  </div>

                  {order.complaint.status === "open" && (
                    <button
                      type="button"
                      onClick={() => setShowResolveComplaintModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-warning-600 hover:bg-warning-700 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                    >
                      Tutup Komplain
                    </button>
                  )}
                </div>

                {order.complaint.status === "closed" && (
                  <div className="p-3 bg-white/80 rounded-xl border border-warning-200 text-xs text-neutral-700">
                    <span className="font-semibold block mb-0.5">
                      Resolusi: {order.complaint.resolution}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      Ditutup pada {formatDateId(order.complaint.closed_at || "", "d MMM yyyy, HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 5. AUDIT TIMELINE */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-4">
                Jejak Audit & Riwayat Perubahan
              </h3>
              <AuditTimeline events={order.events || []} />
            </div>
          </div>

          {/* RIGHT COLUMN (4/12) */}
          <div className="lg:col-span-4 space-y-6">
            {/* 1. COST SUMMARY */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Ringkasan Biaya
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-neutral-600">
                  <span>Harga Paket Jasa</span>
                  <span className="font-medium text-neutral-900 tabular-nums">
                    {formatRupiah(order.package_price)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-neutral-600">
                  <div className="flex items-center gap-1">
                    <span>Biaya Layanan Platform</span>
                    {order.customer.is_plus && (
                      <span className="text-[10px] text-lavender-600 font-bold">
                        (Plus Rp0)
                      </span>
                    )}
                  </div>
                  <span className="font-medium text-neutral-900 tabular-nums">
                    {order.customer.is_plus ? (
                      <span>
                        <s className="text-neutral-400 mr-1.5">Rp5.000</s>
                        <span className="text-lavender-700 font-bold">Rp0</span>
                      </span>
                    ) : (
                      formatRupiah(order.service_fee)
                    )}
                  </span>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-sm font-bold text-neutral-900">
                  <span>Total Transaksi</span>
                  <span className="text-lavender-700 tabular-nums">
                    {formatRupiah(order.total)}
                  </span>
                </div>
              </div>

              {/* Payment Status & Trans ID */}
              <div className="pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Status Bayar</span>
                  <span className="font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full text-[11px]">
                    Lunas (Midtrans)
                  </span>
                </div>

                {order.transaction_id && (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400">ID Transaksi</span>
                    <Link
                      href="/admin/transactions"
                      className="font-mono text-lavender-600 hover:underline text-[11px]"
                    >
                      {order.transaction_id}
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* 2. CUSTOMER CARD */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Informasi Pelanggan
              </h3>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full bg-lavender-100 text-lavender-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {order.customer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-neutral-900 text-xs">
                        {order.customer.name}
                      </span>
                      {order.customer.is_plus && (
                        <Crown1 size={14} className="text-lavender-600" variant="Bold" />
                      )}
                    </div>
                    <span className="text-[11px] text-neutral-400 block mt-0.5">
                      {order.customer.email}
                    </span>
                    <span className="text-[11px] text-neutral-600 font-medium block">
                      {order.customer.phone}
                    </span>
                  </div>
                </div>

                <WaButton
                  phone={order.customer.phone}
                  messageText={WA_TEMPLATES.adminToCustomer({
                    customerName: order.customer.name,
                    orderCode: order.order_code,
                    workerName: order.worker?.name || "Tukang kami",
                    date: order.scheduled_date,
                    timeSlot: order.time_slot,
                  })}
                  size="sm"
                />
              </div>
            </div>

            {/* 3. PANEL DISPATCH & TUKANG TERPILIH (B25 & A03) */}
            <DispatchPanel
              order={order}
              activeWorkers={activeWorkers}
              onManualAssign={handleManualAssign}
              onRetryDispatch={handleRetryDispatch}
              onReleaseWorker={handleReleaseWorker}
              onAutoCompleteNow={handleAutoCompleteNow}
            />

            {/* 4. INTERNAL ADMIN NOTES */}
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Catatan Internal
                </h3>
                <span className="text-[10px] text-neutral-400">
                  {notesSaveStatus === "saving" ? "Menyimpan..." : notesSaveStatus === "error" ? "Gagal disimpan" : "Tersimpan"}
                </span>
              </div>

              <textarea
                rows={4}
                value={internalNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="Tuliskan catatan khusus tim operasional (hanya dilihat oleh admin)..."
                className="w-full text-xs p-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-lavender-300 resize-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialogProps.isOpen}
        onClose={() => setConfirmDialogProps((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialogProps.onConfirmAction}
        title={confirmDialogProps.title}
        description={confirmDialogProps.description}
        variant={confirmDialogProps.variant}
        requireReason={confirmDialogProps.requireReason}
      />

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <PhotoLightbox
          isOpen={!!lightboxImage}
          onClose={() => setLightboxImage(null)}
          imageUrl={lightboxImage.url}
          title={lightboxImage.title}
          subtitle={lightboxImage.subtitle}
        />
      )}

      {/* REPLACE WORKER MODAL */}
      {showReplaceWorkerModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowReplaceWorkerModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">Ganti Tukang Pesanan</h3>
            <p className="text-xs text-neutral-500">
              Pilih tukang aktif lain yang melayani paket ini.
            </p>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Pilih Tukang Pengganti
              </label>
              <FilterDropdown
                value={selectedReplacementWorkerId}
                options={activeWorkers.map((w) => ({
                  value: w.id,
                  label: `${w.full_name} (${w.service_area})`,
                }))}
                onChange={(val) => setSelectedReplacementWorkerId(val)}
                placeholder="-- Pilih Tukang --"
                fullWidth
                size="md"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Catatan Alasan Penggantian
              </label>
              <textarea
                rows={2}
                value={replacementNote}
                onChange={(e) => setReplacementNote(e.target.value)}
                placeholder="Misal: Tukang sebelumnya kendaraannya mogok"
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 resize-none"
              />
            </div>

            {/* MANDATORY CONSENT CHECKBOX */}
            <label className="flex items-start gap-2 text-xs text-neutral-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={replacementConsent}
                onChange={(e) => setReplacementConsent(e.target.checked)}
                className="w-4 h-4 rounded text-lavender-600 focus:ring-lavender-300 border-neutral-300 mt-0.5"
              />
              <span>Pelanggan sudah menyetujui penggantian tukang ini via chat/telepon.</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowReplaceWorkerModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!selectedReplacementWorkerId || !replacementConsent}
                onClick={handleReplaceWorkerSubmit}
              >
                Simpan & Kirim Tawaran
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* RESOLVE COMPLAINT MODAL */}
      {showResolveComplaintModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowResolveComplaintModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-neutral-900">
              Penyelesaian Komplain
            </h3>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Tindakan Penyelesaian
              </label>
              <FilterDropdown
                value={complaintAction}
                options={COMPLAINT_ACTION_OPTIONS}
                onChange={(val) =>
                  setComplaintAction(
                    val as "warranty_rework" | "close_without_action" | "cancel_refund"
                  )
                }
                fullWidth
                size="md"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Penjelasan Resolusi <span className="text-danger-600">*</span>
              </label>
              <textarea
                rows={3}
                value={complaintResolution}
                onChange={(e) => setComplaintResolution(e.target.value)}
                placeholder="Tuliskan hasil mediasi atau kesepakatan dengan pelanggan..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowResolveComplaintModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!complaintResolution.trim()}
                onClick={handleResolveComplaintSubmit}
                className="bg-warning-600 hover:bg-warning-700 focus-visible:ring-warning-500"
              >
                Tutup Komplain
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* EMERGENCY ACTION MODAL (FOR ACCOUNT-MANAGED WORKERS) */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
          onClick={() => setShowEmergencyModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-xl border border-neutral-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center gap-2 text-amber-700 mb-1">
                <Warning2 size={18} />
                <h3 className="text-base font-bold text-neutral-900">
                  Tindakan Darurat (Atas Nama Tukang)
                </h3>
              </div>
              <p className="text-xs text-neutral-500">
                Tukang <strong>{order.worker?.name}</strong> memiliki akun mandiri di platform.
                Aksi ini mencatat override status oleh admin ke jejak audit. Catatan alasan wajib diisi.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Target Status
              </label>
              <div className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs font-semibold text-neutral-800">
                {emergencyTargetStatus ? ORDER_STATUS_INFO[emergencyTargetStatus].label : "Status Berikutnya"}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-neutral-700 block mb-1">
                Catatan Alasan Darurat <span className="text-danger-600">*</span>
              </label>
              <textarea
                rows={3}
                value={emergencyReason}
                onChange={(e) => setEmergencyReason(e.target.value)}
                placeholder="Misal: Tukang mengalami kendala teknis perangkat, konfirmasi via koordinasi telepon bahwa pekerjaan selesai..."
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 resize-none focus:outline-none focus:ring-2 focus:ring-lavender-300"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowEmergencyModal(false)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={!emergencyReason.trim() || !emergencyTargetStatus}
                onClick={async () => {
                  await handleExecuteTransition(
                    emergencyTargetStatus,
                    `[Tindakan Darurat Admin] atas nama tukang ${order.worker?.name}: ${emergencyReason}`
                  );
                  setShowEmergencyModal(false);
                  setEmergencyReason("");
                }}
                className="bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-500 text-white"
              >
                Lanjutkan Tindakan Darurat
              </Button>
            </div>
          </div>
        </div>
      )}
      </RequirePermission>
    </AdminShell>
  );
}

export default function AdminOrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-100/60 p-6 flex items-center justify-center text-xs text-neutral-400">
          Memuat data detail pesanan...
        </div>
      }
    >
      <OrderDetailContent {...props} />
    </React.Suspense>
  );
}

