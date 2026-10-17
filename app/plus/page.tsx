"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Script from "next/script";
import { CustomerShell } from "@/components/customer/CustomerShell";
import {
  Crown1,
  TickCircle,
  CloseCircle,
  ArrowRight,
  ShieldTick,
  ArrowDown2,
  ArrowUp2,
  WalletMoney,
} from "@/lib/icons";
import { formatRupiah, formatDateId } from "@/lib/format";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { getSnapScriptUrl } from "@/lib/payments/snap-url";

export default function PlusPage() {
  const [user, setUser] = useState<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [expiryDate, setExpiryDate] = useState<string | null>(null);
  const [remainingDays, setRemainingDays] = useState(0);

  // Savings Calculator
  const [ordersPerMonth, setOrdersPerMonth] = useState(3);

  // FAQ Accordion
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [subscribing, setSubscribing] = useState(false);

  const checkStatus = () => {
    fetch("/api/subscriptions/status")
      .then((res) => res.json())
      .then((data) => {
        if (data?.isPlus) {
          setIsSubscribed(true);
          setExpiryDate(data.current_period_end);
          setRemainingDays(data.remaining_days || 0);
        }
      })
      .catch((err) => console.warn("Failed to check subscription status:", err));
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUser(user);
        checkStatus();
      }
    });
  }, []);

  const handleSubscribe = async () => {
    if (!user) {
      toast.error("Silakan masuk terlebih dahulu untuk berlangganan.");
      return;
    }

    try {
      setSubscribing(true);
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data.error || "Gagal menyiapkan pembayaran.");
        setSubscribing(false);
        return;
      }

      const snapToken = data.snap_token;
      const subOrderId = data.sub_order_id;

      if (typeof window !== "undefined" && (window as any).snap && snapToken) {
        (window as any).snap.pay(snapToken, {
          onSuccess: async () => {
            toast.success("Pembayaran berhasil! Mengaktifkan status Member Plus...");
            try {
              await fetch("/api/subscriptions/status", { cache: "no-store" });
            } catch {}
            setIsSubscribed(true);
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
            setTimeout(() => {
              checkStatus();
              window.location.reload();
            }, 1200);
          },
          onPending: () => {
            toast.info("Menunggu penyelesaian pembayaran di simulator.");
            // Poll status once after pending in case simulator already completed
            setTimeout(checkStatus, 3000);
          },
          onError: () => {
            toast.error("Pembayaran dibatalkan atau gagal.");
          },
          onClose: () => {
            // Check status in case user already paid
            checkStatus();
          },
        });
      } else {
        toast.info("Transaksi berhasil disiapkan di Sandbox.");
      }
    } catch {
      toast.error("Terjadi kesalahan.");
    } finally {
      setSubscribing(false);
    }
  };

  const savingsAmount = ordersPerMonth * 5000;

  return (
    <CustomerShell title="BuildMate Plus">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
        {/* 1. HERO PLUS (Editorial Flamingo Style A2 & C09) */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-lavender-100 text-lavender-800 text-xs font-semibold border border-lavender-200 shadow-xs">
            <Crown1 size={16} variant="Bold" className="text-lavender-600" />
            <span>MEMBERSHIP BULANAN</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-5xl text-neutral-900 tracking-tight leading-tight">
            Hemat & terlindungi dengan{" "}
            <span className="italic text-lavender-600">BuildMate Plus</span>
          </h1>

          <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed max-w-lg mx-auto">
            Hanya <strong>Rp29.000 / 30 hari</strong>. Bebas biaya layanan di setiap pesanan dan perlindungan garansi pengerjaan ulang 7 hari.
          </p>

          {/* Active Status Card if subscribed */}
          {isSubscribed ? (
            <div className="bg-gradient-to-r from-lavender-600 to-lavender-700 text-white p-6 rounded-3xl shadow-md text-left mt-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Crown1 size={24} variant="Bold" className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-serif text-2xl">Member Plus Aktif</h3>
                    <p className="text-xs text-lavender-200">
                      Berlaku hingga {expiryDate ? formatDateId(expiryDate) : "30 hari ke depan"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={subscribing}
                  className="px-4 py-2 rounded-full bg-white text-lavender-900 hover:bg-lavender-50 active:scale-95 text-xs font-bold transition-all shrink-0"
                >
                  Perpanjang 30 Hari
                </button>
              </div>

              {/* Progress sisa hari */}
              <div>
                <div className="flex justify-between text-xs text-lavender-200 mb-1.5">
                  <span>Sisa masa aktif</span>
                  <span>{remainingDays} hari lagi</span>
                </div>
                <div className="h-2 w-full bg-black/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${Math.min(100, (remainingDays / 30) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={subscribing}
                className="px-8 py-4 rounded-full bg-lavender-600 hover:bg-lavender-700 active:scale-[0.98] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all tracking-wider uppercase inline-flex items-center gap-2"
              >
                <Crown1 size={18} variant="Bold" />
                <span>Berlangganan Sekarang · Rp29.000</span>
              </button>
            </div>
          )}
        </div>

        {/* 2. TABEL PERBANDINGAN GRATIS VS PLUS (B3) */}
        <div className="bg-white rounded-3xl border border-neutral-200/90 p-6 sm:p-10 shadow-xs space-y-6">
          <div className="text-center max-w-md mx-auto">
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
              Perbandingan Paket
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Transparan tanpa biaya tersembunyi.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-3.5 font-semibold text-neutral-700 w-1/2">
                    Fitur & Manfaat
                  </th>
                  <th className="text-center py-3.5 font-semibold text-neutral-500 w-1/4">
                    Akun Gratis
                  </th>
                  <th className="text-center py-3.5 font-bold text-lavender-700 w-1/4 bg-lavender-50/60 rounded-t-xl">
                    BuildMate Plus
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr>
                  <td className="py-3.5 text-neutral-800 font-medium">Pesan Layanan Tukang</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold">Ya</td>
                  <td className="py-3.5 text-center text-emerald-600 font-bold bg-lavender-50/60">Ya</td>
                </tr>
                <tr>
                  <td className="py-3.5 text-neutral-800 font-medium">Biaya Layanan per Pesanan</td>
                  <td className="py-3.5 text-center text-neutral-600">Rp5.000</td>
                  <td className="py-3.5 text-center font-bold text-emerald-700 bg-lavender-50/60">
                    Rp0 (Gratis)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 text-neutral-800 font-medium">Garansi Pengerjaan Ulang 7 Hari</td>
                  <td className="py-3.5 text-center text-neutral-400">Tidak Ada</td>
                  <td className="py-3.5 text-center font-bold text-emerald-700 bg-lavender-50/60">
                    Termasuk (7 Hari)
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 text-neutral-800 font-medium">Lapor Masalah ke Admin</td>
                  <td className="py-3.5 text-center text-neutral-600">Via WhatsApp</td>
                  <td className="py-3.5 text-center font-bold text-lavender-700 bg-lavender-50/60">
                    Prioritas + Rework
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 text-neutral-800 font-medium">Badge Eksklusif Plus</td>
                  <td className="py-3.5 text-center text-neutral-400">—</td>
                  <td className="py-3.5 text-center font-bold text-lavender-700 bg-lavender-50/60">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-lavender-200/80 text-[10px]">
                      <Crown1 size={11} variant="Bold" />
                      <span>Member Plus</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. KALKULATOR HEMAT (Slider Interaktif A5 C09) */}
        <div className="bg-cream-100 rounded-3xl p-6 sm:p-10 border border-cream-200/80 space-y-6">
          <div className="text-center max-w-md mx-auto space-y-1">
            <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900">
              Kalkulator Penghematan
            </h2>
            <p className="text-xs text-neutral-600">
              Geser untuk menghitung estimasi penghematan biaya bulanan kamu.
            </p>
          </div>

          <div className="max-w-md mx-auto space-y-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs">
            <div>
              <div className="flex justify-between text-xs font-semibold text-neutral-700 mb-2">
                <span>Frekuensi Pesan per Bulan:</span>
                <span className="text-lavender-700 font-bold text-sm">
                  {ordersPerMonth} kali / bulan
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={6}
                value={ordersPerMonth}
                onChange={(e) => setOrdersPerMonth(Number(e.target.value))}
                className="w-full accent-lavender-600 h-2 bg-neutral-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-500 block">Total Penghematan Biaya:</span>
                <span className="text-xl font-bold text-emerald-700 font-sans tracking-tight">
                  Hemat {formatRupiah(savingsAmount)}
                </span>
              </div>
              <span className="text-[11px] font-semibold text-lavender-700 bg-lavender-50 px-3 py-1 rounded-full border border-lavender-200">
                + Garansi 7 Hari
              </span>
            </div>
          </div>
        </div>

        {/* 4. FAQ ACCORDION */}
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 text-center mb-6">
            Pertanyaan Umum Seputar Plus
          </h2>

          {[
            {
              q: "Apakah langganan ini otomatis memotong saldo setiap bulan?",
              a: "Tidak. BuildMate Plus adalah sistem beli putus 30 hari (bukan recurring debit otomatis). Setelah 30 hari selesai, akun kembali ke paket Gratis kecuali kamu memilih untuk memperpanjang secara manual.",
            },
            {
              q: "Bagaimana cara kerja garansi pengerjaan ulang 7 hari?",
              a: "Jika dalam 7 hari setelah pekerjaan selesai terdapat masalah seperti keran rembes kembali atau cat mengelupas, kamu cukup mengajukan klaim garansi pada detail pesanan. Mitra tukang akan dikirim kembali untuk merapikan tanpa biaya tambahan.",
            },
            {
              q: "Apakah saya bisa langsung memakai bebas biaya layanan?",
              a: "Ya! Begitu pembayaran Rp29.000 sukses diverifikasi, biaya layanan platform sebesar Rp5.000 akan otomatis menjadi Rp0 pada setiap pesanan berikutnya selama 30 hari.",
            },
          ].map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-neutral-200/90 shadow-xs overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-semibold text-xs sm:text-sm text-neutral-900"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ArrowUp2 size={16} /> : <ArrowDown2 size={16} />}
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-neutral-600 leading-relaxed border-t border-neutral-100 pt-3 animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Script Snap Midtrans */}
      <Script
        src={getSnapScriptUrl()}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="afterInteractive"
      />
    </CustomerShell>
  );
}
