"use client";

import React from "react";
import Link from "next/link";
import { ShieldTick, Verify, Camera } from "@/lib/icons";

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  isPartner?: boolean;
}

export function AuthLayout({
  children,
  title,
  subtitle,
  isPartner = false,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-cream-50 flex flex-col justify-between font-sans selection:bg-lavender-200 selection:text-lavender-900">
      {/* Main Container */}
      <div className="flex-1 flex w-full">
        {/* Left Editorial Panel (Desktop only ≥1024px, A4) */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-lavender-50 via-lavender-100 to-lavender-200 p-12 xl:p-16 flex-col justify-between relative overflow-hidden border-r border-lavender-200/80">
          {/* Subtle Background Glow Accent */}
          <div className="absolute -top-24 -left-24 w-96 h-96 bg-lavender-300/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-lavender-400/20 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10">
            <Link
              href="/"
              className="inline-block font-serif text-3xl text-neutral-900 tracking-tight hover:opacity-90 transition-opacity"
            >
              BuildMate
            </Link>
          </div>

          {/* Middle Pitch & Trust Points */}
          <div className="relative z-10 max-w-lg space-y-8 my-auto">
            <div>
              <span className="text-[11px] font-semibold tracking-widest text-lavender-700 uppercase bg-lavender-200/80 px-3 py-1 rounded-full">
                {isPartner ? "Portal Mitra Tukang" : "Jasa Perbaikan Rumah"}
              </span>
              <h2 className="text-4xl xl:text-5xl font-serif text-neutral-900 leading-[1.15] mt-4">
                Tukang yang <span className="italic text-lavender-700">tepat</span>, saat kamu butuh.
              </h2>
              <p className="text-sm text-neutral-600 mt-3 leading-relaxed">
                Pilih tukang terverifikasi dengan harga paket pasti. Dana kamu aman di rekening bersama dan baru diteruskan setelah pekerjaan terbukti beres.
              </p>
            </div>

            {/* 3 Trust Bullets with Bulk Icons (A4) */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-white/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-lavender-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <ShieldTick size={22} variant="Bulk" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900">
                    Pembayaran Aman dengan Rekber
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Dana ditahan di rekening bersama sampai kamu memeriksa hasil foto & menyetujuinya.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-white/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-lavender-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Verify size={22} variant="Bulk" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900">
                    Tukang Terverifikasi
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Identitas, portofolio pekerjaan, dan keahlian telah ditinjau langsung oleh tim operator BuildMate.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 bg-white/70 backdrop-blur-sm p-3.5 rounded-2xl border border-white/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-lavender-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Camera size={22} variant="Bulk" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-neutral-900">
                    Bukti Foto Sebelum & Sesudah
                  </h4>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    Tukang wajib mengunggah foto hasil pekerjaan sebelum menyelesaikan pesanan.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Note */}
          <div className="relative z-10 text-[11px] text-neutral-500">
            © 2026 BuildMate SaaS Solo Challenge · Sandboxed Simulation
          </div>
        </div>

        {/* Right Form Card (Desktop 420px max / Mobile Full-screen) */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10 lg:p-12">
          <div className="w-full max-w-[420px] space-y-6">
            {/* Mobile Brand Wordmark */}
            <div className="lg:hidden text-center pb-2">
              <Link
                href="/"
                className="font-serif text-3xl text-neutral-900 tracking-tight"
              >
                BuildMate
              </Link>
            </div>

            {/* Header Titles */}
            <div className="space-y-1 text-center sm:text-left">
              <h1 className="font-serif text-3xl sm:text-[34px] text-neutral-900 leading-tight">
                {title}
              </h1>
              <p className="text-xs text-neutral-500 leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Form Slot */}
            <div className="bg-white lg:bg-transparent p-6 sm:p-0 rounded-2xl border border-neutral-200/80 lg:border-none shadow-xs lg:shadow-none">
              {children}
            </div>

            {/* Partner / Customer Cross Link */}
            <div className="text-center pt-2">
              {isPartner ? (
                <Link
                  href="/login"
                  className="text-xs text-neutral-500 hover:text-lavender-700 transition-colors"
                >
                  Bukan mitra? Masuk sebagai pelanggan →
                </Link>
              ) : (
                <Link
                  href="/mitra/login"
                  className="text-xs text-neutral-500 hover:text-lavender-700 transition-colors"
                >
                  Kamu tukang? Masuk sebagai mitra →
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
