"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import {
  TickCircle,
  CloseCircle,
  Clock,
  ShieldTick,
  ArrowRight,
  Refresh,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getOrderById, transitionOrder } from "@/lib/data/orders";
import { Order } from "@/lib/data/types";
import confetti from "canvas-confetti";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

function PaymentStatusContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitStatus = searchParams.get("status");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState<
    "processing" | "success" | "pending" | "failed"
  >("processing");
  const [countdownMinutes, setCountdownMinutes] = useState(59);

  // Poll order status
  useEffect(() => {
    let timer: NodeJS.Timeout;
    let pollCount = 0;

    const checkStatus = async () => {
      const ord = await getOrderById(resolvedParams.orderId);
      if (ord) {
        setOrder(ord);

        if (explicitStatus === "success" || ord.status !== "pending_payment") {
          setPaymentState("success");
          setLoading(false);
          // Fire confetti per B8
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.6 },
          });
          return;
        }

        if (explicitStatus === "failed") {
          setPaymentState("failed");
          setLoading(false);
          return;
        }

        if (explicitStatus === "pending") {
          setPaymentState("pending");
          setLoading(false);
          return;
        }

        pollCount++;
        if (pollCount > 6) {
          // Fallback to pending state with instructions
          setPaymentState("pending");
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
      }
    };

    checkStatus();
    timer = setInterval(checkStatus, 2500);

    return () => clearInterval(timer);
  }, [resolvedParams.orderId, explicitStatus]);

  // Simulated instant payment for testing convenience in sandbox
  const handleSimulatePayment = async () => {
    if (!order) return;
    setPaymentState("processing");
    await transitionOrder(order.id, "paid", "webhook", {
      note: "Pembayaran sukses disimulasikan di Sandbox.",
    });
    setPaymentState("success");
    confetti({
      particleCount: 60,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  return (
    <CustomerShell title="Status Pembayaran" hideBottomNav={true}>
      <div className="max-w-md w-full mx-auto px-4 py-12">
        {/* 1. STATE MEMPROSES */}
        {paymentState === "processing" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-lavender-50 border border-lavender-200 flex items-center justify-center mx-auto text-lavender-600">
              <svg
                className="animate-spin h-8 w-8 text-lavender-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
                Mengonfirmasi Pembayaranmu…
              </h2>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs mx-auto">
                Sistem sedang memverifikasi notifikasi dari Midtrans. Proses ini biasanya membutuhkan waktu kurang dari 10 detik.
              </p>
            </div>

            {/* Sandbox Simulation Helper */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="px-4 py-2 rounded-full bg-cream-100 hover:bg-cream-200 text-xs font-semibold text-neutral-800 transition-colors"
              >
                Simulasikan Pembayaran Berhasil (Sandbox)
              </button>
            </div>
          </div>
        )}

        {/* 2. STATE BERHASIL */}
        {paymentState === "success" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated SVG Checkmark */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <TickCircle size={36} variant="Bold" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-3xl text-neutral-900 tracking-tight">
                Pembayaran Berhasil!
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Dana telah aman di rekening bersama BuildMate. Kami mulai mencarikan tukang untuk pekerjaanmu.
              </p>
            </div>

            {/* Order Summary Pill */}
            {order && (
              <div className="bg-cream-50 p-4 rounded-2xl border border-cream-200/80 text-left space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Kode Pesanan:</span>
                  <span className="font-mono font-bold text-neutral-900">
                    {order.order_code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Paket:</span>
                  <span className="font-semibold text-neutral-800">
                    {order.package.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Dibayar:</span>
                  <span className="font-bold text-neutral-900">
                    {formatRupiah(order.total)}
                  </span>
                </div>
              </div>
            )}

            {/* Action CTA */}
            <div className="pt-2">
              <Link
                href={`/orders/${order?.id || resolvedParams.orderId}`}
                className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Lihat Progres Pesanan</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* 3. STATE MENUNGGU PEMBAYARAN (VA / QRIS PENDING) */}
        {paymentState === "pending" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600 shadow-xs">
              <Clock size={32} variant="Bold" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
                Menunggu Pembayaran
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Selesaikan pembayaran sesuai instruksi Virtual Account / QRIS yang diberikan sebelum batas waktu berakhir.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-cream-50 border border-cream-200 text-xs text-neutral-700">
              <span>Batas waktu pembayaran: </span>
              <strong className="text-neutral-900 font-mono">
                {countdownMinutes} menit lagi
              </strong>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleSimulatePayment}
                className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold shadow-xs transition-all"
              >
                Bayar Sekarang (Simulasi Sandbox)
              </button>

              <Link
                href="/orders"
                className="block text-xs font-semibold text-neutral-600 hover:text-neutral-900"
              >
                Kembali ke Pesanan Saya
              </Link>
            </div>
          </div>
        )}

        {/* 4. STATE GAGAL / KEDALUWARSA */}
        {paymentState === "failed" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto text-danger-600 shadow-xs">
              <CloseCircle size={36} variant="Bold" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-3xl text-neutral-900">
                Pembayaran Belum Berhasil
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Waktu pembayaran telah kedaluwarsa atau transaksi dibatalkan. Tidak ada dana yang terpotong.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/search"
                className="inline-block px-6 py-3 rounded-full bg-lavender-600 text-white text-xs font-semibold shadow-xs hover:bg-lavender-700 transition-colors"
              >
                Pesan Ulang Layanan
              </Link>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

export default function PaymentStatusPage(props: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat status pembayaran...
        </div>
      }
    >
      <PaymentStatusContent {...props} />
    </React.Suspense>
  );
}
