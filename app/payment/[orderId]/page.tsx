"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { CustomerShell } from "@/components/customer/CustomerShell";
import {
  TickCircle,
  CloseCircle,
  Clock,
  ShieldTick,
  ArrowRight,
  Refresh,
  InfoCircle,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getOrderById, registerClientOrder } from "@/lib/data/orders";
import { Order } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/client";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { getSnapScriptUrl } from "@/lib/payments/snap-url";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

type PaymentUiState = "processing" | "success" | "waiting" | "failed";

function PaymentStatusContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitStatus = searchParams.get("status");

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiState, setUiState] = useState<PaymentUiState>(
    explicitStatus === "success" ? "processing" : "processing"
  );
  const [hasConfettiTriggered, setHasConfettiTriggered] = useState(false);

  // 15-Minute Countdown Timer for Waiting State
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(895);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutesFormatted = Math.floor(timeLeftSeconds / 60)
    .toString()
    .padStart(2, "0");
  const secondsFormatted = (timeLeftSeconds % 60).toString().padStart(2, "0");

  // Determine state based on order status
  const evaluateState = (ord: Order) => {
    // Berhasil: paid, worker_confirmed, on_the_way, in_progress, awaiting_confirmation, completed
    if (
      ord.status === "paid" ||
      ord.status === "worker_confirmed" ||
      ord.status === "on_the_way" ||
      ord.status === "in_progress" ||
      ord.status === "awaiting_confirmation" ||
      ord.status === "completed"
    ) {
      setUiState("success");
      if (!hasConfettiTriggered) {
        setHasConfettiTriggered(true);
        confetti({
          particleCount: 75,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
      return;
    }

    // Gagal / Dibatalkan
    if (ord.status === "cancelled" || explicitStatus === "failed") {
      setUiState("failed");
      return;
    }

    // Menunggu (pending_payment)
    if (ord.status === "pending_payment") {
      if (explicitStatus === "success") {
        setUiState("processing");
      } else {
        setUiState("waiting");
      }
    }
  };

  // Fetch Order logic (Reads from DB and Server API)
  const fetchLatestOrder = async () => {
    try {
      let ord: Order | null = null;

      // 1. Always check API first for live database & Midtrans status sync
      if (typeof window !== "undefined") {
        try {
          const res = await fetch(`/api/orders/${resolvedParams.orderId}`, {
            cache: "no-store",
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.order) {
              const fetchedOrder: Order = data.order;
              ord = fetchedOrder;
              registerClientOrder(fetchedOrder);
              sessionStorage.setItem(`bm_order_${resolvedParams.orderId}`, JSON.stringify(fetchedOrder));
            }
          }
        } catch {}
      }

      // 2. Fallback check from local getOrderById
      if (!ord) {
        ord = await getOrderById(resolvedParams.orderId);
      }

      // 3. Fallback check from sessionStorage
      if (!ord && typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem(`bm_order_${resolvedParams.orderId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.id) ord = parsed;
          }
        } catch {}
      }

      if (ord) {
        setOrder(ord);
        evaluateState(ord);
      }
      setLoading(false);
      return ord;
    } catch {
      setLoading(false);
      return null;
    }
  };

  // Realtime & Polling
  useEffect(() => {
    fetchLatestOrder();

    // 1. Supabase Realtime Subscription (C06)
    const supabase = createClient();
    const channel = supabase
      .channel(`order-payment-status-${resolvedParams.orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${resolvedParams.orderId}`,
        },
        (payload: any) => {
          if (payload.new) {
            fetchLatestOrder();
          }
        }
      )
      .subscribe();

    // 2. Fallback Polling (2.5s, maks 60s / 24 attempts)
    let attempts = 0;
    const maxAttempts = 24;

    const interval = setInterval(async () => {
      attempts += 1;
      const updated = await fetchLatestOrder();

      // If status is final (paid or cancelled) or exceeded 60s, stop polling
      if (
        updated?.status === "paid" ||
        updated?.status === "cancelled" ||
        attempts >= maxAttempts
      ) {
        clearInterval(interval);
      }
    }, 2500);

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [resolvedParams.orderId, explicitStatus]);

  // Handle "Lanjutkan Pembayaran" (Open Snap Modal again)
  const handleResumePayment = () => {
    if (!order?.snap_token) {
      toast.error("Token pembayaran tidak ditemukan. Silakan hubungi admin.");
      return;
    }

    if (typeof window !== "undefined" && (window as any).snap) {
      (window as any).snap.pay(order.snap_token, {
        onSuccess: () => {
          fetchLatestOrder();
        },
        onPending: () => {
          setUiState("waiting");
          fetchLatestOrder();
        },
        onError: () => {
          fetchLatestOrder();
        },
        onClose: () => {
          fetchLatestOrder();
        },
      });
    } else {
      toast.error("Script Midtrans Snap belum siap. Mohon tunggu sebentar.");
    }
  };

  return (
    <CustomerShell title="Status Pembayaran" hideBottomNav={true}>
      {/* Script Snap Midtrans */}
      <Script
        src={getSnapScriptUrl()}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />

      <div className="max-w-xl mx-auto px-4 py-8 sm:py-14">
        {/* Loading Initial State */}
        {loading && (
          <div className="min-h-[40vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-lavender-200 border-t-lavender-600 rounded-full animate-spin" />
            <p className="text-xs text-neutral-500 font-medium">
              Memeriksa status pembayaran...
            </p>
          </div>
        )}

        {/* Not Found */}
        {!loading && !order && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-xs text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto text-danger-600">
              <CloseCircle size={36} variant="Bold" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-neutral-900">
                Pesanan Tidak Ditemukan
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                ID pesanan ini tidak dapat ditemukan dalam sistem.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/services"
                className="inline-block px-6 py-2.5 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold transition-colors"
              >
                Kembali ke Layanan
              </Link>
            </div>
          </div>
        )}

        {/* 1. STATE: MEMPROSES (PROCESSING) */}
        {!loading && order && uiState === "processing" && (
          <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-lavender-50 border border-lavender-200 flex items-center justify-center mx-auto text-lavender-600">
              <div className="w-8 h-8 border-4 border-lavender-300 border-t-lavender-600 rounded-full animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
                Mengonfirmasi pembayaranmu…
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Biasanya kurang dari 10 detik. Sistem sedang menyinkronkan status pembayaran dari Midtrans Sandbox.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => fetchLatestOrder()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold transition-colors"
              >
                <Refresh size={14} />
                <span>Periksa Sekarang</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. STATE: BERHASIL (SUCCESS - B12 & C06) */}
        {!loading && order && uiState === "success" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Checkmark */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <TickCircle size={38} variant="Bold" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-3xl text-neutral-900 tracking-tight">
                Pembayaran Berhasil
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Dana pembayaran telah diamankan di Rekening Bersama Midtrans. Sistem sedang menyiapkan penugasan mitra tukang.
              </p>
            </div>

            {/* Receipt Summary */}
            <div className="p-4 sm:p-5 rounded-2xl bg-cream-50/80 border border-cream-200/80 text-left text-xs space-y-2.5 font-sans">
              <div className="flex justify-between">
                <span className="text-neutral-500">Kode Pesanan:</span>
                <span className="font-mono font-bold text-neutral-900">
                  {order.order_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Paket Layanan:</span>
                <span className="font-semibold text-neutral-800">
                  {order.package.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Jadwal Pelaksanaan:</span>
                <span className="text-neutral-800">
                  {formatDateId(order.scheduled_date)} · {order.time_slot}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-cream-200">
                <span className="text-neutral-500">Total Dibayar:</span>
                <span className="font-mono font-bold text-sm text-neutral-900">
                  {formatRupiah(order.total)}
                </span>
              </div>
            </div>

            {/* Action CTA Buttons */}
            <div className="space-y-2.5 pt-1">
              <Link
                href={`/orders/${order.id}`}
                className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Lihat Progres Pesanan</span>
                <ArrowRight size={14} />
              </Link>
              <Link
                href="/orders"
                className="block text-xs font-semibold text-neutral-500 hover:text-neutral-800 py-1"
              >
                Lihat Semua Pesanan Saya
              </Link>
            </div>
          </div>
        )}

        {/* 3. STATE: MENUNGGU (WAITING - C06) */}
        {!loading && order && uiState === "waiting" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
              <Clock size={36} variant="Bold" />
            </div>

            <div className="space-y-1.5">
              <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
                Menunggu Pembayaran
              </h2>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                Selesaikan pembayaran sesuai instruksi di popup Midtrans Snap. Setelah pembayaran selesai, status pesanan akan berubah otomatis.
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-neutral-100 border border-neutral-200 text-xs font-mono font-medium text-neutral-700">
              <span>Selesaikan dalam:</span>
              <span className="text-lavender-700 font-bold">
                {minutesFormatted}:{secondsFormatted}
              </span>
            </div>

            {/* Bill Info */}
            <div className="p-4 rounded-2xl bg-cream-50/80 border border-cream-200/80 text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-neutral-500">Kode Pesanan:</span>
                <span className="font-mono font-bold text-neutral-800">{order.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Total Tagihan:</span>
                <span className="font-mono font-bold text-neutral-900 text-sm">
                  {formatRupiah(order.total)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={handleResumePayment}
                className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-95 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-all"
              >
                <ShieldTick size={16} />
                <span>Lanjutkan Pembayaran (Buka Snap)</span>
              </button>
              <button
                type="button"
                onClick={() => fetchLatestOrder()}
                className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 py-1"
              >
                <Refresh size={14} />
                <span>Periksa Status Lagi</span>
              </button>
            </div>

            {/* Sandbox Guidance Box (B12 & B20) */}
            {process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION !== "true" && (
              <div className="p-4 rounded-2xl bg-lavender-50/80 border border-lavender-200/90 text-left text-xs text-lavender-950 space-y-2 mt-4">
                <div className="flex items-center gap-1.5 font-semibold text-lavender-800">
                  <InfoCircle size={15} className="text-lavender-600 shrink-0" />
                  <span>Mode sandbox — tidak ada uang sungguhan.</span>
                </div>
                <p className="text-[11px] text-neutral-600 leading-relaxed">
                  Buka{" "}
                  <a
                    href="https://simulator.sandbox.midtrans.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lavender-700 font-bold underline hover:text-lavender-900 inline-flex items-center gap-0.5"
                  >
                    simulator pembayaran resmi Midtrans
                  </a>{" "}
                  untuk membayar VA/QRIS. Kartu kredit uji:{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    4811 1111 1111 1114
                  </span>
                  , CVV{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    123
                  </span>
                  , OTP{" "}
                  <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-lavender-200 font-semibold text-neutral-800">
                    112233
                  </span>
                  .
                </p>
              </div>
            )}
          </div>
        )}

        {/* 4. STATE: GAGAL / KEDALUWARSA (FAILED - C06) */}
        {!loading && order && uiState === "failed" && (
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="w-16 h-16 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto text-danger-600">
              <CloseCircle size={36} variant="Bold" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-neutral-900">
                Pembayaran Dibatalkan / Kedaluwarsa
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Batas waktu transaksi telah berakhir atau transaksi dibatalkan oleh pengguna.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <Link
                href={`/order/${order.package_id}`}
                className="block w-full py-3 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold text-center transition-colors"
              >
                Pesan Ulang Layanan
              </Link>
              <Link
                href="/"
                className="block text-xs font-semibold text-neutral-500 hover:text-neutral-800 py-1"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        )}
      </div>
    </CustomerShell>
  );
}

export default function PaymentStatusPage({ params }: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-cream-50 flex items-center justify-center text-xs text-neutral-400">
          Memuat status pembayaran…
        </div>
      }
    >
      <PaymentStatusContent params={params} />
    </React.Suspense>
  );
}
