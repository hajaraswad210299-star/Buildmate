"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { BeforeAfterSlider } from "@/components/customer/BeforeAfterSlider";
import {
  Clock,
  CardTick,
  UserTick,
  Routing2,
  Setting4,
  GalleryTick,
  TickCircle,
  CloseCircle,
  ShieldTick,
  Copy,
  WhatsappIcon,
  Crown1,
  Warning2,
  ArrowRight,
  Camera,
  Verify,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getOrderById, transitionOrder } from "@/lib/data/orders";
import { Order, OrderStatus } from "@/lib/data/types";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STEPS_LIST: { status: OrderStatus; label: string }[] = [
  { status: "pending_payment", label: "Pesanan Dibuat" },
  { status: "paid", label: "Dibayar & Mencari Tukang" },
  { status: "worker_confirmed", label: "Tukang Dikonfirmasi" },
  { status: "on_the_way", label: "Dalam Perjalanan" },
  { status: "in_progress", label: "Sedang Dikerjakan" },
  { status: "awaiting_confirmation", label: "Menunggu Konfirmasi" },
  { status: "completed", label: "Pesanan Selesai" },
];

function CustomerOrderDetailContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  // Confirmation Modal
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmNote, setConfirmNote] = useState("");
  const [submittingConfirm, setSubmittingConfirm] = useState(false);

  // Complaint Sheet
  const [complaintSheetOpen, setComplaintSheetOpen] = useState(false);
  const [complaintType, setComplaintType] = useState("Hasil belum rapi");
  const [complaintDesc, setComplaintDesc] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const fetchOrder = async () => {
    const ord = await getOrderById(resolvedParams.id);
    if (ord) setOrder({ ...ord });
    setLoading(false);
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000); // polling fallback
    return () => clearInterval(interval);
  }, [resolvedParams.id]);

  const handleCopyCode = () => {
    if (!order) return;
    navigator.clipboard.writeText(order.order_code);
    toast.success("Kode pesanan berhasil disalin!");
  };

  const handleConfirmOrder = async () => {
    if (!order) return;
    try {
      setSubmittingConfirm(true);
      const res = await fetch(`/api/orders/${order.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: confirmNote }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal mengonfirmasi pesanan.");
        setSubmittingConfirm(false);
        return;
      }

      setConfirmModalOpen(false);
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.6 },
      });
      toast.success("Pesanan selesai! Terima kasih telah menggunakan BuildMate.");
      fetchOrder();
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setSubmittingConfirm(false);
    }
  };

  const handleFileComplaint = async () => {
    if (!order) return;
    if (!complaintDesc.trim()) {
      toast.error("Mohon jelaskan kendala yang dialami.");
      return;
    }

    try {
      setSubmittingComplaint(true);
      const res = await fetch(`/api/orders/${order.id}/complaint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problem_type: complaintType,
          description: complaintDesc,
          is_warranty: Boolean(order.customer.is_plus),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal melaporkan masalah.");
        setSubmittingComplaint(false);
        return;
      }

      setComplaintSheetOpen(false);
      toast.success("Laporan masalah telah dicatat dan tim kami akan segera menghubungi.");
      fetchOrder();
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  const handleCancelPending = async () => {
    if (!order) return;
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Dibatalkan oleh pelanggan." }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pesanan telah dibatalkan.");
        fetchOrder();
      }
    } catch {
      toast.error("Gagal membatalkan pesanan.");
    }
  };

  if (loading) {
    return (
      <CustomerShell title="Detail Pesanan">
        <div className="min-h-[50vh] flex items-center justify-center text-xs text-neutral-400">
          Memuat pesanan...
        </div>
      </CustomerShell>
    );
  }

  if (!order) {
    return (
      <CustomerShell title="Pesanan Tidak Ditemukan">
        <div className="max-w-md mx-auto my-20 p-8 bg-white rounded-3xl border border-neutral-200 text-center space-y-4">
          <h2 className="font-serif text-2xl text-neutral-900">
            Pesanan Tidak Ditemukan
          </h2>
          <Link
            href="/orders"
            className="inline-block px-5 py-2.5 rounded-full bg-lavender-600 text-white text-xs font-semibold"
          >
            Kembali ke Pesanan Saya
          </Link>
        </div>
      </CustomerShell>
    );
  }

  // Find Problem and Result Photos
  const problemPhoto =
    order.photos?.find((p) => p.type === "problem")?.storage_path ||
    "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80";

  const resultPhoto =
    order.photos?.find((p) => p.type === "result")?.storage_path ||
    "https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=800&auto=format&fit=crop&q=80";

  // Status Copy & Icon Mapping (B15 Copy)
  const getStatusHero = () => {
    switch (order.status) {
      case "pending_payment":
        return {
          title: "Menunggu Pembayaran",
          desc: "Selesaikan pembayaran sesuai instruksi agar tukang segera ditugaskan.",
          bg: "bg-neutral-100 border-neutral-200 text-neutral-800",
          icon: <Clock size={32} variant="Bulk" className="text-neutral-600" />,
        };
      case "paid":
        return {
          title: "Dibayar · Mencari Tukang",
          desc: "Pembayaran diterima. Kami sedang mencarikan tukang terbaik untukmu.",
          bg: "bg-info-50 border-info-200 text-info-900",
          icon: <CardTick size={32} variant="Bulk" className="text-info-600" />,
        };
      case "worker_confirmed":
        return {
          title: "Tukang Dikonfirmasi",
          desc: `${order.worker?.name || "Tukang"} telah menerima pekerjaan dan menyepakati jadwal.`,
          bg: "bg-lavender-50 border-lavender-200 text-lavender-900",
          icon: <UserTick size={32} variant="Bulk" className="text-lavender-600" />,
        };
      case "on_the_way":
        return {
          title: "Dalam Perjalanan",
          desc: "Tukang sedang menuju ke alamat rumahmu.",
          bg: "bg-teal-50 border-teal-200 text-teal-900",
          icon: <Routing2 size={32} variant="Bulk" className="text-teal-600" />,
        };
      case "in_progress":
        return {
          title: "Sedang Dikerjakan",
          desc: "Pekerjaan perbaikan sedang berlangsung di lokasi.",
          bg: "bg-warning-50 border-warning-200 text-warning-900",
          icon: <Setting4 size={32} variant="Bulk" className="text-warning-600" />,
        };
      case "awaiting_confirmation":
        return {
          title: "Pekerjaan Selesai · Menunggu Konfirmasi",
          desc: "Pekerjaan selesai menurut tukang. Periksa bukti foto di bawah lalu konfirmasi selesai.",
          bg: "bg-orange-50 border-orange-200 text-orange-900",
          icon: <GalleryTick size={32} variant="Bulk" className="text-orange-600" />,
        };
      case "completed":
        return {
          title: "Terima Kasih! Pesanan Selesai",
          desc: "Pekerjaan telah dikonfirmasi dan dana telah diteruskan ke mitra tukang.",
          bg: "bg-emerald-50 border-emerald-200 text-emerald-900",
          icon: <TickCircle size={32} variant="Bulk" className="text-emerald-600" />,
        };
      case "cancelled":
        return {
          title: "Pesanan Dibatalkan",
          desc: order.cancel_reason || "Pesanan telah dibatalkan.",
          bg: "bg-danger-50 border-danger-200 text-danger-900",
          icon: <CloseCircle size={32} variant="Bulk" className="text-danger-600" />,
        };
    }
  };

  const statusHero = getStatusHero();
  const currentStepIdx = STEPS_LIST.findIndex((s) => s.status === order.status);

  return (
    <CustomerShell title="Detail Pesanan" showBack backHref="/orders">
      <div className="max-w-[760px] mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
        {/* 1. KARTU STATUS UTAMA (A5 C08) */}
        <div
          className={`p-6 sm:p-8 rounded-3xl border shadow-xs flex items-start gap-4 sm:gap-5 transition-all ${statusHero.bg}`}
        >
          <div className="shrink-0 mt-0.5">{statusHero.icon}</div>
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="font-serif text-2xl sm:text-3xl tracking-tight leading-snug">
              {statusHero.title}
            </h1>
            <p className="text-xs sm:text-sm leading-relaxed opacity-90">
              {statusHero.desc}
            </p>
          </div>
        </div>

        {/* 2. TIMELINE VERTIKAL 7 LANGKAH (A5 C08) */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <h2 className="font-serif text-xl sm:text-2xl text-neutral-900">
            Timeline Progres Pekerjaan
          </h2>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-neutral-200">
            {STEPS_LIST.map((stepItem, idx) => {
              const isPast = currentStepIdx > idx;
              const isCurrent = currentStepIdx === idx;

              return (
                <div key={stepItem.status} className="relative flex items-start gap-3">
                  {/* Step Dot */}
                  <div
                    className={`absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                      isPast
                        ? "bg-lavender-600 text-white"
                        : isCurrent
                        ? "bg-lavender-600 text-white ring-4 ring-lavender-200 animate-pulse"
                        : "bg-neutral-200 text-neutral-400"
                    }`}
                  >
                    {isPast ? (
                      <TickCircle size={14} variant="Bold" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>

                  <div>
                    <h3
                      className={`text-xs font-semibold leading-none ${
                        isCurrent
                          ? "text-lavender-700 font-bold"
                          : isPast
                          ? "text-neutral-800"
                          : "text-neutral-400"
                      }`}
                    >
                      {stepItem.label}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. SAAT AWAITING_CONFIRMATION: SLIDER SEBELUM/SESUDAH & ACTION BUTTONS */}
        {order.status === "awaiting_confirmation" && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-lavender-500 shadow-md space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-orange-700 bg-orange-100 px-3 py-1 rounded-full uppercase tracking-wider inline-block">
                Periksa Hasil Pekerjaan
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 pt-1">
                Bandingkan Foto Sebelum & Sesudah
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Geser pemisah ke kiri dan kanan untuk membandingkan kondisi awal dengan hasil perbaikan tukang.
              </p>
            </div>

            {/* Draggable Slider */}
            <BeforeAfterSlider
              beforeUrl={problemPhoto}
              afterUrl={resultPhoto}
              beforeLabel="Sebelum (Kendala)"
              afterLabel="Sesudah (Hasil Tukang)"
            />

            {/* Action Buttons: Selesai vs Masalah */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(true)}
                className="h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <TickCircle size={16} variant="Bold" />
                <span>Pesanan Selesai (Puas)</span>
              </button>

              <button
                type="button"
                onClick={() => setComplaintSheetOpen(true)}
                className="h-12 rounded-full border border-neutral-300 hover:bg-neutral-50 active:scale-95 text-neutral-800 text-xs font-semibold transition-all flex items-center justify-center gap-2"
              >
                <Warning2 size={16} />
                <span>Ada Masalah / Belum Rapi</span>
              </button>
            </div>
          </div>
        )}

        {/* 4. INFORMASI MITRA TUKANG */}
        {order.worker && (
          <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
            <h3 className="font-serif text-xl text-neutral-900">
              Mitra Tukang yang Bertugas
            </h3>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-lavender-100 text-lavender-700 font-bold text-lg flex items-center justify-center overflow-hidden border border-neutral-200">
                {order.worker.avatar_url ? (
                  <img
                    src={order.worker.avatar_url}
                    alt={order.worker.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{order.worker.name.charAt(0)}</span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="font-bold text-sm text-neutral-900 truncate">
                    {order.worker.name}
                  </h4>
                  {order.worker.is_verified && (
                    <Verify size={15} variant="Bold" className="text-lavender-600" />
                  )}
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Wilayah: {order.worker.service_area}
                </p>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Tukang akan menghubungi via WhatsApp sebelum menuju ke lokasi.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 5. JADWAL, ALAMAT, & RINCIAN BIAYA */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">
                Kode Pesanan
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-sm font-bold text-neutral-900">
                  {order.order_code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="text-neutral-400 hover:text-neutral-700 p-1"
                  aria-label="Salin kode pesanan"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <StatusBadge status={order.status} />
          </div>

          {/* Details */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-neutral-500">Paket:</span>
              <span className="font-semibold text-neutral-900 text-right">
                {order.package.name} ({order.package.category_name})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Jadwal:</span>
              <span className="font-semibold text-neutral-900 text-right">
                {formatDateId(order.scheduled_date)}, {order.time_slot}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Alamat:</span>
              <span className="font-medium text-neutral-800 text-right max-w-xs">
                {order.address}
              </span>
            </div>
          </div>

          {/* Cost breakdown with dotted lines (Flamingo pattern) */}
          <div className="pt-3 border-t border-neutral-100 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Harga Paket Layanan</span>
              <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
              <span className="font-semibold">{formatRupiah(order.package_price)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600">Biaya Layanan Platform</span>
              <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
              <span className="font-semibold">
                {order.service_fee === 0 ? "Rp0 · Plus" : formatRupiah(order.service_fee)}
              </span>
            </div>
            <div className="pt-2 flex items-center justify-between text-sm font-bold text-neutral-900">
              <span>Total Biaya</span>
              <div className="flex-1 border-b border-dotted border-neutral-300 mx-3" />
              <span>{formatRupiah(order.total)}</span>
            </div>
          </div>
        </div>

        {/* 6. BUTUH BANTUAN & BATALKAN */}
        <div className="space-y-3 pt-2 text-center">
          <a
            href="https://wa.me/6281200000000"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-12 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsappIcon size={16} color="#079455" />
            <span>Butuh Bantuan? Hubungi WhatsApp BuildMate</span>
          </a>

          {order.status === "pending_payment" && (
            <button
              type="button"
              onClick={handleCancelPending}
              className="text-xs font-semibold text-danger-700 hover:underline"
            >
              Batalkan Pesanan Ini
            </button>
          )}

          {order.status !== "pending_payment" &&
            order.status !== "completed" &&
            order.status !== "cancelled" && (
              <p className="text-[11px] text-neutral-400">
                Ingin membatalkan atau mengubah jadwal setelah pembayaran? Silakan hubungi tim kami via WhatsApp.
              </p>
            )}
        </div>
      </div>

      {/* CONFIRMATION MODAL (A5 C08) */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
              <TickCircle size={32} variant="Bold" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-serif text-2xl text-neutral-900">
                Konfirmasi Pesanan Selesai
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Apakah perbaikan sudah beres sesuai harapanmu? Setelah dikonfirmasi, dana di rekening bersama akan dicairkan ke mitra tukang.
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-semibold text-neutral-700">
                Catatan Kepuasan (Opsional)
              </label>
              <textarea
                rows={2}
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                placeholder="Pekerjaan sangat rapi dan cepat!"
                className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-lavender-600 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="h-11 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={handleConfirmOrder}
                disabled={submittingConfirm}
                className="h-11 rounded-full bg-lavender-600 text-white text-xs font-semibold shadow-xs hover:bg-lavender-700"
              >
                {submittingConfirm ? "Menyelesaikan…" : "Ya, Pekerjaan Beres"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT BOTTOM SHEET (A5 C08) */}
      {complaintSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-xl animate-in slide-in-from-bottom duration-200">
            <div className="w-12 h-1 bg-neutral-300 rounded-full mx-auto -mt-2 sm:hidden" />

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Warning2 size={20} className="text-danger-600" />
                <h3 className="font-serif text-2xl text-neutral-900">
                  Lapor Masalah Pekerjaan
                </h3>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Dana kamu tetap ditahan aman di platform selama komplain berlangsung.
              </p>
            </div>

            {order.customer.is_plus && (
              <div className="p-3 rounded-xl bg-lavender-50 border border-lavender-200 text-lavender-900 text-xs flex items-center gap-2 font-semibold">
                <Crown1 size={16} variant="Bold" className="text-lavender-600 shrink-0" />
                <span>Terlindungi Garansi Pengerjaan Ulang BuildMate Plus</span>
              </div>
            )}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Jenis Kendala
                </label>
                <select
                  value={complaintType}
                  onChange={(e) => setComplaintType(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-neutral-200 text-xs bg-white text-neutral-900"
                >
                  <option value="Hasil belum rapi">Hasil belum rapi</option>
                  <option value="Belum selesai">Pekerjaan belum selesai</option>
                  <option value="Ada kerusakan baru">Ada kerusakan baru</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-neutral-700">
                  Keterangan Kendala
                </label>
                <textarea
                  rows={3}
                  required
                  value={complaintDesc}
                  onChange={(e) => setComplaintDesc(e.target.value)}
                  placeholder="Jelaskan detail bagian mana yang belum rapi..."
                  className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 focus:outline-none focus:border-lavender-600 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setComplaintSheetOpen(false)}
                className="h-11 rounded-full border border-neutral-200 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleFileComplaint}
                disabled={submittingComplaint}
                className="h-11 rounded-full bg-danger-600 text-white text-xs font-semibold shadow-xs hover:bg-danger-700"
              >
                {submittingComplaint ? "Mengirim…" : "Kirim Laporan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerShell>
  );
}

export default function CustomerOrderDetailPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat detail pesanan...
        </div>
      }
    >
      <CustomerOrderDetailContent {...props} />
    </React.Suspense>
  );
}
