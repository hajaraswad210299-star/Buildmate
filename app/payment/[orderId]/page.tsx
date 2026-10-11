"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { CustomerShell } from "@/components/customer/CustomerShell";
import {
  TickCircle,
  CloseCircle,
  Clock,
  ShieldTick,
  ArrowRight,
  Refresh,
  Crown1,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { getOrderById, transitionOrder } from "@/lib/data/orders";
import { Order } from "@/lib/data/types";
import confetti from "canvas-confetti";
import { toast } from "sonner";

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const SIMULATOR_APPS = [
  {
    id: "gopay",
    name: "GoPay",
    color: "#00AA13",
    bgLight: "bg-emerald-50",
    borderLight: "border-emerald-200",
    textLight: "text-emerald-700",
    saldo: "Rp 1.500.000",
    icon: "🟢",
  },
  {
    id: "bca",
    name: "BCA Mobile",
    color: "#005E9E",
    bgLight: "bg-blue-50",
    borderLight: "border-blue-200",
    textLight: "text-blue-700",
    saldo: "Rp 4.250.000",
    icon: "🔵",
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    color: "#EE4D2D",
    bgLight: "bg-orange-50",
    borderLight: "border-orange-200",
    textLight: "text-orange-700",
    saldo: "Rp 950.000",
    icon: "🟠",
  },
  {
    id: "dana",
    name: "DANA",
    color: "#118EEA",
    bgLight: "bg-sky-50",
    borderLight: "border-sky-200",
    textLight: "text-sky-700",
    saldo: "Rp 800.000",
    icon: "🔵",
  },
];

function PaymentStatusContent({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitStatus = searchParams.get("status");
  const isSimulatorAction = searchParams.get("action") === "simulate_scan";

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentState, setPaymentState] = useState<"qris" | "processing" | "success" | "failed">("qris");

  // QRIS State
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [selectedApp, setSelectedApp] = useState(SIMULATOR_APPS[0]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStepText, setScanStepText] = useState("");
  const [showPhoneSimulator, setShowPhoneSimulator] = useState(isSimulatorAction);

  // 15-Minute Countdown Timer
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

  // Poll order status & generate QR
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      let ord = await getOrderById(resolvedParams.orderId);

      // Fallback 1: Direct check from sessionStorage for instant zero-latency loading
      if (!ord && typeof window !== "undefined") {
        try {
          const cached = sessionStorage.getItem(`bm_order_${resolvedParams.orderId}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed?.id) ord = parsed;
          }
        } catch {}
      }

      // Fallback 2: Server API endpoint fetch
      if (!ord && typeof window !== "undefined") {
        try {
          const res = await fetch(`/api/orders/${resolvedParams.orderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.order) ord = data.order;
          }
        } catch {}
      }

      if (ord) {
        setOrder(ord);

        if (explicitStatus === "success" || ord.status !== "pending_payment") {
          setPaymentState("success");
          setLoading(false);
          confetti({
            particleCount: 60,
            spread: 70,
            origin: { y: 0.6 },
          });
          return;
        }

        if (explicitStatus === "failed") {
          setPaymentState("failed");
          setLoading(false);
          return;
        }

        setPaymentState("qris");
        setLoading(false);

        // Generate authentic QRIS dynamic QR code
        try {
          const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
          const qrPayload = `${origin}/payment/${ord.id}?action=simulate_scan&amount=${ord.total}`;
          const url = await QRCode.toDataURL(qrPayload, {
            width: 340,
            margin: 1,
            color: {
              dark: "#0F172A",
              light: "#FFFFFF",
            },
          });
          setQrCodeDataUrl(url);
        } catch (qrErr) {
          console.error("Failed to generate QRIS code:", qrErr);
        }
      } else {
        setLoading(false);
      }
    };

    checkStatus();
    timer = setInterval(checkStatus, 3000);
    return () => clearInterval(timer);
  }, [resolvedParams.orderId, explicitStatus]);

  // Handle Realistic QRIS Payment Simulation
  const handleSimulatePayment = async (overrideApp?: typeof SIMULATOR_APPS[0]) => {
    if (!order) return;
    const app = overrideApp || selectedApp;

    setIsScanning(true);
    setScanStepText(`Memindai QRIS via ${app.name}…`);

    // Step 1: Laser scanning sweep simulation
    setTimeout(() => {
      setScanStepText(`Mengotorisasi saldo ${app.name} (${formatRupiah(order.total)})…`);
    }, 800);

    // Step 2: Confirm payment via backend API & transition order
    setTimeout(async () => {
      setScanStepText("Memverifikasi Rekening Bersama Midtrans…");
      try {
        await fetch(`/api/orders/${order.id}/pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: "QRIS",
            appName: app.name,
          }),
        });

        await transitionOrder(order.id, "paid", "webhook", {
          actorName: `Midtrans Sandbox (${app.name})`,
          note: `Pembayaran QRIS via ${app.name} berhasil disimulasikan.`,
        });

        // Update local state and cache
        const updatedOrder = { ...order, status: "paid" as const, paid_at: new Date().toISOString() };
        setOrder(updatedOrder);
        if (typeof window !== "undefined") {
          sessionStorage.setItem(`bm_order_${order.id}`, JSON.stringify(updatedOrder));
        }

        setIsScanning(false);
        setShowPhoneSimulator(false);
        setPaymentState("success");

        toast.success(`Pembayaran Rp${order.total.toLocaleString("id-ID")} berhasil via ${app.name}!`);

        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch (payErr) {
        console.error("Simulation error:", payErr);
        setIsScanning(false);
        toast.error("Gagal memproses simulasi pembayaran.");
      }
    }, 1800);
  };

  return (
    <CustomerShell title="Pembayaran QRIS" hideBottomNav={true}>
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Loading State */}
        {loading && (
          <div className="min-h-[45vh] flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-lavender-200 border-t-lavender-600 rounded-full animate-spin" />
            <p className="text-xs text-neutral-500 font-medium">Menyiapkan kode QRIS Rekber...</p>
          </div>
        )}

        {/* Not Found State */}
        {!loading && !order && (
          <div className="max-w-md mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6">
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
                className="inline-block w-full py-3 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold text-center"
              >
                Kembali ke Layanan
              </Link>
            </div>
          </div>
        )}

        {/* 1. STATE QRIS: AUTHENTIC QRIS STANDEE + SIMULATOR PANEL */}
        {!loading && paymentState === "qris" && order && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT / CENTER: AUTHENTIC INDONESIAN QRIS STANDEE CARD */}
            <div className="lg:col-span-7 flex flex-col items-center">
              <div className="w-full max-w-[380px] bg-white rounded-3xl border-2 border-neutral-300 shadow-[0_12px_40px_rgb(0,0,0,0.08)] overflow-hidden text-center relative">
                {/* Official National QRIS Red Header */}
                <div className="bg-[#E52320] text-white pt-5 pb-4 px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Official QRIS Logo Mark */}
                    <div className="bg-white text-[#E52320] font-black text-xs px-2 py-0.5 rounded tracking-tighter">
                      QRIS
                    </div>
                    <span className="text-[10px] tracking-wider uppercase font-medium text-white/90">
                      Nasional
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/95">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>GPN TERHUBUNG</span>
                  </div>
                </div>

                {/* Merchant Information */}
                <div className="pt-4 pb-2 px-6 border-b border-neutral-100 bg-neutral-50/70">
                  <h3 className="font-bold text-sm text-neutral-900 tracking-tight leading-tight">
                    BUILDMATE REKENING BERSAMA
                  </h3>
                  <div className="flex items-center justify-center gap-3 text-[10px] text-neutral-500 font-mono mt-1">
                    <span>NMID: ID102026888999</span>
                    <span>•</span>
                    <span>A01 · VERIFIKASI OTOMATIS</span>
                  </div>
                </div>

                {/* The QR Code Container */}
                <div className="p-6 relative flex flex-col items-center justify-center bg-white">
                  <div className="relative p-2 rounded-2xl border border-neutral-200 bg-white shadow-inner group">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QRIS BuildMate"
                        className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                      />
                    ) : (
                      <div className="w-64 h-64 flex items-center justify-center text-xs text-neutral-400">
                        Membuat QRIS…
                      </div>
                    )}

                    {/* BuildMate Shield Emblem at Center of QR */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-xl bg-white p-1 shadow-md border border-neutral-200 flex items-center justify-center">
                        <img
                          src="/icon.svg"
                          alt="BuildMate"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>

                    {/* Animated Green Laser Scanner Bar when Simulating */}
                    {isScanning && (
                      <div className="absolute inset-x-2 h-1.5 bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-[0_0_15px_#10B981] animate-pulse top-1/2 -translate-y-1/2 pointer-events-none">
                        <div className="w-full h-full bg-emerald-400 opacity-75 blur-xs" />
                      </div>
                    )}
                  </div>

                  {/* Scanning Status Badge */}
                  {isScanning && (
                    <div className="mt-3 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold animate-pulse border border-emerald-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{scanStepText}</span>
                    </div>
                  )}

                  {/* Amount to Pay */}
                  <div className="mt-4 pt-3 border-t border-neutral-100 w-full text-center">
                    <span className="text-[11px] text-neutral-400 uppercase tracking-wider block font-medium">
                      Total Nominal Pembayaran
                    </span>
                    <span className="font-mono text-2xl sm:text-3xl font-extrabold text-neutral-900 tracking-tight">
                      {formatRupiah(order.total)}
                    </span>
                  </div>
                </div>

                {/* Countdown & Order Code Footer */}
                <div className="bg-neutral-50 p-4 border-t border-neutral-200/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <Clock size={15} className="text-amber-500 shrink-0" />
                    <span className="text-[11px]">Batas Waktu:</span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded">
                      {minutesFormatted}:{secondsFormatted}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-neutral-500 font-semibold">
                    {order.order_code}
                  </span>
                </div>

                {/* E-Wallets & Banks Acceptance Footer */}
                <div className="py-2.5 px-4 bg-white border-t border-neutral-100 flex flex-wrap items-center justify-center gap-2 text-[9px] font-bold text-neutral-400 uppercase">
                  <span>BCA</span>
                  <span>•</span>
                  <span>MANDIRI</span>
                  <span>•</span>
                  <span>GOPAY</span>
                  <span>•</span>
                  <span>OVO</span>
                  <span>•</span>
                  <span>DANA</span>
                  <span>•</span>
                  <span>SHOPEEPAY</span>
                </div>
              </div>

              {/* Security Hint */}
              <p className="text-[11px] text-neutral-500 mt-4 text-center max-w-sm flex items-center justify-center gap-1.5">
                <ShieldTick size={14} className="text-lavender-600 shrink-0" />
                <span>Dana aman di rekening bersama Midtrans. Otomatis diverifikasi.</span>
              </p>
            </div>

            {/* RIGHT: INTERACTIVE SIMULATOR PANEL (EXPERIENCE REAL PAYMENT WITHOUT MONEY) */}
            <div className="lg:col-span-5 space-y-5">
              <div className="bg-white p-6 sm:p-7 rounded-3xl border border-neutral-200/90 shadow-sm space-y-5">
                {/* Simulator Header */}
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lavender-100 text-lavender-700 text-[10px] font-bold uppercase tracking-wider mb-1">
                      <span>Simulasi Sandbox</span>
                    </div>
                    <h2 className="font-serif text-xl sm:text-2xl text-neutral-900">
                      Coba Simulasi Bayar
                    </h2>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Pilih aplikasi e-wallet / mobile banking untuk mensimulasikan proses scan QRIS tanpa uang sungguhan.
                    </p>
                  </div>
                </div>

                {/* App Selector Grid */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Pilih Dompet / Bank Pembayar:
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {SIMULATOR_APPS.map((app) => (
                      <button
                        key={app.id}
                        type="button"
                        onClick={() => setSelectedApp(app)}
                        className={`p-3 rounded-2xl border text-left transition-all relative ${
                          selectedApp.id === app.id
                            ? `${app.bgLight} ${app.borderLight} ring-2 ring-lavender-400 shadow-xs`
                            : "bg-white border-neutral-200 hover:border-neutral-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base">{app.icon}</span>
                          {selectedApp.id === app.id && (
                            <span className="w-2 h-2 rounded-full bg-lavender-600" />
                          )}
                        </div>
                        <p className="text-xs font-bold text-neutral-900 leading-tight">
                          {app.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                          Saldo: {app.saldo}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Action Button: Simulate Instant Scan & Pay */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    onClick={() => handleSimulatePayment()}
                    disabled={isScanning}
                    className="w-full h-13 rounded-2xl bg-[#E52320] hover:bg-[#D01E1B] active:scale-[0.98] text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isScanning ? (
                      <>
                        <svg
                          className="animate-spin h-4 w-4 text-white"
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
                        <span>{scanStepText || "Memproses…" }</span>
                      </>
                    ) : (
                      <>
                        <span>⚡ Simulasikan Scan via {selectedApp.name}</span>
                      </>
                    )}
                  </button>

                  {/* Open Smartphone Camera Viewfinder Simulator */}
                  <button
                    type="button"
                    onClick={() => setShowPhoneSimulator(true)}
                    className="w-full h-11 rounded-2xl bg-neutral-100 hover:bg-neutral-200 active:scale-[0.98] text-neutral-800 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <span>📱 Buka Layar Scanner HP (Interaktif)</span>
                  </button>
                </div>

                {/* Official Midtrans Simulator Link */}
                <div className="pt-3 border-t border-neutral-100 text-center">
                  <a
                    href="https://simulator.sandbox.midtrans.com/qris/index"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-800 font-medium transition-colors"
                  >
                    <span>Buka Simulator Resmi Midtrans QRIS</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>

              {/* Order Summary Snapshot */}
              <div className="bg-neutral-50 p-5 rounded-3xl border border-neutral-200/80 text-xs space-y-2.5">
                <p className="font-semibold text-neutral-900 pb-1 border-b border-neutral-200/60">
                  Rincian Transaksi
                </p>
                <div className="flex justify-between text-neutral-600">
                  <span>Layanan:</span>
                  <span className="font-semibold text-neutral-900">{order.package.name}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Tarif Paket:</span>
                  <span className="font-mono">{formatRupiah(order.package_price)}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Biaya Layanan & Rekber:</span>
                  <span className="font-mono">{formatRupiah(order.service_fee)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-200 text-neutral-900 font-bold">
                  <span>Total Tagihan:</span>
                  <span className="font-mono text-sm">{formatRupiah(order.total)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. STATE PEMBAYARAN BERHASIL (SUCCESS STATE) */}
        {paymentState === "success" && order && (
          <div className="max-w-md mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-md text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Animated Checkmark */}
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-xs">
              <TickCircle size={38} variant="Bold" />
            </div>

            <div className="space-y-1">
              <h2 className="font-serif text-3xl text-neutral-900 tracking-tight">
                Pembayaran Berhasil!
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto leading-relaxed">
                Dana telah aman di rekening bersama BuildMate via Midtrans Escrow. Pesananmu kini diteruskan ke mitra tukang.
              </p>
            </div>

            {/* Official Receipt Pill */}
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 text-left space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Kode Pesanan:</span>
                <span className="font-mono font-bold text-neutral-900">
                  {order.order_code}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Metode Bayar:</span>
                <span className="font-semibold text-neutral-800">
                  QRIS ({selectedApp.name} Simulator)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Layanan:</span>
                <span className="font-semibold text-neutral-800">
                  {order.package.name}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-200">
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
                <span>Pantau Progres Pesanan & Tukang</span>
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

        {/* 3. STATE GAGAL */}
        {paymentState === "failed" && (
          <div className="max-w-md mx-auto bg-white p-8 sm:p-10 rounded-3xl border border-neutral-200/90 shadow-sm text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-danger-50 border border-danger-200 flex items-center justify-center mx-auto text-danger-600">
              <CloseCircle size={36} variant="Bold" />
            </div>
            <div className="space-y-1">
              <h2 className="font-serif text-2xl text-neutral-900">
                Pembayaran Belum Diterima
              </h2>
              <p className="text-xs text-neutral-500 max-w-xs mx-auto">
                Batas waktu verifikasi telah berakhir atau transaksi dibatalkan.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setPaymentState("qris")}
                className="w-full h-12 rounded-full bg-lavender-600 hover:bg-lavender-700 text-white text-xs font-semibold"
              >
                Coba Bayar Lagi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. MODAL: SMARTPHONE QRIS SCANNER SIMULATOR */}
      {showPhoneSimulator && order && (
        <div className="fixed inset-0 z-50 bg-neutral-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-neutral-900 rounded-[40px] border-4 border-neutral-800 shadow-2xl overflow-hidden text-white flex flex-col animate-in zoom-in-95 duration-200">
            {/* Phone Top Notch & Header */}
            <div className="pt-4 px-6 pb-3 flex items-center justify-between border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="text-base">{selectedApp.icon}</span>
                <span className="font-bold text-xs">{selectedApp.name} Pay</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPhoneSimulator(false)}
                className="w-7 h-7 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Simulated Camera Viewfinder */}
            <div className="relative h-64 bg-neutral-950 flex items-center justify-center p-6 overflow-hidden">
              {/* Camera background grid */}
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-25" />

              {/* Viewfinder Target Frame */}
              <div className="relative w-48 h-48 border-2 border-emerald-400 rounded-2xl flex items-center justify-center">
                {/* 4 Corner Markers */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br" />

                {/* Laser scanline */}
                <div className="w-full h-0.5 bg-emerald-400 shadow-[0_0_8px_#10B981] animate-bounce" />
              </div>

              <div className="absolute bottom-3 bg-black/60 px-3 py-1 rounded-full text-[10px] text-neutral-300 backdrop-blur-xs">
                QRIS Terdeteksi: BuildMate Escrow
              </div>
            </div>

            {/* Payment Confirmation Drawer */}
            <div className="p-6 bg-neutral-900 border-t border-neutral-800 space-y-4">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-neutral-400 block font-medium">
                  Penerima Pembayaran
                </span>
                <p className="font-bold text-sm text-white">
                  BUILDMATE REKENING BERSAMA
                </p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Paket: {order.package.name} ({order.order_code})
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-400 block">Total Tagihan</span>
                  <span className="font-mono font-bold text-base text-white">
                    {formatRupiah(order.total)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-neutral-400 block">Sumber Dana</span>
                  <span className="text-xs font-semibold text-emerald-400">
                    {selectedApp.name} Saldo
                  </span>
                </div>
              </div>

              {/* Confirm Pay Button */}
              <button
                type="button"
                onClick={() => handleSimulatePayment()}
                disabled={isScanning}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white text-xs font-bold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <span>Mengonfirmasi Pembayaran…</span>
                ) : (
                  <span>Konfirmasi & Bayar Sekarang</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </CustomerShell>
  );
}

export default function PaymentStatusPage({ params }: PageProps) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center text-xs text-neutral-400">
          Memuat pembayaran QRIS…
        </div>
      }
    >
      <PaymentStatusContent params={params} />
    </React.Suspense>
  );
}
