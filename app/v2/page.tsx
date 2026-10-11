"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  SearchNormal1,
  Location,
  Calendar,
  ShieldTick,
  Verify,
  Camera,
  Crown1,
  ArrowRight,
  Clock,
  Sparkles,
} from "@/lib/icons";
import { formatRupiah } from "@/lib/format";
import { getPackages } from "@/lib/data/services";
import { getWorkers } from "@/lib/data/workers";
import { ServicePackage, Worker } from "@/lib/data/types";

// Curated 3-photo galleries for Section 3 (Matching the reference's 3 Days in Derawan & Nusa Tenggara)
const POPULAR_GALLERY_PACKAGES = [
  {
    id: "pkg-ac-standard",
    title: "Servis & Cuci AC Standard",
    badge: "Pak Joko (4.9 ★) · 140+ Selesai",
    category: "Servis AC",
    price: 75000,
    duration: "60 Menit",
    warranty: "14 Hari Garansi",
    tools: "Alat Mandiri Lengkap",
    description:
      "Pembersihan menyeluruh unit indoor & outdoor, filter anti-bakteri, pengecekan tekanan freon, dan pembersihan jalur drainase air tanpa bocor.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80",
        caption: "Pengecekan Tekanan Freon",
      },
      {
        url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80",
        caption: "Pembersihan Evaporator",
      },
      {
        url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80",
        caption: "Unit Dingin & Hening",
      },
    ],
  },
  {
    id: "pkg-plumbing-leak",
    title: "Deteksi Kebocoran Pipa & Ganti Keran",
    badge: "Pak Budi (5.0 ★) · 98+ Selesai",
    category: "Plumbing",
    price: 120000,
    duration: "45 - 90 Menit",
    warranty: "14 Hari Garansi",
    tools: "Sensor Presisi & Seal SNI",
    description:
      "Pemeriksaan jalur pipa dinding dengan alat deteksi tekanan, perbaikan seal bocor rembes, dan penggantian keran air dengan pemasangan presisi rapi.",
    photos: [
      {
        url: "https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=80",
        caption: "Deteksi Rembesan Dinding",
      },
      {
        url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80",
        caption: "Penggantian Fitting Pipa",
      },
      {
        url: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=800&auto=format&fit=crop&q=80",
        caption: "Aliran Deras Tanpa Bocor",
      },
    ],
  },
];

// Interactive Accordion Questions (Section 4 matching reference)
const ACCORDION_ITEMS = [
  {
    question: "Kapan teknisi bisa tiba di lokasi rumah saya?",
    answer:
      "Mitra tukang terdekat dapat tiba dalam waktu 60-90 menit untuk pesanan hari yang sama (urgent), atau kamu dapat memilih jadwal spesifik kapan saja sesuai kenyamanan aktivitas keluargamu.",
  },
  {
    question: "Bagaimana cara kerja Rekening Bersama (Midtrans Escrow)?",
    answer:
      "Uang pembayaranmu tidak langsung masuk ke rekening tukang. Dana disimpan aman di rekening bersama platform dan baru kami cairkan setelah kamu memeriksa foto hasil kerja dan mengklik konfirmasi selesai.",
  },
  {
    question: "Apakah ada biaya tersembunyi atau biaya dadakan?",
    answer:
      "Tidak ada. Tarif paket dicatat pasti di awal pemesanan. Mitra BuildMate dilarang keras meminta biaya tambahan di luar kesepakatan tertulis di aplikasi.",
  },
];

