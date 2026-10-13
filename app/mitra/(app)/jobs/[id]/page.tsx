"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { MitraShell } from "@/components/mitra/MitraShell";
import { StickyActionBar } from "@/components/mitra/StickyActionBar";
import { DeclineSheet } from "@/components/mitra/DeclineSheet";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PhotoLightbox } from "@/components/shared/PhotoLightbox";
import { AuditTimeline } from "@/components/shared/AuditTimeline";
import { useCountUp } from "@/hooks/useCountUp";
import { formatRupiah } from "@/lib/format";
import { OrderStatus } from "@/lib/orders/transitions";
import {
  Calendar1,
  Clock,
  Location,
  Map1,
  WhatsappIcon,
  Camera,
  GalleryAdd,
  Lock,
  TickCircle,
  CloseCircle,
  InfoCircle,
} from "@/lib/icons";

function MitraJobDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDeclineSheet, setShowDeclineSheet] = useState(false);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const loadJob = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mitra/jobs/${id}`);
      if (!res.ok) {
        setErrorMsg("Pekerjaan tidak ditemukan atau kamu tidak memiliki akses.");
        return;
      }
      const data = await res.json();
      setOrder(data.job);
    } catch {
      setErrorMsg("Gagal memuat detail pekerjaan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
  }, [id]);

  const animatedFee = useCountUp(order?.package_price || 0);

  const handleAccept = async () => {
    const res = await fetch(`/api/mitra/jobs/${id}/accept`, { method: "POST" });
    if (res.ok) {
      await loadJob();
    }
  };

  const handleDecline = async (reason: string) => {
    const res = await fetch(`/api/mitra/jobs/${id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) {
      router.push("/mitra/jobs");
    }
  };

  const handleTransitionStatus = async (toStatus: OrderStatus) => {
    const res = await fetch(`/api/mitra/jobs/${id}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: toStatus }),
    });
    if (res.ok) {
      await loadJob();
    }
  };

  const handleUploadResultPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const url = ev.target?.result as string;
      try {
        // Upload photo via API
        await fetch(`/api/mitra/jobs/${id}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: order.status,
            photo_paths: [url],
          }),
        });
        await loadJob();
        setShowPhotoUploadModal(false);
      } finally {
        setUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (loading) {
    return (
      <MitraShell showBack backHref="/mitra/jobs" hideNav>
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-lavender-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </MitraShell>
    );
  }

  if (errorMsg || !order) {
    return (
      <MitraShell showBack backHref="/mitra/jobs" hideNav>
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-danger-50 text-danger-600 flex items-center justify-center mx-auto">
            <InfoCircle size={24} />
          </div>
          <p className="text-xs text-neutral-600">{errorMsg || "Pekerjaan tidak ditemukan."}</p>
          <button
            type="button"
            onClick={() => router.push("/mitra/jobs")}
            className="px-4 py-2 rounded-xl bg-lavender-600 text-xs font-semibold text-white"
          >
            Kembali ke Daftar Pekerjaan
          </button>
        </div>
      </MitraShell>
    );
  }

  const isAccepted =
    order.status !== "paid" &&
    order.status !== "pending_payment";

  const problemPhotos = order.photos?.filter((p: any) => p.type === "problem") || [];
  const resultPhotos = order.photos?.filter((p: any) => p.type === "result") || [];

  const waTemplate = `Halo ${order.customer?.name || "Pelanggan"}, saya dari BuildMate untuk pesanan ${order.order_code}. Saya akan datang pada tanggal ${order.scheduled_date}, slot ${order.time_slot}.`;

  return (
    <MitraShell
      title={`Pesanan ${order.order_code}`}
      showBack
      backHref="/mitra/jobs"
      hideNav={true}
    >
      <div className="p-4 pb-28 space-y-5 animate-in fade-in duration-200">
        {/* 1. Header: Order code & Status */}
        <div className="flex items-center justify-between pb-1 border-b border-neutral-100">
          <div>
            <span className="text-[11px] text-neutral-400 block font-mono">
              Kode Pesanan
            </span>
            <span className="font-mono text-sm font-bold text-neutral-900">
              {order.order_code}
            </span>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* 2. Big Hak Tukang Amount (count-up, A4) */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-lavender-50 via-lavender-100/50 to-white border border-lavender-200/80 space-y-1">
          <span className="text-xs font-medium text-neutral-600">
            Hak pendapatan kamu:
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-3xl font-extrabold text-lavender-900 tabular-nums">
              {formatRupiah(animatedFee)}
            </span>
            <span className="text-[11px] font-semibold text-success-700 bg-success-50 px-2 py-0.5 rounded-full border border-success-200/60">
              Pasti & Terjamin
            </span>
          </div>
          <p className="text-[11px] text-neutral-500 pt-1 leading-relaxed">
            Dana aman di rekening bersama dan langsung dicairkan setelah pekerjaan dikonfirmasi selesai.
          </p>
        </div>

        {/* 3. Package & Scope */}
        <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
          <div>
            <span className="text-[10px] font-semibold tracking-wider text-lavender-700 uppercase">
              {order.package?.category_name}
            </span>
            <h3 className="font-serif text-lg font-medium text-neutral-900 leading-snug">
              {order.package?.name}
            </h3>
          </div>

          {/* Schedule */}
          <div className="flex items-center gap-2 text-xs text-neutral-600 p-2.5 rounded-xl bg-neutral-50">
            <Calendar1 size={16} className="text-neutral-500 shrink-0" />
            <span>{order.scheduled_date}</span>
            <span className="text-neutral-300">·</span>
            <Clock size={16} className="text-neutral-500 shrink-0" />
            <span>Slot {order.time_slot}</span>
          </div>

          {/* Inclusions & Exclusions */}
          <div className="space-y-2 pt-1 text-xs">
            {order.package?.inclusions && order.package.inclusions.length > 0 && (
              <div className="space-y-1">
                <span className="font-semibold text-neutral-800 text-[11px]">
                  Cakupan Pekerjaan (Termasuk):
                </span>
                <ul className="space-y-1 text-neutral-600">
                  {order.package.inclusions.map((inc: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <TickCircle size={14} className="text-success-600 shrink-0 mt-0.5" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {order.package?.exclusions && order.package.exclusions.length > 0 && (
              <div className="space-y-1 pt-1">
                <span className="font-semibold text-neutral-800 text-[11px]">
                  Tidak Termasuk:
                </span>
                <ul className="space-y-1 text-neutral-500">
                  {order.package.exclusions.map((exc: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <CloseCircle size={14} className="text-neutral-400 shrink-0 mt-0.5" />
                      <span>{exc}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Problem Description & Photos */}
          {order.description && (
            <div className="pt-2 border-t border-neutral-100 space-y-1">
              <span className="font-semibold text-neutral-800 text-[11px]">
                Deskripsi Masalah dari Pelanggan:
              </span>
              <p className="text-xs text-neutral-600 italic bg-neutral-50 p-2.5 rounded-xl">
                &ldquo;{order.description}&rdquo;
              </p>
            </div>
          )}

          {problemPhotos.length > 0 && (
            <div className="pt-2 space-y-1.5">
              <span className="font-semibold text-neutral-800 text-[11px]">
                Foto Masalah:
              </span>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {problemPhotos.map((p: any) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightboxImage(p.storage_path)}
                    className="w-20 h-20 rounded-xl overflow-hidden border border-neutral-200 shrink-0 focus:outline-none"
                  >
                    <img
                      src={p.storage_path}
                      alt="Foto Masalah"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 4. Customer Info (Privacy Gated, A1, A4) */}
        <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-neutral-800">
              Informasi Pelanggan & Lokasi
            </h4>
            {!isAccepted && (
              <span className="flex items-center gap-1 text-[10px] text-neutral-400 font-medium">
                <Lock size={12} />
                Privasi Terlindungi
              </span>
            )}
          </div>

          {isAccepted ? (
            <div className="space-y-3 text-xs animate-in fade-in">
              <div>
                <span className="text-[10px] text-neutral-400 block">Nama Pelanggan</span>
                <span className="font-semibold text-neutral-900 text-sm">
                  {order.customer?.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 block">Alamat Pengerjaan</span>
                <p className="text-neutral-700 leading-relaxed font-medium mt-0.5">
                  {order.address}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* Google Maps Button */}
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    order.address
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Map1 size={16} className="text-lavender-700" />
                  <span>Buka di Maps</span>
                </a>

                {/* WhatsApp Chat Button with prefilled template */}
                <a
                  href={`https://wa.me/${order.customer?.phone?.replace(/[^0-9]/g, "") || ""}?text=${encodeURIComponent(
                    waTemplate
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-11 rounded-xl bg-success-600 hover:bg-success-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                >
                  <WhatsappIcon size={16} />
                  <span>Chat Pelanggan</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-neutral-700">
                <Location size={16} className="text-neutral-400 shrink-0" />
                <span>{order.address}</span>
              </div>
              <p className="text-[11px] text-neutral-500 italic flex items-center gap-1">
                <Lock size={12} className="shrink-0" />
                Alamat detail & nomor WhatsApp pelanggan baru tampil setelah kamu menerima pekerjaan ini.
              </p>
            </div>
          )}
        </div>

        {/* 5. Result Photos Section */}
        {resultPhotos.length > 0 && (
          <div className="p-4 rounded-2xl border border-neutral-200 space-y-2.5">
            <h4 className="text-xs font-semibold text-neutral-800">
              Foto Hasil Pekerjaan ({resultPhotos.length} foto)
            </h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {resultPhotos.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightboxImage(p.storage_path)}
                  className="w-20 h-20 rounded-xl overflow-hidden border border-success-200 shrink-0 focus:outline-none"
                >
                  <img
                    src={p.storage_path}
                    alt="Foto Hasil"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Timeline Audit */}
        {order.events && order.events.length > 0 && (
          <div className="p-4 rounded-2xl border border-neutral-200 space-y-3">
            <h4 className="text-xs font-semibold text-neutral-800">
              Riwayat Aktivitas Pesanan
            </h4>
            <AuditTimeline events={order.events} />
          </div>
        )}

        {/* 7. Need Help WhatsApp Link */}
        <div className="text-center pt-2">
          <a
            href={`https://wa.me/6281234567890?text=${encodeURIComponent(
              `Halo Admin BuildMate, saya butuh bantuan untuk pesanan ${order.order_code}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-neutral-500 hover:text-lavender-700 inline-flex items-center gap-1.5 transition-colors"
          >
            <WhatsappIcon size={14} className="text-success-600" />
            <span>Butuh bantuan? Hubungi admin BuildMate</span>
          </a>
        </div>
      </div>

      {/* Sticky Action Bar (W05, A4) */}
      <StickyActionBar
        status={order.status}
        orderId={order.id}
        orderCode={order.order_code}
        packagePrice={order.package_price}
        resultPhotosCount={resultPhotos.length}
        onAccept={handleAccept}
        onDecline={() => setShowDeclineSheet(true)}
        onTransitionStatus={handleTransitionStatus}
        onOpenPhotoUploader={() => setShowPhotoUploadModal(true)}
        cancelReason={order.cancel_reason}
      />

      {/* Decline Sheet */}
      <DeclineSheet
        isOpen={showDeclineSheet}
        onClose={() => setShowDeclineSheet(false)}
        onConfirmDecline={handleDecline}
        orderCode={order.order_code}
      />

      {/* Upload Photo Modal */}
      {showPhotoUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-neutral-200 animate-in zoom-in-95">
            <h3 className="font-serif text-xl text-neutral-900">
              Unggah Foto Hasil Kerja
            </h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Foto hasil pekerjaan wajib diunggah untuk membuktikan perbaikan telah selesai dikerjakan dengan baik sebelum meminta konfirmasi pelanggan.
            </p>

            <label className="w-full h-32 rounded-2xl border-2 border-dashed border-lavender-300 hover:border-lavender-600 bg-lavender-50/50 flex flex-col items-center justify-center text-lavender-700 cursor-pointer transition-colors">
              <Camera size={32} />
              <span className="text-xs font-semibold mt-2">
                {uploadingPhoto ? "Mengunggah..." : "Pilih / Ambil Foto"}
              </span>
              <span className="text-[10px] text-neutral-400 mt-0.5">
                Maksimal 5 MB (JPG, PNG, WebP)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadResultPhoto}
                disabled={uploadingPhoto}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={() => setShowPhotoUploadModal(false)}
              className="w-full h-11 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* Photo Lightbox */}
      <PhotoLightbox
        isOpen={Boolean(lightboxImage)}
        imageUrl={lightboxImage || ""}
        onClose={() => setLightboxImage(null)}
      />
    </MitraShell>
  );
}

export default function MitraJobDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat detail pekerjaan...
        </div>
      }
    >
      <MitraJobDetailContent {...props} />
    </React.Suspense>
  );
}
