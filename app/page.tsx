"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CustomerShell } from "@/components/customer/CustomerShell";
import { SearchBox } from "@/components/customer/SearchBox";
import { CategoryTile } from "@/components/customer/CategoryTile";
import { PackageCard } from "@/components/customer/PackageCard";
import { WorkerCard } from "@/components/customer/WorkerCard";
import {
  ShieldTick,
  Verify,
  Camera,
  SearchNormal1,
  Crown1,
  ArrowRight,
  Clock,
  TickCircle,
} from "@/lib/icons";
import { getCategories, getPackages } from "@/lib/data/services";
import { getWorkers } from "@/lib/data/workers";
import { Category, ServicePackage, Worker } from "@/lib/data/types";

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [carouselProgress, setCarouselProgress] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load database / mock data
    getCategories().then((cats) => setCategories(cats.filter((c) => c.is_active)));
    getPackages().then((pkgs) => setPackages(pkgs.filter((p) => p.is_active)));
    getWorkers({ tab: "active" }).then((wks) => setWorkers(wks.slice(0, 4)));
  }, []);

  const handleCarouselScroll = () => {
    if (!carouselRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 0) {
      setCarouselProgress(100);
      return;
    }
    const percent = Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100));
    setCarouselProgress(percent);
  };

  return (
    <CustomerShell>
      {/* 1. HERO: Flamingo Rounded Photo Card (A2 & A5 C01) */}
      <section className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="relative rounded-[24px] sm:rounded-[32px] overflow-hidden bg-neutral-900 min-h-[460px] sm:min-h-[520px] flex flex-col justify-between p-6 sm:p-12 lg:p-16 text-white shadow-md">
            {/* Background Image: Workshop Tools with Natural Light */}
            <img
              src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&auto=format&fit=crop&q=80"
              alt="BuildMate Workshop"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-35 scale-105 transition-transform duration-1000"
            />
            {/* Dark Gentle Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-900/60 to-neutral-900/40" />

            {/* Top Chip */}
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-semibold text-lavender-200 border border-white/20">
                <Crown1 size={14} className="text-lavender-300" variant="Bold" />
                <span>Marketplace Jasa Tukang Terpercaya #1</span>
              </span>
            </div>

            {/* Center Editorial Headlines & Search Box */}
            <div className="relative z-10 max-w-2xl my-auto py-6">
              <h1 className="font-serif text-3xl sm:text-5xl lg:text-[56px] text-white leading-[1.1] tracking-tight">
                Tukang yang <span className="italic text-lavender-300">tepat</span>, saat kamu butuh.
              </h1>
              <p className="text-xs sm:text-sm text-neutral-300 mt-3 sm:mt-4 leading-relaxed max-w-xl font-normal">
                Pilih tukang terverifikasi, harga paket pasti, dan bayar aman dengan rekening bersama. Dana baru diteruskan setelah pekerjaan terbukti beres.
              </p>

              {/* White Search Box inside Hero Card */}
              <div className="mt-6 sm:mt-8">
                <SearchBox />
              </div>
            </div>

            {/* Bottom Trust Chip Row (Bulk Icons) */}
            <div className="relative z-10 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 sm:gap-8 text-xs text-neutral-200 font-medium">
              <div className="flex items-center gap-2">
                <ShieldTick size={18} variant="Bulk" className="text-lavender-400" />
                <span>Pembayaran Aman (Rekber)</span>
              </div>
              <div className="flex items-center gap-2">
                <Verify size={18} variant="Bulk" className="text-lavender-400" />
                <span>Tukang Terverifikasi</span>
              </div>
              <div className="flex items-center gap-2">
                <Camera size={18} variant="Bulk" className="text-lavender-400" />
                <span>Bukti Foto Sebelum & Sesudah</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. KATEGORI LAYANAN */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="text-center mb-8">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
            KATEGORI LAYANAN
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
            Pilih kebutuhan perbaikan rumahmu
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {categories.map((cat) => (
            <CategoryTile
              key={cat.id}
              name={cat.name}
              slug={cat.slug}
              icon={cat.icon}
              startingPrice={cat.slug === "pengecatan" ? 150000 : 100000}
              packageCount={cat.package_count || 2}
            />
          ))}
        </div>
      </section>

      {/* 3. PAKET POPULER (Carousel with 2px progress bar A2 & A5) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
              PAKET POPULER
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Solusi cepat dengan harga pasti
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700 hover:text-lavender-800 transition-colors"
          >
            <span>Semua Paket</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Scrollable Container */}
        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex lg:grid lg:grid-cols-4 gap-4 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-none"
        >
          {packages.slice(0, 4).map((pkg) => (
            <div
              key={pkg.id}
              className="w-[85%] sm:w-[320px] lg:w-auto shrink-0 snap-start"
            >
              <PackageCard
                id={pkg.id}
                name={pkg.name}
                categoryName={pkg.category_name || "Layanan"}
                price={pkg.price}
                durationMinutes={pkg.est_duration_minutes}
                inclusions={pkg.inclusions}
                workerCount={pkg.worker_count || 6}
              />
            </div>
          ))}
        </div>

        {/* Thin 2px Progress Line (Flamingo Estate Pattern A2) */}
        <div className="lg:hidden mt-3 max-w-xs mx-auto">
          <div className="h-0.5 w-full bg-neutral-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-lavender-600 rounded-full transition-all duration-150"
              style={{ width: `${Math.max(15, carouselProgress)}%` }}
            />
          </div>
        </div>
      </section>

      {/* 4. CARA KERJA (01 02 03 Serif big numbers) */}
      <section id="cara-kerja" className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-20 sm:pt-24">
        <div className="bg-cream-100 rounded-3xl p-8 sm:p-14 border border-cream-200/80">
          <div className="text-center max-w-lg mx-auto mb-12">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
              CARA KERJA
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Mudah, aman, tanpa rasa khawatir
            </h2>
            <p className="text-xs text-neutral-500 mt-2">
              Tiga langkah praktis untuk memperbaiki hunianmu dengan kepastian transaksi.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl text-lavender-400 block font-normal">
                01
              </span>
              <div className="flex items-center gap-2">
                <SearchNormal1 size={18} className="text-lavender-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Pilih Tukang & Paket
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Cari berdasarkan kategori atau wilayahmu. Pilih paket harga pasti tanpa biaya tersembunyi.
              </p>
            </div>

            {/* Step 2 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl text-lavender-400 block font-normal">
                02
              </span>
              <div className="flex items-center gap-2">
                <ShieldTick size={18} className="text-lavender-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Bayar Aman di Rekber
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Bayar via Midtrans Sandbox. Dana kamu ditahan aman di platform selama tukang mengerjakan perbaikan.
              </p>
            </div>

            {/* Step 3 */}
            <div className="space-y-3">
              <span className="font-serif text-5xl text-lavender-400 block font-normal">
                03
              </span>
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-lavender-600" />
                <h3 className="font-semibold text-neutral-900 text-sm">
                  Cek Foto & Konfirmasi
                </h3>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Tukang wajib unggah foto hasil. Cek foto sebelum/sesudah, lalu konfirmasi selesai agar dana diteruskan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. TUKANG PILIHAN */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest mb-1">
              TUKANG PILIHAN
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-neutral-900 tracking-tight">
              Mitra berdedikasi dengan rekam jejak nyata
            </h2>
          </div>
          <Link
            href="/search"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-lavender-700 hover:text-lavender-800 transition-colors"
          >
            <span>Lihat Semua Tukang</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              id={worker.id}
              slug={worker.slug}
              fullName={worker.full_name}
              photoPath={worker.photo_path}
              serviceArea={worker.service_area}
              isVerified={worker.is_verified}
              completedJobsCount={worker.completed_jobs_count}
              experienceYears={worker.experience_years}
              categoryName={worker.service_area.includes("Selatan") ? "Plumbing" : "Perbaikan"}
              startingPrice={150000}
            />
          ))}
        </div>
      </section>

      {/* 6. PENJELAS REKBER (Editorial Escrow Tile A2) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="bg-white rounded-3xl border border-neutral-200/90 p-8 sm:p-12 shadow-xs text-center max-w-3xl mx-auto space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-lavender-50 border border-lavender-100 flex items-center justify-center mx-auto text-lavender-600">
            <ShieldTick size={32} variant="Bulk" />
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl text-neutral-900 leading-snug tracking-tight">
            "Dana kamu baru diteruskan ke tukang setelah kamu puas dan mengonfirmasi hasil pekerjaan."
          </h2>

          {/* Escrow Flow Diagram */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 text-xs font-medium text-neutral-700">
            <div className="p-3 rounded-xl bg-cream-50 border border-cream-200/60">
              <span className="text-lavender-700 font-bold block mb-1">1</span>
              <span>Kamu Bayar</span>
            </div>
            <div className="p-3 rounded-xl bg-lavender-50 border border-lavender-200/60">
              <span className="text-lavender-700 font-bold block mb-1">2</span>
              <span>Dana Ditahan Rekber</span>
            </div>
            <div className="p-3 rounded-xl bg-cream-50 border border-cream-200/60">
              <span className="text-lavender-700 font-bold block mb-1">3</span>
              <span>Tukang Selesaikan</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200/60">
              <span className="text-emerald-700 font-bold block mb-1">4</span>
              <span>Kamu Konfirmasi & Cair</span>
            </div>
          </div>
        </div>
      </section>

      {/* 7. BANNER PLUS (Lavender Gradient Card) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20">
        <div className="rounded-3xl bg-gradient-to-r from-lavender-600 via-lavender-700 to-lavender-800 text-white p-8 sm:p-12 shadow-md relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2 text-lavender-200 text-xs font-semibold">
              <Crown1 size={18} variant="Bold" />
              <span>MEMBERSHIP EKSKLUSIF</span>
            </div>
            <h3 className="font-serif text-3xl sm:text-4xl text-white tracking-tight">
              Hemat lebih banyak dengan <span className="italic text-lavender-200">BuildMate Plus</span>
            </h3>
            <p className="text-xs sm:text-sm text-lavender-100 leading-relaxed">
              Bebas biaya layanan Rp5.000 untuk setiap pesanan dan dapatkan jaminan garansi pengerjaan ulang 7 hari hanya Rp29.000 / 30 hari.
            </p>
          </div>

          <Link
            href="/plus"
            className="px-6 py-3.5 rounded-full bg-white text-lavender-900 hover:bg-lavender-50 active:scale-95 text-xs font-bold transition-all shrink-0 shadow-xs uppercase tracking-wider"
          >
            Lihat Manfaat Plus
          </Link>
        </div>
      </section>

      {/* 8. PITA CTA MITRA (Partner Ribbon) */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="rounded-2xl bg-neutral-900 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <h4 className="font-serif text-2xl text-white">
              Kamu tukang berpengalaman?
            </h4>
            <p className="text-xs text-neutral-400 mt-1">
              Dapatkan order pekerjaan teratur dan sistem pencairan dana transparan di BuildMate.
            </p>
          </div>
          <Link
            href="/mitra/register"
            className="px-5 py-2.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 text-xs font-semibold transition-all shrink-0"
          >
            Daftar Jadi Mitra Tukang
          </Link>
        </div>
      </section>
    </CustomerShell>
  );
}