export default function HomeV2Page() {
  const [activeAccordion, setActiveAccordion] = useState<number | null>(0);
  const [selectedService, setSelectedService] = useState("Semua Layanan");
  const [selectedArea, setSelectedArea] = useState("Semua Wilayah");
  const [selectedDate, setSelectedDate] = useState("Kapan Saja");
  const [selectedBudget, setSelectedBudget] = useState("Semua Budget");
  const [workers, setWorkers] = useState<Worker[]>([]);

  useEffect(() => {
    getWorkers({ tab: "active" }).then((wks) => setWorkers(wks.slice(0, 3)));
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* 0. FLOATING TOP NAV BAR (MATCHING REFERENCE PILL NAVIGATION) */}
      <header className="sticky top-4 z-50 w-full px-4 sm:px-8 max-w-7xl mx-auto">
        <nav className="flex items-center justify-between px-5 py-3 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/80 shadow-[0_4px_20px_rgb(0,0,0,0.06)]">
          {/* Left Pill Brand Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/v2"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-900 text-white text-xs font-semibold tracking-tight hover:bg-neutral-800 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span>BuildMate</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-orange-50 text-[10px] font-semibold text-orange-600 border border-orange-200 uppercase tracking-wider">
              Versi 2.0
            </span>
          </div>

          {/* Center Clean Links */}
          <div className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-600">
            <Link href="/v2" className="text-neutral-950 font-semibold hover:text-neutral-900 transition-colors">
              Beranda
            </Link>
            <Link href="/search" className="hover:text-neutral-900 transition-colors">
              Layanan
            </Link>
            <Link href="/#cara-kerja" className="hover:text-neutral-900 transition-colors">
              Keunggulan
            </Link>
            <Link href="/search?tab=workers" className="hover:text-neutral-900 transition-colors">
              Mitra Tukang
            </Link>
            <Link href="/plus" className="hover:text-neutral-900 transition-colors">
              Testimoni
            </Link>
          </div>

          {/* Right Action Links & Switcher */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 hover:text-neutral-900 transition-colors px-2.5 py-1 rounded-full border border-neutral-200"
              title="Kembali ke tampilan Home versi 1"
            >
              <span>← Versi 1</span>
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 px-3 py-1.5"
            >
              Masuk
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 rounded-full bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 active:scale-95 transition-all shadow-xs"
            >
              Daftar
            </Link>
          </div>
        </nav>
      </header>

      {/* 1. HERO SECTION: CINEMATIC CANYON / STILL-LIFE LIGHTING + TYPOGRAPHY SPLIT */}
      <section className="w-full px-4 sm:px-8 pt-4 pb-12 max-w-7xl mx-auto">
        <div className="relative rounded-[32px] sm:rounded-[44px] overflow-hidden bg-neutral-900 min-h-[560px] sm:min-h-[640px] lg:min-h-[680px] flex flex-col justify-between p-7 sm:p-14 lg:p-16 text-white shadow-lg border border-neutral-800">
          {/* Architectural Still-Life / Natural Warm Light Backdrop */}
          <img
            src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&auto=format&fit=crop&q=85"
            alt="BuildMate Cinematic Architecture"
            className="absolute inset-0 w-full h-full object-cover object-center scale-100"
          />

          {/* Dramatic Amber/Terracotta Gradient Glow (Matching the reference's glowing canyon sunset) */}
          <div className="absolute inset-0 bg-gradient-to-r from-neutral-950/90 via-neutral-950/65 to-neutral-950/20" />
          <div className="absolute top-0 right-0 w-full sm:w-2/3 h-full bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.35)_0%,_transparent_65%)] pointer-events-none" />
          <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-neutral-950/80 to-transparent pointer-events-none" />

          {/* Top Left Headline Content */}
          <div className="relative z-10 max-w-2xl pt-4">
            <h1 className="text-3xl sm:text-5xl lg:text-[62px] font-bold text-white leading-[1.08] tracking-tight">
              Perbaiki hunian bersama tanpa drama tukang dan biaya siluman
            </h1>
            <p className="text-xs sm:text-sm text-neutral-200 mt-4 sm:mt-5 leading-relaxed max-w-lg font-normal">
              BuildMate menghubungkan pemilik rumah dengan mitra tukang terverifikasi. Tarif paket transparan, dana aman di rekening bersama Midtrans, dan verifikasi foto sebelum dana dicairkan.
            </p>
          </div>

          {/* Center-Right Brand Signature in Italic Serif (Matching 'Jalanori Travel Partner') */}
          <div className="relative z-10 self-end text-right my-auto pr-2 sm:pr-8">
            <span className="block font-serif italic text-3xl sm:text-5xl lg:text-[64px] text-white/95 leading-none tracking-tight">
              BuildMate Home
            </span>
            <span className="block font-serif italic text-3xl sm:text-5xl lg:text-[64px] text-orange-300 leading-none tracking-tight mt-1">
              Trusted Partner
            </span>
          </div>

          {/* Bottom 3 Interactive Horizontal Links */}
          <div className="relative z-10 pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-neutral-200">
            <Link
              href="/search"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors group"
            >
              <span>Layanan Terkurasi</span>
              <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </Link>
            <Link
              href="/search?tab=workers"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors group"
            >
              <span>Mitra Terverifikasi 100%</span>
              <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </Link>
            <Link
              href="/plus"
              className="inline-flex items-center gap-1.5 hover:text-white transition-colors group"
            >
              <span>Proteksi Midtrans Escrow</span>
              <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 2. FLOATING MULTI-SEGMENT FILTER BAR: "NEED A REPAIR?" (MATCHING REFERENCE SEARCH CAPSULE) */}
      <section className="w-full px-4 sm:px-8 py-8 max-w-7xl mx-auto">
        {/* Section Header: Title on Left, Subtitle on Right */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <h2 className="text-2xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Butuh Perbaikan Apa Hari Ini?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md leading-relaxed font-normal">
            Pilih kategori masalah, tentukan jadwal dan estimasi budget. Platform mengamankan transaksi dengan jaminan pengerjaan tepat waktu.
          </p>
        </div>

        {/* Multi-Segment Filter Capsule Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl p-3 sm:p-4 border border-neutral-200/80 shadow-[0_10px_35px_rgb(0,0,0,0.05)] flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Segment 1: Layanan */}
          <div className="flex-1 px-4 py-2.5 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 mb-1">
              <span className="w-5 h-5 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center text-[10px]">
                🔧
              </span>
              <span>Layanan</span>
            </div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              aria-label="Pilih Jenis Layanan"
              className="w-full bg-transparent text-xs text-neutral-600 font-medium outline-none cursor-pointer"
            >
              <option>Semua Layanan</option>
              <option>Servis AC</option>
              <option>Plumbing & Pipa</option>
              <option>Kelistrikan</option>
              <option>Pengecatan Dinding</option>
              <option>Atap & Waterproofing</option>
              <option>Pintu & Kunci</option>
            </select>
          </div>

          <div className="hidden lg:block w-px h-10 bg-neutral-200" />

          {/* Segment 2: Wilayah */}
          <div className="flex-1 px-4 py-2.5 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 mb-1">
              <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px]">
                📍
              </span>
              <span>Wilayah</span>
            </div>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              aria-label="Pilih Wilayah Layanan"
              className="w-full bg-transparent text-xs text-neutral-600 font-medium outline-none cursor-pointer"
            >
              <option>Semua Wilayah</option>
              <option>Wilayah Pusat</option>
              <option>Wilayah Timur</option>
              <option>Wilayah Barat</option>
              <option>Wilayah Selatan</option>
              <option>Wilayah Utara</option>
            </select>
          </div>

          <div className="hidden lg:block w-px h-10 bg-neutral-200" />

          {/* Segment 3: Jadwal */}
          <div className="flex-1 px-4 py-2.5 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 mb-1">
              <span className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center text-[10px]">
                📅
              </span>
              <span>Jadwal Datang</span>
            </div>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              aria-label="Pilih Jadwal Kedatangan"
              className="w-full bg-transparent text-xs text-neutral-600 font-medium outline-none cursor-pointer"
            >
              <option>Kapan Saja</option>
              <option>Hari Ini (Prioritas)</option>
              <option>Besok Pagi</option>
              <option>Akhir Pekan</option>
            </select>
          </div>

          <div className="hidden lg:block w-px h-10 bg-neutral-200" />

          {/* Segment 4: Budget Range */}
          <div className="flex-1 px-4 py-2.5 rounded-2xl hover:bg-neutral-50 transition-colors border border-transparent hover:border-neutral-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900 mb-1">
              <span className="w-5 h-5 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center text-[10px]">
                💰
              </span>
              <span>Rentang Tarif</span>
            </div>
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              aria-label="Pilih Rentang Tarif"
              className="w-full bg-transparent text-xs text-neutral-600 font-medium outline-none cursor-pointer"
            >
              <option>Semua Budget</option>
              <option>Hemat (&lt; Rp100.000)</option>
              <option>Standar (Rp100.000 - Rp200.000)</option>
              <option>Mayor (&gt; Rp200.000)</option>
            </select>
          </div>

          {/* Search Action CTA (Warm Vibrant Orange Pill matching reference) */}
          <Link
            href={`/search?q=${selectedService !== "Semua Layanan" ? selectedService : ""}`}
            className="px-8 py-4 rounded-2xl bg-[#E8590C] hover:bg-[#D9480F] active:scale-95 text-white text-xs font-bold uppercase tracking-wider text-center transition-all shadow-md shrink-0 flex items-center justify-center gap-2"
          >
            <SearchNormal1 size={16} />
            <span>Cari Layanan</span>
          </Link>
        </div>
      </section>

      {/* 3. SECTION: POPULAR DESTINATION CARDS -> "EXPLORE POPULAR PACKAGES" (3-PHOTO GALLERY CARDS) */}
      <section className="w-full px-4 sm:px-8 py-14 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
            Paket Perbaikan Paling Populer
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-2.5 leading-relaxed font-normal">
            Solusi perbaikan harian dengan dokumentasi visual tahapan kerja dan spesifikasi garansi transparan.
          </p>
        </div>

        {/* 2 Wide Cards with 3-Photo Galleries (Matching the reference's 3 Days in Derawan & Nusa Tenggara) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {POPULAR_GALLERY_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="rounded-3xl bg-white border border-neutral-200/90 p-6 sm:p-7 shadow-[0_4px_25px_rgb(0,0,0,0.04)] hover:shadow-lg transition-all"
            >
              {/* Card Top Bar: Title on Left, Badge on Right */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight">
                    {pkg.title}
                  </h3>
                  <span className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider">
                    {pkg.category} · {formatRupiah(pkg.price)}
                  </span>
                </div>
                <span className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-semibold border border-neutral-200 shrink-0">
                  {pkg.badge}
                </span>
              </div>

              {/* 3-Photo Gallery Grid */}
              <div className="grid grid-cols-3 gap-2.5 mb-5">
                {pkg.photos.map((photo, i) => (
                  <div
                    key={i}
                    className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200/70 group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/75 to-transparent text-[9px] font-medium text-white/95 leading-tight">
                      {photo.caption}
                    </div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-600 leading-relaxed font-normal mb-5">
                {pkg.description}
              </p>

              {/* Specs Triple Column Footer */}
              <div className="pt-4 border-t border-neutral-100 grid grid-cols-3 gap-3 text-left">
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
                    Peralatan
                  </span>
                  <span className="text-xs font-semibold text-neutral-900 truncate block mt-0.5">
                    {pkg.tools}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
                    Estimasi Waktu
                  </span>
                  <span className="text-xs font-semibold text-neutral-900 truncate block mt-0.5">
                    {pkg.duration}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-neutral-400 tracking-wider">
                    Garansi Resmi
                  </span>
                  <span className="text-xs font-semibold text-emerald-600 truncate block mt-0.5">
                    {pkg.warranty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Centered Pill Button with Orange Badge: "Explore All" */}
        <div className="mt-10 text-center">
          <Link
            href="/search"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-md group"
          >
            <span>Jelajahi Semua Layanan</span>
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* 4. SECTION: SPLIT INTERACTIVE ACCORDION & IMAGES ("SET YOUR VIBE, BUDGET & DATES TOGETHER") */}
      <section className="w-full px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        {/* Intro Top Pill & Statement */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10 pb-6 border-b border-neutral-200">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-100 text-[11px] font-semibold text-neutral-700 w-fit">
            <span className="w-2 h-2 rounded-full bg-neutral-900" />
            <span>Alur Transparan BuildMate</span>
          </span>
          <p className="text-xs sm:text-sm text-neutral-600 max-w-lg leading-relaxed font-normal">
            Hilangkan kekhawatiran tukang tak datang atau hasil kerja asal-asalan. Kami menyelaraskan jadwal, estimasi biaya, dan bukti visual di satu platform terpadu.
          </p>
        </div>

        {/* Split Grid: Left Big Card vs Right Accordion & Dual Images */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (5 Cols): Big Architectural Card + Subtext */}
          <div className="lg:col-span-5 space-y-5">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-100 border border-neutral-200/80 shadow-md">
              <img
                src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1000&auto=format&fit=crop&q=80"
                alt="Modern Living Space with Natural Light"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-4 left-4 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md text-[11px] font-bold text-neutral-900 uppercase tracking-wider shadow-xs">
                Standar Kualitas
              </span>
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-neutral-900 tracking-tight leading-snug">
                Pilih Jadwal, Tentukan Budget, dan Awasi Hasil Bersama
              </h3>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Setiap detail terekam digital di riwayat pesananmu: bukti foto sebelum pengerjaan, foto sesudah, serta rincian nota kerja.
              </p>
              <div className="pt-2">
                <Link
                  href="/#cara-kerja"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-900 hover:text-orange-600 transition-colors uppercase tracking-wider"
                >
                  <span>Pelajari SOP Kerja</span>
                  <span>↗</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column (7 Cols): Accordion Questions + 2 Small Images Below */}
          <div className="lg:col-span-7 space-y-6">
            {/* 3 Interactive Accordion Rows */}
            <div className="space-y-3">
              {ACCORDION_ITEMS.map((item, idx) => {
                const isOpen = activeAccordion === idx;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl bg-white border border-neutral-200/90 overflow-hidden transition-all shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveAccordion(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-sm sm:text-base text-neutral-900 hover:text-orange-600 transition-colors"
                    >
                      <span>{item.question}</span>
                      <span className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold shrink-0 ml-3">
                        {isOpen ? "−" : "+"}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs text-neutral-600 leading-relaxed font-normal border-t border-neutral-100 pt-3">
                        {item.answer}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* 2 Small Gallery Photos Below Accordion (Matching Reference) */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <img
                  src="https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80"
                  alt="Material Pengerjaan Rapi"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                  Material Rapi
                </span>
              </div>
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 border border-neutral-200">
                <img
                  src="https://images.unsplash.com/photo-1584622781564-1d987f7333c1?w=600&auto=format&fit=crop&q=80"
                  alt="Hasil Sanitasi Bersih"
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                  Hasil Teruji
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SECTION: TRIPLE VALUE PROPS CARDS (MATCHING REFERENCE 3 FEATURE BOXES) */}
      <section className="w-full px-4 sm:px-8 py-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Box 1 */}
          <div className="rounded-3xl bg-white border border-neutral-200/90 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-8">
              <span className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                01
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Kurasi
              </span>
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight leading-snug mb-2">
                Temukan teknisi ahli terverifikasi untuk setiap kerusakan
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Verifikasi identitas fisik, uji keahlian kerja, dan kepatuhan SOP kebersihan sebelum mitra diaktifkan di platform.
              </p>
            </div>
          </div>

          {/* Box 2 (With Dual Thumbnail Photos inside card) */}
          <div className="rounded-3xl bg-white border border-neutral-200/90 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                02
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Harga Pasti
              </span>
            </div>

            {/* Thumbnail Photos Row */}
            <div className="grid grid-cols-2 gap-2 my-3">
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/70">
                <img
                  src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=80"
                  alt="Instalasi Listrik SNI"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200/70">
                <img
                  src="https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=500&auto=format&fit=crop&q=80"
                  alt="Pengecatan Halus Merata"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div>
              <h4 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight leading-snug mb-2">
                Biaya paket transparan tanpa pungutan tambahan mendadak
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Rincian tarif dicatat jelas di awal. Tukang dilarang meminta biaya di luar sistem tanpa persetujuanmu.
              </p>
            </div>
          </div>

          {/* Box 3 */}
          <div className="rounded-3xl bg-white border border-neutral-200/90 p-6 sm:p-7 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between mb-8">
              <span className="w-8 h-8 rounded-full bg-neutral-900 text-white text-xs font-bold flex items-center justify-center">
                03
              </span>
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                Proteksi Escrow
              </span>
            </div>
            <div>
              <h4 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight leading-snug mb-2">
                Dana ditahan aman hingga kamu puas dengan hasil kerja
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed font-normal">
                Periksa foto sebelum dan sesudah langsung di aplikasi sebelum kamu menekan tombol konfirmasi selesai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. SECTION: CHOOSE AN INSPIRING DESTINATION -> "PILIHAN MITRA TUKANG TERBAIK" */}
      <section className="w-full px-4 sm:px-8 py-16 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-[11px] font-bold tracking-widest text-orange-600 uppercase block mb-1">
              DEDIKASI NYATA
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 tracking-tight">
              Pilihan Mitra Tukang Berdedikasi
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 max-w-md leading-relaxed font-normal">
            Bekerja dengan dedikasi tinggi, bersertifikasi, dan telah menyelesaikan puluhan pekerjaan dengan kepuasan pelanggan bintang lima.
          </p>
        </div>

        {/* 3 Worker Cards: Center Card Elevated (Matching Reference's Center Featured Sumba Card) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {workers.map((worker, idx) => {
            const isCenter = idx === 1;
            return (
              <div
                key={worker.id}
                className={`rounded-3xl bg-white border p-5 transition-all ${
                  isCenter
                    ? "border-neutral-900 shadow-xl md:-translate-y-3"
                    : "border-neutral-200/90 shadow-xs"
                }`}
              >
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100 mb-4">
                  {worker.photo_path ? (
                    <img
                      src={worker.photo_path}
                      alt={worker.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-800 text-2xl font-bold">
                      {worker.full_name.charAt(0)}
                    </div>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/95 text-neutral-900 text-[10px] font-bold shadow-xs">
                    4.9 ★ Terverifikasi
                  </span>
                </div>

                <div className="space-y-1 mb-4">
                  <h4 className="text-lg font-bold text-neutral-900 tracking-tight truncate">
                    {worker.full_name}
                  </h4>
                  <p className="text-xs text-neutral-500">
                    {worker.service_area} · {worker.experience_years} tahun pengalaman
                  </p>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs font-semibold">
                  <div>
                    <span className="block text-[10px] text-neutral-400 font-normal uppercase">
                      Mulai Dari
                    </span>
                    <span className="text-neutral-900 font-bold">
                      Rp150.000
                    </span>
                  </div>
                  <Link
                    href={`/workers/${worker.slug}`}
                    className="px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-semibold transition-colors"
                  >
                    Lihat Profil
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Center Pill Button */}
        <div className="mt-10 text-center">
          <Link
            href="/search?tab=workers"
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold tracking-wider uppercase transition-all shadow-md group"
          >
            <span>Lihat Semua Mitra Tukang</span>
            <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] flex items-center justify-center font-bold group-hover:translate-x-0.5 transition-transform">
              →
            </span>
          </Link>
        </div>
      </section>

      {/* 7. SECTION: FINALE SPLIT BANNER (MATCHING REFERENCE BOTTOM SPLIT HERO) */}
      <section className="w-full px-4 sm:px-8 py-10 pb-20 max-w-7xl mx-auto">
        <div className="rounded-[36px] sm:rounded-[48px] overflow-hidden bg-neutral-950 text-white grid grid-cols-1 lg:grid-cols-2 shadow-2xl border border-neutral-800">
          {/* Left Side: Dramatic Architecture with Overlaid Floating Card */}
          <div className="relative min-h-[460px] sm:min-h-[560px] flex items-center justify-center p-6 sm:p-10">
            <img
              src="https://images.unsplash.com/photo-160058515526-990dced4db0d?w=1400&auto=format&fit=crop&q=80"
              alt="BuildMate Artisan Habitat"
              className="absolute inset-0 w-full h-full object-cover opacity-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-neutral-950/30" />

            {/* Overlaid Floating Card (Matching the Reference's Sumba Floating Card) */}
            <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white/95 backdrop-blur-md text-neutral-900 p-5 shadow-2xl border border-white/20">
              <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-neutral-100 mb-3.5">
                <img
                  src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&auto=format&fit=crop&q=80"
                  alt="BuildMate Shield Protected Home"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full bg-neutral-900 text-white text-[10px] font-bold">
                  Paket Plus
                </span>
              </div>
              <h4 className="font-bold text-base text-neutral-900 tracking-tight">
                The BuildMate Shield
              </h4>
              <p className="text-xs text-neutral-500 mt-1 mb-3">
                Ketenangan hunian sepanjang tahun. Bebas biaya layanan, garansi pengerjaan ulang 14 hari, dan prioritas penugasan.
              </p>
              <div className="flex items-center justify-between text-xs pt-3 border-t border-neutral-100">
                <span className="font-bold text-orange-600">Rp49.000 / bln</span>
                <Link
                  href="/plus"
                  className="px-3.5 py-1.5 rounded-full bg-neutral-900 text-white text-[11px] font-semibold hover:bg-neutral-800 transition-colors"
                >
                  Daftar Plus
                </Link>
              </div>
            </div>
          </div>

          {/* Right Side: Warm Textured Tone with Big Statement & Directory Links */}
          <div className="relative min-h-[460px] sm:min-h-[560px] flex flex-col justify-between p-8 sm:p-14 bg-gradient-to-br from-[#1C1815] to-[#12100E] border-t lg:border-t-0 lg:border-l border-neutral-800">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-400 border-b border-white/10 pb-4">
              <Link href="/search" className="hover:text-white transition-colors">
                Semua Layanan ↗
              </Link>
              <Link href="/search?tab=workers" className="hover:text-white transition-colors">
                Mitra Resmi ↗
              </Link>
              <Link href="/plus" className="hover:text-white transition-colors">
                Hubungi Kami ↗
              </Link>
            </div>

            {/* Center Big Headline */}
            <div className="my-auto py-8">
              <span className="text-xs font-bold text-orange-400 uppercase tracking-widest block mb-3">
                STANDAR PERAWATAN HUNIAN MODERN
              </span>
              <h3 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Kenyamanan hunian bermula dari tangan ahli yang tepat.
              </h3>
              <p className="text-xs sm:text-sm text-neutral-400 mt-4 leading-relaxed max-w-md font-normal">
                Bergabunglah dengan ribuan keluarga di Indonesia yang telah mempercayakan perbaikan hunian mereka ke sistem rekening bersama aman BuildMate.
              </p>

              <div className="pt-6">
                <Link
                  href="/search"
                  className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-neutral-900 hover:bg-neutral-100 active:scale-95 text-xs font-bold tracking-wider uppercase transition-all shadow-md"
                >
                  Mulai Perbaikan Sekarang
                </Link>
              </div>
            </div>

            {/* Bottom Footer Directory Links */}
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-400 pt-4 border-t border-white/10">
              <div className="flex gap-4">
                <Link href="/search" className="hover:text-white transition-colors">
                  Kategori
                </Link>
                <Link href="/#cara-kerja" className="hover:text-white transition-colors">
                  Tentang Kami
                </Link>
                <Link href="/mitra/register" className="hover:text-white transition-colors">
                  Jadi Mitra
                </Link>
                <Link href="/plus" className="hover:text-white transition-colors">
                  Testimoni
                </Link>
              </div>
              <span className="text-[11px] text-neutral-400">
                © 2026 BuildMate Platform
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
